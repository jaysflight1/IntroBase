import type { ReactNode } from "react";

import { AppNav } from "@/components/AppNav";
import { VisitLogger } from "@/components/VisitLogger";
import { getCurrentUser } from "@/lib/supabase/server-auth";

export default async function ProductLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();

  return (
    <div className="min-h-screen bg-app-shell">
      <VisitLogger eventName="visited_app" />
      <AppNav userEmail={user?.email ?? null} />
      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">
        {children}
      </main>
    </div>
  );
}
