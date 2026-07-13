import { PartialType } from '@nestjs/swagger';
import { CrearSolicitudDto } from './crear-solicitud.dto';

/** Todos los campos opcionales — se persiste lo que venga (borrador incremental). */
export class ActualizarSolicitudDto extends PartialType(CrearSolicitudDto) {}
