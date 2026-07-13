import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  Put,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { type JwtPayload } from '../auth/auth.types';
import { SolicitudesService } from './solicitudes.service';
import { CrearSolicitudDto } from './dto/crear-solicitud.dto';
import { ActualizarSolicitudDto } from './dto/actualizar-solicitud.dto';

@ApiTags('solicitudes')
@ApiBearerAuth('access-token')
@Controller('solicitudes')
export class SolicitudesController {
  constructor(private readonly service: SolicitudesService) {}

  @Get('mia')
  @ApiOperation({ summary: 'Obtener la solicitud del profesional autenticado' })
  @ApiOkResponse({ description: 'Solicitud vigente o null' })
  getMia(@CurrentUser() user: JwtPayload) {
    return this.service.getMia(user.sub);
  }

  @Post()
  @ApiOperation({ summary: 'Crear el borrador de la solicitud' })
  @ApiOkResponse({ description: 'Borrador creado' })
  crear(@CurrentUser() user: JwtPayload, @Body() dto: CrearSolicitudDto) {
    return this.service.crearBorrador(user.sub, dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar un borrador editable' })
  @ApiOkResponse({ description: 'Solicitud actualizada' })
  actualizar(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ActualizarSolicitudDto,
  ) {
    return this.service.actualizar(user.sub, id, dto);
  }

  @Post(':id/enviar')
  @HttpCode(200)
  @ApiOperation({ summary: 'Presentar la solicitud (Borrador → Enviada)' })
  @ApiOkResponse({ description: 'Solicitud enviada' })
  enviar(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.service.enviar(user.sub, id);
  }
}
