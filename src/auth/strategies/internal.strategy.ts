import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AdminUser } from '../auth.types';
import { IAuthStrategy } from '../auth-strategy.interface';
import { AuthIdentityService } from '../services/auth-identity.service';

@Injectable()
export class InternalStrategy implements IAuthStrategy {
  constructor(private readonly authIdentity: AuthIdentityService) {}

  async authenticate(dto: { _id?: string }): Promise<AdminUser> {
    const id = dto._id;

    if (!id) {
      throw new UnauthorizedException('Se requiere _id (email o documento)');
    }

    if (this.authIdentity.isEmail(id)) {
      return this.authIdentity.authenticateByEmail(id);
    }

    return this.authIdentity.authenticateByDocumento(id);
  }
}
