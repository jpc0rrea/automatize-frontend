import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { and, eq, isNull } from "drizzle-orm";
import { auth } from "@/app/(auth)/auth";
import { instagramAccount } from "@/lib/db/schema";
import { getInstagramAccountMedia } from "@/lib/meta-business/instagram";
import type {
  GetInstagramMediaResponse,
  InstagramMedia,
} from "@/lib/meta-business/instagram";

// Initialize database connection
// biome-ignore lint: Forbidden non-null assertion.
const client = postgres(process.env.POSTGRES_URL!);
const db = drizzle(client);

// ================================
// Route Types
// ================================

/**
 * Query parameters for the GET /api/meta-business/instagram/media endpoint
 */
export type GetInstagramMediaQueryParams = {
  after?: string;
  limit?: string;
};

/**
 * Successful response from the GET /api/meta-business/instagram/media endpoint
 */
export type GetInstagramMediaRouteResponse = {
  media: InstagramMedia[];
  pagination: {
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    nextCursor?: string;
    previousCursor?: string;
  };
  account: {
    id: string;
    username: string | null;
  };
};

/**
 * Error response from the GET /api/meta-business/instagram/media endpoint
 */
export type GetInstagramMediaErrorResponse = {
  error: string;
};

/**
 * GET /api/meta-business/instagram/media
 *
 * Fetches media posts from the authenticated user's connected Instagram account.
 * Supports pagination through the `after` query parameter.
 *
 * Query parameters:
 * - after (optional): Pagination cursor to fetch media after a specific position
 * - limit (optional): Number of media items to fetch (default: 20, max: 100)
 *
 * Returns:
 * - media: Array of Instagram media items
 * - pagination: Object with hasNextPage, hasPreviousPage, and cursor information
 * - account: Basic info about the connected Instagram account
 */
export async function GET(
  request: NextRequest
): Promise<
  NextResponse<GetInstagramMediaRouteResponse | GetInstagramMediaErrorResponse>
> {
  try {
    // Get authenticated user
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const after = searchParams.get("after") ?? undefined;
    const limitParam = searchParams.get("limit");

    // Parse and validate limit (default: 20, max: 100)
    let limit = 20;
    if (limitParam) {
      const parsedLimit = Number.parseInt(limitParam, 10);
      if (!Number.isNaN(parsedLimit) && parsedLimit > 0) {
        limit = Math.min(parsedLimit, 100);
      }
    }

    // Find the user's Instagram account (not soft-deleted)
    const accounts = await db
      .select({
        id: instagramAccount.id,
        accountId: instagramAccount.accountId,
        username: instagramAccount.username,
        accessToken: instagramAccount.accessToken,
      })
      .from(instagramAccount)
      .where(
        and(
          eq(instagramAccount.userId, userId),
          isNull(instagramAccount.deletedAt)
        )
      )
      .limit(1);

    const account = accounts.at(0);

    if (!account) {
      return NextResponse.json(
        { error: "No Instagram account connected" },
        { status: 404 }
      );
    }

    // Fetch media from Instagram API
    const mediaResponse: GetInstagramMediaResponse =
      await getInstagramAccountMedia({
        accessToken: account.accessToken,
        instagramAccountId: account.accountId,
        after,
        limit,
      });

    return NextResponse.json({
      media: mediaResponse.media,
      pagination: mediaResponse.pagination,
      account: {
        id: account.id,
        username: account.username,
      },
    });
  } catch (error) {
    console.error("Error fetching Instagram media:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch Instagram media",
      },
      { status: 500 }
    );
  }
}
