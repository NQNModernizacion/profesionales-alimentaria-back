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
      });

      const u = await service.authenticateByEmail('a@b.com');
      expect(u.id).toBe(1);
      expect(u.persona?.nombres).toBe('N');
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
