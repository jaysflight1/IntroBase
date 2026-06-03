import { Suspense } from "react";
import Link from "next/link";

import { LoginForm } from "@/app/login/LoginForm";
import { LogoLink } from "@/components/LogoLink";

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-landing-shell">
      <header className="border-b border-border/60 bg-white/70 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-5 sm:px-6">
          <LogoLink />
          <Link
            href="/"
            className="text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            Back home
          </Link>
        </div>
      </header>
      <main className="mx-auto flex min-h-[calc(100vh-81px)] max-w-7xl items-center justify-center px-4 py-12 sm:px-6">
        <Suspense
          fallback={
            <div className="surface-card w-full max-w-md p-6 text-sm text-muted-foreground">
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
