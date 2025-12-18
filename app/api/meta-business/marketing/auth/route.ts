import { NextResponse } from "next/server";
import { generateMarketingAuthUrl } from "@/lib/meta-business/marketing/auth";

/**
 * GET /api/meta-business/marketing/auth
 *
 * Initiates the Facebook Login for Business OAuth flow for Marketing API access.
 * Redirects the user to Facebook's authorization page.
 *
 * Query parameters:
 * - state (optional): A state parameter to maintain state between request and callback
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const state = searchParams.get("state") ?? undefined;

    const authUrl = generateMarketingAuthUrl(state);

    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error("Error initiating Marketing OAuth:", error);

    return NextResponse.json(
      { error: "Failed to initiate Facebook login. Please try again." },
      { status: 500 }
    );
  }
}
