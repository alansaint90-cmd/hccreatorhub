import { randomBytes, scryptSync, timingSafeEqual, createHash } from "node:crypto";
export { canManage, isTeam, canFinance } from "./permissions";
export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}
export function verifyPassword(password: string, hash: string) {
  const [salt, key] = hash.split(":");
  if (!salt || !key || key.length !== 128) return false;
  return timingSafeEqual(Buffer.from(key, "hex"), scryptSync(password, salt, 64));
}
export function digest(token: string) {
  return createHash("sha256").update(token).digest("hex");
}
