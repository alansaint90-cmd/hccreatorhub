import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { links, partnerships, clicks, auditLog } from "@/lib/db/schema";
import { isPublicHttps } from "@/lib/validators";
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const id = z.uuid().parse((await params).id);
    const session = await getSession();
    if (!session) return NextResponse.redirect(new URL("/", request.url));
    const db = getDb();
    const [row] = await db
      .select({ link: links, creatorId: partnerships.creatorId, accepted: partnerships.accepted })
      .from(links)
      .innerJoin(partnerships, eq(links.partnershipId, partnerships.id))
      .where(and(eq(links.id, id), eq(links.isDeleted, false), eq(partnerships.isDeleted, false)));
    if (!row || !row.accepted || (session.user.role === "creator" && row.creatorId !== session.user.id))
      return new NextResponse("Link não disponível.", { status: 403 });
    if (!isPublicHttps(row.link.destination)) return new NextResponse("Destino inválido.", { status: 400 });
    await db.transaction(async (tx) => {
      await tx.insert(clicks).values({ linkId: id, modifiedBy: session.user.id });
      await tx.insert(auditLog).values({ action: "link acessado", entityId: id, modifiedBy: session.user.id });
    });
    return new Response(null, {
      status: 302,
      headers: { Location: row.link.destination, "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" },
    });
  } catch {
    return new NextResponse("Não foi possível abrir este link.", { status: 400 });
  }
}
