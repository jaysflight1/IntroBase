"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { readJson } from "@/lib/browserStorage";
import { STORAGE_KEYS } from "@/lib/storageKeys";
import type { AnalysisResult } from "@/types";

export function OnboardingGate() {
  const router = useRouter();

  useEffect(() => {
    const analysis = readJson<AnalysisResult | null>(
      STORAGE_KEYS.currentAnalysis,
      null,
    );

    if (analysis?.messageCount || analysis?.messages?.length) {
      router.replace("/app");
    }
  }, [router]);

  return null;
}
