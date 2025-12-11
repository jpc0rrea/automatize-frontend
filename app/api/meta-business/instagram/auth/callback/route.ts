import { NextResponse } from "next/server";

import {
  exchangeCodeForToken,
  getLongLivedToken,
  getUserProfile,
  subscribeToWebhooks,
  ALL_WEBHOOK_FIELDS,
} from "@/lib/meta-business/instagram";

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

      return NextResponse.json(
        {
          error: "Instagram authorization failed",
          error_code: error,
          error_reason: errorReason,
          error_description: errorDescription,
        },
        { status: 400 }
      );
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
      return NextResponse.json(
        { error: "Authorization code is required" },
        { status: 400 }
      );
    }

    // Step 1: Exchange code for short-lived token
    console.log(
      "TODELETE: /api/instagram/auth/callback GET - Step 1: Exchanging code for token"
    );
    const { access_token: shortLivedToken, user_id: instagramUserId } =
      await exchangeCodeForToken(code);

    console.log(
      "TODELETE: /api/instagram/auth/callback GET - Short-lived token obtained"
    );
    console.log(
      "TODELETE: /api/instagram/auth/callback GET - Instagram User ID:",
      instagramUserId
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
    const profile = await getUserProfile(longLivedToken, instagramUserId);

    console.log("TODELETE: /api/instagram/auth/callback GET - Profile fetched");
    console.log(
      "TODELETE: /api/instagram/auth/callback GET - Username:",
      profile.username
    );
    console.log(
      "TODELETE: /api/instagram/auth/callback GET - Account type:",
      profile.account_type
    );

    // Step 4: Store/update the Instagram account in the database
    // Note: For now, we'll create a temporary user if state doesn't contain user_id
    // In a real implementation, you'd get the user_id from the state or session
    console.log(
      "TODELETE: /api/instagram/auth/callback GET - Step 4: Storing Instagram account in database"
    );

    let userId = state; // Assuming state contains the user_id

    // If no user_id in state, try to find an existing user with this Instagram account
    // or create a placeholder user
    if (!userId) {
      console.log(
        "TODELETE: /api/instagram/auth/callback GET - No user_id in state, looking for existing account"
      );

      const existingAccount = await prisma.instagramAccount.findFirst({
        where: {
          account_id: instagramUserId,
          deleted_at: null,
        },
      });

      if (existingAccount) {
        userId = existingAccount.user_id;
        console.log(
          "TODELETE: /api/instagram/auth/callback GET - Found existing account for user:",
          userId
        );
      } else {
        // For demonstration, return the data without saving
        // In production, you'd handle user creation or require authentication
        console.log(
          "TODELETE: /api/instagram/auth/callback GET - No existing account found"
        );
        console.log(
          "TODELETE: /api/instagram/auth/callback GET - Returning data without saving (no user context)"
        );

        return NextResponse.json({
          success: true,
          message:
            "Instagram authorization successful. No user context available for storage.",
          instagram_account: {
            account_id: profile.id,
            username: profile.username,
            account_type: profile.account_type,
            media_count: profile.media_count,
          },
          token_expires_at: tokenExpiresAt.toISOString(),
          note: "Pass a user_id in the state parameter to store the account automatically.",
        });
      }
    }

    // Upsert the Instagram account
    console.log(
      "TODELETE: /api/instagram/auth/callback GET - Upserting Instagram account for user:",
      userId
    );

    const instagramAccount = await prisma.instagramAccount.upsert({
      where: {
        user_id_account_id: {
          user_id: userId,
          account_id: instagramUserId,
        },
      },
      update: {
        access_token: longLivedToken,
        username: profile.username,
        token_expires_at: tokenExpiresAt,
        updated_at: new Date(),
        deleted_at: null, // Restore if was soft deleted
      },
      create: {
        user_id: userId,
        account_id: instagramUserId,
        username: profile.username,
        access_token: longLivedToken,
        token_expires_at: tokenExpiresAt,
      },
    });

    console.log(
      "TODELETE: /api/instagram/auth/callback GET - Instagram account saved:",
      instagramAccount.id
    );

    // Step 5: Subscribe to webhooks
    console.log(
      "TODELETE: /api/instagram/auth/callback GET - Step 5: Subscribing to webhooks"
    );
    try {
      const subscribed = await subscribeToWebhooks(
        longLivedToken,
        instagramUserId,
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

    return NextResponse.json({
      success: true,
      message: "Instagram account connected successfully",
      instagram_account: {
        id: instagramAccount.id,
        account_id: instagramUserId,
        username: profile.username,
        account_type: profile.account_type,
        media_count: profile.media_count,
      },
      token_expires_at: tokenExpiresAt.toISOString(),
    });
  } catch (error) {
    console.error("TODELETE: /api/instagram/auth/callback GET - Error:", error);

    return NextResponse.json(
      {
        error: "Failed to complete Instagram authorization. Please try again.",
        details: error instanceof Error ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}
