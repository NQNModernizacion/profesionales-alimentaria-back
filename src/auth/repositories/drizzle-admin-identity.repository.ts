import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE_ADMIN } from '../../admin-db/admin-db.constants';
import { type AdminDrizzleClient } from '../../admin-db/admin-db.client';
import {
  adminPersonas,
  adminUsuarios,
  adminUsers,
} from '../../admin-db/admin-db.schema';
import type { AdminIdentityRepository } from './admin-identity.repository';
import { withFederatedGuard } from './federated-errors';

@Injectable()
export class DrizzleAdminIdentityRepository implements AdminIdentityRepository {
  constructor(
    @Inject(DRIZZLE_ADMIN) private readonly adminDb: AdminDrizzleClient,
  ) {}

  findUserById(id: number) {
    return withFederatedGuard(() =>
      this.adminDb
        .select()
        .from(adminUsers)
        .where(eq(adminUsers.id, id))
        .limit(1)
        .then((rows) => rows[0] ?? null),
    );
  }

  findUserByEmail(email: string) {
    return withFederatedGuard(() =>
      this.adminDb
        .select()
        .from(adminUsers)
        .where(eq(adminUsers.email, email))
        .limit(1)
        .then((rows) => rows[0] ?? null),
    );
  }

  findPersonaByDocumento(documento: number) {
    return withFederatedGuard(() =>
      this.adminDb
        .select()
        .from(adminPersonas)
        .where(eq(adminPersonas.documento, documento))
        .limit(1)
        .then((rows) => rows[0] ?? null),
    );
  }

  findUsuarioByPersonaId(personaId: number) {
    return withFederatedGuard(() =>
      this.adminDb
        .select()
        .from(adminUsuarios)
        .where(eq(adminUsuarios.personaId, personaId))
        .limit(1)
        .then((rows) => rows[0] ?? null),
    );
  }

  findUsuarioByReferenciaId(referenciaId: number) {
    return withFederatedGuard(() =>
      this.adminDb
        .select()
        .from(adminUsuarios)
        .where(eq(adminUsuarios.referenciaId, referenciaId))
        .limit(1)
        .then((rows) => rows[0] ?? null),
    );
  }

  findPersonaById(id: number) {
    return withFederatedGuard(() =>
      this.adminDb
        .select()
        .from(adminPersonas)
        .where(eq(adminPersonas.id, id))
        .limit(1)
        .then((rows) => rows[0] ?? null),
    );
  }
}
