export const scopes = {
  visitor: ["me:read", "item:read", "item:update:conditiontrue"],
  editor: ["me:edit", "item:update:conditionfalse"],
  admin: ["me:read", "item:create", "item:update"]
};
