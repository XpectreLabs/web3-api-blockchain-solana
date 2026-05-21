/**
 * Script para generar una wallet de Solana
 * Ejecutar: node generate-wallet.js
 */

const solanaWeb3 = require('@solana/web3.js');
const bs58 = require('bs58');

// Generar un nuevo par de claves
const keypair = solanaWeb3.Keypair.generate();

// Dirección pública (la que compartes)
const publicKey = keypair.publicKey.toBase58();

// Clave privada en Base58 (la que va en .env)
const privateKey = bs58.default.encode(keypair.secretKey);

console.log('============================================');
console.log('   NUEVA WALLET DE SOLANA GENERADA');
console.log('============================================');
console.log('');
console.log('Dirección pública (compartir):');
console.log(publicKey);
console.log('');
console.log('Clave privada Base58 (para .env):');
console.log(privateKey);
console.log('');
console.log('============================================');
console.log('IMPORTANTE:');
console.log('Copia la clave privada en tu .env:');
console.log('   SOLANA_PRIVATE_KEY=' + privateKey);
;
