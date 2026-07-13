import {
  ConflictException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { SolicitudesService } from './solicitudes.service';
import type {
  SolicitudRow,
  SolicitudesRepository,
} from './repositories/solicitudes.repository';
import type { CrearSolicitudDto } from './dto/crear-solicitud.dto';

const OWNER = 42;

function makeRow(overrides: Partial<SolicitudRow> = {}): SolicitudRow {
  return {
    id: 1,
    ownerId: OWNER,
    estado: 'borrador',
    nombre: 'Ana',
    apellido: 'Gómez',
    dni: '30111222',
    cuit: '27-30111222-4',
    fechaNacimiento: '1990-05-01',
    domicilio: 'Calle 1',
    email: 'ana@example.com',
    telefono: '2990000000',
    tituloId: 'bromatologia',
    matricula: 'MAT-123',
    matriculaVigente: true,
    areas: ['direccion_tecnica'],
    areasOtros: '',
    aceptaDdjj: false,
    consientePublicacion: false,
    motivoRechazo: null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  };
}

const dtoBase = { nombre: 'Ana' } as unknown as CrearSolicitudDto;

function buildService(repo: Partial<SolicitudesRepository>) {
  return new SolicitudesService(repo as SolicitudesRepository);
}

describe('SolicitudesService', () => {
  describe('getMia', () => {
    it('devuelve data null cuando el owner no tiene solicitud', async () => {
      const service = buildService({
        findLatestByOwner: jest.fn().mockResolvedValue(null),
      });
      const res = await service.getMia(OWNER);
      expect(res.data).toBeNull();
    });

    it('devuelve la solicitud con estado en display', async () => {
      const service = buildService({
        findLatestByOwner: jest.fn().mockResolvedValue(makeRow()),
      });
      const res = await service.getMia(OWNER);
      expect(res.data?.estado).toBe('Borrador');
      expect(res.data?.aceptaDDJJ).toBe(false);
    });
  });

  describe('crearBorrador', () => {
    it('rechaza (409) si ya existe una solicitud en curso', async () => {
      const service = buildService({
        findLatestByOwner: jest.fn().mockResolvedValue(makeRow()),
        create: jest.fn(),
      });
      await expect(
        service.crearBorrador(OWNER, dtoBase),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('crea el borrador si no hay ninguna', async () => {
      const create = jest.fn().mockResolvedValue(makeRow({ id: 9 }));
      const service = buildService({
        findLatestByOwner: jest.fn().mockResolvedValue(null),
        create,
      });
      const res = await service.crearBorrador(OWNER, dtoBase);
      expect(create).toHaveBeenCalledWith(OWNER, expect.any(Object));
      expect(res.data?.id).toBe(9);
    });

    it('permite crear una nueva si la última fue rechazada (§5.3)', async () => {
      const create = jest.fn().mockResolvedValue(makeRow({ id: 10 }));
      const service = buildService({
        findLatestByOwner: jest
          .fn()
          .mockResolvedValue(makeRow({ estado: 'rechazada' })),
        create,
      });
      const res = await service.crearBorrador(OWNER, dtoBase);
      expect(create).toHaveBeenCalled();
      expect(res.data?.id).toBe(10);
    });
  });

  describe('actualizar', () => {
    it('404 si la solicitud no es del owner', async () => {
      const service = buildService({
        findByIdAndOwner: jest.fn().mockResolvedValue(null),
      });
      await expect(service.actualizar(OWNER, 1, {})).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('409 si el estado no es editable', async () => {
      const service = buildService({
        findByIdAndOwner: jest
          .fn()
          .mockResolvedValue(makeRow({ estado: 'aprobada' })),
      });
      await expect(service.actualizar(OWNER, 1, {})).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('actualiza si el estado es editable', async () => {
      const update = jest
        .fn()
        .mockResolvedValue(makeRow({ matricula: 'MAT-999' }));
      const service = buildService({
        findByIdAndOwner: jest.fn().mockResolvedValue(makeRow()),
        update,
      });
      const res = await service.actualizar(OWNER, 1, {
        matricula: 'MAT-999',
      });
      expect(update).toHaveBeenCalled();
      expect(res.data?.matricula).toBe('MAT-999');
    });
  });

  describe('enviar', () => {
    it('404 si no es del owner', async () => {
      const service = buildService({
        findByIdAndOwner: jest.fn().mockResolvedValue(null),
      });
      await expect(service.enviar(OWNER, 1)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('409 si el estado no es borrador', async () => {
      const service = buildService({
        findByIdAndOwner: jest
          .fn()
          .mockResolvedValue(makeRow({ estado: 'enviada' })),
      });
      await expect(service.enviar(OWNER, 1)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('422 si no aceptó la DDJJ', async () => {
      const service = buildService({
        findByIdAndOwner: jest
          .fn()
          .mockResolvedValue(makeRow({ aceptaDdjj: false })),
      });
      await expect(service.enviar(OWNER, 1)).rejects.toBeInstanceOf(
        UnprocessableEntityException,
      );
    });

    it('transiciona a Enviada cuando es válido', async () => {
      const updateEstado = jest
        .fn()
        .mockResolvedValue(makeRow({ estado: 'enviada' }));
      const service = buildService({
        findByIdAndOwner: jest
          .fn()
          .mockResolvedValue(makeRow({ aceptaDdjj: true })),
        updateEstado,
      });
      const res = await service.enviar(OWNER, 1);
      expect(updateEstado).toHaveBeenCalledWith(1, 'enviada');
      expect(res.data?.estado).toBe('Enviada');
    });
  });
});
