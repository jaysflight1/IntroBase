import type { ReactNode } from "react";

import { AppShell } from "@/components/AppShell";
import { VisitLogger } from "@/components/VisitLogger";
import { getCurrentUser } from "@/lib/supabase/server-auth";

export default async function ProductLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();

  return (
    <>
      <VisitLogger eventName="visited_app" />
      <AppShell userEmail={user?.email ?? null}>{children}</AppShell>
    </>
  );
}
