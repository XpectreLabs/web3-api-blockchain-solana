import * as dotenv from 'dotenv';
import { BadRequestException } from '@nestjs/common';
import { SolanaAddressPipe } from './solana-address.pipe';

dotenv.config();

describe('SolanaAddressPipe', () => {
  const pipe = new SolanaAddressPipe();
  const WRAPPED_SOL_MINT = process.env.WRAPPED_SOL_MINT ?? '';

  it('returns a valid base58 Solana address unchanged', () => {
    expect(pipe.transform(WRAPPED_SOL_MINT)).toBe(WRAPPED_SOL_MINT);
  });

  it('rejects an empty value', () => {
    expect(() => pipe.transform('')).toThrow(BadRequestException);
  });

  it('rejects a too-short string', () => {
    expect(() => pipe.transform('abc')).toThrow(BadRequestException);
  });

  it('rejects a too-long string', () => {
    expect(() => pipe.transform('1'.repeat(50))).toThrow(BadRequestException);
  });

  it('rejects a string with non-base58 characters', () => {
    // length is in range but contains 0, O, I, l (not in the base58 alphabet)
    expect(() =>
      pipe.transform('0OIl0OIl0OIl0OIl0OIl0OIl0OIl0OIl0OIl'),
    ).toThrow(BadRequestException);
  });
});
