/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  SISTEMA CIRCULATORIO — Flujo de Capital, Información y Conocimiento
 *
 *  ANALOGÍA BIOLÓGICA:
 *  - Corazón     = Motor de distribución central (ciclo de selección)
 *  - Arterias    = Flujo de capital/conocimiento desde elite → periferia
 *  - Venas       = Retorno de capital fracasado → reciclaje
 *  - Capilares   = Microintercambios P2P entre agentes vecinos (GAT edges)
 *  - Plasma      = Información de mercado que circula entre todos
 *  - Glóbulos rojos  = Unidades de capital productivo
 *  - Glóbulos blancos = Señales de alerta de riesgo
 *  - Plaquetas   = Mecanismos de coagulación (stop-loss / drawdown limit)
 *
 *  PRINCIPIO: La información y el capital fluyen como la sangre.
 *  Los agentes sanos irradian "oxígeno" a los débiles.
 *  Los agentes moribundos "sangran" y contaminan los capilares cercanos.
 * ═══════════════════════════════════════════════════════════════════════════
 */

// ─── TIPOS ───────────────────────────────────────────────────────────────────

export interface BloodPacket {
  id: string;
  type: BloodCellType;
  origin: string;          // agentId fuente
  destination: string;     // agentId destino (o "all" para plasma)
  payload: BloodPayload;
  lifespan: number;        // ticks restantes de vida
  strength: number;        // 0-1: potencia de la señal
  createdAt: number;
}

export type BloodCellType =
  | "erythrocyte"    // capital productivo (O₂ = oportunidades de trade)
  | "leukocyte"      // alerta de riesgo sistémico
  | "platelet"       // mecanismo stop-loss / coagulación
  | "plasma"         // información de mercado (precio, volumen, volatilidad)
  | "knowledge"      // paquete de conocimiento (math/physics/chemistry)
  | "hormone"        // señal hormonal (cortisol, adrenalina) para modo estrés
  | "antibody";      // respuesta inmune (contramedida a estrategia fallida)

export interface BloodPayload {
  capitalDelta?: number;       // transferencia de capital ($)
  knowledgeBoost?: [number, number, number]; // [math, physics, chem] boost
  riskSignal?: number;         // 0-1: nivel de riesgo detectado
  priceSignal?: number;        // precio de mercado actual
  volatilitySignal?: number;   // volatilidad actual
  fitnessSignal?: number;      // fitness del agente origen
  strategySignal?: string;     // estrategia dominante detectada
  stopLossLevel?: number;      // nivel de coagulación (capital mínimo)
  hormoneType?: "cortisol" | "adrenaline" | "dopamine";
  hormoneIntensity?: number;
}

export interface CirculatoryState {
  heartRate: number;           // ticks por ciclo (latidos)
  bloodPressure: number;       // 0-1 (presión sistémica)
  oxygenSaturation: number;    // 0-1 (% capital productivo circulando)
  circulatoryStress: number;   // 0-1 (estrés del sistema)
  activePackets: BloodPacket[];
  vesselHealth: VesselHealth;
  lastHeartbeat: number;       // tick del último bombeo
  heartbeatCount: number;
  totalCapitalCirculated: number;
  totalKnowledgeTransferred: number;
}

export interface VesselHealth {
  arterialFlow: number;   // 0-1: flujo desde elite hacia periferia
  venousReturn: number;   // 0-1: retorno de capital reciclado
  capillaryDensity: number; // 0-1: densidad de conexiones P2P
  plaqueIndex: number;    // 0-1: obstrucción (agentes muertos bloquean flujo)
}

export interface AgentBloodProfile {
  agentId: string;
  capitalIn: number;       // capital recibido en circulación
  capitalOut: number;      // capital enviado a circulación
  knowledgeIn: [number, number, number];
  knowledgeOut: [number, number, number];
  hormoneLevel: { cortisol: number; adrenaline: number; dopamine: number };
  bloodType: "elite" | "normal" | "stressed" | "critical"; // análogo a tipos sanguíneos
}

