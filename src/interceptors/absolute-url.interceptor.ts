import {
  Injectable,
  type CallHandler,
  type ExecutionContext,
  type NestInterceptor,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { map, type Observable } from 'rxjs';

/**
 * Rewrites relative `/uploads/…` paths in JSON responses to absolute URLs
 * using the API_BASE_URL environment variable.
 */
@Injectable()
export class AbsoluteUrlInterceptor implements NestInterceptor {
  private readonly baseUrl: string;

  constructor(configService: ConfigService) {
    const raw = configService.get<string>('API_BASE_URL', '');
    this.baseUrl = raw.replace(/\/+$/, '');
  }

  intercept(
    _context: ExecutionContext,
    next: CallHandler,
  ): Observable<unknown> {
    if (!this.baseUrl) return next.handle();

    return next.handle().pipe(map((data) => this.rewrite(data)));
  }

  private rewrite(value: unknown): unknown {
    if (typeof value === 'string') {
      return value.startsWith('/uploads/') ? `${this.baseUrl}${value}` : value;
    }

    if (Array.isArray(value)) {
      return value.map((item) => this.rewrite(item));
    }

    if (value instanceof Date) {
      return value;
    }

    if (value !== null && typeof value === 'object') {
      const result: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(
        value as Record<string, unknown>,
      )) {
        result[key] = this.rewrite(val);
      }
      return result;
    }

    return value;
  }
}
