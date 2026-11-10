"use server";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import sharp from "sharp";
import { requireSession } from "./auth";
import { canManage } from "./permissions";
import { getDb } from "./db";
import { auditLog } from "./db/schema";
import { errorMessage } from "./errors";

export async function uploadCampaignBanner(input: FormData) {
  try {
    const { user } = await requireSession();
    if (!canManage(user.role)) throw new Error("Sem permissão para enviar banners.");
    const file = input.get("banner");
    if (!(file instanceof File) || file.size === 0 || file.size > 5 * 1024 * 1024)
      throw new Error("Envie uma imagem de até 5 MB.");
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
      throw new Error("Use uma imagem JPG, PNG ou WebP.");
    const bytes = Buffer.from(await file.arrayBuffer());
    let image: Buffer;
    try {
      const source = sharp(bytes, { limitInputPixels: 20_000_000, animated: false });
      const metadata = await source.metadata();
      if (!metadata.format || !["jpeg", "png", "webp"].includes(metadata.format)) throw new Error("format");
      image = await source
        .rotate()
        .resize({ width: 1600, height: 1000, fit: "inside", withoutEnlargement: true })
        .webp({ quality: 85 })
        .toBuffer();
    } catch {
      throw new Error("Não foi possível ler a imagem. Use um JPG, PNG ou WebP válido.");
    }
    const id = randomUUID();
    const directory = resolve(".local/uploads/banners");
    await mkdir(directory, { recursive: true });
    await writeFile(resolve(directory, `${id}.webp`), image, { flag: "wx" });
    await getDb().insert(auditLog).values({ action: "banner de campanha enviado", entityId: id, modifiedBy: user.id });
    return { ok: true as const, url: `/media/banners/${id}` };
  } catch (error) {
    return { ok: false as const, error: errorMessage(error) };
  }
}
