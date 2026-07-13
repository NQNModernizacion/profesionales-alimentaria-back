import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';
import { DRIZZLE } from '../../db/db.constants';
import { type DrizzleClient } from '../../db/db.client';
import { solicitudes } from '../../db/schema';
import type {
  SolicitudData,
  SolicitudEstadoSlug,
  SolicitudRow,
  SolicitudesRepository,
} from './solicitudes.repository';

@Injectable()
export class DrizzleSolicitudesRepository implements SolicitudesRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleClient) {}

  findLatestByOwner(ownerId: number): Promise<SolicitudRow | null> {
    return this.db
      .select()
      .from(solicitudes)
      .where(eq(solicitudes.ownerId, ownerId))
      .orderBy(desc(solicitudes.createdAt))
      .limit(1)
      .then((rows) => (rows[0] as SolicitudRow) ?? null);
  }

  findByIdAndOwner(id: number, ownerId: number): Promise<SolicitudRow | null> {
    return this.db
      .select()
      .from(solicitudes)
      .where(and(eq(solicitudes.id, id), eq(solicitudes.ownerId, ownerId)))
      .limit(1)
      .then((rows) => (rows[0] as SolicitudRow) ?? null);
  }

  async create(ownerId: number, data: SolicitudData): Promise<SolicitudRow> {
    const [row] = await this.db
      .insert(solicitudes)
      .values({ ownerId, ...data })
      .returning();
    return row as SolicitudRow;
  }

  async update(id: number, data: SolicitudData): Promise<SolicitudRow> {
    const [row] = await this.db
      .update(solicitudes)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(solicitudes.id, id))
      .returning();
    return row as SolicitudRow;
  }

  async updateEstado(
    id: number,
    estado: SolicitudEstadoSlug,
  ): Promise<SolicitudRow> {
    const [row] = await this.db
      .update(solicitudes)
      .set({ estado, updatedAt: new Date() })
      .where(eq(solicitudes.id, id))
      .returning();
    return row as SolicitudRow;
  }
}
