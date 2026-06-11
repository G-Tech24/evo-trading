# EvoTrading + Medallion Fund — Guía de uso

## Requisitos

- Node.js 18+
- Cuenta en [Alpaca Markets](https://app.alpaca.markets) (paper o live)
- Terminal 140+ columnas para el dashboard completo (80+ mínimo)

## Setup rápido

```bash
# 1. Clonar
git clone https://github.com/G-Tech24/evo-trading.git
cd evo-trading

# 2. Instalar dependencias
npm install

# 3. Configurar credenciales
cp .env.example .env
# Editar .env con tu ALPACA_KEY_ID y ALPACA_SECRET_KEY
```

## Ejecutar

```bash
# Dashboard curses en terminal (recomendado)
npm run evo

# Modo paper trading explícito
npm run evo:paper

# Modo LIVE (¡dinero real! — asegúrate de entender los riesgos)
npm run evo:live

# Solo logs de texto (sin UI curses)
npm run evo:text

# Símbolos custom
npm run evo -- --symbols=BTC/USD,ETH/USD,SPY

# Sin UI y symbols custom
npm run evo -- --no-ui --symbols=BTC/USD
```

## Variables de entorno (.env)

| Variable | Default | Descripción |
|---|---|---|
| `ALPACA_KEY_ID` | — | API Key de Alpaca (**requerida** para órdenes reales) |
| `ALPACA_SECRET_KEY` | — | API Secret de Alpaca (**requerida**) |
| `ALPACA_PAPER` | `true` | `true` = paper trading, `false` = live |
| `ALPACA_SYMBOLS` | `BTC/USD,ETH/USD` | Símbolos a operar (cripto o acciones) |
| `ALPACA_MIN_NOTIONAL` | `10` | Mínimo USD por orden |
| `ALPACA_MAX_NOTIONAL` | `500` | Máximo USD por orden |
| `EVO_AGENTS` | `20` | Agentes evolutivos iniciales |
| `EVO_TICK_MS` | `2000` | Milisegundos entre ticks del motor |

## Cómo obtener las claves de Alpaca

1. Crear cuenta en https://app.alpaca.markets
2. Para paper trading: Dashboard → Paper Trading → API Keys → Generate
3. Para live trading: Dashboard → Live Trading → API Keys → Generate
4. Copiar Key ID y Secret Key al archivo `.env`

## Atajos en el dashboard

| Tecla | Acción |
|---|---|
| `q` o `Ctrl+C` | Salir (detiene la simulación) |

## Arquitectura del sistema

```
Agente EvoTrading
├── Sistema Nervioso (CfC + NCP + GAT)
│   ├── CfC: 24 neuronas tiempo-continuo
│   ├── NCP: 9 sensorial → 12 inter → 3 motor (buy/sell/hold)
│   └── GAT: atención entre agentes (αᵢⱼ = softmax(LeakyReLU))
├── Músculo/Esqueleto (conocimiento)
│   ├── 70 conceptos L1-L7 (Guardería → Doctorado)
│   ├── Matemáticas: Itô, Hurst, z-score
│   ├── Física: energía cinética, entropía Shannon, oscilador armónico
│   └── Química: cinética, difusión Fick, Le Chatelier
├── Sistema Circulatorio
│   ├── Corazón: bombea capital elite → débiles
│   ├── 7 tipos de paquetes (eritrocitos, leucocitos, plaquetas...)
│   └── Retorno venoso: 30% capital reciclado de agentes muertos
├── Sistema Respiratorio
│   ├── 8 regímenes (eupnea, tachypnea, hipoxia...)
│   ├── O₂ = ratio señal/ruido del mercado
│   └── CO₂ = volatilidad tóxica
└── Entrenamiento Adversarial
    ├── 6 fases: warmup → acceleration → adversarial → doctoral → chaos → self_play
    ├── Problemas generados proceduralmente (nunca repite)
    └── RL-style: penaliza respuestas memorizadas

Broker: Alpaca Markets
├── Paper trading: simulado con precios reales
├── Live trading: órdenes reales a mercado
├── WebSocket: datos de mercado en tiempo real
└── Escala de inversión: agentes con más fitness invierten más
```

## Selección natural

- Tick cada 2s: cada agente procesa precio → señal CfC → decisión buy/sell/hold
- Evaluación de fitness = Sharpe×0.5 + WinRate×0.3 + PnL%×0.2
- **Mueren**: capital < $6,000 o drawdown > 40%
- **Se reproducen**: top 25% de fitness cada 30 ticks
- **Capital reciclado**: 30% del capital de agentes muertos → 3 más necesitados

## Órdenes en Alpaca

Los agentes con fitness > 0.3 ejecutan sus decisiones como órdenes reales en Alpaca.
El tamaño de la orden se escala: `notional = (capital_ratio × MAX_NOTIONAL × positionSizing × 2)` clampeado entre `MIN_NOTIONAL` y `MAX_NOTIONAL`.

---

## Medallion Fund — Motor de Inteligencia Política Autónomo

Inspirado en el **Medallion Fund de Renaissance Technologies** (Jim Simons, 1988 - presente, ~66% anualizado bruto).

### Arquitectura del Medallion Fund

```
Fuentes de Inteligencia (29 feeds RSS sin API key)
├── Política USA          — Reuters, AP, Politico, The Hill, Roll Call
├── Política Internacional — BBC, Reuters World, Foreign Policy, CFR
├── Banco Central          — Federal Reserve, ECB, BIS (máx. prioridad)
├── Economía               — Reuters Business, CNBC, FT, WSJ
├── Regulación             — SEC, CFTC (alerta regulatoria)
├── Geopolítica            — Defense News, AP World, CFR
├── Commodities            — Reuters Energy, Platts
└── Social/Alt             — Reddit: r/worldnews, r/economics, r/investing, r/CryptoCurrency
          │
          ▼
    Sentiment Engine (NLP sin ML externo)
    ├── Léxico Financiero    — 40+ términos positivos/negativos, ponderados
    ├── Léxico Político      — 46 términos con mapeo a activos/sectores
    ├── Léxico Macro         — 28 términos económicos
    ├── Reconocimiento NER   — Países, tickers, monedas, commodities, personas
    └── Puntuación ponderada — Financial 50% + Political 35% + Macro 15%
          │
          ▼
    Political Analyzer
    ├── 10 tipos de eventos  — guerra, sanción, elección, banco central, etc.
    ├── Decodificador CB     — Hawkish/Dovish de comunicados Fed/ECB/BOJ
    ├── Registro geopolítico — 6 regiones con decaimiento temporal de riesgo
    └── Mapeo activo/evento  — Qué comprar/vender ante cada evento político
          │
          ▼
    Signal Engine — Modelo Multi-Factor
    ├── Factor Político  (35%) — señales del Political Analyzer
    ├── Factor Sentimiento (25%) — sentiment agregado de noticias
    ├── Factor Macro     (20%) — entorno macro estimado
    ├── Factor Técnico   (20%) — momentum + RSI simplificado
    ├── Kelly Criterion  — sizing óptimo de posición (fracción conservadora 25%)
    └── Confianza compuesta — consenso entre los 4 factores
          │
          ▼
    Autonomous Execution
    ├── Ciclo automático cada 15 min
    ├── Stop-loss automático (3% default)
    ├── Take-profit automático (6% default)
    ├── Max 5 posiciones simultáneas
    └── Max 15% del portfolio por posición
          │
          ▼
    Integración con Motor Evolutivo
    └── Señal política (10-20% blend) → influye en decisión de cada agente
```

### Variables de entorno adicionales (Medallion Fund)

| Variable | Default | Descripción |
|---|---|---|
| `MEDALLION_LIVE` | `false` | `true` = ejecutar trades reales vía Alpaca |

### API REST del Medallion Fund

| Endpoint | Descripción |
|---|---|
| `GET /api/medallion/summary` | Resumen del fondo (estado, performance, señales activas) |
| `GET /api/medallion/intelligence` | Reporte completo de inteligencia política |
| `GET /api/medallion/signals` | Señales de trading activas |
| `GET /api/medallion/signal/:symbol` | Señal para un símbolo específico |
| `GET /api/medallion/geopolitical` | Riesgos geopolíticos por región |
| `GET /api/medallion/performance` | Métricas de performance del fondo |
| `GET /api/medallion/news/stats` | Estadísticas del agregador de noticias |
| `GET /api/medallion/config` | Configuración actual |
| `PATCH /api/medallion/config` | Actualizar configuración |
| `POST /api/medallion/start` | Iniciar el fondo |
| `POST /api/medallion/stop` | Detener el fondo |
| `POST /api/medallion/cycle` | Disparar ciclo manual de inteligencia |

### Lógica de Inversión Política (ejemplos)

| Evento Político | Activos Bullish | Activos Bearish | Duración señal |
|---|---|---|---|
| Guerra / Conflicto | GLD, OIL, BTC, defensa | SPY, EM | 72h |
| Sanciones | GLD, OIL, BTC | activos del país sancionado | 168h |
| Fed Dovish / Recorte | SPY, BTC, GLD | USD | 48h |
| Fed Hawkish / Alza | USD, bonos cortos | SPY, BTC, GLD | 48h |
| Guerra Comercial | GLD | tech, exportadores, SPY | 120h |
| Gasto Fiscal | SPY, commodities, BTC | USD bonos largos | 96h |
| Regulación Cripto | — | BTC, ETH, altcoins | 72h |
| Golpe / Crisis Política | GLD, BTC, USD | activos locales | 48h |
| Acuerdo de Paz | activos regionales | GLD (menor demanda safe haven) | 48h |

### Modelo de Riesgo Geopolítico

El sistema mantiene un registro en tiempo real de 6 regiones:
- **Middle East** → afecta OIL, GLD, BTC
- **Eastern Europe** → afecta OIL, GLD, gas natural, trigo
- **Asia-Pacific** → afecta semiconductores, AAPL, TSLA, NVDA
- **Latin America** → afecta cobre, OIL, agricultura
- **Africa** → afecta GLD, OIL, cobalto, litio
- **North Korea** → afecta GLD, BTC, acciones de defensa

El riesgo decae exponencialmente si no hay nuevas noticias (90% cada 6 horas).

### Fear & Greed Index

Calculado continuamente de 0 (miedo extremo) a 100 (codicia extrema):
- `> 70` → zona de codicia, considerar reducir exposición
- `30-70` → zona neutral
- `< 30` → zona de miedo, posible oportunidad contraria
