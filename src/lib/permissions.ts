export type Role = "super_admin" | "admin" | "operador" | "visualizador" | "creator";
export function canManage(role: Role) {
  return ["super_admin", "admin", "operador"].includes(role);
}
export function isTeam(role: Role) {
  return role !== "creator";
}
export function canFinance(role: Role) {
  return role === "super_admin" || role === "admin";
}
