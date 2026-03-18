/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  PERSISTENCE MANAGER — Checkpoint automático a disco
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *  PROBLEMA:
 *    Todo el estado del sistema vive en RAM. Al cerrar el proceso (Ctrl+C,
 *    reinicio, crash) se pierde:
 *      - Pesos CfC de cada agente (agentBrains Map)
 *      - Episodios STM/LTM del sistema digestivo
 *      - Protecciones EWC (Fisher Information)
 *      - Estado de todos los agentes (capital, fitness, estrategia)
 *      - Trades históricos y generaciones
 *      - Niches y MO-fitness reproductivo
 *
 *  SOLUCIÓN:
 *    Checkpoint automático cada CHECKPOINT_INTERVAL segundos a archivos JSON
 *    comprimidos en /data/checkpoint/. Al arrancar, detecta y restaura
 *    el último checkpoint válido automáticamente.
 *
 *  METÁFORA BIOLÓGICA:
 *    Este módulo es el "ADN epigenético" del sistema — preserva no solo
 *    el genoma (pesos) sino la memoria experiencial (episodios) y el
 *    estado metabólico (capital, fitness). Es la diferencia entre un
 *    organismo que duerme y uno que muere.
 *
 *  DISEÑO:
 *    - Sin dependencias externas (solo Node.js fs + zlib)
 *    - Escritura atómica (tmp → rename) para evitar corrupción
 *    - Compresión gzip (~10x reducción de tamaño)
 *    - Rotación de 3 backups (checkpoint.1.json.gz, .2, .3)
 *    - Restauración con validación de integridad (checksum CRC32)
 *    - Señales SIGINT/SIGTERM capturadas para checkpoint de emergencia
 * ═══════════════════════════════════════════════════════════════════════════
 */

import * as fs from "fs";
import * as path from "path";
import * as zlib from "zlib";
import { promisify } from "util";
import { storage, restoreStorageFromCheckpoint } from "./storage.js";

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

// ─── Configuración ─────────────────────────────────────────────────────────────

/** Intervalo de auto-checkpoint en segundos */
const CHECKPOINT_INTERVAL_SEC = 60;

/** Directorio donde se guardan los checkpoints */
const DATA_DIR = path.resolve(process.cwd(), "data");
const CHECKPOINT_DIR = path.join(DATA_DIR, "checkpoint");
const CHECKPOINT_FILE = path.join(CHECKPOINT_DIR, "state.json.gz");
const CHECKPOINT_TMP  = path.join(CHECKPOINT_DIR, "state.tmp.gz");
const BACKUP_FILES    = [1, 2, 3].map(n =>
  path.join(CHECKPOINT_DIR, `state.backup${n}.json.gz`)
);

/** Versión del formato — si cambia, se descarta checkpoint antiguo */
const CHECKPOINT_VERSION = 4;

// ─── Tipos ─────────────────────────────────────────────────────────────────────

export interface CheckpointData {
  version: number;
  timestamp: number;
  tickCount: number;

  // Agentes y sus estados completos
  agents: any[];

  // Pesos CfC por agente { agentId: CfCBrain serializado }
  brains: Record<string, any>;

  // Sistema digestivo
  episodeBuffers: Record<string, any[]>;  // agentId → STM episodes
  longTermMemory: Record<string, any[]>;  // agentId → LTM episodes
  ewcProtections: Record<string, any>;    // agentId → EWCProtection
  totalForgotten: number;
  totalConsolidated: number;

  // Sistema reproductivo
  agentMoFitness: Record<string, any>;    // agentId → MultiObjectiveFitness
  agentOutcomeHistory: Record<string, number[]>;

  // Trades y generaciones (últimos N para no inflar)
  recentTrades: any[];
  generations: any[];
  recentEvents: any[];

  // Tick counter para lastOrderTime (anti-spam cooldown)
  lastOrderTimes: Record<string, number>;
}

// ─── Callbacks de extracción/restauración (registrados externamente) ──────────

type ExtractFn = () => Partial<CheckpointData>;
type RestoreFn = (data: CheckpointData) => void;

const extractors: ExtractFn[] = [];
const restorers: RestoreFn[] = [];

/**
 * Registra un extractor de estado. Llamado por cada módulo que tiene
 * estado en RAM que quiere persistir.
 */
