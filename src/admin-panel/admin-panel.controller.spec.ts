import { Test, TestingModule } from '@nestjs/testing';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AdminPanelController } from './admin-panel.controller';
import { AdminPanelService } from './admin-panel.service';

const campaignFixture = {
  id: 2,
  title: 'Campaña inactiva',
  description: 'Detalle para edición admin',
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

const mockAdminPanelService = {
  campaigns: jest.fn(),
  campaignById: jest.fn(),
  bootstrap: jest.fn(),
  getPersonInfoByDni: jest.fn(),
  userByDni: jest.fn(),
  syncRoles: jest.fn(),
  syncUserPermissions: jest.fn(),
  syncRolePermissions: jest.fn(),
};

describe('AdminPanelController', () => {
  let controller: AdminPanelController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminPanelController],
      providers: [
        {
          provide: AdminPanelService,
          useValue: mockAdminPanelService,
        },
      ],
    })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(AdminPanelController);
  });

  describe('campaignById', () => {
    it('retorna campaña por id delegando al servicio (happy path)', async () => {
      mockAdminPanelService.campaignById.mockResolvedValue(campaignFixture);

      const result = await controller.campaignById(2);

      expect(result).toEqual(campaignFixture);
      expect(mockAdminPanelService.campaignById).toHaveBeenCalledWith(2);
    });
  });
});
