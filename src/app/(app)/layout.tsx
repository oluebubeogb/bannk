import { BottomNav } from "@/components/BottomNav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh pb-20 safe-top">
      <div className="max-w-lg mx-auto">{children}</div>
      <BottomNav />
    </div>
  );
}
