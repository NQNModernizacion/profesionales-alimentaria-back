import {
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import Redis from 'ioredis';
import { IS_PUBLIC_KEY } from './public.decorator';
import { REDIS_CLIENT } from '../../redis/redis.constants';
import { JwtPayload } from '../auth.types';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(
    private readonly reflector: Reflector,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) return true;

    // Let Passport validate the JWT
    const canActivate = await super.canActivate(context);
    if (!canActivate) return false;

    // Check jti blacklist
    const request = context.switchToHttp().getRequest<{ user?: JwtPayload }>();
    const user = request.user;

    if (user?.jti) {
      const blacklisted = await this.redis.get(`jti:${user.jti}`);
      if (blacklisted) {
        throw new UnauthorizedException('Token ha sido revocado');
      }
    }

    return true;
  }

  handleRequest<TUser = JwtPayload>(
    err: Error | null,
    user: TUser | false,
  ): TUser {
    if (err || !user) {
      throw err ?? new UnauthorizedException('No autorizado');
    }
    return user;
  }
}
