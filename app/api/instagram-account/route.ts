import { NextResponse } from "next/server";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { and, eq, isNull } from "drizzle-orm";
import { auth } from "@/app/(auth)/auth";
import { instagramAccount } from "@/lib/db/schema";

// Initialize database connection
// biome-ignore lint: Forbidden non-null assertion.
const client = postgres(process.env.POSTGRES_URL!);
const db = drizzle(client);

/**
 * GET /api/instagram-account
 *
 * Checks if the current authenticated user has a connected Instagram account.
 * Returns the connection status and account details if connected.
 */
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // Find the user's Instagram account (not soft-deleted)
    const accounts = await db
      .select({
        username: instagramAccount.username,
        accountId: instagramAccount.accountId,
      })
      .from(instagramAccount)
      .where(
        and(
          eq(instagramAccount.userId, userId),
          isNull(instagramAccount.deletedAt)
        )
      )
      .limit(1);

    const account = accounts[0];

    if (account) {
      return NextResponse.json({
        connected: true,
        account: {
          username: account.username,
          accountId: account.accountId,
        },
      });
    }

    return NextResponse.json({
      connected: false,
      account: null,
    });
  } catch (error) {
    console.error("Error checking Instagram account:", error);
    return NextResponse.json(
      { error: "Failed to check Instagram account status" },
      { status: 500 }
    );
  }
}
