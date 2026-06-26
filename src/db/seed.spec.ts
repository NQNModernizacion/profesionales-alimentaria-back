import { runSeed } from './seed';
import { type DrizzleClient } from './db.client';
import { roles, rolePermissions, permissions } from './schema';

function makeInsertWithConflict(resolvedValue: unknown = undefined) {
  const chain = {
    values: jest.fn(),
    onConflictDoNothing: jest.fn(),
  };
  chain.onConflictDoNothing.mockResolvedValue(resolvedValue);
  chain.values.mockReturnValue(chain);
  return chain;
}

function makeSelectChain(result: unknown[]) {
  const chain: {
    from: jest.Mock;
    where: jest.Mock;
    then: (resolve: (v: unknown) => void) => void;
  } = {
    from: jest.fn(),
    where: jest.fn(),
    then: (resolve) => resolve(result),
  };
  chain.from.mockReturnValue(chain);
  chain.where.mockResolvedValue(result);
  return chain;
}

function buildDb(overrides: {
  roleSelectResult?: unknown[];
  permissionsSelectResult?: unknown[];
}) {
  const { roleSelectResult = [{ id: 42 }], permissionsSelectResult = [] } =
    overrides;

  const rolesInsertChain = makeInsertWithConflict();
  const permCatalogueInsertChain = makeInsertWithConflict();
  const rolePermissionsInsertChain = makeInsertWithConflict();
  const userRolesInsertChain = makeInsertWithConflict();

  const db = {
    insert: jest.fn().mockImplementation((table: unknown) => {
      if (table === roles) return rolesInsertChain;
      if (table === permissions) return permCatalogueInsertChain;
      if (table === rolePermissions) return rolePermissionsInsertChain;
      return userRolesInsertChain;
    }),
    select: jest.fn().mockImplementation(() => {
      const callCount = db.select.mock.calls.length;
      if (callCount === 1) return makeSelectChain(roleSelectResult);
      return makeSelectChain(permissionsSelectResult);
    }),
    _chains: {
      rolesInsertChain,
      permCatalogueInsertChain,
      rolePermissionsInsertChain,
      userRolesInsertChain,
    },
  };

  return db as unknown as DrizzleClient & { _chains: typeof db._chains };
}

describe('runSeed', () => {
  describe('First boot — fresh database', () => {
    it('calls db.insert 3 times (roles, permissions, user_roles)', async () => {
      const db = buildDb({});
      await runSeed(db);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(db.insert).toHaveBeenCalledTimes(3);
    });

    it('inserts exactly 5 permission seed rows', async () => {
      const db = buildDb({});
      await runSeed(db);
      const permCalls = db._chains.permCatalogueInsertChain.values.mock
        .calls as [unknown[]][];
      const permValues = permCalls[0][0];
      expect(permValues).toHaveLength(5);
    });

    it('inserts exactly 9 user_role rows', async () => {
      const db = buildDb({});
      await runSeed(db);
      const urCalls = db._chains.userRolesInsertChain.values.mock.calls as [
        unknown[],
      ][];
      const urValues = urCalls[0][0];
      expect(urValues).toHaveLength(9);
    });
  });

  describe('Idempotencia — onConflictDoNothing', () => {
    it('usa onConflictDoNothing para el insert de roles', async () => {
      const db = buildDb({});
      await runSeed(db);
      expect(
        db._chains.rolesInsertChain.onConflictDoNothing,
      ).toHaveBeenCalled();
    });

    it('usa onConflictDoNothing para el insert de user_roles', async () => {
      const db = buildDb({});
      await runSeed(db);
      expect(
        db._chains.userRolesInsertChain.onConflictDoNothing,
      ).toHaveBeenCalled();
    });

    it('inserta rolePermissions cuando existen permisos en la base', async () => {
      const db = buildDb({
        permissionsSelectResult: [{ id: 1 }, { id: 2 }],
      });
      await runSeed(db);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(db.insert).toHaveBeenCalledTimes(4);
      const rpValues = (
        db._chains.rolePermissionsInsertChain.values.mock.calls as [
          { roleId: number }[],
        ][]
      )[0][0];
      expect(rpValues).toHaveLength(2);
      expect(rpValues.every((r) => r.roleId === 42)).toBe(true);
    });

    it('omite el insert de rolePermissions cuando no hay permisos en la base', async () => {
      const db = buildDb({ permissionsSelectResult: [] });
      await runSeed(db);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(db.insert).toHaveBeenCalledTimes(3);
      expect(
        db._chains.rolePermissionsInsertChain.values,
      ).not.toHaveBeenCalled();
    });
  });

  describe('Error handling', () => {
    it('lanza Error cuando el rol admin no se encuentra después del insert', async () => {
      const db = buildDb({ roleSelectResult: [] });
      await expect(runSeed(db)).rejects.toThrow(
        'admin role not found after seed',
      );
    });
  });
});
