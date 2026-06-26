import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CaslAbilityFactory } from './casl-ability.factory';
import { CHECK_ABILITY_KEY, RequiredAbility } from './check-ability.decorator';
import { JwtPayload } from '../auth.types';

@Injectable()
export class CaslAbilityGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly caslAbilityFactory: CaslAbilityFactory,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<
      RequiredAbility | undefined
    >(CHECK_ABILITY_KEY, [context.getHandler(), context.getClass()]);

    // No decorator → allow
    if (!required) return true;

    const request = context.switchToHttp().getRequest<{ user?: JwtPayload }>();
    const user = request.user;

    if (!user?.sub) {
      throw new ForbiddenException('Sin contexto de usuario');
    }

    const ability = await this.caslAbilityFactory.createForUser(user.sub);

    if (!ability.can(required.action, required.subject)) {
      throw new ForbiddenException(
        `No tienes permiso para ${required.action} en ${required.subject}`,
      );
    }

    return true;
  }
}
