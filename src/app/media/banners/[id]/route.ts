import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { z } from "zod";
import { getSession } from "@/lib/auth";
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!(await getSession())) return new Response("Entre para continuar.", { status: 401 });
    const id = z.uuid().parse((await params).id);
    const bytes = await readFile(resolve(".local/uploads/banners", `${id}.webp`));
    return new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": "private, max-age=3600",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("Imagem não encontrada.", { status: 404 });
  }
}
