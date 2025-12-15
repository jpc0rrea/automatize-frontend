import { auth } from "@/app/(auth)/auth";
import {
  deleteScheduledPost,
  getInstagramAccountByUserId,
  getScheduledPostById,
  updateScheduledPost,
} from "@/lib/db/queries";
import type { ScheduledPost } from "@/lib/db/schema";
import { createMediaContainer } from "@/lib/meta-business/instagram/create-media-container";
import { getMediaContainerStatus } from "@/lib/meta-business/instagram/get-media-container-status";
import { publishMediaContainer } from "@/lib/meta-business/instagram/publish-media-container";
import {
  CreateMediaContainerResult,
  GetContainerStatusResult,
} from "@/lib/meta-business/instagram/types";
import {
  errorToGraphErrorReturn,
  GraphApiError,
  GraphErrorReturn,
} from "@/lib/meta-business/error";
import { NextRequest, NextResponse } from "next/server";
import type { ScheduledPostResponse } from "../route";

// Helper functions
function errorToString(error: unknown): string {
  if (error instanceof Error) return error.message;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

function formatScheduledPostResponse(
  post: ScheduledPost
): ScheduledPostResponse {
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

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        { error: "id parameter is required" },
        { status: 400 }
      );
    }

    const post = await getScheduledPostById({ id, userId });

    if (!post) {
      return NextResponse.json(
        { error: "Scheduled post not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(formatScheduledPostResponse(post), {
      status: 200,
    });
  } catch (error) {
    console.error("Error fetching scheduled post:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const { id } = await context.params;
    const now = new Date();

    if (!id) {
      return NextResponse.json(
        { error: "id parameter is required" },
        { status: 400 }
      );
    }

    // Find the scheduled post by id
    let scheduledPostData = await getScheduledPostById({ id, userId });

    if (!scheduledPostData) {
      return NextResponse.json(
        { error: "Scheduled post not found" },
        { status: 404 }
      );
    }

    // Get Instagram account for the user
    const instagramAccount = await getInstagramAccountByUserId({ userId });

    if (!instagramAccount) {
      return NextResponse.json(
        { error: "Instagram account not found for this user" },
        { status: 404 }
      );
    }

    const accessToken = instagramAccount.accessToken;
    const igUserId = instagramAccount.accountId;

    // ============================================
    // STEP 1: CREATE MEDIA CONTAINER
    // (skip if container_id already exists)
    // ============================================

    if (!scheduledPostData.mediaContainerId) {
      try {
        // Determine media type and URL
        const mediaType = scheduledPostData.mediaType ?? "IMAGE";
        const createInput: Parameters<typeof createMediaContainer>[0] = {
          caption: scheduledPostData.caption,
          igUserId,
          accessToken,
        };

        if (mediaType === "IMAGE") {
          createInput.imageUrl = scheduledPostData.mediaUrl;
        } else if (mediaType === "VIDEO" || mediaType === "REELS") {
          createInput.videoUrl = scheduledPostData.mediaUrl;
          createInput.mediaType = mediaType;
        }

        if (scheduledPostData.locationId) {
          createInput.locationId = scheduledPostData.locationId;
        }

        if (scheduledPostData.userTagsJson) {
          createInput.userTagsJson = scheduledPostData.userTagsJson;
        }

        const result = await createMediaContainer(createInput);

        // Since createMediaContainer throws GraphApiError on error,
        // if we get here, result is CreateMediaContainerResult
        const containerResult = result as CreateMediaContainerResult;

        // Success: we got a container id
        scheduledPostData = await updateScheduledPost({
          id: scheduledPostData.id,
          userId,
          data: {
            mediaContainerId: containerResult.id,
            mediaContainerStatus: "IN_PROGRESS",
            lastAttemptAt: now,
            lastErrorMessage: null,
          },
        });
      } catch (error) {
        const newRetryAttempts = scheduledPostData.retryAttempts + 1;

        // Handle GraphApiError with standardized error interface
        const errorReturn = errorToGraphErrorReturn(error);

        scheduledPostData = await updateScheduledPost({
          id: scheduledPostData.id,
          userId,
          data: {
            retryAttempts: newRetryAttempts,
            lastAttemptAt: now,
            lastErrorMessage: JSON.stringify(errorReturn),
            status: "retry",
          },
        });

        return NextResponse.json(
          formatScheduledPostResponse(scheduledPostData),
          {
            status: 200,
          }
        );
      }
    }

    // ============================================
    // STEP 2: CHECK MEDIA CONTAINER STATUS
    // (only if container_id exists and status is pending|retry)
    // ============================================

    if (
      scheduledPostData.mediaContainerId &&
      (scheduledPostData.status === "pending" ||
        scheduledPostData.status === "retry")
    ) {
      try {
        const result = await getMediaContainerStatus({
          igContainerId: scheduledPostData.mediaContainerId,
          accessToken,
        });

        // Since getMediaContainerStatus throws GraphApiError on error,
        // if we get here, result is GetContainerStatusResult
        const statusResult = result as GetContainerStatusResult;

        // Update container status
        scheduledPostData = await updateScheduledPost({
          id: scheduledPostData.id,
          userId,
          data: {
            mediaContainerStatus: statusResult.status_code,
          },
        });

        // If status is ERROR, mark as retry/failure
        if (statusResult.status_code === "ERROR") {
          const newRetryAttempts = scheduledPostData.retryAttempts + 1;

          scheduledPostData = await updateScheduledPost({
            id: scheduledPostData.id,
            userId,
            data: {
              retryAttempts: newRetryAttempts,
              lastAttemptAt: now,
              lastErrorMessage: `Container error status: ${statusResult.status_code}`,
              status: "retry",
            },
          });

          return NextResponse.json(
            formatScheduledPostResponse(scheduledPostData),
            {
              status: 200,
            }
          );
        }
      } catch (error) {
        const newRetryAttempts = scheduledPostData.retryAttempts + 1;

        // Handle GraphApiError with standardized error interface
        const errorReturn = errorToGraphErrorReturn(error);

        scheduledPostData = await updateScheduledPost({
          id: scheduledPostData.id,
          userId,
          data: {
            retryAttempts: newRetryAttempts,
            lastAttemptAt: now,
            lastErrorMessage: JSON.stringify(errorReturn),
            status: "retry",
          },
        });

        return NextResponse.json(
          formatScheduledPostResponse(scheduledPostData),
          {
            status: 200,
          }
        );
      }
    }

    // ============================================
    // STEP 3: PUBLISH ALL FINISHED CONTAINERS
    // (only if container status is FINISHED and post status is pending|retry)
    // ============================================

    if (
      scheduledPostData.mediaContainerId &&
      scheduledPostData.mediaContainerStatus === "FINISHED" &&
      (scheduledPostData.status === "pending" ||
        scheduledPostData.status === "retry")
    ) {
      try {
        await publishMediaContainer({
          creationId: scheduledPostData.mediaContainerId,
          igUserId,
          accessToken,
        });

        // Success: post published
        scheduledPostData = await updateScheduledPost({
          id: scheduledPostData.id,
          userId,
          data: {
            status: "posted",
            lastAttemptAt: now,
            lastErrorMessage: null,
            publishedAt: now,
          },
        });
      } catch (error) {
        const newRetryAttempts = scheduledPostData.retryAttempts + 1;

        // Handle GraphApiError with standardized error interface
        const errorReturn = errorToGraphErrorReturn(error);

        scheduledPostData = await updateScheduledPost({
          id: scheduledPostData.id,
          userId,
          data: {
            retryAttempts: newRetryAttempts,
            lastAttemptAt: now,
            lastErrorMessage: JSON.stringify(errorReturn),
            status: "retry",
          },
        });

        return NextResponse.json(
          formatScheduledPostResponse(scheduledPostData),
          {
            status: 200,
          }
        );
      }
    }

    // Return the current state of the scheduled post
    return NextResponse.json(formatScheduledPostResponse(scheduledPostData), {
      status: 200,
    });
  } catch (error) {
    console.error("Error publishing scheduled post:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

type UpdateScheduledPostBody = {
  mediaUrl?: string;
  mediaType?: string;
  caption?: string;
  locationId?: string | null;
  userTagsJson?: string | null;
  scheduledAt?: string; // ISO string
};

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const { id } = await context.params;
    const body = (await request.json()) as UpdateScheduledPostBody;

    if (!id) {
      return NextResponse.json(
        { error: "id parameter is required" },
        { status: 400 }
      );
    }

    // Check if post exists and belongs to user
    const existingPost = await getScheduledPostById({ id, userId });

    if (!existingPost) {
      return NextResponse.json(
        { error: "Scheduled post not found" },
        { status: 404 }
      );
    }

    // Don't allow editing if already posted
    if (existingPost.status === "posted") {
      return NextResponse.json(
        { error: "Cannot edit a post that has already been published" },
        { status: 400 }
      );
    }

    // Build update data
    const updateData: Parameters<typeof updateScheduledPost>[0]["data"] = {};

    if (body.mediaUrl !== undefined) {
      updateData.mediaUrl = body.mediaUrl;
    }

    if (body.mediaType !== undefined) {
      updateData.mediaType = body.mediaType;
    }

    if (body.caption !== undefined) {
      updateData.caption = body.caption;
    }

    if (body.locationId !== undefined) {
      updateData.locationId = body.locationId;
    }

    if (body.userTagsJson !== undefined) {
      updateData.userTagsJson = body.userTagsJson;
    }

    if (body.scheduledAt !== undefined) {
      const scheduledDate = new Date(body.scheduledAt);
      if (Number.isNaN(scheduledDate.getTime())) {
        return NextResponse.json(
          { error: "scheduledAt is invalid date" },
          { status: 400 }
        );
      }
      updateData.scheduledAt = scheduledDate;
    }

    // If media URL or type changed, reset container to allow recreation
    if (
      (body.mediaUrl !== undefined || body.mediaType !== undefined) &&
      existingPost.mediaContainerId
    ) {
      updateData.mediaContainerId = null;
      updateData.mediaContainerStatus = null;
      updateData.status = "pending";
    }

    const updated = await updateScheduledPost({
      id,
      userId,
      data: updateData,
    });

    return NextResponse.json(formatScheduledPostResponse(updated), {
      status: 200,
    });
  } catch (error) {
    console.error("Error updating scheduled post:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        { error: "id parameter is required" },
        { status: 400 }
      );
    }

    // Check if post exists and belongs to user
    const existingPost = await getScheduledPostById({ id, userId });

    if (!existingPost) {
      return NextResponse.json(
        { error: "Scheduled post not found" },
        { status: 404 }
      );
    }

    await deleteScheduledPost({ id, userId });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error deleting scheduled post:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
