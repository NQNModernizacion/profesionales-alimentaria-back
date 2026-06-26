import { BadRequestException, Injectable } from '@nestjs/common';
import { AuthType } from '../auth.types';
import { IAuthStrategy } from '../auth-strategy.interface';
import { InternalStrategy } from './internal.strategy';
import { EnterAppStrategy } from './enter-app.strategy';
import { TokenRefreshStrategy } from './token-refresh.strategy';

@Injectable()
export class AuthStrategyResolver {
  constructor(
    private readonly internalStrategy: InternalStrategy,
    private readonly enterAppStrategy: EnterAppStrategy,
    private readonly tokenRefreshStrategy: TokenRefreshStrategy,
  ) {}

  resolve(type: AuthType): IAuthStrategy {
    switch (type) {
      case AuthType.INTERNAL:
        return this.internalStrategy;
      case AuthType.ENTER_APP:
        return this.enterAppStrategy;
      case AuthType.REFRESH_TOKEN:
      case AuthType.REFRESH_DATA:
      case AuthType.APP_LOGIN:
        return this.tokenRefreshStrategy;
      default:
        throw new BadRequestException('Tipo de autenticación no reconocido');
    }
  }
}