// ─── ESTADO GLOBAL ───────────────────────────────────────────────────────────

const circulatoryState: CirculatoryState = {
  heartRate: 15,        // bombeo cada 15 ticks
  bloodPressure: 0.5,
  oxygenSaturation: 0.8,
  circulatoryStress: 0,
  activePackets: [],
  vesselHealth: {
    arterialFlow: 0.9,
    venousReturn: 0.7,
    capillaryDensity: 0.6,
    plaqueIndex: 0.1,
  },
  lastHeartbeat: 0,
  heartbeatCount: 0,
  totalCapitalCirculated: 0,
  totalKnowledgeTransferred: 0,
};

const agentProfiles = new Map<string, AgentBloodProfile>();

let packetCounter = 0;

// ─── FUNCIONES CARDIOVASCULARES ───────────────────────────────────────────────

/**
 * LATIDO DEL CORAZÓN
 * Cada heartRate ticks, el corazón bombea:
 * 1. Capital desde agentes elite hacia novatos (redistribución arterial)
 * 2. Conocimiento (plasma de información) a todos
 * 3. Señales de riesgo (leucocitos) si volatilidad alta
 */
export function heartbeat(
  agents: Array<{
    id: string; fitnessScore: number; capital: number;
    mathWeight: number; physicsWeight: number; chemistryWeight: number;
    status: string; generation: number; winRate: number;
  }>,
  currentTick: number,
  marketVolatility: number,
  currentPrice: number
): BloodPacket[] {
  if (currentTick - circulatoryState.lastHeartbeat < circulatoryState.heartRate) return [];

  circulatoryState.lastHeartbeat = currentTick;
  circulatoryState.heartbeatCount++;

  const alive = agents.filter(a => a.status === "alive");
  if (alive.length < 2) return [];

  const newPackets: BloodPacket[] = [];
  const sorted = [...alive].sort((a, b) => b.fitnessScore - a.fitnessScore);
  const elite = sorted.slice(0, Math.max(1, Math.floor(sorted.length * 0.25)));
  const struggling = sorted.slice(Math.floor(sorted.length * 0.75));

  // ── ARTERIAL: Elite → Struggling (capital + conocimiento) ─────────────────
  for (const src of elite) {
    for (const dst of struggling.slice(0, 2)) {
      if (src.id === dst.id) continue;

      // Transfusión de capital: máximo 2% del capital del donante
      const capitalTransfer = src.capital * 0.02 * circulatoryState.vesselHealth.arterialFlow;

      newPackets.push({
        id: `pkt_${++packetCounter}`,
        type: "erythrocyte",
        origin: src.id,
        destination: dst.id,
        payload: {
          capitalDelta: capitalTransfer,
          fitnessSignal: src.fitnessScore,
          strategySignal: undefined,
        },
        lifespan: 5,
        strength: src.fitnessScore * circulatoryState.vesselHealth.arterialFlow,
        createdAt: currentTick,
      });

      // Transferencia de conocimiento: el conocimiento dominante del agente elite
      const domWeights: [number, number, number] = [
        src.mathWeight * 0.1,
        src.physicsWeight * 0.1,
        src.chemistryWeight * 0.1,
      ];
      newPackets.push({
        id: `pkt_${++packetCounter}`,
        type: "knowledge",
        origin: src.id,
        destination: dst.id,
        payload: { knowledgeBoost: domWeights, fitnessSignal: src.fitnessScore },
        lifespan: 8,
        strength: 0.6,
        createdAt: currentTick,
      });

      circulatoryState.totalKnowledgeTransferred++;
    }
  }

  // ── PLASMA: Información de mercado a todos los agentes ────────────────────
  const plasmaPacket: BloodPacket = {
    id: `pkt_${++packetCounter}`,
    type: "plasma",
    origin: "market",
    destination: "all",
    payload: {
      priceSignal: currentPrice,
      volatilitySignal: marketVolatility,
      fitnessSignal: elite[0]?.fitnessScore ?? 0,
      strategySignal: elite[0]?.id,
    },
    lifespan: 3,
    strength: 1.0,
    createdAt: currentTick,
  };
  newPackets.push(plasmaPacket);

  // ── LEUCOCITOS: Alerta si volatilidad alta ─────────────────────────────────
  if (marketVolatility > 0.03) {
    const riskLevel = Math.min(1, marketVolatility / 0.1);
    newPackets.push({
      id: `pkt_${++packetCounter}`,
      type: "leukocyte",
      origin: "immune_system",
      destination: "all",
      payload: { riskSignal: riskLevel, volatilitySignal: marketVolatility },
      lifespan: 4,
      strength: riskLevel,
      createdAt: currentTick,
    });
    circulatoryState.circulatoryStress = Math.min(1, circulatoryState.circulatoryStress + riskLevel * 0.1);
  }

  // ── PLAQUETAS: Stop-loss sistémico si muchos agentes en crítico ───────────
  const criticalAgents = alive.filter(a => a.capital < 7000);
  if (criticalAgents.length / alive.length > 0.3) {
    for (const ca of criticalAgents) {
      newPackets.push({
        id: `pkt_${++packetCounter}`,
        type: "platelet",
        origin: "coagulation",
        destination: ca.id,
        payload: { stopLossLevel: 6500, riskSignal: 0.9 },
        lifespan: 2,
        strength: 0.95,
        createdAt: currentTick,
      });
    }
  }

  // ── HORMONAS: Cortisol bajo estrés extremo, Dopamina en victorias ─────────
  if (circulatoryState.circulatoryStress > 0.6) {
    newPackets.push({
      id: `pkt_${++packetCounter}`,
      type: "hormone",
      origin: "endocrine",
      destination: "all",
      payload: {
        hormoneType: "cortisol",
        hormoneIntensity: circulatoryState.circulatoryStress,
        riskSignal: circulatoryState.circulatoryStress,
      },
      lifespan: 6,
      strength: circulatoryState.circulatoryStress,
      createdAt: currentTick,
    });
  }

  // Si el mejor agente mejoró mucho, liberar dopamina
  if (elite[0] && elite[0].fitnessScore > 0.5 && elite[0].winRate > 0.6) {
    newPackets.push({
      id: `pkt_${++packetCounter}`,
      type: "hormone",
      origin: "reward_circuit",
      destination: "all",
      payload: {
        hormoneType: "dopamine",
        hormoneIntensity: elite[0].winRate,
        fitnessSignal: elite[0].fitnessScore,
      },
      lifespan: 5,
      strength: elite[0].winRate,
      createdAt: currentTick,
    });
  }

  // Agregar nuevos paquetes al estado
  circulatoryState.activePackets.push(...newPackets);
  circulatoryState.totalCapitalCirculated += newPackets
    .filter(p => p.type === "erythrocyte")
    .reduce((s, p) => s + (p.payload.capitalDelta ?? 0), 0);

  // Actualizar presión sanguínea
  updateBloodPressure(alive.length, marketVolatility);

  return newPackets;
}

