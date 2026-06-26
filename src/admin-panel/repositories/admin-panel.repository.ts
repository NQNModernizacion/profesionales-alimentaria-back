export interface PermissionRow {
  id: number;
  name: string;
  description: string | null;
}

export interface RoleRow {
  id: number;
  name: string;
  description: string | null;
}

export interface PersonaInfo {
  usuarioID: number;
  documento: number;
  nombres: string | null;
  apellidos: string | null;
  nombreCompleto: string;
  correoElectronico: string | null;
  celular: string | null;
  genero: string;
  direccionCompleta: string | null;
}

export interface UserWithRolesAndPermissions {
  id: number;
  email: string;
  roles: string[];
  permissions: string[];
}

export interface CampaignAdminRow {
  id: number;
  title: string;
  description: string;
  bannerUrl: string | null;
  backgroundUrl: string | null;
  startsAt: Date;
  endsAt: Date;
  status: string;
  ownerId: number;
  requiredAuth: boolean;
  voterIdentityType: string;
  options: unknown[];
  createdAt: Date;
  updatedAt: Date;
}

export interface PersonaBasic {
  dni: number;
  nombres: string;
  apellidos: string;
  userId: number;
}

/**
 * Admin panel data access — mixes PostgreSQL (roles/permissions)
 * and MySQL admin (personas/usuarios/users).
 */
export interface AdminPanelRepository {
  // ── Bootstrap ────────────────────────────────────────────────────────────
  getAllRoles(): Promise<RoleRow[]>;
  getAllPermissions(): Promise<PermissionRow[]>;
  getAllUsersWithRolesOrPermissions(): Promise<UserWithRolesAndPermissions[]>;
  getAllCampaigns(): Promise<CampaignAdminRow[]>;
  getCampaignById(id: number): Promise<CampaignAdminRow | null>;

  // ── Persona lookup (MySQL admin) ─────────────────────────────────────────
  findPersonaByDni(dni: number): Promise<{
    id: number;
    documento: number;
    nombres: string;
    apellidos: string;
    nombreCompleto: string | null;
    correoElectronico: string | null;
    celular: string | null;
    genero: string;
    direccionCompleta: string | null;
  } | null>;

  findUsuarioIdByPersonaId(personaId: number): Promise<number | null>;

  findUserById(userId: number): Promise<{
    id: number;
    email: string;
  } | null>;

  // ── Roles for a user (PostgreSQL) ────────────────────────────────────────
  getUserRoleNames(userId: number): Promise<string[]>;

  /** All permission names reachable by the user (via roles + direct). */
  getUserAllPermissionNames(userId: number): Promise<string[]>;

  /**
   * Add roles to a user (insert-ignore, no removal of existing roles).
   * Accepts role IDs or role names.
   */
  assignRolesByIds(userId: number, roleIds: number[]): Promise<void>;
  assignRolesByNames(userId: number, roleNames: string[]): Promise<void>;

  /**
   * Replace all direct permissions of a user with the given set.
   */
  syncUserPermissions(userId: number, permissionIds: number[]): Promise<void>;

  /**
   * Replace all permissions of a role with the given set.
   */
  syncRolePermissions(roleId: number, permissionIds: number[]): Promise<void>;

  findRoleById(roleId: number): Promise<RoleRow | null>;

  /** Permission names directly assigned to a role. */
  getRolePermissionNames(roleId: number): Promise<string[]>;
}