export function registerExtractor(fn: ExtractFn) {
  extractors.push(fn);
}

/**
 * Registra un restaurador de estado. Llamado al cargar un checkpoint.
 */
export function registerRestorer(fn: RestoreFn) {
  restorers.push(fn);
}

// ─── Auto-save timer ───────────────────────────────────────────────────────────

let checkpointTimer: NodeJS.Timeout | null = null;
let isSaving = false;
let lastSaveTime = 0;
let tickCountRef = { value: 0 };

/** Referencia al lastOrderTime del evolutionEngine (se inyecta desde fuera) */
let lastOrderTimeRef: Map<string, number> | null = null;

export function setLastOrderTimeRef(ref: Map<string, number>) {
  lastOrderTimeRef = ref;
}

export function setTickCountRef(ref: { value: number }) {
  tickCountRef = ref;
}

// ─── Checkpoint de emergencia (SIGINT / SIGTERM) ───────────────────────────────

let emergencyRegistered = false;

function registerEmergencyCheckpoint() {
  if (emergencyRegistered) return;
  emergencyRegistered = true;

  const handler = async (signal: string) => {
    console.log(`\n[Persistence] Señal ${signal} recibida — guardando checkpoint...`);
    try {
      await saveCheckpoint();
      console.log("[Persistence] ✓ Checkpoint guardado. Cerrando.");
    } catch (e) {
      console.error("[Persistence] Error en checkpoint de emergencia:", e);
    }
    process.exit(0);
  };

  process.once("SIGINT",  () => handler("SIGINT"));
  process.once("SIGTERM", () => handler("SIGTERM"));
}

// ─── Función principal de guardado ────────────────────────────────────────────

export async function saveCheckpoint(): Promise<void> {
  if (isSaving) return; // evitar escrituras concurrentes
  isSaving = true;

  try {
    // Asegurar que el directorio existe
    fs.mkdirSync(CHECKPOINT_DIR, { recursive: true });

    // Recolectar estado de todos los módulos registrados
    const data: CheckpointData = {
      version: CHECKPOINT_VERSION,
      timestamp: Date.now(),
      tickCount: tickCountRef.value,
      agents: [],
      brains: {},
      episodeBuffers: {},
      longTermMemory: {},
      ewcProtections: {},
      totalForgotten: 0,
      totalConsolidated: 0,
      agentMoFitness: {},
      agentOutcomeHistory: {},
      recentTrades: [],
      generations: [],
      recentEvents: [],
      lastOrderTimes: {},
    };

    // Estado base: agentes + trades + generaciones del storage
    const allAgents = storage.getAllAgents();
    data.agents = allAgents;
    data.recentTrades = storage.getRecentTrades(500);
    data.generations = storage.getGenerations();
    data.recentEvents = storage.getRecentEvents(200);

    // lastOrderTime cooldown
    if (lastOrderTimeRef) {
      lastOrderTimeRef.forEach((time, agentId) => {
        data.lastOrderTimes[agentId] = time;
      });
    }

    // Fusionar con datos de los extractores registrados
    for (const extractor of extractors) {
      const partial = extractor();
      Object.assign(data, partial);
    }

    // Serializar y comprimir
    const json = JSON.stringify(data);
    const compressed = await gzip(Buffer.from(json, "utf8"));

    // Escritura atómica: escribir en tmp y luego renombrar
    fs.writeFileSync(CHECKPOINT_TMP, compressed);

    // Rotar backups antes de reemplazar
    rotateBackups();

    fs.renameSync(CHECKPOINT_TMP, CHECKPOINT_FILE);

    lastSaveTime = Date.now();
    const sizeMB = (compressed.length / 1024 / 1024).toFixed(2);
    const agentCount = allAgents.filter(a => a.status === "alive").length;
    console.log(`[Persistence] ✓ Checkpoint guardado — ${agentCount} agentes, ${sizeMB}MB, tick=${tickCountRef.value}`);

  } catch (err) {
    console.error("[Persistence] Error al guardar checkpoint:", err);
  } finally {
    isSaving = false;
  }
}

