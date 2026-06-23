"use client";

import type { JSX } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { logEvent } from "@/lib/logEvent";
import { cn } from "@/lib/utils";

interface LandingActionsProps {
  compact?: boolean;
  inverted?: boolean;
}

export function LandingActions({
  compact = false,
  inverted = false,
}: LandingActionsProps): JSX.Element {
  if (compact) {
    return (
      <div className="flex items-center gap-3">
        <Link
          href="/login"
          className={buttonVariants()}
          onClick={() =>
            void logEvent("clicked_cta", { cta: "continue_with_google" })
          }
        >
          Sign in
        </Link>
        <Link
          href="/app/import?sample=1"
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            "hidden sm:inline-flex",
          )}
          onClick={() =>
            void logEvent("clicked_cta", { cta: "view_sample_demo" })
          }
        >
          Try demo
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3 sm:flex-row">
      <Link
        href="/login"
        className={cn(
          buttonVariants({ size: "lg" }),
          "gap-2",
        )}
        onClick={() =>
          void logEvent("clicked_cta", { cta: "continue_with_google" })
        }
      >
        Sign in
        <ArrowRight className="size-4" />
      </Link>
      <Link
        href="/app/import?sample=1"
        className={cn(
          buttonVariants({ variant: "outline", size: "lg" }),
          inverted &&
            "border-background/30 bg-transparent text-background hover:bg-background/10 hover:text-background",
        )}
        onClick={() => void logEvent("clicked_cta", { cta: "view_sample_demo" })}
      >
        Try demo
      </Link>
    </div>
  );
}
