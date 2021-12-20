import dbInit, { ITestDb } from '../helpers/database-init';
import getLogger from '../../fixtures/no-logger';

// eslint-disable-next-line import/no-unresolved
import {
    AccessService,
    ALL_PROJECTS,
} from '../../../lib/services/access-service';

import * as permissions from '../../../lib/types/permissions';
import { RoleName } from '../../../lib/types/model';
import { IUnleashStores } from '../../../lib/types';

let db: ITestDb;
let stores: IUnleashStores;
let accessService;

let editorUser;
let superUser;
let editorRole;
let adminRole;
let readRole;

const createUserEditorAccess = async (name, email) => {
    const { userStore } = stores;
    const user = await userStore.insert({ name, email });
    await accessService.addUserToRole(user.id, editorRole.id, ALL_PROJECTS);
    return user;
};

const createSuperUser = async () => {
    const { userStore } = stores;
    const user = await userStore.insert({
        name: 'Alice Admin',
        email: 'admin@getunleash.io',
    });
    await accessService.addUserToRole(user.id, adminRole.id, ALL_PROJECTS);
    return user;
};

beforeAll(async () => {
    db = await dbInit('access_service_serial', getLogger);
    stores = db.stores;
    // projectStore = stores.projectStore;
    accessService = new AccessService(stores, { getLogger });
    const roles = await accessService.getRootRoles();
    editorRole = roles.find((r) => r.name === RoleName.EDITOR);
    adminRole = roles.find((r) => r.name === RoleName.ADMIN);
    readRole = roles.find((r) => r.name === RoleName.VIEWER);

    editorUser = await createUserEditorAccess('Bob Test', 'bob@getunleash.io');
    superUser = await createSuperUser();
});

afterAll(async () => {
    await db.destroy();
});

test('should have access to admin addons', async () => {
    const { CREATE_ADDON, UPDATE_ADDON, DELETE_ADDON } = permissions;
    const user = editorUser;
    expect(await accessService.hasPermission(user, CREATE_ADDON)).toBe(true);
    expect(await accessService.hasPermission(user, UPDATE_ADDON)).toBe(true);
    expect(await accessService.hasPermission(user, DELETE_ADDON)).toBe(true);
});

test('should have access to admin strategies', async () => {
    const { CREATE_STRATEGY, UPDATE_STRATEGY, DELETE_STRATEGY } = permissions;
    const user = editorUser;
    expect(await accessService.hasPermission(user, CREATE_STRATEGY)).toBe(true);
    expect(await accessService.hasPermission(user, UPDATE_STRATEGY)).toBe(true);
    expect(await accessService.hasPermission(user, DELETE_STRATEGY)).toBe(true);
});

test('should have access to admin contexts', async () => {
    const { CREATE_CONTEXT_FIELD, UPDATE_CONTEXT_FIELD, DELETE_CONTEXT_FIELD } =
        permissions;
    const user = editorUser;
    expect(await accessService.hasPermission(user, CREATE_CONTEXT_FIELD)).toBe(
        true,
    );
    expect(await accessService.hasPermission(user, UPDATE_CONTEXT_FIELD)).toBe(
        true,
    );
    expect(await accessService.hasPermission(user, DELETE_CONTEXT_FIELD)).toBe(
        true,
    );
});

test('should have access to create projects', async () => {
    const { CREATE_PROJECT } = permissions;
    const user = editorUser;
    expect(await accessService.hasPermission(user, CREATE_PROJECT)).toBe(true);
});

test('should have access to update applications', async () => {
    const { UPDATE_APPLICATION } = permissions;
    const user = editorUser;
    expect(await accessService.hasPermission(user, UPDATE_APPLICATION)).toBe(
        true,
    );
});

test('should not have admin permission', async () => {
    const { ADMIN } = permissions;
    const user = editorUser;
    expect(await accessService.hasPermission(user, ADMIN)).toBe(false);
});

test('should have project admin to default project', async () => {
    const {
        DELETE_PROJECT,
        UPDATE_PROJECT,
        CREATE_FEATURE,
        UPDATE_FEATURE,
        DELETE_FEATURE,
    } = permissions;
    const user = editorUser;
    expect(
        await accessService.hasPermission(user, DELETE_PROJECT, 'default'),
    ).toBe(true);
    expect(
        await accessService.hasPermission(user, UPDATE_PROJECT, 'default'),
    ).toBe(true);
    expect(
        await accessService.hasPermission(user, CREATE_FEATURE, 'default'),
    ).toBe(true);
    expect(
        await accessService.hasPermission(user, UPDATE_FEATURE, 'default'),
    ).toBe(true);
    expect(
        await accessService.hasPermission(user, DELETE_FEATURE, 'default'),
    ).toBe(true);
});

