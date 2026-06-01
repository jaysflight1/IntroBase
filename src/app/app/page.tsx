"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { STORAGE_KEYS } from "@/lib/storageKeys";

export default function AppIndexPage() {
  const router = useRouter();

  useEffect(() => {
    const hasAnalysis = Boolean(
      window.localStorage.getItem(STORAGE_KEYS.currentAnalysis),
    );

    router.replace(hasAnalysis ? "/app/board" : "/app/import");
  }, [router]);

  return (
    <div className="surface-card p-8 text-sm text-muted-foreground">
      Opening Introbase...
    </div>
  );
}
