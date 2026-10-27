import { requirePageUser } from "@/lib/guards";

export const dynamic = "force-dynamic";

export default async function CommunityLayout({ children }: { children: React.ReactNode }) {
  await requirePageUser("/community");
  return <>{children}</>;
}
