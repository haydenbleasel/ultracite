import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { api } from "../../../convex/_generated/api";
import { convexClient } from "@/lib/convex";
import { REFERRAL_COOKIE } from "@/lib/referral/constants";

const COOKIE_MAX_AGE = 30 * 24 * 60 * 60; // 30 days

export const GET = async (
  _request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) => {
  const { code } = await params;

  const referralCode = await convexClient.query(api.referralCodes.getByCode, {
    code,
  });

  if (!referralCode) {
    return NextResponse.redirect(new URL("/", _request.url));
  }

  const cookieStore = await cookies();
  cookieStore.set(REFERRAL_COOKIE, code, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });

  return NextResponse.redirect(new URL("/sign-in", _request.url));
};
