import { SolicitudesController } from './solicitudes.controller';
import type { JwtPayload } from '../auth/auth.types';
import type { SolicitudesService } from './solicitudes.service';
import type { CrearSolicitudDto } from './dto/crear-solicitud.dto';
import type { ActualizarSolicitudDto } from './dto/actualizar-solicitud.dto';

const user = { sub: 7 } as JwtPayload;

function build() {
  const service = {
    getMia: jest.fn(),
    crearBorrador: jest.fn(),
    actualizar: jest.fn(),
    enviar: jest.fn(),
  };
  const controller = new SolicitudesController(
    service as unknown as SolicitudesService,
  );
  return { controller, service };
}

describe('SolicitudesController', () => {
  it('getMia usa el sub del usuario autenticado', () => {
    const { controller, service } = build();
    void controller.getMia(user);
    expect(service.getMia).toHaveBeenCalledWith(7);
  });

  it('crear delega con sub + dto', () => {
    const { controller, service } = build();
    const dto = { nombre: 'Ana' } as unknown as CrearSolicitudDto;
    void controller.crear(user, dto);
    expect(service.crearBorrador).toHaveBeenCalledWith(7, dto);
  });

  it('actualizar delega con sub, id y dto', () => {
    const { controller, service } = build();
    const dto = { matricula: 'X' } as unknown as ActualizarSolicitudDto;
    void controller.actualizar(user, 5, dto);
    expect(service.actualizar).toHaveBeenCalledWith(7, 5, dto);
  });

  it('enviar delega con sub e id', () => {
    const { controller, service } = build();
    void controller.enviar(user, 5);
    expect(service.enviar).toHaveBeenCalledWith(7, 5);
  });
});
