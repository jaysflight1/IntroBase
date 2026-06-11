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
    <div className="flex items-center justify-center py-24 text-sm text-muted-foreground">
      Opening Introbase...
    </div>
  );
}
