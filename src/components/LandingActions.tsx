"use client";

import type { JSX } from "react";
import Link from "next/link";
import { LogIn, PlayCircle } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { logEvent } from "@/lib/logEvent";
import { cn } from "@/lib/utils";

interface LandingActionsProps {
  compact?: boolean;
}

export function LandingActions({
  compact = false,
}: LandingActionsProps): JSX.Element {
  return (
    <div
      className={
        compact
          ? "hidden gap-2 sm:flex"
          : "flex flex-col gap-3 sm:flex-row"
      }
    >
      <Link
        href="/login"
        className={cn(buttonVariants({ size: "lg" }), "gap-2")}
        onClick={() =>
          void logEvent("clicked_cta", { cta: "continue_with_google" })
        }
      >
        Continue with Google
        <LogIn className="size-4" />
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