test('should grant member CREATE_FEATURE on all projects', async () => {
    const { CREATE_FEATURE } = permissions;
    const user = editorUser;

    await accessService.addPermissionToRole(
        editorRole.id,
        permissions.CREATE_FEATURE,
        ALL_PROJECTS,
    );

    expect(
        await accessService.hasPermission(user, CREATE_FEATURE, 'some-project'),
    ).toBe(true);
});

test('cannot add CREATE_FEATURE without defining project', async () => {
    await expect(async () => {
        await accessService.addPermissionToRole(
            editorRole.id,
            permissions.CREATE_FEATURE,
        );
    }).rejects.toThrow(
        new Error('ProjectId cannot be empty for permission=CREATE_FEATURE'),
    );
});

test('cannot remove CREATE_FEATURE without defining project', async () => {
    await expect(async () => {
        await accessService.removePermissionFromRole(
            editorRole.id,
            permissions.CREATE_FEATURE,
        );
    }).rejects.toThrow(
        new Error('ProjectId cannot be empty for permission=CREATE_FEATURE'),
    );
});

test('should remove CREATE_FEATURE on default environment', async () => {
    const { CREATE_FEATURE } = permissions;
    const user = editorUser;
    const editRole = await accessService.getRoleByName(RoleName.EDITOR);

    await accessService.addPermissionToRole(
        editRole.id,
        permissions.CREATE_FEATURE,
        'default',
    );

    await accessService.removePermissionFromRole(
        editRole.id,
        permissions.CREATE_FEATURE,
        'default',
    );

    expect(
        await accessService.hasPermission(user, CREATE_FEATURE, 'some-project'),
    ).toBe(false);
});

test('admin should be admin', async () => {
    const {
        DELETE_PROJECT,
        UPDATE_PROJECT,
        CREATE_FEATURE,
        UPDATE_FEATURE,
        DELETE_FEATURE,
        ADMIN,
    } = permissions;
    const user = superUser;
    expect(
        await accessService.hasPermission(user, DELETE_PROJECT, 'default'),
    ).toBe(true);
    expect(
        await accessService.hasPermission(user, UPDATE_PROJECT, 'default'),
    ).toBe(true);
    expect(
        await accessService.hasPermission(user, CREATE_FEATURE, 'default'),
    ).toBe(true);
    expect(
        await accessService.hasPermission(user, UPDATE_FEATURE, 'default'),
    ).toBe(true);
    expect(
        await accessService.hasPermission(user, DELETE_FEATURE, 'default'),
    ).toBe(true);
    expect(await accessService.hasPermission(user, ADMIN)).toBe(true);
});

test('should create default roles to project', async () => {
    const {
        DELETE_PROJECT,
        UPDATE_PROJECT,
        CREATE_FEATURE,
        UPDATE_FEATURE,
        DELETE_FEATURE,
    } = permissions;
    const project = 'some-project';
    const user = editorUser;
    await accessService.createDefaultProjectRoles(user, project);
    expect(
        await accessService.hasPermission(user, UPDATE_PROJECT, project),
    ).toBe(true);
    expect(
        await accessService.hasPermission(user, DELETE_PROJECT, project),
    ).toBe(true);
    expect(
        await accessService.hasPermission(user, CREATE_FEATURE, project),
    ).toBe(true);
    expect(
        await accessService.hasPermission(user, UPDATE_FEATURE, project),
    ).toBe(true);
    expect(
        await accessService.hasPermission(user, DELETE_FEATURE, project),
    ).toBe(true);
});

test('should require name when create default roles to project', async () => {
    await expect(async () => {
        await accessService.createDefaultProjectRoles(editorUser);
    }).rejects.toThrow(new Error('ProjectId cannot be empty'));
});

