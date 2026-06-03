"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2, LogIn } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { sanitizeNextPath } from "@/lib/auth/redirects";

const errorMessages: Record<string, string> = {
  auth_not_configured: "Google sign-in is not configured for this environment.",
  oauth_cancelled: "Google sign-in was cancelled. Try again when you are ready.",
  oauth_exchange_failed: "Introbase could not finish Google sign-in.",
  signout_failed: "Introbase could not sign you out. Please try again.",
};

export function LoginForm() {
  const searchParams = useSearchParams();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const supabase = createSupabaseBrowserClient();
  const nextPath = useMemo(
    () =>
      sanitizeNextPath(
        searchParams.get("next") ?? "/app/integrations?welcome=1",
      ),
    [searchParams],
  );
  const error = searchParams.get("error");

  async function signInWithGoogle() {
    if (!supabase) {
      toast.error(errorMessages.auth_not_configured);
      return;
    }

    setIsSubmitting(true);

    const redirectTo = new URL("/auth/callback", window.location.origin);
    redirectTo.searchParams.set("next", nextPath);

    const { error: signInError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: redirectTo.toString(),
        queryParams: {
          access_type: "online",
          prompt: "select_account",
        },
      },
    });

    if (signInError) {
      setIsSubmitting(false);
      toast.error(signInError.message);
    }
  }

  return (
    <div className="surface-card w-full max-w-md p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Sign in to Introbase
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Use Google to create your account and keep your board available across
          devices.
        </p>
      </div>

      {error ? (
        <div className="mt-5 rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {errorMessages[error] ?? "Introbase could not complete sign-in."}
        </div>
      ) : null}

      <Button
        className="mt-6 w-full"
        size="lg"
        onClick={signInWithGoogle}
        disabled={isSubmitting || !supabase}
      >
        {isSubmitting ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <LogIn className="size-4" />
        )}
        Continue with Google
      </Button>

      {!supabase ? (
        <p className="mt-4 text-sm leading-6 text-muted-foreground">
          Add Supabase environment variables locally to enable Google sign-in.
        </p>
      ) : null}

      <p className="mt-5 text-xs leading-5 text-muted-foreground">
        Gmail access is requested separately later. Signing in with Google does
        not give Introbase access to your inbox.
      </p>
    </div>
  );
}
