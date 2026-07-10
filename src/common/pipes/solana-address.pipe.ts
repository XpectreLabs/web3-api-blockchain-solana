import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';
import { PublicKey } from '@solana/web3.js';

/**
 * Validates that a route/query param is a syntactically valid Solana address
 * (canonical base58 encoding of a 32-byte public key). Rejects anything else
 * with a clean 400 instead of letting `new PublicKey()` throw a raw error
 * deeper in the stack.
 *
 * Note: this only checks the address shape, not whether the account exists or
 * is an SPL mint — those are the service's responsibility (404 / BadRequest).
 */
@Injectable()
export class SolanaAddressPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    if (!value || typeof value !== 'string') {
      throw new BadRequestException('A Solana address is required');
    }

    // Solana addresses are 32-44 base58 chars; cheap pre-check before decoding.
    if (value.length < 32 || value.length > 44) {
      throw new BadRequestException(`Invalid Solana address: "${value}"`);
    }

    try {
      const key = new PublicKey(value);
      // Reject non-canonical input that PublicKey may decode leniently.
      if (key.toBase58() !== value) {
        throw new Error('non-canonical encoding');
      }
      return value;
    } catch {
      throw new BadRequestException(`Invalid Solana address: "${value}"`);
    }
  }
}
