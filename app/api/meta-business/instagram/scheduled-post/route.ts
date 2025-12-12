import { auth } from "@/app/(auth)/auth";
import {
  createScheduledPost,
  getInstagramAccountByUserId,
  getScheduledPostsByUserId,
} from "@/lib/db/queries";
import type { ScheduledPost } from "@/lib/db/schema";
import type { MediaType } from "@/lib/meta-business/instagram/types";
import { NextRequest, NextResponse } from "next/server";

type CreateScheduledPostBody = {
  mediaUrl: string;
  mediaType?: MediaType;
  caption: string;
  scheduledAt?: string; // ISO string
  locationId?: string;
  userTagsJson?: string; // JSON string for user tags
};

export type GetScheduledPostsParams = {
  perPage?: string;
  page?: string;
  after?: string; // ISO date string
};

export type ScheduledPostResponse = {
  id: string;
  userId: string;
  mediaUrl: string;
  mediaType: string;
  caption: string;
  locationId: string | null;
  userTagsJson: string | null;
  scheduledAt: string;
  status: string;
  retryAttempts: number;
  lastAttemptAt: string | null;
  lastErrorMessage: string | null;
  mediaContainerId: string | null;
  mediaContainerStatus: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type GetScheduledPostsResponse = {
  pager: {
    page: number;
    perPage: number;
    total: number;
  };
  posts: ScheduledPostResponse[];
};

export type CreatedScheduledPostResponse = ScheduledPostResponse;

function formatScheduledPostResponse(post: ScheduledPost): ScheduledPostResponse {
  return {
    id: post.id,
    userId: post.userId,
    mediaUrl: post.mediaUrl,
    mediaType: post.mediaType ?? "IMAGE",
    caption: post.caption,
    locationId: post.locationId,
    userTagsJson: post.userTagsJson,
    scheduledAt: post.scheduledAt.toISOString(),
    status: post.status,
    retryAttempts: post.retryAttempts,
    lastAttemptAt: post.lastAttemptAt?.toISOString() ?? null,
    lastErrorMessage: post.lastErrorMessage,
    mediaContainerId: post.mediaContainerId,
    mediaContainerStatus: post.mediaContainerStatus,
    publishedAt: post.publishedAt?.toISOString() ?? null,
    createdAt: post.createdAt.toISOString(),
    updatedAt: post.updatedAt.toISOString(),
  };
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const { searchParams } = new URL(request.url);

    const query: GetScheduledPostsParams = {
      perPage: searchParams.get("per_page") ?? undefined,
      page: searchParams.get("page") ?? undefined,
      after: searchParams.get("after") ?? undefined,
    };

    // Parse pagination parameters
    const perPage = query.perPage ? Number.parseInt(query.perPage, 10) : 10;
    const page = query.page ? Number.parseInt(query.page, 10) : 1;

    // Validate pagination parameters
    if (Number.isNaN(perPage) || perPage < 1) {
      return NextResponse.json(
        { error: "per_page must be a positive integer" },
        { status: 400 }
      );
    }

    if (Number.isNaN(page) || page < 1) {
      return NextResponse.json(
        { error: "page must be a positive integer" },
        { status: 400 }
      );
    }

    // Parse and validate 'after' date if provided
    let afterDate: Date | undefined;
    if (query.after) {
      afterDate = new Date(query.after);
      if (Number.isNaN(afterDate.getTime())) {
        return NextResponse.json(
          { error: "after must be a valid ISO date string" },
          { status: 400 }
        );
      }
    }

    const { posts, total } = await getScheduledPostsByUserId({
      userId,
      page,
      perPage,
      afterDate,
    });

    // Format response
    const response: GetScheduledPostsResponse = {
      pager: {
        page,
        perPage,
        total,
      },
      posts: posts.map(formatScheduledPostResponse),
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error("Error fetching scheduled posts:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const body = (await request.json()) as CreateScheduledPostBody;

    const { mediaUrl, mediaType, caption, scheduledAt, locationId, userTagsJson } =
      body;

    if (!mediaUrl || !caption) {
      return NextResponse.json(
        { error: "mediaUrl and caption are required" },
        { status: 400 }
      );
    }

    const instagramAccount = await getInstagramAccountByUserId({ userId });

    if (!instagramAccount) {
      return NextResponse.json(
        { error: "Instagram account not found for this user" },
        { status: 404 }
      );
    }

    // Default media type to "IMAGE" if not provided
    const resolvedMediaType: MediaType = mediaType ?? "IMAGE";

    // If scheduledAt not provided, use current time
    const now = new Date();
    const scheduledDate = scheduledAt ? new Date(scheduledAt) : now;

    if (Number.isNaN(scheduledDate.getTime())) {
      return NextResponse.json(
        { error: "scheduledAt is invalid date" },
        { status: 400 }
      );
    }

    const created = await createScheduledPost({
      userId,
      data: {
        mediaUrl,
        mediaType: resolvedMediaType,
        caption,
        locationId: locationId ?? null,
        userTagsJson: userTagsJson ?? null,
        scheduledAt: scheduledDate,
      },
    });

    return NextResponse.json(formatScheduledPostResponse(created), {
      status: 201,
    });
  } catch (error) {
    console.error("Error creating scheduled post:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
