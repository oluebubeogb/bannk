import { z } from "zod";
import { optionalDate } from "./api";

export const challengeSchema = z.object({
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().max(1000).optional().nullable(),
  kind: z.enum(["learning", "community", "sponsored"]).default("community"),
  status: z.enum(["draft", "active", "ended"]).default("draft"),
  rewardMinor: z.number().int().min(0).max(100_000_000).default(0),
  startsAt: optionalDate,
  endsAt: optionalDate,
  campaignId: z.string().trim().optional().nullable().or(z.literal("").transform(() => null)),
});
