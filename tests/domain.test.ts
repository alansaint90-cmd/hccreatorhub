import { test } from "node:test";
import assert from "node:assert/strict";
import {
  isPublicHttps,
  companySchema,
  opportunitySchema,
  profileSchema,
  moneySchema,
  calendarDate,
} from "../src/lib/validators";
import { canManage, canFinance, isTeam } from "../src/lib/permissions";
import { hashPassword, verifyPassword } from "../src/lib/security";
test("permissões distinguem equipe, escrita operacional e financeiro", () => {
  assert.equal(canManage("creator"), false);
  assert.equal(canManage("visualizador"), false);
  assert.equal(canManage("operador"), true);
  assert.equal(canFinance("operador"), false);
  assert.equal(canFinance("admin"), true);
  assert.equal(canFinance("super_admin"), true);
  assert.equal(isTeam("creator"), false);
});
test("senhas usam salt independente e comparação segura", () => {
  const one = hashPassword("UmaSenhaForte2026!");
  const two = hashPassword("UmaSenhaForte2026!");
  assert.notEqual(one, two);
  assert.equal(verifyPassword("UmaSenhaForte2026!", one), true);
  assert.equal(verifyPassword("Errada", one), false);
  assert.equal(verifyPassword("x", "malformado"), false);
});
test("destino preservado e rejeição de esquemas, IPs, credenciais e hosts locais", () => {
  assert.equal(isPublicHttps("https://marca.com.br/produto?utm_source=creator&ref=a%2Fb"), true);
  for (const url of [
    "http://marca.com",
    "https://localhost",
    "https://127.0.0.1",
    "https://2130706433",
    "https://[::1]",
    "https://10.0.0.2",
    "https://a.local",
    "https://a.internal",
    "https://usuario:senha@marca.com",
    "javascript:alert(1)",
    "https://marca.com:8443",
  ])
    assert.equal(isPublicHttps(url), false, url);
});
test("validações rejeitam conteúdo inválido e dinheiro fracionário", () => {
  assert.equal(
    companySchema.safeParse({ name: "<script>", segment: "Moda", city: "São Paulo", contact: "Ana", stage: "Contrato" })
      .success,
    false,
  );
  for (const amount of [-1, 0.5, 2147483648]) assert.equal(moneySchema.safeParse(amount).success, false);
  assert.equal(moneySchema.parse("125050"), 125050);
  assert.equal(
    profileSchema.safeParse({
      city: "SP",
      niche: "Moda",
      instagram: "@ana",
      followers: "-1",
      engagement: "101",
      metricsDate: "hoje",
      portfolio: "",
    }).success,
    false,
  );
  assert.equal(opportunitySchema.safeParse({}).success, false);
  assert.equal(calendarDate.safeParse("2026-02-31").success, false);
  assert.equal(calendarDate.safeParse("2028-02-29").success, true);
});
