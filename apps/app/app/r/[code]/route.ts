import { database } from "@repo/backend/database";
import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";

const REFERRAL_COOKIE = "ultracite_referral";
const COOKIE_MAX_AGE = 30 * 24 * 60 * 60; // 30 days

export const GET = async (
  _request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) => {
  const { code } = await params;

  // Validate code exists
  const referralCode = await database.referralCode.findUnique({
    where: { code },
  });

  if (!referralCode) {
    return NextResponse.redirect(new URL("/", _request.url));
  }

  // Set referral cookie
  const cookieStore = await cookies();
  cookieStore.set(REFERRAL_COOKIE, code, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });

  return NextResponse.redirect(new URL("/auth/login", _request.url));
};
