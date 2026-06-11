import { NextResponse } from "next/server";

import { applyPriorityLabelsForPrimaryGmailAccount } from "@/lib/integrations/gmail/sync";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/server-auth";

function wantsHtml(request: Request) {
  return request.headers.get("accept")?.includes("text/html") ?? false;
}

function redirectToIntegrations(request: Request, status: string) {
  return NextResponse.redirect(
    new URL(`/app/integrations?gmail=${status}`, request.url),
    303,
  );
}

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    if (wantsHtml(request)) {
      return NextResponse.redirect(
        new URL("/login?next=/app/integrations", request.url),
        303,
      );
    }

    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();

  if (!supabase) {
    if (wantsHtml(request)) {
      return redirectToIntegrations(request, "storage_not_configured");
    }

    return NextResponse.json(
      { error: "Storage is not configured." },
      { status: 503 },
    );
  }

  try {
    const result = await applyPriorityLabelsForPrimaryGmailAccount(
      supabase,
      user.id,
    );

    if (!result) {
      if (wantsHtml(request)) {
        return redirectToIntegrations(request, "not_connected");
      }

      return NextResponse.json(
        { error: "Connect Gmail before applying labels." },
        { status: 400 },
      );
    }

    if (result.reconnectRequired) {
      if (wantsHtml(request)) {
        return redirectToIntegrations(request, "reconnect_required");
      }

      return NextResponse.json(
        { error: "Reconnect Gmail before applying labels." },
        { status: 409 },
      );
    }

    if (wantsHtml(request)) {
      return redirectToIntegrations(request, "labels_applied");
    }

    return NextResponse.json({ ok: true, ...result });
  } catch {
    if (wantsHtml(request)) {
      return redirectToIntegrations(request, "label_failed");
    }

    return NextResponse.json(
      { error: "Gmail priority labeling failed. Try reconnecting Gmail." },
      { status: 500 },
    );
  }
}
