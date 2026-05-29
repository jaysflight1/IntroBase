"use client";

import Link from "next/link";
import { ArrowRight, PlayCircle } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { logEvent } from "@/lib/logEvent";
import { cn } from "@/lib/utils";

export function LandingActions() {
  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <Link
        href="/app/import"
        className={cn(buttonVariants({ size: "lg" }), "gap-2")}
        onClick={() =>
          void logEvent("clicked_cta", { cta: "try_pasted_messages" })
        }
      >
        Try with pasted messages
        <ArrowRight className="size-4" />
      </Link>
      <Link
        href="/app/import?sample=1"
        className={cn(
          buttonVariants({ size: "lg", variant: "outline" }),
          "gap-2",
        )}
        onClick={() => void logEvent("clicked_cta", { cta: "view_sample_demo" })}
      >
        <PlayCircle className="size-4" />
        View sample demo
      </Link>
    </div>
  );
}