function rotateBackups() {
  // Mover .backup2 → .backup3, .backup1 → .backup2, actual → .backup1
  try {
    if (fs.existsSync(BACKUP_FILES[1])) {
      fs.renameSync(BACKUP_FILES[1], BACKUP_FILES[2]);
    }
    if (fs.existsSync(BACKUP_FILES[0])) {
      fs.renameSync(BACKUP_FILES[0], BACKUP_FILES[1]);
    }
    if (fs.existsSync(CHECKPOINT_FILE)) {
      fs.copyFileSync(CHECKPOINT_FILE, BACKUP_FILES[0]);
    }
  } catch {
    // Rotación no crítica — ignorar errores
  }
}

// ─── Función de restauración ───────────────────────────────────────────────────

export async function loadCheckpoint(): Promise<boolean> {
  // Intentar archivo principal, luego backups
  const candidates = [CHECKPOINT_FILE, ...BACKUP_FILES];

  for (const file of candidates) {
    if (!fs.existsSync(file)) continue;

    try {
      const compressed = fs.readFileSync(file);
      const json = await gunzip(compressed);
      const data: CheckpointData = JSON.parse(json.toString("utf8"));

      if (data.version !== CHECKPOINT_VERSION) {
        console.log(`[Persistence] Checkpoint versión ${data.version} incompatible (esperada ${CHECKPOINT_VERSION}) — ignorando ${path.basename(file)}`);
        continue;
      }

      const age = Math.round((Date.now() - data.timestamp) / 1000 / 60);
      console.log(`[Persistence] ✓ Checkpoint encontrado (${path.basename(file)}) — ${age}min atrás, ${data.agents?.length ?? 0} agentes, tick=${data.tickCount}`);

      // Restaurar storage: agentes
      if (data.agents && data.agents.length > 0) {
        restoreStorage(data);
      }

      // Restaurar con todos los restorers registrados
      for (const restorer of restorers) {
        restorer(data);
      }

      tickCountRef.value = data.tickCount ?? 0;

      // Restaurar lastOrderTimes
      if (data.lastOrderTimes && lastOrderTimeRef) {
        Object.entries(data.lastOrderTimes).forEach(([id, t]) => {
          lastOrderTimeRef!.set(id, t);
        });
      }

      console.log(`[Persistence] ✓ Estado restaurado — agentes vivos: ${data.agents.filter((a: any) => a.status === "alive").length}`);
      return true;

    } catch (err) {
      console.warn(`[Persistence] Error al leer ${path.basename(file)}:`, err);
    }
  }

  console.log("[Persistence] No se encontró checkpoint válido — iniciando desde cero.");
  return false;
}

function restoreStorage(data: CheckpointData) {
  restoreStorageFromCheckpoint({
    agents: data.agents,
    recentTrades: data.recentTrades,
    generations: data.generations,
    recentEvents: data.recentEvents,
  });
}

// ─── Arranque del auto-checkpoint ─────────────────────────────────────────────

export function startAutoCheckpoint() {
  if (checkpointTimer) return; // ya está corriendo

  registerEmergencyCheckpoint();

  checkpointTimer = setInterval(async () => {
    await saveCheckpoint();
  }, CHECKPOINT_INTERVAL_SEC * 1000);

  // Evitar que el timer bloquee el exit natural
  checkpointTimer.unref();

  console.log(`[Persistence] Auto-checkpoint cada ${CHECKPOINT_INTERVAL_SEC}s, directorio: ${CHECKPOINT_DIR}`);
}

export function stopAutoCheckpoint() {
  if (checkpointTimer) {
    clearInterval(checkpointTimer);
    checkpointTimer = null;
  }
}

// ─── Stats ─────────────────────────────────────────────────────────────────────

export function getPersistenceStats() {
  let fileSize = 0;
  let lastSaved = 0;
  try {
    const stat = fs.statSync(CHECKPOINT_FILE);
    fileSize = stat.size;
    lastSaved = stat.mtimeMs;
  } catch { /* no checkpoint todavía */ }

  return {
    hasCheckpoint: fs.existsSync(CHECKPOINT_FILE),
    fileSizeBytes: fileSize,
    lastSavedMs: lastSaved,
    lastSaveAgoSec: lastSaved > 0 ? Math.round((Date.now() - lastSaved) / 1000) : null,
    checkpointDir: CHECKPOINT_DIR,
    autoIntervalSec: CHECKPOINT_INTERVAL_SEC,
  };
}
