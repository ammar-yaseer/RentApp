// Role-based access control (RBAC) helpers.
// Permissions are stored per-user (User.permissions) keyed by NavItem.key.
// Users without a `permissions` field (legacy / pre-RBAC) retain full access
// so existing localStorage data is not broken on upgrade.
import type { User, Profile, UserPermissions, ModulePermissions, PermissionAction } from '../types';
import { NAV_ITEMS } from '../components/nav';

export type { PermissionAction, ModulePermissions, UserPermissions };

/** Union type for any user-like object (User or Profile). */
type UserLike = User | Profile;

/** All module keys derived from the navigation config (single source of truth). */
export const ALL_MODULE_KEYS: string[] = NAV_ITEMS.map((n) => n.key);

/** A permissions map with every module set to all-false (used for new users). */
export function emptyPermissions(): UserPermissions {
  const obj: UserPermissions = {};
  for (const k of ALL_MODULE_KEYS) {
    obj[k] = { view: false, create: false, edit: false, delete: false };
  }
  return obj;
}

/** A permissions map with every module fully granted (used for seed admin). */
export function fullPermissions(): UserPermissions {
  const obj: UserPermissions = {};
  for (const k of ALL_MODULE_KEYS) {
    obj[k] = { view: true, create: true, edit: true, delete: true };
  }
  return obj;
}

/** Normalize a partial permissions map so every module key is present. */
export function normalizePermissions(partial?: UserPermissions | null): UserPermissions {
  const base = emptyPermissions();
  if (!partial) return base;
  for (const k of ALL_MODULE_KEYS) {
    const p = partial[k];
    if (p) base[k] = { view: !!p.view, create: !!p.create, edit: !!p.edit, delete: !!p.delete };
  }
  return base;
}

/** Core permission check. */
export function can(
  user: UserLike | null | undefined,
  moduleKey: string,
  action: PermissionAction,
): boolean {
  if (!user || !user.active) return false;
  // Legacy users without an explicit permissions map keep full access (backward compat).
  if (!user.permissions) return true;
  const p = user.permissions[moduleKey];
  return !!p?.[action];
}

export function canView(user: UserLike | null | undefined, moduleKey: string): boolean {
  return can(user, moduleKey, 'view');
}

/** Navigation items visible to the user (view permission on the module). */
export function visibleNavItems(user: UserLike | null | undefined) {
  return NAV_ITEMS.filter((n) => canView(user, n.key));
}

export function hasAnyAccess(user: UserLike | null | undefined): boolean {
  return visibleNavItems(user).length > 0;
}
