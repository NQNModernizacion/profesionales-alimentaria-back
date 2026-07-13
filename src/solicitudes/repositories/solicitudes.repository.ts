export type SolicitudEstadoSlug =
  | 'borrador'
  | 'enviada'
  | 'en_revision'
  | 'aprobada'
  | 'rechazada'
  | 'publicada'
  | 'no_publicada';

/** Fila persistida (estado en slug). */
export interface SolicitudRow {
  id: number;
  ownerId: number;
  estado: SolicitudEstadoSlug;
  nombre: string;
  apellido: string;
  dni: string;
  cuit: string;
  fechaNacimiento: string;
  domicilio: string;
  email: string;
  telefono: string;
  tituloId: string;
  matricula: string;
  matriculaVigente: boolean;
  areas: string[];
  areasOtros: string;
  aceptaDdjj: boolean;
  consientePublicacion: boolean;
  motivoRechazo: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Campos que el profesional carga/edita (payload de create/update). */
export interface SolicitudData {
  nombre: string;
  apellido: string;
  dni: string;
  cuit: string;
  fechaNacimiento: string;
  domicilio: string;
  email: string;
  telefono: string;
  tituloId: string;
  matricula: string;
  matriculaVigente: boolean;
  areas: string[];
  areasOtros: string;
  aceptaDdjj: boolean;
  consientePublicacion: boolean;
}

/** Estados que NO bloquean crear una nueva solicitud (REQUIREMENT §5.3). */
export const ESTADOS_NO_BLOQUEANTES: SolicitudEstadoSlug[] = ['rechazada'];

/** Estados en los que el profesional puede editar (REQUIREMENT §5.2). */
export const ESTADOS_EDITABLES: SolicitudEstadoSlug[] = ['borrador', 'enviada'];

/** Port de persistencia de solicitudes (PostgreSQL). */
export interface SolicitudesRepository {
  /** Última solicitud del owner en CUALQUIER estado (o null). */
  findLatestByOwner(ownerId: number): Promise<SolicitudRow | null>;
  findByIdAndOwner(id: number, ownerId: number): Promise<SolicitudRow | null>;
  create(ownerId: number, data: SolicitudData): Promise<SolicitudRow>;
  update(id: number, data: SolicitudData): Promise<SolicitudRow>;
  updateEstado(id: number, estado: SolicitudEstadoSlug): Promise<SolicitudRow>;
}
