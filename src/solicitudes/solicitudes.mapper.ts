import type {
  SolicitudEstadoSlug,
  SolicitudRow,
} from './repositories/solicitudes.repository';

/** slug (DB) → display (lo que consume el front en EstadoSolicitud). */
export const ESTADO_DISPLAY: Record<SolicitudEstadoSlug, string> = {
  borrador: 'Borrador',
  enviada: 'Enviada',
  en_revision: 'En revisión',
  aprobada: 'Aprobada',
  rechazada: 'Rechazada',
  publicada: 'Publicada',
  no_publicada: 'No publicada',
};

/**
 * Fila → DTO de respuesta con la forma que espera el front (Solicitud):
 * estado en display, documentos (vacío por ahora), timestamps ISO.
 */
export function rowToDto(row: SolicitudRow) {
  return {
    id: row.id,
    estado: ESTADO_DISPLAY[row.estado],
    nombre: row.nombre,
    apellido: row.apellido,
    dni: row.dni,
    cuit: row.cuit,
    fechaNacimiento: row.fechaNacimiento,
    domicilio: row.domicilio,
    email: row.email,
    telefono: row.telefono,
    tituloId: row.tituloId,
    matricula: row.matricula,
    matriculaVigente: row.matriculaVigente,
    areas: row.areas,
    areasOtros: row.areasOtros,
    aceptaDDJJ: row.aceptaDdjj,
    consientePublicacion: row.consientePublicacion,
    documentos: [] as unknown[],
    motivoRechazo: row.motivoRechazo ?? null,
    creadaEn: row.createdAt.toISOString(),
    actualizadaEn: row.updatedAt.toISOString(),
  };
}
