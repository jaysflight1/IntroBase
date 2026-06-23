import type { JSX } from "react";
import Image from "next/image";
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
      <span className="flex size-7 shrink-0 items-center justify-center">
        <Image
          src="/ib-logo.png"
          alt=""
          width={326}
          height={330}
          className="size-7 object-contain"
          aria-hidden="true"
        />
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
