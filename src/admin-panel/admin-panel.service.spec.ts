import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ADMIN_PANEL_REPOSITORY } from './admin-panel.tokens';
import { AdminPanelService } from './admin-panel.service';
import type { CampaignAdminRow } from './repositories/admin-panel.repository';

const campaignFixture: CampaignAdminRow = {
  id: 2,
  title: 'Campaña inactiva',
  description: 'Detalle para editar',
  bannerUrl: null,
  backgroundUrl: null,
  startsAt: new Date('2026-01-01T00:00:00.000Z'),
  endsAt: new Date('2026-12-31T00:00:00.000Z'),
  status: 'inactiva',
  ownerId: 1,
  requiredAuth: false,
  voterIdentityType: 'none',
  options: [],
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
};

const mockAdminPanelRepository = {
  getAllRoles: jest.fn(),
  getAllPermissions: jest.fn(),
  getAllUsersWithRolesOrPermissions: jest.fn(),
  getAllCampaigns: jest.fn(),
  getCampaignById: jest.fn(),
  findPersonaByDni: jest.fn(),
  findUsuarioIdByPersonaId: jest.fn(),
  findUserById: jest.fn(),
  getUserRoleNames: jest.fn(),
  getUserAllPermissionNames: jest.fn(),
  assignRolesByIds: jest.fn(),
  assignRolesByNames: jest.fn(),
  syncUserPermissions: jest.fn(),
  syncRolePermissions: jest.fn(),
  findRoleById: jest.fn(),
  getRolePermissionNames: jest.fn(),
};

describe('AdminPanelService', () => {
  let service: AdminPanelService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminPanelService,
        {
          provide: ADMIN_PANEL_REPOSITORY,
          useValue: mockAdminPanelRepository,
        },
      ],
    }).compile();

    service = module.get(AdminPanelService);
  });

  describe('campaignById', () => {
    it('retorna la campaña cuando existe (happy path)', async () => {
      mockAdminPanelRepository.getCampaignById.mockResolvedValue(
        campaignFixture,
      );

      const result = await service.campaignById(2);

      expect(result).toEqual(campaignFixture);
      expect(mockAdminPanelRepository.getCampaignById).toHaveBeenCalledWith(2);
    });

    it('lanza NotFoundException cuando no existe', async () => {
      mockAdminPanelRepository.getCampaignById.mockResolvedValue(null);

      await expect(service.campaignById(999)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(mockAdminPanelRepository.getCampaignById).toHaveBeenCalledWith(
        999,
      );
    });
  });
});
