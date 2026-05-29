import type { ReactNode } from "react";

import { AppNav } from "@/components/AppNav";
import { VisitLogger } from "@/components/VisitLogger";

export default function ProductLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-50">
      <VisitLogger eventName="visited_app" />
      <AppNav />
      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">
        {children}
      </main>
    </div>
  );
}
