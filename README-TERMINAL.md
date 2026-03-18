# EvoTrading — Guía de uso en terminal

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
