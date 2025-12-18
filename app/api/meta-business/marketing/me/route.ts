import { NextRequest, NextResponse } from "next/server";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { and, eq, isNull } from "drizzle-orm";
import { auth } from "@/app/(auth)/auth";
import { metaBusinessAccount, metaAdAccount } from "@/lib/db/schema";

// Initialize database connection
// biome-ignore lint: Forbidden non-null assertion.
const client = postgres(process.env.POSTGRES_URL!);
const db = drizzle(client);

// ================================
// Route Types (camelCase)
// ================================

export type AdAccount = {
  id: string;
  name: string | null;
  accountId: string;
  adAccountId: string;
  currency: string | null;
  timezoneId: string | null;
  timezoneName: string | null;
  accountStatus: number | null;
};

export type GetMeResponse = {
  id: string;
  facebookUserId: string;
  name: string | null;
  pictureUrl: string | null;
  adAccounts: AdAccount[];
  tokenExpiresAt: Date | null;
};

export type GetMeErrorResponse = {
  error: string;
  message: string;
  solution?: string;
};

/**
 * GET /api/meta-business/marketing/me
 *
 * Fetches information about the authenticated user's connected Facebook account
 * and associated ad accounts from the database.
 *
 * Returns:
 * - id: Meta Business Account record ID
 * - facebookUserId: Facebook User ID
 * - name: User name
 * - pictureUrl: User's profile picture URL (when available)
 * - adAccounts: User's ad accounts with details
 * - tokenExpiresAt: When the access token expires
 */
export async function GET(
  _request: NextRequest
): Promise<NextResponse<GetMeResponse | GetMeErrorResponse>> {
  try {
    // Get the authenticated user from the session
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        {
          error: "Not authenticated",
          message: "You must be logged in to access this resource",
          solution: "Please log in and try again",
        },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // Fetch the user's connected Meta Business Account
    const metaAccounts = await db
      .select()
      .from(metaBusinessAccount)
      .where(
        and(
          eq(metaBusinessAccount.userId, userId),
          isNull(metaBusinessAccount.deletedAt)
        )
      )
      .limit(1);

    const metaAccountRecord = metaAccounts[0];

    if (!metaAccountRecord) {
      return NextResponse.json(
        {
          error: "No connected account",
          message: "No Facebook account is connected",
          solution:
            "Connect your Facebook account to access marketing features",
        },
        { status: 404 }
      );
    }

    // Fetch the user's ad accounts
    const adAccounts = await db
      .select()
      .from(metaAdAccount)
      .where(
        and(
          eq(metaAdAccount.metaBusinessAccountId, metaAccountRecord.id),
          isNull(metaAdAccount.deletedAt)
        )
      );

    // Transform to response format
    const response: GetMeResponse = {
      id: metaAccountRecord.id,
      facebookUserId: metaAccountRecord.facebookUserId,
      name: metaAccountRecord.name,
      pictureUrl: metaAccountRecord.pictureUrl,
      tokenExpiresAt: metaAccountRecord.tokenExpiresAt,
      adAccounts: adAccounts.map((account) => ({
        id: account.id,
        name: account.name,
        accountId: account.accountId,
        adAccountId: account.adAccountId,
        currency: account.currency,
        timezoneId: account.timezoneId,
        timezoneName: account.timezoneName,
        accountStatus: account.accountStatus,
      })),
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error("Error fetching user information:", error);

    return NextResponse.json(
      {
        error: "Internal server error",
        message:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred",
        solution: "Please try again later",
      },
      { status: 500 }
    );
  }
}
