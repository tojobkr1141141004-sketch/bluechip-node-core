import { NextRequest, NextResponse } from "next/server";
import { createWebServerSupabaseClient } from "@/lib/supabase/server";

const OTP_TYPES = ["email", "recovery", "invite", "email_change"] as const;
type AllowedOtpType = (typeof OTP_TYPES)[number];

export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type");

  if (tokenHash && type && OTP_TYPES.includes(type as AllowedOtpType)) {
    const supabase = await createWebServerSupabaseClient();
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as AllowedOtpType
    });

    if (!error) {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  return NextResponse.redirect(new URL("/login?error=confirmation", request.url));
}
