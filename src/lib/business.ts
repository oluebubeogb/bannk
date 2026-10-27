import { prisma } from "./prisma";
import { HttpError } from "./api";

/** The signed-in user's business (one per owner in this MVP). */
export async function getOwnBusiness(userId: string) {
  return prisma.business.findFirst({ where: { ownerUserId: userId }, orderBy: { createdAt: "asc" } });
}

export async function requireApprovedBusiness(userId: string) {
  const b = await getOwnBusiness(userId);
  if (!b) throw new HttpError(404, "Submit your business profile first");
  if (b.verificationStatus !== "approved") throw new HttpError(403, "Your business is not approved yet");
  return b;
}
