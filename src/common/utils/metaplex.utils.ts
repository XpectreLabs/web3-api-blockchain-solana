import { PublicKey } from '@solana/web3.js';

/**
 * Returns the Metaplex Token Metadata program PublicKey.
 * Read lazily from env at call time to avoid module-load race conditions
 * with dotenv (same pattern used for COMPUTE_BUDGET_PROGRAM_ID).
 */
export function getMetadataProgramId(): PublicKey {
  return new PublicKey(process.env.METADATA_PROGRAM_ID as string);
}

export interface TokenMetadata {
  name: string;
  symbol: string;
  uri: string;
  updateAuthority: string;
}

/**
 * Derive the Metadata PDA for a mint:
 *   seeds = ["metadata", metadataProgramId, mint]
 */
export function getMetadataPda(mint: PublicKey): PublicKey {
  const programId = getMetadataProgramId();
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from('metadata'), programId.toBuffer(), mint.toBuffer()],
    programId,
  );
  return pda;
}

/** Read a borsh-serialized string (u32 LE length prefix + utf8 bytes). */
function readBorshString(
  buffer: Buffer,
  offset: number,
): { value: string; next: number } {
  const len = buffer.readUInt32LE(offset);
  const start = offset + 4;
  const raw = buffer.subarray(start, start + len);
  // On-chain strings are fixed-capacity and zero-padded; strip the padding.
  const value = raw.toString('utf8').replace(/\0/g, '').trim();
  return { value, next: start + len };
}

/**
 * Decode the leading fields of a Metaplex Metadata account buffer.
 * Layout: key(1) + updateAuthority(32) + mint(32) + data{ name, symbol, uri, ... }.
 * We only need the first three strings, so the trailing fields are ignored.
 */
export function decodeMetadata(buffer: Buffer): TokenMetadata {
  let offset = 1; // skip account key/discriminator byte
  const updateAuthority = new PublicKey(
    buffer.subarray(offset, offset + 32),
  ).toBase58();
  offset += 32;
  offset += 32; // skip mint pubkey

  const name = readBorshString(buffer, offset);
  const symbol = readBorshString(buffer, name.next);
  const uri = readBorshString(buffer, symbol.next);

  return {
    name: name.value,
    symbol: symbol.value,
    uri: uri.value,
    updateAuthority,
  };
}