test('should grant user access to project', async () => {
    const {
        DELETE_PROJECT,
        UPDATE_PROJECT,
        CREATE_FEATURE,
        UPDATE_FEATURE,
        DELETE_FEATURE,
    } = permissions;
    const project = 'another-project';
    const user = editorUser;
    const sUser = await createUserEditorAccess(
        'Some Random',
        'random@getunleash.io',
    );
    await accessService.createDefaultProjectRoles(user, project);

    const projectRole = await accessService.getRoleByName(RoleName.MEMBER);
    await accessService.addUserToRole(sUser.id, projectRole.id, project);

    // Should be able to update feature toggles inside the project
    expect(
        await accessService.hasPermission(sUser, CREATE_FEATURE, project),
    ).toBe(true);
    expect(
        await accessService.hasPermission(sUser, UPDATE_FEATURE, project),
    ).toBe(true);
    expect(
        await accessService.hasPermission(sUser, DELETE_FEATURE, project),
    ).toBe(true);

    // Should not be able to admin the project itself.
    expect(
        await accessService.hasPermission(sUser, UPDATE_PROJECT, project),
    ).toBe(false);
    expect(
        await accessService.hasPermission(sUser, DELETE_PROJECT, project),
    ).toBe(false);
});

test('should not get access if not specifying project', async () => {
    const { CREATE_FEATURE, UPDATE_FEATURE, DELETE_FEATURE } = permissions;
    const project = 'another-project-2';
    const user = editorUser;
    const sUser = await createUserEditorAccess(
        'Some Random',
        'random22@getunleash.io',
    );
    await accessService.createDefaultProjectRoles(user, project);

    const projectRole = await accessService.getRoleByName(RoleName.MEMBER);

    await accessService.addUserToRole(sUser.id, projectRole.id, project);

    // Should not be able to update feature toggles outside project
    expect(await accessService.hasPermission(sUser, CREATE_FEATURE)).toBe(
        false,
    );
    expect(await accessService.hasPermission(sUser, UPDATE_FEATURE)).toBe(
        false,
    );
    expect(await accessService.hasPermission(sUser, DELETE_FEATURE)).toBe(
        false,
    );
});

test('should remove user from role', async () => {
    const { userStore } = stores;
    const user = await userStore.insert({
        name: 'Some User',
        email: 'random123@getunleash.io',
    });

    await accessService.addUserToRole(user.id, editorRole.id, 'default');

    // check user has one role
    const userRoles = await accessService.getRolesForUser(user.id);
    expect(userRoles.length).toBe(1);
    expect(userRoles[0].name).toBe(RoleName.EDITOR);

    await accessService.removeUserFromRole(user.id, editorRole.id, 'default');
    const userRolesAfterRemove = await accessService.getRolesForUser(user.id);
    expect(userRolesAfterRemove.length).toBe(0);
});

test('should return role with users', async () => {
    const { userStore } = stores;
    const user = await userStore.insert({
        name: 'Some User',
        email: 'random2223@getunleash.io',
    });

    await accessService.addUserToRole(user.id, editorRole.id, 'default');

    const roleWithUsers = await accessService.getRole(editorRole.id);

    expect(roleWithUsers.role.name).toBe(RoleName.EDITOR);
    expect(roleWithUsers.users.length > 2).toBe(true);
    expect(roleWithUsers.users.find((u) => u.id === user.id)).toBeTruthy();
    expect(
        roleWithUsers.users.find((u) => u.email === user.email),
    ).toBeTruthy();
});

test('should return role with permissions and users', async () => {
    const { userStore } = stores;
    const user = await userStore.insert({
        name: 'Some User',
        email: 'random2244@getunleash.io',
    });

    await accessService.addUserToRole(user.id, editorRole.id, 'default');

    const roleWithPermission = await accessService.getRoleData(editorRole.id);

    expect(roleWithPermission.role.name).toBe(RoleName.EDITOR);
    expect(roleWithPermission.permissions.length > 2).toBe(true);
    expect(
        roleWithPermission.permissions.find(
            (p) => p.name === permissions.CREATE_PROJECT,
        ),
    ).toBeTruthy();
    //This assert requires other tests to have run in this pack before length > 2 resolves to true
    // I've set this to be > 1, which allows us to run the test alone and should still satisfy the logic requirement
    expect(roleWithPermission.users.length > 1).toBe(true);
});

test('should set root role for user', async () => {
    const { userStore } = stores;
    const user = await userStore.insert({
        name: 'Some User',
        email: 'random2255@getunleash.io',
    });

    await accessService.setUserRootRole(user.id, editorRole.id);

    const roles = await accessService.getRolesForUser(user.id);
    roles.sort((x, y) => {
        return x.name.localeCompare(y.name);
    });

    //To have duplicated roles like this may not may not be a hack. Needs some thought
    expect(roles[0].name).toBe(RoleName.EDITOR);
    expect(roles[1].name).toBe(RoleName.VIEWER);
    expect(roles.length).toBe(2);
});

