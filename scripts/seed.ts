import "dotenv/config";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { getDb } from "../src/lib/db";
import { users, auditLog } from "../src/lib/db/schema";
import { registerSchema } from "../src/lib/validators";
import { hashPassword } from "../src/lib/security";
async function main() {
  const credentials = registerSchema.parse({
    name: "Administrador",
    email: process.env.ADMIN_EMAIL,
    password: process.env.ADMIN_PASSWORD,
  });
  const db = getDb();
  await db.transaction(async (tx) => {
    const [existing] = await tx.select({ id: users.id }).from(users).where(eq(users.email, credentials.email));
    if (existing) throw new Error("Conta já existe. Nenhuma alteração realizada.");
    const id = randomUUID();
    await tx
      .insert(users)
      .values({
        id,
        name: credentials.name,
        email: credentials.email,
        password: hashPassword(credentials.password),
        role: "super_admin",
        modifiedBy: id,
      });
    await tx.insert(auditLog).values({ action: "administrador inicial criado", entityId: id, modifiedBy: id });
  });
  console.log("Conta da equipe criada.");
}
main()
  .then(() => process.exit(0))
  .catch(() => {
    console.error(
      "Não foi possível criar a conta. Confira o banco, ADMIN_EMAIL e ADMIN_PASSWORD (mínimo 12 caracteres).",
    );
    process.exit(1);
  });
