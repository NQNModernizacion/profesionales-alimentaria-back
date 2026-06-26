/**
 * Redis-backed JTI revocation list for JWT access/refresh tokens.
 */
export interface TokenRevocationRepository {
  isRevoked(jti: string): Promise<boolean>;
  /**
   * Marks `jti` as revoked until the token would have expired (remaining TTL).
   */
  revokeForRemainingTtl(
    jti: string,
    expUnixSeconds: number | undefined,
  ): Promise<void>;
}
