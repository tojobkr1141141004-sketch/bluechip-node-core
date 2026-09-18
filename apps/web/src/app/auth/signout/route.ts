import { NextRequest, NextResponse } from "next/server";
import { createWebServerSupabaseClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createWebServerSupabaseClient();
  const { data } = await supabase.auth.getClaims();

  if (data?.claims) {
    await supabase.auth.signOut();
  }

  return NextResponse.redirect(new URL("/login", request.url), { status: 303 });
}
