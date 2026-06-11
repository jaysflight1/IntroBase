import { Suspense } from "react";
import Link from "next/link";

import { LoginForm } from "@/app/login/LoginForm";
import { BrandMark } from "@/components/LogoLink";

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <BrandMark />
          <Link
            href="/"
            className="text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            Back home
          </Link>
        </div>
      </header>
      <main className="mx-auto flex min-h-[calc(100vh-65px)] max-w-6xl items-center justify-center px-4 py-12 sm:px-6">
        <Suspense
          fallback={
            <div className="surface-card w-full max-w-md p-8 text-sm text-muted-foreground">
              Loading sign-in...
            </div>
          }
        >
          <LoginForm />
        </Suspense>
      </main>
    </div>
  );
}
