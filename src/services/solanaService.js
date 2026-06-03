const solanaWeb3 = require('@solana/web3.js');
const { config } = require('../config/config');
const logger = require('../utils/logger');
const {
  inferTransactionType,
  extractAmountSOL,
  sortTransactions,
} = require('../utils/transactionUtils');

const MAX_TRANSACTION_LIMIT = 50;
const TYPE_FILTER_FETCH_MULTIPLIER = 3;

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



async function fetchRawTransaction(signature) {
  return connection().getTransaction(signature, {
    maxSupportedTransactionVersion: 0,
  });
}

function getAccountKeysBase58(tx) {
  if (tx.transaction.message.getAccountKeys) {
    return tx.transaction.message.getAccountKeys().staticAccountKeys.map((key) => key.toBase58());
  }
  return tx.transaction.message.accountKeys.map((key) => key.toBase58());
}

function mapTransactionSummary(signature, tx, walletAddress) {
  const fee = tx.meta?.fee ?? 0;

  return {
    signature,
    slot: tx.slot,
    blockTime: tx.blockTime,
    blockTimeISO: tx.blockTime ? new Date(tx.blockTime * 1000).toISOString() : null,
    fee,
    feeSOL: fee / solanaWeb3.LAMPORTS_PER_SOL,
    status: tx.meta?.err ? 'failed' : 'success',
    type: inferTransactionType(tx),
    amountSOL: extractAmountSOL(tx, walletAddress),
  };
}

/**
 * Obtiene el detalle completo de una transacción por su firma.
 * @param {string} signature - Firma de la transacción en Base58
 * @returns {Promise<object|null>}
 */
async function getTransactionDetail(signature) {
  const tx = await fetchRawTransaction(signature);

  if (!tx) {
    logger.warn(`Transacción no encontrada: ${signature}`);
    return null;
  }

  const accountKeys = getAccountKeysBase58(tx);

  const instructions = (
    tx.transaction.message.compiledInstructions
    || tx.transaction.message.instructions
    || []
  ).map((ix, index) => ({
    index,
    programIdIndex: ix.programIdIndex,
    accounts: ix.accountKeyIndexes || ix.accounts,
    dataLength: ix.data?.length ?? 0,
  }));

  const fee = tx.meta?.fee ?? 0;

  logger.debug(`Detalle de transacción obtenido: ${signature}`);

  return {
    signature,
    slot: tx.slot,
    blockTime: tx.blockTime,
    blockTimeISO: tx.blockTime ? new Date(tx.blockTime * 1000).toISOString() : null,
    fee,
    feeSOL: fee / solanaWeb3.LAMPORTS_PER_SOL,
    status: tx.meta?.err ? 'failed' : 'success',
    accounts: accountKeys,
    instructions,
    balanceChanges: accountKeys.map((address, index) => {
      const preBalance = tx.meta?.preBalances?.[index] ?? 0;
      const postBalance = tx.meta?.postBalances?.[index] ?? 0;
      const changeLamports = postBalance - preBalance;

      return {
        address,
        preBalance,
        postBalance,
        changeLamports,
        changeSOL: changeLamports / solanaWeb3.LAMPORTS_PER_SOL,
      };
    }),
    meta: {
      err: tx.meta?.err ?? null,
      logMessages: tx.meta?.logMessages ?? [],
      innerInstructions: tx.meta?.innerInstructions ?? [],
      computeUnitsConsumed: tx.meta?.computeUnitsConsumed ?? null,
    },
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

/**
 * Lista transacciones con filtrado, paginación y ordenamiento.
 */
async function queryTransactions({
  wallet,
  type,
  limit = 10,
  offset = 0,
  sortBy = 'timestamp',
  sortOrder = 'desc',
}) {
  const publicKey = new solanaWeb3.PublicKey(wallet);
  const safeLimit = Math.min(Math.max(Number(limit), 1), MAX_TRANSACTION_LIMIT);
  const safeOffset = Math.max(Number(offset), 0);

  const fetchCount = type
    ? Math.min((safeLimit + safeOffset) * TYPE_FILTER_FETCH_MULTIPLIER, 100)
    : safeLimit + safeOffset;

  const signatures = await connection().getSignaturesForAddress(publicKey, {
    limit: fetchCount,
  });

  const signatureList = signatures.map((sig) => sig.signature);
  const rawTxs = signatureList.length > 0
    ? await connection().getTransactions(signatureList, {
      maxSupportedTransactionVersion: 0,
    })
    : [];

  const transactions = [];

  for (let i = 0; i < signatures.length; i += 1) {
    const raw = rawTxs[i];
    if (!raw) {
      logger.warn(`No se pudo obtener transacción: ${signatures[i].signature}`);
      continue;
    }

    const summary = mapTransactionSummary(signatures[i].signature, raw, wallet);

    if (type && summary.type !== type) {
      continue;
    }

    transactions.push(summary);
  }

  const sorted = sortTransactions(transactions, sortBy, sortOrder);
  const paginated = sorted.slice(safeOffset, safeOffset + safeLimit);

  logger.debug(
    `queryTransactions wallet=${wallet} count=${paginated.length} type=${type || 'all'}`
  );

  return {
    wallet,
    pagination: {
      limit: safeLimit,
      offset: safeOffset,
      count: paginated.length,
      totalMatched: sorted.length,
    },
    filters: {
      type: type || null,
      sortBy,
      sortOrder,
    },
    transactions: paginated,
  };
}

module.exports = {
  connection,
  getBalance,
  getTransactionDetail,
  queryTransactions,
  getClusterInfo,
  getRecentTransactions,
  MAX_TRANSACTION_LIMIT,
};
