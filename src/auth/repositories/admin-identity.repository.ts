import type {
  AdminPersona,
  AdminUser as AdminUserRow,
  AdminUsuario,
} from '../../admin-db/admin-db.schema';

/**
 * Read-only access to MySQL `admin` identity tables (users, Usuarios, Personas).
 */
export interface AdminIdentityRepository {
  findUserById(id: number): Promise<AdminUserRow | null>;
  findUserByEmail(email: string): Promise<AdminUserRow | null>;
  findPersonaByDocumento(documento: number): Promise<AdminPersona | null>;
  findUsuarioByPersonaId(personaId: number): Promise<AdminUsuario | null>;
  findUsuarioByReferenciaId(referenciaId: number): Promise<AdminUsuario | null>;
  findPersonaById(id: number): Promise<AdminPersona | null>;
}
