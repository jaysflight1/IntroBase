import type { JSX } from "react";
import Link from "next/link";

import { cn } from "@/lib/utils";

interface LogoLinkProps {
  className?: string;
}

export function LogoLink({ className }: LogoLinkProps): JSX.Element {
  return (
    <Link
      href="/"
      className={cn(
        "text-lg font-semibold tracking-tight text-foreground transition-opacity hover:opacity-80",
        className,
      )}
    >
      Introbase
    </Link>
  );
}
