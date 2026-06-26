import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { AdminPanelService } from './admin-panel.service';
import { SyncRolesDto } from './dto/sync-roles.dto';
import { SyncPermissionsDto } from './dto/sync-permissions.dto';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
@Roles('admin')
@ApiTags('admin')
@ApiBearerAuth('access-token')
@UseGuards(RolesGuard)
@Controller('admin')
export class AdminPanelController {
  constructor(private readonly service: AdminPanelService) {}

  /**
   * GET /admin/campaigns
   * Lista todas las campañas existentes en PostgreSQL.
   */
  @Get('campaigns')
  @ApiOperation({ summary: 'Listar todas las campañas' })
  @ApiOkResponse({ description: 'Listado de campañas' })
  @ApiForbiddenResponse({ description: 'Sin permiso de admin' })
  campaigns() {
    return this.service.campaigns();
  }

  /**
   * GET /admin/campaigns/:id
   * Obtiene una campaña por id sin filtrar por estado.
   */
  @Get('campaigns/:id')
  @ApiOperation({ summary: 'Obtener una campaña por id (admin)' })
  @ApiOkResponse({ description: 'Campaña encontrada' })
  @ApiForbiddenResponse({ description: 'Sin permiso de admin' })
  campaignById(@Param('id', ParseIntPipe) id: number) {
    return this.service.campaignById(id);
  }

  /**
   * GET /admin/bootstrap
   * Devuelve todos los roles y permisos disponibles en la aplicación.
   * Equivalente a AdminController@index en Laravel.
   */
  @Get('bootstrap')
  @ApiOperation({ summary: 'Obtener roles y permisos del sistema' })
  @ApiOkResponse({ description: 'Lista de roles y permisos' })
  @ApiForbiddenResponse({ description: 'Sin permiso de admin' })
  bootstrap() {
    return this.service.bootstrap();
  }

  /**
   * GET /admin/get_person_info/:dni
   * Información de persona por DNI (desde MySQL admin).
   */
  @Get('get_person_info/:dni')
  @ApiOperation({ summary: 'Obtener información de persona por DNI' })
  @ApiOkResponse({ description: 'Datos de la persona' })
  getPersonInfoByDni(@Param('dni') dni: string) {
    return this.service.getPersonInfoByDni(dni);
  }

  /**
   * GET /admin/user-by-dni/:dni
   * Busca persona + usuario con sus roles y permisos actuales.
   */
  @Get('user-by-dni/:dni')
  @ApiOperation({ summary: 'Obtener usuario con roles y permisos por DNI' })
  @ApiOkResponse({ description: 'Persona y usuario' })
  userByDni(@Param('dni') dni: string) {
    return this.service.userByDni(dni);
  }

  /**
   * POST /admin/users/:userId/sync-roles
   * Asigna roles a un usuario (agrega sin quitar los existentes).
   * Acepta role_ids[] o roles[] (nombres).
   */
  @Post('users/:userId/sync-roles')
  @ApiOperation({ summary: 'Asignar roles a un usuario' })
  @ApiOkResponse({ description: 'Roles actualizados' })
  @ApiUnprocessableEntityResponse({ description: 'Roles inválidos o ausentes' })
  syncRoles(
    @Param('userId', ParseIntPipe) userId: number,
    @Body() dto: SyncRolesDto,
  ) {
    return this.service.syncRoles(userId, dto);
  }

  /**
   * POST /admin/users/:userId/sync-permissions
   * Reemplaza los permisos directos del usuario.
   */
  @Post('users/:userId/sync-permissions')
  @ApiOperation({ summary: 'Sincronizar permisos directos de un usuario' })
  @ApiOkResponse({ description: 'Permisos actualizados' })
  syncUserPermissions(
    @Param('userId', ParseIntPipe) userId: number,
    @Body() dto: SyncPermissionsDto,
  ) {
    return this.service.syncUserPermissions(userId, dto);
  }

  /**
   * POST /admin/roles/:roleId/sync-permissions
   * Reemplaza los permisos de un rol.
   */
  @Post('roles/:roleId/sync-permissions')
  @ApiOperation({ summary: 'Sincronizar permisos de un rol' })
  @ApiOkResponse({ description: 'Permisos del rol actualizados' })
  syncRolePermissions(
    @Param('roleId', ParseIntPipe) roleId: number,
    @Body() dto: SyncPermissionsDto,
  ) {
    return this.service.syncRolePermissions(roleId, dto);
  }
}
