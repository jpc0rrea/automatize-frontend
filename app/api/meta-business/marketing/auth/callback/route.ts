import { NextResponse } from "next/server";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { and, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { auth } from "@/app/(auth)/auth";
import { instagramAccount } from "@/lib/db/schema";
import {
  exchangeCodeForToken,
  getLongLivedToken,
  getUserProfile,
  subscribeToWebhooks,
  ALL_WEBHOOK_FIELDS,
} from "@/lib/meta-business/instagram";

// Initialize database connection
// biome-ignore lint: Forbidden non-null assertion.
const client = postgres(process.env.POSTGRES_URL!);
const db = drizzle(client);

/**
 * GET /api/instagram/auth/callback
 *
 * Handles the OAuth callback from Instagram after user authorization.
 * Exchanges the authorization code for an access token, retrieves user profile,
 * and stores the Instagram account in the database.
 *
 * Query parameters (from Instagram):
 * - code: The authorization code to exchange for an access token
 * - state (optional): The state parameter passed during authorization
 * - error: Error code if authorization failed
 * - error_reason: Reason for the error
 * - error_description: Human-readable description of the error
 */
export async function GET(request: Request) {
  console.log("TODELETE: /api/instagram/auth/callback GET - Request received");
  console.log("TODELETE: /api/instagram/auth/callback GET - URL:", request.url);

  try {
    const { searchParams } = new URL(request.url);

    // Check for errors from Instagram
    const error = searchParams.get("error");
    const errorReason = searchParams.get("error_reason");
    const errorDescription = searchParams.get("error_description");

    if (error) {
      console.log(
        "TODELETE: /api/instagram/auth/callback GET - Error from Instagram:",
        error
      );
      console.log(
        "TODELETE: /api/instagram/auth/callback GET - Error reason:",
        errorReason
      );
      console.log(
        "TODELETE: /api/instagram/auth/callback GET - Error description:",
        errorDescription
      );

      // Redirect to onboarding with error parameter
      const redirectUrl = new URL("/onboarding", request.url);
      redirectUrl.searchParams.set("instagram_error", "true");
      redirectUrl.searchParams.set(
        "error_message",
        errorDescription ?? errorReason ?? "Authorization failed"
      );

      return NextResponse.redirect(redirectUrl);
    }

    // Get the authorization code
    const code = searchParams.get("code");
    const state = searchParams.get("state");

    console.log(
      "TODELETE: /api/instagram/auth/callback GET - Code received:",
      code ? "Yes" : "No"
    );
    console.log("TODELETE: /api/instagram/auth/callback GET - State:", state);

    if (!code) {
      console.log(
        "TODELETE: /api/instagram/auth/callback GET - No authorization code received"
      );

      // Redirect to onboarding with error parameter
      const redirectUrl = new URL("/onboarding", request.url);
      redirectUrl.searchParams.set("instagram_error", "true");
      redirectUrl.searchParams.set(
        "error_message",
        "Authorization code is required"
      );

      return NextResponse.redirect(redirectUrl);
    }

    // Step 1: Exchange code for short-lived token
    console.log(
      "TODELETE: /api/instagram/auth/callback GET - Step 1: Exchanging code for token"
    );
    const {
      access_token: shortLivedToken,
      user_id: oldInstagramUserIdWEDONOTUSETHIS,
    } = await exchangeCodeForToken(code);

    console.log(
      "TODELETE: /api/instagram/auth/callback GET - Short-lived token obtained"
    );
    console.log(
      "TODELETE: /api/instagram/auth/callback GET - Instagram User ID:",
      oldInstagramUserIdWEDONOTUSETHIS
    );

    // Step 2: Exchange short-lived token for long-lived token
    console.log(
      "TODELETE: /api/instagram/auth/callback GET - Step 2: Getting long-lived token"
    );
    const { access_token: longLivedToken, expires_in } =
      await getLongLivedToken(shortLivedToken);

    console.log(
      "TODELETE: /api/instagram/auth/callback GET - Long-lived token obtained"
    );
    console.log(
      "TODELETE: /api/instagram/auth/callback GET - Token expires in:",
      expires_in,
      "seconds"
    );

    // Calculate token expiration date
    const tokenExpiresAt = new Date(Date.now() + expires_in * 1000);
    console.log(
      "TODELETE: /api/instagram/auth/callback GET - Token expires at:",
      tokenExpiresAt.toISOString()
    );

    // Step 3: Get user profile information
    console.log(
      "TODELETE: /api/instagram/auth/callback GET - Step 3: Fetching user profile"
    );
    const profile = await getUserProfile(longLivedToken);

    console.log("TODELETE: /api/instagram/auth/callback GET - Profile fetched");
    console.log(
      "TODELETE: /api/instagram/auth/callback GET - Username:",
      profile.username
    );

    // Step 4: Store/update the Instagram account in the database
    console.log(
      "TODELETE: /api/instagram/auth/callback GET - Step 4: Storing Instagram account in database"
    );

    // Get the authenticated user from the session
    const session = await auth();

    if (!session?.user?.id) {
      console.log(
        "TODELETE: /api/instagram/auth/callback GET - No authenticated user found"
      );

      // Redirect to login if not authenticated
      const redirectUrl = new URL("/login", request.url);
      return NextResponse.redirect(redirectUrl);
    }

    const userId = session.user.id;
    console.log(
      "TODELETE: /api/instagram/auth/callback GET - Authenticated user:",
      userId
    );

    // Upsert the Instagram account
    console.log(
      "TODELETE: /api/instagram/auth/callback GET - Upserting Instagram account for user:",
      userId
    );

    const instagramUserId = profile.id;

    // Check if account already exists
    const existingAccounts = await db
      .select()
      .from(instagramAccount)
      .where(
        and(
          eq(instagramAccount.userId, userId),
          eq(instagramAccount.accountId, instagramUserId)
        )
      )
      .limit(1);

    const existingAccountRecord = existingAccounts[0];

    let accountRecord;
    if (existingAccountRecord) {
      // Update existing account
      const updatedAccounts = await db
        .update(instagramAccount)
        .set({
          accessToken: longLivedToken,
          username: profile.username ?? null,
          name: profile.name ?? null,
          website: profile.website ?? null,
          biography: profile.biography ?? null,
          profilePictureUrl: profile.profile_picture_url ?? null,
          mediaCount: profile.media_count ?? null,
          tokenExpiresAt: tokenExpiresAt,
          updatedAt: new Date(),
          deletedAt: null, // Restore if was soft deleted
        })
        .where(eq(instagramAccount.id, existingAccountRecord.id))
        .returning();

      accountRecord = updatedAccounts[0];
    } else {
      // Create new account
      // Generate a unique ID using nanoid (similar to cuid)
      const accountId = nanoid();
      const createdAccounts = await db
        .insert(instagramAccount)
        .values({
          id: accountId,
          userId: userId,
          accountId: instagramUserId,
          username: profile.username ?? null,
          name: profile.name ?? null,
          website: profile.website ?? null,
          biography: profile.biography ?? null,
          profilePictureUrl: profile.profile_picture_url ?? null,
          mediaCount: profile.media_count ?? null,
          accessToken: longLivedToken,
          tokenExpiresAt: tokenExpiresAt,
        })
        .returning();

      accountRecord = createdAccounts[0];
    }

    const instagramAccountRecord = accountRecord;

    console.log(
      "TODELETE: /api/instagram/auth/callback GET - Instagram account saved:",
      instagramAccountRecord.id
    );

    // Step 5: Subscribe to webhooks
    console.log(
      "TODELETE: /api/instagram/auth/callback GET - Step 5: Subscribing to webhooks"
    );
    try {
      const subscribed = await subscribeToWebhooks(
        longLivedToken,
        profile.id,
        ALL_WEBHOOK_FIELDS
      );
      console.log(
        "TODELETE: /api/instagram/auth/callback GET - Webhook subscription result:",
        subscribed
      );
    } catch (webhookError) {
      console.error(
        "TODELETE: /api/instagram/auth/callback GET - Webhook subscription failed:",
        webhookError
      );
      // Don't fail the whole flow if webhook subscription fails
      // The user can retry later
    }

    console.log(
      "TODELETE: /api/instagram/auth/callback GET - OAuth flow completed successfully"
    );

    // Redirect to onboarding with success parameter
    const redirectUrl = new URL("/onboarding", request.url);
    redirectUrl.searchParams.set("instagram_connected", "true");
    redirectUrl.searchParams.set("username", profile.username ?? "");
    if (profile.name) {
      redirectUrl.searchParams.set("name", profile.name);
    }
    if (profile.website) {
      redirectUrl.searchParams.set("website", profile.website);
    }
    if (profile.profile_picture_url) {
      redirectUrl.searchParams.set(
        "profile_picture_url",
        profile.profile_picture_url
      );
    }

    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    console.error("TODELETE: /api/instagram/auth/callback GET - Error:", error);

    // Redirect to onboarding with error parameter
    const redirectUrl = new URL("/onboarding", request.url);
    redirectUrl.searchParams.set("instagram_error", "true");
    redirectUrl.searchParams.set(
      "error_message",
      error instanceof Error ? error.message : "Failed to connect Instagram"
    );

    return NextResponse.redirect(redirectUrl);
  }
}
