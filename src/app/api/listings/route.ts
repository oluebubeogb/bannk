import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { createListing } from "@/lib/discover";
import { isAdminUser } from "@/lib/admin";

const schema = z.object({
  listingType: z.enum(["product", "event"]),
  title: z.string().min(2).max(120),
  description: z.string().optional(),
  imageUrl: z.string().url().optional().or(z.literal("")),
  location: z.string().optional(),
  externalUrl: z.string().url().optional().or(z.literal("")),
  isSponsored: z.boolean().optional(),
  publish: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const data = schema.parse(body);
    const listing = await createListing({
      listingType: data.listingType,
      title: data.title,
      description: data.description,
      imageUrl: data.imageUrl || undefined,
      location: data.location,
      externalUrl: data.externalUrl || undefined,
      // Only admins can mark a listing sponsored (businesses go through /business + admin review)
      isSponsored: isAdminUser(user) ? data.isSponsored : false,
      publish: data.publish ?? true,
    });
    return NextResponse.json({ listing }, { status: 201 });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors }, { status: 400 });
    }
    console.error(err);
    return NextResponse.json({ error: "Failed to create listing" }, { status: 500 });
  }
}
