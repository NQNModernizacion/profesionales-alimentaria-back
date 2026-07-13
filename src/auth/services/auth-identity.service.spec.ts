import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ADMIN_IDENTITY_REPOSITORY } from '../auth.tokens';
import { AuthIdentityService } from './auth-identity.service';

describe('AuthIdentityService', () => {
  const identity = {
    findUserById: jest.fn(),
    findUserByEmail: jest.fn(),
    findPersonaByDocumento: jest.fn(),
    findUsuarioByPersonaId: jest.fn(),
    findUsuarioByReferenciaId: jest.fn(),
    findPersonaById: jest.fn(),
  };

  let service: AuthIdentityService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthIdentityService,
        { provide: ADMIN_IDENTITY_REPOSITORY, useValue: identity },
      ],
    }).compile();

    service = module.get(AuthIdentityService);
  });

  describe('isEmail', () => {
    it('returns true for a typical email', () => {
      expect(service.isEmail('user@example.com')).toBe(true);
    });

    it('returns false for document-like id', () => {
      expect(service.isEmail('12345678')).toBe(false);
    });
  });

  describe('authenticateByEmail', () => {
    it('throws NotFoundException when user is missing', async () => {
      identity.findUserByEmail.mockResolvedValue(null);
      await expect(service.authenticateByEmail('nope@x.com')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('returns mapped user with persona when lookups succeed', async () => {
      identity.findUserByEmail.mockResolvedValue({
        id: 1,
        email: 'a@b.com',
        password: 'hash',
        tokenWeblogin: null,
      });
      identity.findUsuarioByReferenciaId.mockResolvedValue({ personaId: 10 });
      identity.findPersonaById.mockResolvedValue({
        id: 10,
        documento: 1,
        nombres: 'N',
        apellidos: 'A',
        nombreCompleto: null,
        genero: 'M',
        celular: null,
        correoElectronico: null,
        direccionCompleta: null,
        cuil: '20-12345678-9',
        fechaNacimiento: '1990-01-01',
      });

      const u = await service.authenticateByEmail('a@b.com');
      expect(u.id).toBe(1);
      expect(u.persona?.nombres).toBe('N');
      expect(u.persona?.cuil).toBe('20-12345678-9');
      expect(u.persona?.fechaNacimiento).toBe('1990-01-01');
    });

    it('coerces a Date to YYYY-MM-DD when Drizzle returns a Date', async () => {
      identity.findUserByEmail.mockResolvedValue({
        id: 2,
        email: 'c@d.com',
        password: 'hash',
        tokenWeblogin: null,
      });
      identity.findUsuarioByReferenciaId.mockResolvedValue({ personaId: 11 });
      identity.findPersonaById.mockResolvedValue({
        id: 11,
        documento: 2,
        nombres: 'C',
        apellidos: 'D',
        nombreCompleto: null,
        genero: 'M',
        celular: null,
        correoElectronico: null,
        direccionCompleta: null,
        cuil: '20-12345678-9',
        fechaNacimiento: new Date('1990-01-01T00:00:00Z'),
      });

      const u = await service.authenticateByEmail('c@d.com');
      expect(u.persona?.fechaNacimiento).toBe('1990-01-01');
    });
  });

  describe('authenticateByDocumento', () => {
    it('throws UnauthorizedException when value is not a number', async () => {
      await expect(service.authenticateByDocumento('abc')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('throws NotFoundException when persona is missing', async () => {
      identity.findPersonaByDocumento.mockResolvedValue(null);
      await expect(service.authenticateByDocumento('123')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('uses eClave synthetic user when users row missing but eClave exists', async () => {
      identity.findPersonaByDocumento.mockResolvedValue({
        id: 5,
        documento: 99,
        nombres: 'N',
        apellidos: 'A',
        nombreCompleto: null,
        genero: 'F',
        celular: null,
        correoElectronico: null,
        direccionCompleta: null,
        cuil: null,
        fechaNacimiento: null,
      });
      identity.findUsuarioByPersonaId.mockResolvedValue({
        referenciaId: 7,
        personaId: 5,
        eClave: 'plain',
      });
      identity.findUserById.mockResolvedValue(null);

      const u = await service.authenticateByDocumento('99');
      expect(u.id).toBe(7);
      expect(u.email).toBe('documento_99@local');
      expect(u.password).toBe('plain');
      expect(u.persona?.documento).toBe(99);
    });
  });

  describe('loadAdminUserById', () => {
    it('throws NotFoundException with default message', async () => {
      identity.findUserById.mockResolvedValue(null);
      await expect(service.loadAdminUserById(42)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('uses custom not found message when provided', async () => {
      identity.findUserById.mockResolvedValue(null);
      await expect(
        service.loadAdminUserById(3, 'Usuario con ID 3 no encontrado'),
      ).rejects.toThrow('Usuario con ID 3 no encontrado');
    });
  });
});
