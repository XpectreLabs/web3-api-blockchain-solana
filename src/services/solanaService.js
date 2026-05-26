const solanaWeb3 = require('@solana/web3.js');
const { config } = require('../config/config');
const logger = require('../utils/logger');

// ── Mapeo de redes a URLs de cluster ──────────────────────────
const CLUSTER_URLS = {
  devnet: solanaWeb3.clusterApiUrl('devnet'),
  testnet: solanaWeb3.clusterApiUrl('testnet'),
  'mainnet-beta': solanaWeb3.clusterApiUrl('mainnet-beta'),
};

/**
 * Obtiene la URL del cluster RPC configurado.
 * Prioriza la URL personalizada en .env sobre la URL por defecto.
 */
function getRpcUrl() {
  if (config.solana.rpcUrl) {
    return config.solana.rpcUrl;
  }
  return CLUSTER_URLS[config.solana.network] || CLUSTER_URLS.devnet;
}

/**
 * Crea y retorna una conexión al cluster de Solana.
 * @returns {solanaWeb3.Connection}
 */
function getConnection() {
  const rpcUrl = getRpcUrl();
  logger.info(`Conectando a Solana: ${config.solana.network} (${rpcUrl})`);
  return new solanaWeb3.Connection(rpcUrl, 'confirmed');
}

// ── Instancia singleton de la conexión ────────────────────────
let connectionInstance = null;

/**
 * Retorna la conexión singleton al cluster.
 * La crea en la primera invocación y la reutiliza después.
 * @returns {solanaWeb3.Connection}
 */
function connection() {
  if (!connectionInstance) {
    connectionInstance = getConnection();
  }
  return connectionInstance;
}

// ── Servicios públicos ────────────────────────────────────────


async function getBalance(publicKeyStr) {
  const publicKey = new solanaWeb3.PublicKey(publicKeyStr);
  const balanceLamports = await connection().getBalance(publicKey);
  const balanceSOL = balanceLamports / solanaWeb3.LAMPORTS_PER_SOL;

  logger.debug(`Balance de ${publicKeyStr}: ${balanceSOL} SOL`);

  return {
    address: publicKeyStr,
    balanceLamports,
    balanceSOL,
  };
}

/**
 * Obtiene la información de una transacción por su firma.
 * @param {string} signature - Firma de la transacción en Base58
 * @returns {Promise<object|null>}
 */
async function getTransaction(signature) {
  const tx = await connection().getTransaction(signature, {
    maxSupportedTransactionVersion: 0,
  });

  if (!tx) {
    logger.warn(`Transacción no encontrada: ${signature}`);
    return null;
  }

  logger.debug(`Transacción encontrada: ${signature}`);
  return {
    signature,
    slot: tx.slot,
    blockTime: tx.blockTime,
    fee: tx.meta?.fee,
    status: tx.meta?.err ? 'failed' : 'success',
    meta: tx.meta,
  };
}

/**
 * Obtiene la información del cluster (versión, epoch, etc.).
 * @returns {Promise<object>}
 */
async function getClusterInfo() {
  const [version, epochInfo, supply] = await Promise.all([
    connection().getVersion(),
    connection().getEpochInfo(),
    connection().getSupply(),
  ]);

  return {
    network: config.solana.network,
    rpcUrl: getRpcUrl(),
    version,
    epoch: {
      epoch: epochInfo.epoch,
      slotIndex: epochInfo.slotIndex,
      slotsInEpoch: epochInfo.slotsInEpoch,
      absoluteSlot: epochInfo.absoluteSlot,
    },
    supply: {
      totalSOL: supply.value.total / solanaWeb3.LAMPORTS_PER_SOL,
      circulatingSOL: supply.value.circulating / solanaWeb3.LAMPORTS_PER_SOL,
    },
  };
}

/**
 * Solicita un airdrop de SOL (solo funciona en devnet/testnet).
 * @param {string} publicKeyStr - Dirección pública en Base58
 * @param {number} amountSOL - Cantidad en SOL (máx 2 en devnet)
 * @returns {Promise<{ signature: string, address: string, amountSOL: number }>}
 */
async function requestAirdrop(publicKeyStr, amountSOL = 1) {
  if (config.solana.network === 'mainnet-beta') {
    throw new Error('Airdrop no disponible en mainnet');
  }

  const publicKey = new solanaWeb3.PublicKey(publicKeyStr);
  const lamports = amountSOL * solanaWeb3.LAMPORTS_PER_SOL;

  logger.info(`Solicitando airdrop de ${amountSOL} SOL a ${publicKeyStr}`);
  const signature = await connection().requestAirdrop(publicKey, lamports);

  // Esperar confirmación
  await connection().confirmTransaction(signature, 'confirmed');
  logger.info(`Airdrop confirmado: ${signature}`);

  return {
    signature,
    address: publicKeyStr,
    amountSOL,
  };
}

/**
 * Obtiene las transacciones recientes de una dirección.
 * @param {string} publicKeyStr - Dirección pública en Base58
 * @param {number} limit - Número máximo de transacciones
 * @returns {Promise<Array>}
 */
async function getRecentTransactions(publicKeyStr, limit = 10) {
  const publicKey = new solanaWeb3.PublicKey(publicKeyStr);
  const signatures = await connection().getSignaturesForAddress(publicKey, {
    limit,
  });

  logger.debug(`Encontradas ${signatures.length} transacciones para ${publicKeyStr}`);

  return signatures.map((sig) => ({
    signature: sig.signature,
    slot: sig.slot,
    blockTime: sig.blockTime,
    status: sig.err ? 'failed' : 'success',
    memo: sig.memo,
  }));
}

module.exports = {
  connection,
  getBalance,
  getTransaction,
  getClusterInfo,
  requestAirdrop,
  getRecentTransactions,
};
