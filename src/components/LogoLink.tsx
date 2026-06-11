import type { JSX } from "react";
import Link from "next/link";

import { cn } from "@/lib/utils";

interface LogoLinkProps {
  className?: string;
}

export function BrandMark({ className }: LogoLinkProps): JSX.Element {
  return (
    <Link
      href="/"
      className={cn(
        "flex items-center gap-2 transition-opacity hover:opacity-80",
        className,
      )}
    >
      <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
        In
      </span>
      <span className="text-[15px] font-semibold tracking-tight text-foreground">
        Introbase
      </span>
    </Link>
  );
}

export function LogoLink({ className }: LogoLinkProps): JSX.Element {
  return <BrandMark className={className} />;
}
