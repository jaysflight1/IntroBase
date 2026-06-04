import { NextResponse } from "next/server";

import { getServerAnalysisForUser } from "@/lib/integrations/board";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/server-auth";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ messages: [], contacts: [], sourceTypes: [], categoryCounts: {}, messageCount: 0 });
  }

  const supabase = getSupabaseAdmin();

  if (!supabase) {
    return NextResponse.json({ messages: [], contacts: [], sourceTypes: [], categoryCounts: {}, messageCount: 0 });
  }

  const analysis = await getServerAnalysisForUser(supabase, user.id);

  return NextResponse.json(analysis);
}
