import { NextResponse } from "next/server";

import { generateAuthUrl } from "@/lib/meta-business/instagram";

/**
 * GET /api/instagram/auth
 *
 * Initiates the Instagram Business Login OAuth flow.
 * Redirects the user to Instagram's authorization page.
 *
 * Query parameters:
 * - state (optional): A state parameter to maintain state between request and callback
 */
export async function GET(request: Request) {
  console.log("TODELETE: /api/instagram/auth GET - Request received");
  console.log("TODELETE: /api/instagram/auth GET - URL:", request.url);

  try {
    const { searchParams } = new URL(request.url);
    const state = searchParams.get("state") ?? undefined;

    console.log("TODELETE: /api/instagram/auth GET - State parameter:", state);

    const authUrl = generateAuthUrl(state);

    console.log("TODELETE: /api/instagram/auth GET - Redirecting to Instagram");

    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error("TODELETE: /api/instagram/auth GET - Error:", error);

    return NextResponse.json(
      { error: "Failed to initiate Instagram login. Please try again." },
      { status: 500 }
    );
  }
}
