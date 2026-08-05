export const REPORT_PERMISSIONS: Record<string, { canCreate: boolean; canEdit: boolean; canView: boolean }> = {
  admin: { canCreate: true, canEdit: true, canView: true },
  uzman: { canCreate: true, canEdit: true, canView: true },
  yonetici: { canCreate: false, canEdit: true, canView: true },
  halk: { canCreate: false, canEdit: false, canView: true },
};

export const USER_PERMISSIONS: Record<string, { canManageUsers: boolean; canViewSettings: boolean }> = {
  admin: { canManageUsers: true, canViewSettings: true },
  uzman: { canManageUsers: false, canViewSettings: true },
  yonetici: { canManageUsers: false, canViewSettings: true },
  halk: { canManageUsers: false, canViewSettings: false },
};
