import { ServiceUnavailableException } from '@nestjs/common';

/** MySQL FEDERATED / connection error codes that signal the remote DB is unavailable */
const FEDERATED_ERROR_CODES = new Set([
  'ER_CONNECT_TO_FOREIGN_DATA_SOURCE',
  'ER_NO_SUCH_TABLE',
  'ECONNREFUSED',
  'ETIMEDOUT',
]);

export function isFederatedError(err: unknown): boolean {
  if (err && typeof err === 'object') {
    const code = (err as Record<string, unknown>)['code'];
    if (typeof code === 'string' && FEDERATED_ERROR_CODES.has(code))
      return true;
  }
  return false;
}

export function throwFederatedUnavailable(err: unknown): never {
  throw new ServiceUnavailableException(
    `El servicio de identidad remoto no está disponible. Detalle: ${(err as Error)?.message ?? err}`,
  );
}

export async function withFederatedGuard<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (isFederatedError(err)) throwFederatedUnavailable(err);
    throw err;
  }
}
