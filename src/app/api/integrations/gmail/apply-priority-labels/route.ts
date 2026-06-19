import { NextResponse } from "next/server";

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

  if (wantsHtml(request)) {
    return redirectToIntegrations(request, "labels_disabled");
  }

  return NextResponse.json(
    {
      error:
        "Gmail labeling is disabled because IntroBase requests read-only Gmail access.",
    },
    { status: 410 },
  );
}
