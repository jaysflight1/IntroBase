"use client";

import type { JSX } from "react";
import Link from "next/link";
import { ArrowRight, PlayCircle } from "lucide-react";

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
      <div className="flex items-center gap-2">
        <Link
          href="/login"
          className={cn(buttonVariants({ variant: "ghost" }), "hidden sm:flex")}
          onClick={() =>
            void logEvent("clicked_cta", { cta: "continue_with_google" })
          }
        >
          Sign in
        </Link>
        <Link
          href="/app/import?sample=1"
          className={buttonVariants()}
          onClick={() =>
            void logEvent("clicked_cta", { cta: "view_sample_demo" })
          }
        >
          Try the demo
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <Link
        href="/login"
        className={cn(
          buttonVariants({ size: "lg" }),
          "gap-2",
          inverted &&
            "bg-background text-foreground hover:bg-background/90",
        )}
        onClick={() =>
          void logEvent("clicked_cta", { cta: "continue_with_google" })
        }
      >
        Get started with Google
        <ArrowRight className="size-4" />
      </Link>
      <Link
        href="/app/import?sample=1"
        className={cn(
          buttonVariants({ size: "lg", variant: "outline" }),
          "gap-2",
          inverted &&
            "border-background/30 bg-transparent text-background hover:bg-background/10 hover:text-background",
        )}
        onClick={() => void logEvent("clicked_cta", { cta: "view_sample_demo" })}
      >
        <PlayCircle className="size-4" />
        Try the sample inbox
      </Link>
    </div>
  );
}
