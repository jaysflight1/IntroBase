import type { ReactNode } from "react";

import { AppShell } from "@/components/AppShell";
import { VisitLogger } from "@/components/VisitLogger";

export default function DemoLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <VisitLogger eventName="visited_app" />
      <AppShell variant="demo">{children}</AppShell>
    </>
  );
}
