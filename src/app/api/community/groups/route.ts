import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { handleError, requireVerifiedUser, requireUser, slugify, HttpError } from "@/lib/api";
import { createGroup, listGroups } from "@/lib/community";

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    const q = new URL(req.url).searchParams.get("q") || undefined;
    return NextResponse.json({ groups: await listGroups(user.id, q) });
  } catch (err) {
    return handleError(err);
  }
}

const schema = z.object({
  name: z.string().trim().min(3).max(60),
  description: z.string().trim().max(500).optional(),
  visibility: z.enum(["public", "private"]).default("public"),
});

export async function POST(req: NextRequest) {
  try {
    const user = await requireVerifiedUser();
    const data = schema.parse(await req.json());
    const slug = slugify(data.name);
    if (!slug) throw new HttpError(400, "Name needs letters or numbers");
    const group = await createGroup(user.id, { ...data, slug });
    return NextResponse.json({ group }, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}
