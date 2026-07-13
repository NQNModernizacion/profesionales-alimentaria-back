import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { SOLICITUDES_REPOSITORY } from './solicitudes.tokens';
import {
  ESTADOS_EDITABLES,
  ESTADOS_NO_BLOQUEANTES,
  type SolicitudData,
  type SolicitudesRepository,
} from './repositories/solicitudes.repository';
import { rowToDto } from './solicitudes.mapper';
import type { CrearSolicitudDto } from './dto/crear-solicitud.dto';
import type { ActualizarSolicitudDto } from './dto/actualizar-solicitud.dto';

@Injectable()
export class SolicitudesService {
  constructor(
    @Inject(SOLICITUDES_REPOSITORY)
    private readonly repo: SolicitudesRepository,
  ) {}

  /** GET /solicitudes/mia — última solicitud del owner (o null). */
  async getMia(ownerId: number) {
    const row = await this.repo.findLatestByOwner(ownerId);
    return { data: row ? rowToDto(row) : null, error: null };
  }

  /** POST /solicitudes — crea el borrador si el owner no tiene una activa. */
  async crearBorrador(ownerId: number, dto: CrearSolicitudDto) {
    const latest = await this.repo.findLatestByOwner(ownerId);
    // Bloquea si hay una solicitud en curso; una rechazada SÍ permite crear nueva (§5.3).
    if (latest && !ESTADOS_NO_BLOQUEANTES.includes(latest.estado)) {
      throw new ConflictException({
        data: null,
        error: 'Ya tenés una solicitud en curso',
      });
    }

    const row = await this.repo.create(ownerId, toData(dto));
    return { data: rowToDto(row), error: null };
  }

  /** PUT /solicitudes/:id — actualiza un borrador editable del owner. */
  async actualizar(ownerId: number, id: number, dto: ActualizarSolicitudDto) {
    const row = await this.repo.findByIdAndOwner(id, ownerId);
    if (!row) {
      throw new NotFoundException({
        data: null,
        error: 'Solicitud no encontrada',
      });
    }
    if (!ESTADOS_EDITABLES.includes(row.estado)) {
      throw new ConflictException({
        data: null,
        error: 'La solicitud no se puede editar en su estado actual',
      });
    }

    // Merge parcial: parte de lo guardado y aplica solo lo que vino en el dto.
    const updated = await this.repo.update(id, {
      ...toData(row),
      ...toPartialData(dto),
    });
    return { data: rowToDto(updated), error: null };
  }

  /** POST /solicitudes/:id/enviar — Borrador → Enviada. */
  async enviar(ownerId: number, id: number) {
    const row = await this.repo.findByIdAndOwner(id, ownerId);
    if (!row) {
      throw new NotFoundException({
        data: null,
        error: 'Solicitud no encontrada',
      });
    }
    if (row.estado !== 'borrador') {
      throw new ConflictException({
        data: null,
        error: 'Solo se puede enviar una solicitud en borrador',
      });
    }
    if (!row.aceptaDdjj) {
      throw new UnprocessableEntityException({
        data: null,
        error: 'Debés aceptar la Declaración Jurada para enviar',
      });
    }
    // TODO(documentos §5.4): exigir documentación obligatoria completa antes de enviar.

    const updated = await this.repo.updateEstado(id, 'enviada');
    return { data: rowToDto(updated), error: null };
  }
}

type DataSource = Partial<SolicitudData> & { aceptaDDJJ?: boolean };

/** Normaliza a un payload de persistencia COMPLETO (crea / snapshot de fila). */
function toData(src: DataSource): SolicitudData {
  return {
    nombre: src.nombre ?? '',
    apellido: src.apellido ?? '',
    dni: src.dni ?? '',
    cuit: src.cuit ?? '',
    fechaNacimiento: src.fechaNacimiento ?? '',
    domicilio: src.domicilio ?? '',
    email: src.email ?? '',
    telefono: src.telefono ?? '',
    tituloId: src.tituloId ?? '',
    matricula: src.matricula ?? '',
    matriculaVigente: src.matriculaVigente ?? false,
    areas: src.areas ?? [],
    areasOtros: src.areasOtros ?? '',
    aceptaDdjj: src.aceptaDdjj ?? src.aceptaDDJJ ?? false,
    consientePublicacion: src.consientePublicacion ?? false,
  };
}

/** Solo los campos presentes (update parcial: no pisa lo no enviado). */
function toPartialData(src: DataSource): Partial<SolicitudData> {
  const out: Partial<SolicitudData> = {};
  const keys: (keyof SolicitudData)[] = [
    'nombre',
    'apellido',
    'dni',
    'cuit',
    'fechaNacimiento',
    'domicilio',
    'email',
    'telefono',
    'tituloId',
    'matricula',
    'matriculaVigente',
    'areas',
    'areasOtros',
    'consientePublicacion',
  ];
  for (const k of keys) {
    const value = src[k];
    if (value !== undefined) {
      (out as Record<string, unknown>)[k] = value;
    }
  }
  const ddjj = src.aceptaDdjj ?? src.aceptaDDJJ;
  if (ddjj !== undefined) out.aceptaDdjj = ddjj;
  return out;
}
