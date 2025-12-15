// app/api/scheduled_posts_worker/route.ts

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { and, eq, inArray, isNull, lte, lt, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { createMediaContainer } from "@/lib/meta-business/instagram/create-media-container";
import { getMediaContainerStatus } from "@/lib/meta-business/instagram/get-media-container-status";
import { publishMediaContainer } from "@/lib/meta-business/instagram/publish-media-container";
import {
  ContainerStatusCode,
  CreateMediaContainerResult,
  GetContainerStatusResult,
} from "@/lib/meta-business/instagram/types";
import {
  errorToGraphErrorReturn,
  GraphApiError,
  GraphErrorReturn,
} from "@/lib/meta-business/error";
import { instagramAccount, scheduledPost, user } from "@/lib/db/schema";

// Initialize database connection
// biome-ignore lint: Forbidden non-null assertion.
const client = postgres(process.env.POSTGRES_URL!);
const db = drizzle(client);

// ---------- CONFIG & HELPERS ----------

const defaultMaxRetryAttempt = 3;

const maxRetryAttempt = Number(
  process.env.SCHEDULE_POST_MAXIMUM_RETRY_ATTEMPT ?? defaultMaxRetryAttempt
);

// avoid doing too much work in one run
const maxBatchSize = 50;

function isTerminalContainerErrorStatus(status: ContainerStatusCode): boolean {
  // For now, treat only "ERROR" as terminal; you can expand this logic later
  return status === "ERROR";
}

// ---------- MAIN ROUTE (RUNS EVERY MINUTE) ----------

export async function GET() {
  const now = new Date();

  if (maxRetryAttempt <= 0) {
    return NextResponse.json(
      {
        error: "SCHEDULE_POST_MAXIMUM_RETRY_ATTEMPT must be greater than zero",
      },
      { status: 500 }
    );
  }

  const summary = {
    containers_created: 0,
    container_errors: 0,
    containers_checked: 0,
    containers_finished: 0,
    published_success: 0,
    published_failure: 0,
  };

  // ============================================
  // STEP 1: CREATE MEDIA CONTAINERS FOR VALID POSTS
  // ============================================

  const postsNeedingContainer = await db
    .select({
      // Scheduled post fields
      id: scheduledPost.id,
      userId: scheduledPost.userId,
      mediaUrl: scheduledPost.mediaUrl,
      caption: scheduledPost.caption,
      scheduledAt: scheduledPost.scheduledAt,
      retryAttempts: scheduledPost.retryAttempts,
      status: scheduledPost.status,
      // Instagram account fields
      instagramAccountId: instagramAccount.id,
      instagramAccountIdField: instagramAccount.accountId,
      instagramAccessToken: instagramAccount.accessToken,
    })
    .from(scheduledPost)
    .leftJoin(user, eq(scheduledPost.userId, user.id))
    .leftJoin(
      instagramAccount,
      and(
        eq(instagramAccount.userId, scheduledPost.userId),
        isNull(instagramAccount.deletedAt)
      )
    )
    .where(
      and(
        isNull(scheduledPost.deletedAt),
        isNull(scheduledPost.mediaContainerId),
        lte(scheduledPost.scheduledAt, now),
        lt(scheduledPost.retryAttempts, maxRetryAttempt),
        inArray(scheduledPost.status, ["pending", "retry"])
      )
    )
    .limit(maxBatchSize);

  // Group posts by scheduled post ID and get first Instagram account for each
  const postsWithAccounts = new Map<
    string,
    {
      id: string;
      userId: string;
      mediaUrl: string;
      caption: string;
      scheduledAt: Date;
      retryAttempts: number;
      status: string;
      instagramAccount?: {
        id: string;
        accountId: string;
        accessToken: string;
      };
    }
  >();

  for (const row of postsNeedingContainer) {
    if (!postsWithAccounts.has(row.id)) {
      postsWithAccounts.set(row.id, {
        id: row.id,
        userId: row.userId,
        mediaUrl: row.mediaUrl,
        caption: row.caption,
        scheduledAt: row.scheduledAt,
        retryAttempts: row.retryAttempts,
        status: row.status,
      });
    }

    const post = postsWithAccounts.get(row.id)!;
    if (
      row.instagramAccountId &&
      row.instagramAccessToken &&
      row.instagramAccountIdField &&
      !post.instagramAccount
    ) {
      post.instagramAccount = {
        id: row.instagramAccountId,
        accountId: row.instagramAccountIdField,
        accessToken: row.instagramAccessToken,
      };
    }
  }

  for (const postData of postsWithAccounts.values()) {
    // Get Instagram account data
    const instagramAccountData = postData.instagramAccount;

    if (!instagramAccountData) {
      // Skip posts without Instagram account
      await db
        .update(scheduledPost)
        .set({
          retryAttempts: postData.retryAttempts + 1,
          lastAttemptAt: now,
          lastErrorMessage: "No Instagram account found for user",
          status: "failure",
        })
        .where(eq(scheduledPost.id, postData.id));

      summary.container_errors += 1;
      continue;
    }

    try {
      // NOTE: we assume image_url here; adapt if you also have video/reels
      const result = await createMediaContainer({
        imageUrl: postData.mediaUrl,
        caption: postData.caption,
        igUserId: instagramAccountData.accountId,
        accessToken: instagramAccountData.accessToken,
      });

      // Since createMediaContainer throws GraphApiError on error,
      // if we get here, result is CreateMediaContainerResult
      const containerResult = result as CreateMediaContainerResult;

      // Success: we got a container id
      await db
        .update(scheduledPost)
        .set({
          mediaContainerId: containerResult.id,
          mediaContainerStatus: "IN_PROGRESS",
          lastAttemptAt: now,
          lastErrorMessage: null,
        })
        .where(eq(scheduledPost.id, postData.id));

      summary.containers_created += 1;
    } catch (error) {
      const newRetryAttempts = postData.retryAttempts + 1;
      const isFailure = newRetryAttempts >= maxRetryAttempt;

      const errorReturn = errorToGraphErrorReturn(error);

      await db
        .update(scheduledPost)
        .set({
          retryAttempts: newRetryAttempts,
          lastAttemptAt: now,
          lastErrorMessage: JSON.stringify(errorReturn),
          status: isFailure ? "failure" : "retry",
        })
        .where(eq(scheduledPost.id, postData.id));

      summary.container_errors += 1;
    }
  }

  // ============================================
  // STEP 2: CHECK MEDIA CONTAINER STATUS
  // (for posts with container_id, status pending|retry)
  // ============================================

  const postsWithContainers = await db
    .select({
      // Scheduled post fields
      id: scheduledPost.id,
      userId: scheduledPost.userId,
      mediaContainerId: scheduledPost.mediaContainerId,
      retryAttempts: scheduledPost.retryAttempts,
      status: scheduledPost.status,
      // Instagram account fields
      instagramAccountId: instagramAccount.id,
      instagramAccountIdField: instagramAccount.accountId,
      instagramAccessToken: instagramAccount.accessToken,
    })
    .from(scheduledPost)
    .leftJoin(user, eq(scheduledPost.userId, user.id))
    .leftJoin(
      instagramAccount,
      and(
        eq(instagramAccount.userId, scheduledPost.userId),
        isNull(instagramAccount.deletedAt)
      )
    )
    .where(
      and(
        sql`${scheduledPost.mediaContainerId} IS NOT NULL`,
        lte(scheduledPost.scheduledAt, now),
        lt(scheduledPost.retryAttempts, maxRetryAttempt),
        inArray(scheduledPost.status, ["pending", "retry"])
      )
    )
    .limit(maxBatchSize);

  // Collect posts whose containers are FINISHED so we can publish in Step 3
  const postsWithFinishedContainers: {
    id: string;
    instagram_account_id: string;
    instagram_user_id: string;
    access_token: string;
    media_container_id: string;
  }[] = [];

  // Group posts by scheduled post ID and get first Instagram account for each
  const postsWithContainersMap = new Map<
    string,
    {
      id: string;
      mediaContainerId: string | null;
      retryAttempts: number;
      status: string;
      instagramAccount?: {
        id: string;
        accountId: string;
        accessToken: string;
      };
    }
  >();

  for (const row of postsWithContainers) {
    if (!row.mediaContainerId) continue;

    if (!postsWithContainersMap.has(row.id)) {
      postsWithContainersMap.set(row.id, {
        id: row.id,
        mediaContainerId: row.mediaContainerId,
        retryAttempts: row.retryAttempts,
        status: row.status,
      });
    }

    const post = postsWithContainersMap.get(row.id)!;
    if (
      row.instagramAccountId &&
      row.instagramAccessToken &&
      row.instagramAccountIdField &&
      !post.instagramAccount
    ) {
      post.instagramAccount = {
        id: row.instagramAccountId,
        accountId: row.instagramAccountIdField,
        accessToken: row.instagramAccessToken,
      };
    }
  }

  for (const postData of postsWithContainersMap.values()) {
    if (!postData.mediaContainerId) continue;

    // Get Instagram account data
    const instagramAccountData = postData.instagramAccount;

    if (!instagramAccountData) {
      // Skip posts without Instagram account
      await db
        .update(scheduledPost)
        .set({
          retryAttempts: postData.retryAttempts + 1,
          lastAttemptAt: now,
          lastErrorMessage: "No Instagram account found for user",
          status: "failure",
        })
        .where(eq(scheduledPost.id, postData.id));

      summary.container_errors += 1;
      continue;
    }

    try {
      const result = await getMediaContainerStatus({
        igContainerId: postData.mediaContainerId,
        accessToken: instagramAccountData.accessToken,
      });

      // Since getMediaContainerStatus throws GraphApiError on error,
      // if we get here, result is GetContainerStatusResult
      const statusResult = result as GetContainerStatusResult;

      summary.containers_checked += 1;

      await db
        .update(scheduledPost)
        .set({
          mediaContainerStatus: statusResult.status_code,
        })
        .where(eq(scheduledPost.id, postData.id));

      if (statusResult.status_code === "FINISHED") {
        summary.containers_finished += 1;

        postsWithFinishedContainers.push({
          id: postData.id,
          instagram_account_id: instagramAccountData.id,
          instagram_user_id: instagramAccountData.accountId,
          access_token: instagramAccountData.accessToken,
          media_container_id: postData.mediaContainerId,
        });
      } else if (isTerminalContainerErrorStatus(statusResult.status_code)) {
        const newRetryAttempts = postData.retryAttempts + 1;
        const isFailure = newRetryAttempts >= maxRetryAttempt;

        await db
          .update(scheduledPost)
          .set({
            retryAttempts: newRetryAttempts,
            lastAttemptAt: now,
            lastErrorMessage: `Container error status: ${statusResult.status_code}`,
            status: isFailure ? "failure" : "retry",
          })
          .where(eq(scheduledPost.id, postData.id));

        summary.container_errors += 1;
      }
    } catch (error) {
      const newRetryAttempts = postData.retryAttempts + 1;
      const isFailure = newRetryAttempts >= maxRetryAttempt;

      const errorReturn = errorToGraphErrorReturn(error);

      await db
        .update(scheduledPost)
        .set({
          retryAttempts: newRetryAttempts,
          lastAttemptAt: now,
          lastErrorMessage: JSON.stringify(errorReturn),
          status: isFailure ? "failure" : "retry",
        })
        .where(eq(scheduledPost.id, postData.id));

      summary.container_errors += 1;
    }
  }

  // ============================================
  // STEP 3: PUBLISH ALL FINISHED CONTAINERS
  // (status pending|retry, container status FINISHED)
  // ============================================

  for (const item of postsWithFinishedContainers) {
    // Re-fetch to get freshest retry/status info
    const [scheduledPostData] = await db
      .select()
      .from(scheduledPost)
      .where(eq(scheduledPost.id, item.id))
      .limit(1);

    if (!scheduledPostData) continue;
    if (!scheduledPostData.mediaContainerId) continue;

    // Do not try anymore if we already reached maximum retries
    if (scheduledPostData.retryAttempts >= maxRetryAttempt) {
      continue;
    }

    // Only publish posts that are still pending or retry
    if (
      scheduledPostData.status !== "pending" &&
      scheduledPostData.status !== "retry"
    ) {
      continue;
    }

    // Use Instagram account data already collected in Step 2
    if (!item.instagram_user_id || !item.access_token) {
      // Skip posts without Instagram account data
      await db
        .update(scheduledPost)
        .set({
          retryAttempts: scheduledPostData.retryAttempts + 1,
          lastAttemptAt: now,
          lastErrorMessage: "Instagram account data missing",
          status: "failure",
        })
        .where(eq(scheduledPost.id, scheduledPostData.id));

      summary.published_failure += 1;
      continue;
    }

    try {
      await publishMediaContainer({
        creationId: scheduledPostData.mediaContainerId,
        igUserId: item.instagram_user_id,
        accessToken: item.access_token,
      });

      // Since publishMediaContainer throws GraphApiError on error,
      // if we get here, the publish was successful

      await db
        .update(scheduledPost)
        .set({
          status: "posted",
          lastAttemptAt: now,
          lastErrorMessage: null,
          publishedAt: now,
        })
        .where(eq(scheduledPost.id, scheduledPostData.id));

      summary.published_success += 1;
    } catch (error) {
      const newRetryAttempts = scheduledPostData.retryAttempts + 1;
      const isFailure = newRetryAttempts >= maxRetryAttempt;

      const errorReturn = errorToGraphErrorReturn(error);

      await db
        .update(scheduledPost)
        .set({
          retryAttempts: newRetryAttempts,
          lastAttemptAt: now,
          lastErrorMessage: JSON.stringify(errorReturn),
          status: isFailure ? "failure" : "retry",
        })
        .where(eq(scheduledPost.id, scheduledPostData.id));

      summary.published_failure += 1;
    }
  }

  return NextResponse.json({
    now,
    max_retry_attempt: maxRetryAttempt,
    ...summary,
  });
}
