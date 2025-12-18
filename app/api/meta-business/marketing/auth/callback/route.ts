import { NextResponse } from "next/server";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { and, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { auth } from "@/app/(auth)/auth";
import { metaBusinessAccount, metaAdAccount } from "@/lib/db/schema";
import {
  exchangeCodeForToken,
  getLongLivedToken,
  getFacebookUserProfile,
  getAdAccounts,
} from "@/lib/meta-business/marketing/auth";

// Initialize database connection
// biome-ignore lint: Forbidden non-null assertion.
const client = postgres(process.env.POSTGRES_URL!);
const db = drizzle(client);

/**
 * GET /api/meta-business/marketing/auth/callback
 *
 * Handles the OAuth callback from Facebook after user authorization.
 * Exchanges the authorization code for an access token, retrieves user profile
 * and ad accounts, and stores them in the database.
 *
 * Query parameters (from Facebook):
 * - code: The authorization code to exchange for an access token
 * - state (optional): The state parameter passed during authorization
 * - error: Error code if authorization failed
 * - error_reason: Reason for the error
 * - error_description: Human-readable description of the error
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    // Check for errors from Facebook
    const error = searchParams.get("error");
    const errorReason = searchParams.get("error_reason");
    const errorDescription = searchParams.get("error_description");

    if (error) {
      console.error("Facebook OAuth error:", {
        error,
        errorReason,
        errorDescription,
      });

      // Redirect to marketing page with error parameter
      const redirectUrl = new URL("/marketing", request.url);
      redirectUrl.searchParams.set("auth_error", "true");
      redirectUrl.searchParams.set(
        "error_message",
        errorDescription ?? errorReason ?? "Authorization failed"
      );

      return NextResponse.redirect(redirectUrl);
    }

    // Get the authorization code
    const code = searchParams.get("code");

    if (!code) {
      console.error("No authorization code received from Facebook");

      const redirectUrl = new URL("/marketing", request.url);
      redirectUrl.searchParams.set("auth_error", "true");
      redirectUrl.searchParams.set(
        "error_message",
        "Authorization code is required"
      );

      return NextResponse.redirect(redirectUrl);
    }

    // Step 1: Exchange code for short-lived token
    const { access_token: shortLivedToken } = await exchangeCodeForToken(code);

    // Step 2: Exchange short-lived token for long-lived token
    const { access_token: longLivedToken, expires_in } =
      await getLongLivedToken(shortLivedToken);

    // Calculate token expiration date
    const tokenExpiresAt = new Date(Date.now() + expires_in * 1000);

    // Step 3: Get Facebook user profile
    const profile = await getFacebookUserProfile(longLivedToken);

    // Step 4: Get the authenticated user from the session
    const session = await auth();

    if (!session?.user?.id) {
      console.error("No authenticated user found in session");

      const redirectUrl = new URL("/login", request.url);
      return NextResponse.redirect(redirectUrl);
    }

    const userId = session.user.id;
    const facebookUserId = profile.id;

    // Step 5: Upsert the Meta Business Account
    const existingAccounts = await db
      .select()
      .from(metaBusinessAccount)
      .where(
        and(
          eq(metaBusinessAccount.userId, userId),
          eq(metaBusinessAccount.facebookUserId, facebookUserId)
        )
      )
      .limit(1);

    const existingAccountRecord = existingAccounts[0];
    let metaBusinessAccountRecord;

    // Get picture URL if available and not a silhouette
    const pictureUrl =
      profile.picture?.data?.url && !profile.picture.data.is_silhouette
        ? profile.picture.data.url
        : null;

    if (existingAccountRecord) {
      // Update existing account
      const updatedAccounts = await db
        .update(metaBusinessAccount)
        .set({
          accessToken: longLivedToken,
          name: profile.name ?? null,
          pictureUrl: pictureUrl,
          tokenExpiresAt: tokenExpiresAt,
          updatedAt: new Date(),
          deletedAt: null, // Restore if was soft deleted
        })
        .where(eq(metaBusinessAccount.id, existingAccountRecord.id))
        .returning();

      metaBusinessAccountRecord = updatedAccounts[0];
    } else {
      // Create new account
      const accountId = nanoid();
      const createdAccounts = await db
        .insert(metaBusinessAccount)
        .values({
          id: accountId,
          userId: userId,
          facebookUserId: facebookUserId,
          name: profile.name ?? null,
          pictureUrl: pictureUrl,
          accessToken: longLivedToken,
          tokenExpiresAt: tokenExpiresAt,
        })
        .returning();

      metaBusinessAccountRecord = createdAccounts[0];
    }

    // Step 6: Fetch and store ad accounts
    const adAccountsResponse = await getAdAccounts(longLivedToken);

    if (adAccountsResponse.data && adAccountsResponse.data.length > 0) {
      for (const adAccount of adAccountsResponse.data) {
        // Check if ad account already exists
        const existingAdAccounts = await db
          .select()
          .from(metaAdAccount)
          .where(
            and(
              eq(
                metaAdAccount.metaBusinessAccountId,
                metaBusinessAccountRecord.id
              ),
              eq(metaAdAccount.adAccountId, adAccount.id)
            )
          )
          .limit(1);

        const existingAdAccountRecord = existingAdAccounts[0];

        if (existingAdAccountRecord) {
          // Update existing ad account
          await db
            .update(metaAdAccount)
            .set({
              accountId: adAccount.account_id,
              name: adAccount.name ?? null,
              currency: adAccount.currency ?? null,
              timezoneId: adAccount.timezone_id ?? null,
              timezoneName: adAccount.timezone_name ?? null,
              accountStatus: adAccount.account_status ?? null,
              updatedAt: new Date(),
              deletedAt: null, // Restore if was soft deleted
            })
            .where(eq(metaAdAccount.id, existingAdAccountRecord.id));
        } else {
          // Create new ad account
          const adAccountRecordId = nanoid();
          await db.insert(metaAdAccount).values({
            id: adAccountRecordId,
            metaBusinessAccountId: metaBusinessAccountRecord.id,
            adAccountId: adAccount.id,
            accountId: adAccount.account_id,
            name: adAccount.name ?? null,
            currency: adAccount.currency ?? null,
            timezoneId: adAccount.timezone_id ?? null,
            timezoneName: adAccount.timezone_name ?? null,
            accountStatus: adAccount.account_status ?? null,
          });
        }
      }
    }

    // Redirect to marketing page with success
    const redirectUrl = new URL("/marketing", request.url);
    redirectUrl.searchParams.set("auth_success", "true");
    if (profile.name) {
      redirectUrl.searchParams.set("name", profile.name);
    }

    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    console.error("Error in Marketing OAuth callback:", error);

    // Redirect to marketing page with error
    const redirectUrl = new URL("/marketing", request.url);
    redirectUrl.searchParams.set("auth_error", "true");
    redirectUrl.searchParams.set(
      "error_message",
      error instanceof Error
        ? error.message
        : "Failed to connect Facebook account"
    );

    return NextResponse.redirect(redirectUrl);
  }
}
