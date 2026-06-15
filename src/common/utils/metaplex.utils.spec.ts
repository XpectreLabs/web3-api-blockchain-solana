import * as dotenv from 'dotenv';
import { PublicKey } from '@solana/web3.js';
import {
  getMetadataProgramId,
  decodeMetadata,
  getMetadataPda,
} from './metaplex.utils';

dotenv.config();

const WRAPPED_SOL_MINT = process.env.WRAPPED_SOL_MINT ?? '';

/** Build a borsh string: u32 LE length + utf8 bytes, optionally zero-padded. */
function borshString(value: string, capacity?: number): Buffer {
  const utf8 = Buffer.from(value, 'utf8');
  const len = capacity ?? utf8.length;
  const body = Buffer.alloc(len);
  utf8.copy(body);
  const prefix = Buffer.alloc(4);
  prefix.writeUInt32LE(len, 0);
  return Buffer.concat([prefix, body]);
}

function buildMetadataBuffer(opts: {
  updateAuthority: PublicKey;
  mint: PublicKey;
  name: string;
  symbol: string;
  uri: string;
}): Buffer {
  return Buffer.concat([
    Buffer.from([4]), // account key byte
    opts.updateAuthority.toBuffer(),
    opts.mint.toBuffer(),
    borshString(opts.name, 32), // fixed-capacity, zero-padded on chain
    borshString(opts.symbol, 10),
    borshString(opts.uri, 200),
  ]);
}

describe('metaplex.utils', () => {
  describe('getMetadataPda', () => {
    it('derives a PDA owned by the metadata program, deterministically', () => {
      const mint = new PublicKey(WRAPPED_SOL_MINT);
      const pda1 = getMetadataPda(mint);
      const pda2 = getMetadataPda(mint);
      expect(pda1.toBase58()).toBe(pda2.toBase58());
      expect(PublicKey.isOnCurve(pda1.toBuffer())).toBe(false); // PDAs are off-curve
    });

    it('produces different PDAs for different mints', () => {
      const a = getMetadataPda(
        new PublicKey(WRAPPED_SOL_MINT),
      );
      const b = getMetadataPda(getMetadataProgramId());
      expect(a.toBase58()).not.toBe(b.toBase58());
    });
  });

  describe('decodeMetadata', () => {
    it('decodes name/symbol/uri and strips zero padding', () => {
      const updateAuthority = new PublicKey(WRAPPED_SOL_MINT);
      const mint = getMetadataProgramId();
      const buffer = buildMetadataBuffer({
        updateAuthority,
        mint,
        name: 'My Token',
        symbol: 'MYT',
        uri: 'https://example.com/meta.json',
      });

      const decoded = decodeMetadata(buffer);
      expect(decoded.name).toBe('My Token');
      expect(decoded.symbol).toBe('MYT');
      expect(decoded.uri).toBe('https://example.com/meta.json');
      expect(decoded.updateAuthority).toBe(updateAuthority.toBase58());
    });
  });
});