/**
 * CAPILARES: Microintercambios P2P entre agentes vecinos
 * Ocurre cada tick entre agentes que comparten un edge GAT.
 */
export function capillaryExchange(
  agentId: string,
  neighborIds: string[],
  agentFitness: number,
  neighborFitness: Record<string, number>,
  currentTick: number
): BloodPacket[] {
  if (neighborIds.length === 0) return [];

  const packets: BloodPacket[] = [];
  const capillaryStrength = circulatoryState.vesselHealth.capillaryDensity;

  for (const nid of neighborIds.slice(0, 3)) {
    const nFitness = neighborFitness[nid] ?? 0.5;
    const fitnessDiff = nFitness - agentFitness;

    // Solo fluye si hay gradiente significativo (análogo a difusión Fick)
    if (Math.abs(fitnessDiff) < 0.05) continue;

    const src = fitnessDiff > 0 ? nid : agentId;
    const dst = fitnessDiff > 0 ? agentId : nid;

    packets.push({
      id: `cap_${++packetCounter}`,
      type: "erythrocyte",
      origin: src,
      destination: dst,
      payload: {
        capitalDelta: Math.abs(fitnessDiff) * 50 * capillaryStrength,
        fitnessSignal: Math.max(agentFitness, nFitness),
      },
      lifespan: 2,
      strength: Math.abs(fitnessDiff) * capillaryStrength,
      createdAt: currentTick,
    });
  }

  return packets;
}

