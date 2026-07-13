import {
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import type {
  AdminPersona,
  AdminUser as AdminUserRow,
} from '../../admin-db/admin-db.schema';
import { ADMIN_IDENTITY_REPOSITORY } from '../auth.tokens';
import type { AdminIdentityRepository } from '../repositories/admin-identity.repository';
import { AdminUser } from '../auth.types';

@Injectable()
export class AuthIdentityService {
  constructor(
    @Inject(ADMIN_IDENTITY_REPOSITORY)
    private readonly identity: AdminIdentityRepository,
  ) {}

  isEmail(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  async loadAdminUserById(
    userId: number,
    notFoundMessage = `No se encontró ningún usuario con el ID: ${userId}`,
  ): Promise<AdminUser> {
    const user = await this.identity.findUserById(userId);
    if (!user) {
      throw new NotFoundException(notFoundMessage);
    }
    const persona = await this.fetchPersonaForUser(user.id).catch(() => null);
    return this.mapUser(user, persona);
  }

  async authenticateByEmail(email: string): Promise<AdminUser> {
    const user = await this.identity.findUserByEmail(email);
    if (!user) {
      throw new NotFoundException('No se encontró un usuario con ese email.');
    }
    const persona = await this.fetchPersonaForUser(user.id).catch(() => null);
    return this.mapUser(user, persona);
  }

  async authenticateByDocumento(documentoRaw: string): Promise<AdminUser> {
    const documento = parseInt(documentoRaw, 10);
    if (isNaN(documento)) {
      throw new UnauthorizedException(
        'El valor de _id no es un email ni un documento válido.',
      );
    }

    const persona = await this.identity.findPersonaByDocumento(documento);
    if (!persona) {
      throw new NotFoundException(
        'No se encontró ninguna persona con ese documento.',
      );
    }

    const usuario = await this.identity.findUsuarioByPersonaId(persona.id);
    if (!usuario) {
      throw new NotFoundException('Usuario no vinculado a la persona');
    }

    const userId = usuario.referenciaId;
    const user = await this.identity.findUserById(userId);

    if (!user) {
      if (usuario.eClave) {
        return {
          id: userId,
          email: `documento_${documento}@local`,
          password: usuario.eClave,
          tokenWeblogin: null,
          persona: this.mapPersona(persona),
        };
      }
      throw new NotFoundException(
        `No se encontró ningún usuario con el ID: ${userId}`,
      );
    }

    return this.mapUser(user, this.mapPersona(persona));
  }

  private async fetchPersonaForUser(
    userId: number,
  ): Promise<AdminUser['persona'] | null> {
    const usuario = await this.identity.findUsuarioByReferenciaId(userId);
    if (!usuario?.personaId) return null;
    const persona = await this.identity.findPersonaById(usuario.personaId);
    if (!persona) return null;
    return this.mapPersona(persona);
  }

  private mapPersona(p: AdminPersona): AdminUser['persona'] {
    return {
      id: p.id,
      documento: p.documento,
      nombres: p.nombres,
      apellidos: p.apellidos,
      nombreCompleto: p.nombreCompleto,
      genero: p.genero,
      celular: p.celular,
      correoElectronico: p.correoElectronico,
      direccionCompleta: p.direccionCompleta,
      cuil: p.cuil,
      fechaNacimiento: p.fechaNacimiento
        ? p.fechaNacimiento instanceof Date
          ? p.fechaNacimiento.toISOString().slice(0, 10)
          : String(p.fechaNacimiento)
        : null,
    };
  }

  private mapUser(
    u: AdminUserRow,
    persona: AdminUser['persona'] | null,
  ): AdminUser {
    return {
      id: u.id,
      email: u.email,
      password: u.password,
      tokenWeblogin: u.tokenWeblogin,
      persona,
    };
  }
}
