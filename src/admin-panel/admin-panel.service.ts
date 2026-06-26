import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ADMIN_PANEL_REPOSITORY } from './admin-panel.tokens';
import type { AdminPanelRepository } from './repositories/admin-panel.repository';
import type { SyncRolesDto } from './dto/sync-roles.dto';
import type { SyncPermissionsDto } from './dto/sync-permissions.dto';

@Injectable()
export class AdminPanelService {
  constructor(
    @Inject(ADMIN_PANEL_REPOSITORY)
    private readonly repo: AdminPanelRepository,
  ) {}

  // ── GET /admin/bootstrap ──────────────────────────────────────────────────

  async campaigns() {
    return this.repo.getAllCampaigns();
  }

  async campaignById(id: number) {
    const campaign = await this.repo.getCampaignById(id);
    if (!campaign) {
      throw new NotFoundException({
        data: null,
        error: 'Campaña no encontrada',
      });
    }
    return campaign;
  }

  async bootstrap() {
    const [allRoles, allPermissions, allUsers] = await Promise.all([
      this.repo.getAllRoles(),
      this.repo.getAllPermissions(),
      // get all users with at least one role or permission
      this.repo.getAllUsersWithRolesOrPermissions(),
    ]);

    return {
      data: {
        roles: allRoles.map((r) => ({
          id: r.id,
          description: r.description ?? r.name,
          name: r.name,
        })),
        permissions: allPermissions.map((p) => ({
          id: p.id,
          name: p.name,
          description: p.description ?? p.name,
        })),
        users: allUsers.map((u) => ({
          id: u.id,
          email: u.email,
          roles: u.roles,
          permissions: u.permissions,
        })),
      },
      error: null,
    };
  }

  // ── GET /admin/get_person_info/:dni ───────────────────────────────────────

  async getPersonInfoByDni(dniRaw: string) {
    const dni = this.parseDni(dniRaw);

    const persona = await this.repo.findPersonaByDni(dni);
    if (!persona) {
      throw new NotFoundException({
        error: 'No se encontró persona con ese DNI',
        informacion: null,
      });
    }

    const usuarioId = await this.repo.findUsuarioIdByPersonaId(persona.id);

    return {
      error: null,
      informacion: {
        usuarioID: usuarioId ?? 0,
        documento: persona.documento,
        nombres: persona.nombres,
        apellidos: persona.apellidos,
        nombreCompleto: trim(
          `${persona.apellidos ?? ''}, ${persona.nombres ?? ''}`,
        ),
        correoElectronico: persona.correoElectronico ?? null,
        celular: persona.celular ?? null,
        genero: persona.genero,
        direccionCompleta: persona.direccionCompleta ?? null,
      },
    };
  }

  // ── GET /admin/user-by-dni/:dni ───────────────────────────────────────────

  async userByDni(dniRaw: string) {
    const dni = this.parseDni(dniRaw);

    const persona = await this.repo.findPersonaByDni(dni);
    if (!persona) {
      return {
        error: 'No se encontró persona',
        data: null,
      };
    }

    const personaBasic = {
      dni: persona.documento,
      nombres: persona.nombres,
      apellidos: persona.apellidos,
    };

    const userId = await this.repo.findUsuarioIdByPersonaId(persona.id);

    if (!userId) {
      return {
        error: 'La persona no tiene usuario en users',
        data: {
          persona: { ...personaBasic, user_id: 0 },
          user: null,
        },
      };
    }

    const user = await this.repo.findUserById(userId);

    if (!user) {
      return {
        error: 'ReferenciaID no existe en users',
        data: {
          persona: { ...personaBasic, user_id: userId },
          user: null,
        },
      };
    }

    const [userRoles, userPermissions] = await Promise.all([
      this.repo.getUserRoleNames(user.id),
      this.repo.getUserAllPermissionNames(user.id),
    ]);

    return {
      error: null,
      data: {
        persona: { ...personaBasic, user_id: user.id },
        user: {
          id: user.id,
          email: user.email,
          roles: userRoles,
          permissions: userPermissions,
        },
      },
    };
  }

  // ── POST /admin/users/:userId/sync-roles ──────────────────────────────────

  async syncRoles(userId: number, dto: SyncRolesDto) {
    if (Array.isArray(dto.role_ids)) {
      await this.repo.assignRolesByIds(userId, dto.role_ids);
    } else if (Array.isArray(dto.roles)) {
      await this.repo.assignRolesByNames(userId, dto.roles);
    } else {
      throw new UnprocessableEntityException({
        data: null,
        error: 'Enviar role_ids[] o roles[]',
      });
    }

    const [roleNames, permissionNames] = await Promise.all([
      this.repo.getUserRoleNames(userId),
      this.repo.getUserAllPermissionNames(userId),
    ]);

    if (!roleNames.length) {
      throw new UnprocessableEntityException({
        data: null,
        error: 'Roles inválidos',
      });
    }

    return {
      data: {
        user_id: userId,
        roles: roleNames,
        permissions: permissionNames,
      },
      error: null,
    };
  }

  // ── POST /admin/users/:userId/sync-permissions ────────────────────────────

  async syncUserPermissions(userId: number, dto: SyncPermissionsDto) {
    if (!Array.isArray(dto.permission_ids)) {
      throw new BadRequestException({
        data: null,
        error: 'permission_ids debe ser un array',
      });
    }

    await this.repo.syncUserPermissions(userId, dto.permission_ids);

    const permissionNames = await this.repo.getUserAllPermissionNames(userId);

    return {
      data: {
        user_id: userId,
        permissions: permissionNames,
      },
      error: null,
    };
  }

  // ── POST /admin/roles/:roleId/sync-permissions ────────────────────────────

  async syncRolePermissions(roleId: number, dto: SyncPermissionsDto) {
    if (!Array.isArray(dto.permission_ids)) {
      throw new BadRequestException({
        data: null,
        error: 'permission_ids debe ser un array',
      });
    }

    const role = await this.repo.findRoleById(roleId);
    if (!role) {
      throw new NotFoundException({ data: null, error: 'Rol no encontrado' });
    }

    await this.repo.syncRolePermissions(roleId, dto.permission_ids);

    const permissionNames = await this.repo.getRolePermissionNames(roleId);

    return {
      data: {
        role_id: roleId,
        permissions: permissionNames,
      },
      error: null,
    };
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private parseDni(raw: string): number {
    const clean = raw.replace(/\D+/g, '');
    if (!clean || clean.length < 7 || clean.length > 10) {
      throw new UnprocessableEntityException({
        error: 'DNI no válido',
        informacion: null,
        data: null,
      });
    }
    return parseInt(clean, 10);
  }
}

function trim(s: string): string {
  return s.trim();
}