test('should switch root role for user', async () => {
    const { userStore } = stores;
    const user = await userStore.insert({
        name: 'Some User',
        email: 'random22Read@getunleash.io',
    });

    await accessService.setUserRootRole(user.id, editorRole.id);
    await accessService.setUserRootRole(user.id, readRole.id);

    const roles = await accessService.getRolesForUser(user.id);

    expect(roles.length).toBe(1);
    expect(roles[0].name).toBe(RoleName.VIEWER);
});

test('should not crash if user does not have permission', async () => {
    const { userStore } = stores;

    const user = await userStore.insert({
        name: 'Some User',
        email: 'random55Read@getunleash.io',
    });

    await accessService.setUserRootRole(user.id, readRole.id);

    const { UPDATE_CONTEXT_FIELD } = permissions;
    const hasAccess = await accessService.hasPermission(
        user,
        UPDATE_CONTEXT_FIELD,
    );

    expect(hasAccess).toBe(false);
});

test('should support permission with "ALL" environment requirement', async () => {
    const { userStore, roleStore, accessStore } = stores;

    const user = await userStore.insert({
        name: 'Some User',
        email: 'randomEnv1@getunleash.io',
    });

    await accessService.setUserRootRole(user.id, readRole.id);

    const customRole = await roleStore.create({
        name: 'Power user',
        roleType: 'custom',
        description: 'Grants access to modify all environments',
    });

    const { CREATE_FEATURE_STRATEGY } = permissions;
    await accessStore.addPermissionsToRole(
        customRole.id,
        [CREATE_FEATURE_STRATEGY],
        'production',
    );
    await accessStore.addUserToRole(user.id, customRole.id, ALL_PROJECTS);

    const hasAccess = await accessService.hasPermission(
        user,
        CREATE_FEATURE_STRATEGY,
        'default',
        'production',
    );

    expect(hasAccess).toBe(true);

    const hasNotAccess = await accessService.hasPermission(
        user,
        CREATE_FEATURE_STRATEGY,
        'default',
        'development',
    );
    expect(hasNotAccess).toBe(false);
});

test('Should have access to create a strategy in an environment', async () => {
    const { CREATE_FEATURE_STRATEGY } = permissions;
    const user = editorUser;
    expect(
        await accessService.hasPermission(
            user,
            CREATE_FEATURE_STRATEGY,
            'default',
            'development',
        ),
    ).toBe(true);
});

test('Should be denied access to create a strategy in an environment the user does not have access to', async () => {
    const { CREATE_FEATURE_STRATEGY } = permissions;
    const user = editorUser;
    expect(
        await accessService.hasPermission(
            user,
            CREATE_FEATURE_STRATEGY,
            'default',
            'noaccess',
        ),
    ).toBe(false);
});

test('Should have access to edit a strategy in an environment', async () => {
    const { UPDATE_FEATURE_STRATEGY } = permissions;
    const user = editorUser;
    expect(
        await accessService.hasPermission(
            user,
            UPDATE_FEATURE_STRATEGY,
            'default',
            'development',
        ),
    ).toBe(true);
});

test('Should be denied access to edit a strategy in an environment the user does not have access to', async () => {
    const { UPDATE_FEATURE_STRATEGY } = permissions;
    const user = editorUser;
    expect(
        await accessService.hasPermission(
            user,
            UPDATE_FEATURE_STRATEGY,
            'default',
            'noaccess',
        ),
    ).toBe(false);
});

test('Should have access to delete a strategy in an environment', async () => {
    const { DELETE_FEATURE_STRATEGY } = permissions;
    const user = editorUser;
    expect(
        await accessService.hasPermission(
            user,
            DELETE_FEATURE_STRATEGY,
            'default',
            'development',
        ),
    ).toBe(true);
});

test('Should be denied access to delete a strategy in an environment the user does not have access to', async () => {
    const { DELETE_FEATURE_STRATEGY } = permissions;
    const user = editorUser;
    expect(
        await accessService.hasPermission(
            user,
            DELETE_FEATURE_STRATEGY,
            'default',
            'noaccess',
        ),
    ).toBe(false);
});