/**
 * VENOUS RETURN: Agentes muertos devuelven capital al sistema.
 * El capital no se destruye, se redistribuye (economía circular).
 */
export function venousReturn(
  deadAgentId: string,
  deadAgentCapital: number,
  aliveAgents: Array<{ id: string; fitnessScore: number; capital: number }>,
  currentTick: number
): BloodPacket[] {
  if (aliveAgents.length === 0) return [];

  const recycledCapital = deadAgentCapital * 0.3; // 30% se recicla
  const perAgent = recycledCapital / Math.min(3, aliveAgents.length);

  // Se distribuye a los 3 agentes con menor capital (los más necesitados)
  const neediest = [...aliveAgents]
    .sort((a, b) => a.capital - b.capital)
    .slice(0, 3);

  return neediest.map(a => ({
    id: `vein_${++packetCounter}`,
    type: "erythrocyte" as BloodCellType,
    origin: deadAgentId,
    destination: a.id,
    payload: { capitalDelta: perAgent },
    lifespan: 3,
    strength: 0.4,
    createdAt: currentTick,
  }));
}

/**
 * PROCESAR PAQUETES: Aplicar efectos a agentes destino
 */
export function processPackets(
  currentTick: number
): { effects: Array<{ agentId: string; capitalDelta: number; knowledgeDelta: [number, number, number]; hormoneEffect: string | null }> } {
  const effects: Array<{ agentId: string; capitalDelta: number; knowledgeDelta: [number, number, number]; hormoneEffect: string | null }> = [];

  // Expirar paquetes viejos
  circulatoryState.activePackets = circulatoryState.activePackets.filter(
    p => currentTick - p.createdAt < p.lifespan * 2
  );

  // Agrupar efectos por agente destino
  const effectMap = new Map<string, { capitalDelta: number; knowledgeDelta: [number, number, number]; hormoneEffect: string | null }>();

  for (const pkt of circulatoryState.activePackets) {
    const targets = pkt.destination === "all"
      ? ["__all__"]
      : [pkt.destination];

    for (const tgt of targets) {
      if (!effectMap.has(tgt)) {
        effectMap.set(tgt, { capitalDelta: 0, knowledgeDelta: [0, 0, 0], hormoneEffect: null });
      }
      const eff = effectMap.get(tgt)!;

      switch (pkt.type) {
        case "erythrocyte":
          eff.capitalDelta += (pkt.payload.capitalDelta ?? 0) * pkt.strength;
          break;
        case "knowledge":
          const kb = pkt.payload.knowledgeBoost ?? [0, 0, 0];
          eff.knowledgeDelta[0] += kb[0] * pkt.strength;
          eff.knowledgeDelta[1] += kb[1] * pkt.strength;
          eff.knowledgeDelta[2] += kb[2] * pkt.strength;
          break;
        case "hormone":
          eff.hormoneEffect = pkt.payload.hormoneType ?? null;
          break;
        case "platelet":
          // Los plaquetas reducen capital a nivel mínimo (coagulación = protección)
          eff.capitalDelta -= Math.max(0, 6500 - (pkt.payload.stopLossLevel ?? 6500));
          break;
      }
    }
  }

  effectMap.forEach((eff, agentId) => {
    if (agentId !== "__all__") {
      effects.push({ agentId, ...eff });
    }
  });

  return { effects };
}

