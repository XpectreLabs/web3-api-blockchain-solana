# 🚀 Solana Blockchain API

API REST construida con **Node.js + Express** para interactuar con la blockchain de **Solana**.

> Proyecto de estadía — Ingeniería

---

## 📁 Estructura del Proyecto

```
solana-blockchain-api/
├── src/
│   ├── config/
│   │   └── config.js          # Configuración centralizada
│   ├── controllers/
│   │   └── solanaController.js # Controladores de endpoints
│   ├── middlewares/
│   │   ├── errorHandler.js     # Manejo global de errores
│   │   └── validateRequest.js  # Validación de requests
│   ├── routes/
│   │   ├── index.js            # Router principal
│   │   └── solanaRoutes.js     # Rutas de Solana
│   ├── services/
│   │   └── solanaService.js    # Lógica de negocio (Solana)
│   └── utils/
│       └── logger.js           # Logger con Winston
├── logs/                        # Archivos de log (git-ignored)
├── .env                         # Variables de entorno (git-ignored)
├── .env.example                 # Plantilla de variables
├── .gitignore
├── app.js                       # Punto de entrada principal
├── package.json
└── README.md
```

## 🛠️ Instalación

```bash
# 1. Clonar el repositorio
git clone <url-del-repo>
cd solana-blockchain-api

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env
# Editar .env con tus valores

# 4. Iniciar en desarrollo
npm run dev

# 5. Iniciar en producción
npm start
```

## 📡 Endpoints Disponibles

| Método | Ruta                                | Descripción                       |
| ------ | ----------------------------------- | --------------------------------- |
| GET    | `/`                                 | Estado del servidor               |
| GET    | `/api`                              | Listado de endpoints              |
| GET    | `/api/solana/health`                | Conectividad con Solana           |
| GET    | `/api/solana/balance/:address`      | Balance de una wallet             |
| GET    | `/api/solana/transaction/:signature`| Detalle de una transacción        |
| GET    | `/api/solana/transactions/:address` | Transacciones recientes           |
| POST   | `/api/solana/airdrop`               | Airdrop de SOL (devnet/testnet)   |

## 🔑 Variables de Entorno

| Variable                  | Descripción                             | Default                          |
| ------------------------- | --------------------------------------- | -------------------------------- |
| `PORT`                    | Puerto del servidor                     | `3000`                           |
| `NODE_ENV`                | Entorno de ejecución                    | `development`                    |
| `SOLANA_NETWORK`          | Red de Solana                           | `devnet`                         |
| `SOLANA_RPC_URL`          | URL del RPC personalizada               | (URL por defecto de la red)      |
| `SOLANA_PRIVATE_KEY`      | Clave privada del wallet                | —                                |
| `CORS_ORIGINS`            | Orígenes CORS permitidos                | `localhost:3000,localhost:5173`   |
| `RATE_LIMIT_WINDOW_MS`    | Ventana de rate limiting (ms)           | `900000` (15 min)                |
| `RATE_LIMIT_MAX_REQUESTS` | Máx. peticiones por ventana             | `100`                            |
| `LOG_LEVEL`               | Nivel de logging                        | `debug`                          |

## 📦 Dependencias Principales

- **express** — Framework HTTP
- **@solana/web3.js** — SDK de Solana
- **dotenv** — Variables de entorno
- **cors** — Cross-Origin Resource Sharing
- **helmet** — Headers de seguridad HTTP
- **express-validator** — Validación de datos
- **morgan** — Logging HTTP
- **winston** — Logging avanzado
- **express-rate-limit** — Limitación de peticiones

## 🧪 Ejemplo de Uso

```bash
# Verificar estado
curl http://localhost:3000/

# Verificar conexión con Solana
curl http://localhost:3000/api/solana/health