// ─── ACTUALIZACIÓN DEL ESTADO ─────────────────────────────────────────────────

function updateBloodPressure(aliveCount: number, volatility: number): void {
  // Presión alta = sistema bajo estrés (volatilidad alta o pocos agentes)
  const populationFactor = Math.max(0, 1 - aliveCount / 20);
  circulatoryState.bloodPressure = Math.min(1,
    0.3 + volatility * 3 + populationFactor * 0.3
  );

  // Saturación de O₂ = capital productivo vs total
  circulatoryState.oxygenSaturation = Math.max(0.1,
    0.9 - circulatoryState.circulatoryStress * 0.5
  );

  // Recuperación gradual del estrés
  circulatoryState.circulatoryStress = Math.max(0,
    circulatoryState.circulatoryStress - 0.005
  );

  // Placa arterial aumenta con muertes (plaquetas acumuladas)
  circulatoryState.vesselHealth.plaqueIndex = Math.min(0.8,
    circulatoryState.vesselHealth.plaqueIndex + volatility * 0.01
  );
  // Se disuelve con el tiempo
  circulatoryState.vesselHealth.plaqueIndex = Math.max(0,
    circulatoryState.vesselHealth.plaqueIndex - 0.002
  );

  // Ajustar ritmo cardíaco: más rápido bajo estrés
  circulatoryState.heartRate = Math.max(5,
    Math.round(15 - circulatoryState.circulatoryStress * 10)
  );
}

// ─── PERFIL DE AGENTE ─────────────────────────────────────────────────────────

export function updateAgentProfile(
  agentId: string,
  fitnessScore: number,
  capital: number
): void {
  if (!agentProfiles.has(agentId)) {
    agentProfiles.set(agentId, {
      agentId,
      capitalIn: 0,
      capitalOut: 0,
      knowledgeIn: [0, 0, 0],
      knowledgeOut: [0, 0, 0],
      hormoneLevel: { cortisol: 0, adrenaline: 0, dopamine: 0 },
      bloodType: "normal",
    });
  }

  const profile = agentProfiles.get(agentId)!;
  profile.bloodType =
    fitnessScore > 0.5 && capital > 12000 ? "elite" :
    capital < 7500 ? "critical" :
    fitnessScore < 0.2 ? "stressed" : "normal";

  agentProfiles.set(agentId, profile);
}

export function getAgentProfile(agentId: string): AgentBloodProfile | undefined {
  return agentProfiles.get(agentId);
}

export function getCirculatoryState(): CirculatoryState {
  return {
    ...circulatoryState,
    activePackets: circulatoryState.activePackets.slice(-50), // últimos 50
  };
}

export function getCirculatoryStats() {
  return {
    heartRate: circulatoryState.heartRate,
    bloodPressure: circulatoryState.bloodPressure,
    oxygenSaturation: circulatoryState.oxygenSaturation,
    circulatoryStress: circulatoryState.circulatoryStress,
    heartbeatCount: circulatoryState.heartbeatCount,
    activePackets: circulatoryState.activePackets.length,
    vesselHealth: circulatoryState.vesselHealth,
    totalCapitalCirculated: circulatoryState.totalCapitalCirculated,
    totalKnowledgeTransferred: circulatoryState.totalKnowledgeTransferred,
    packetTypeBreakdown: {
      erythrocyte: circulatoryState.activePackets.filter(p => p.type === "erythrocyte").length,
      leukocyte: circulatoryState.activePackets.filter(p => p.type === "leukocyte").length,
      platelet: circulatoryState.activePackets.filter(p => p.type === "platelet").length,
      plasma: circulatoryState.activePackets.filter(p => p.type === "plasma").length,
      knowledge: circulatoryState.activePackets.filter(p => p.type === "knowledge").length,
      hormone: circulatoryState.activePackets.filter(p => p.type === "hormone").length,
      antibody: circulatoryState.activePackets.filter(p => p.type === "antibody").length,
    }
  };
}
