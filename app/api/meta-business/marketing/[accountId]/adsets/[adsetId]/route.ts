import { NextRequest, NextResponse } from "next/server";
import { metaApiCall } from "@/lib/meta-business/api";
import { errorToGraphErrorReturn } from "@/lib/meta-business/error";
import type {
  Ad,
  AdCreative,
  AdSet,
  GraphApiAd,
  GraphApiAdSet,
  GraphApiInsights,
  GraphPaging,
  InsightsMetrics,
  PaginationInfo,
} from "@/lib/meta-business/marketing/types";

// ================================
// Route Types
// ================================

/**
 * Query parameters for GET /api/meta-business/marketing/[accountId]/adsets/[adsetId]
 */
export type GetAdSetQueryParams = {
  adsLimit?: string;
  adsAfter?: string;
};

/**
 * Successful response from GET adset detail endpoint.
 */
export type GetAdSetResponse = Partial<{
  adset: AdSet;
  ads: Ad[];
  adsPagination: PaginationInfo;
}>;

/**
 * Error response from adset endpoint.
 */
export type GetAdSetErrorResponse = {
  error: string;
  message: string;
  solution?: string;
};

// ================================
// Helper Functions
// ================================

/**
 * Transforms Graph API insights to camelCase InsightsMetrics.
 */
function transformInsights(insights?: {
  data: GraphApiInsights[];
}): InsightsMetrics | undefined {
  if (!insights?.data?.[0]) return undefined;

  const data = insights.data[0];

  let conversions: string | undefined;
  let costPerConversion: string | undefined;

  if (data.actions) {
    const conversionAction = data.actions.find(
      (a) =>
        a.action_type === "purchase" ||
        a.action_type === "lead" ||
        a.action_type === "complete_registration"
    );
    if (conversionAction) {
      conversions = conversionAction.value;
    }
  }

  if (data.cost_per_action_type) {
    const costAction = data.cost_per_action_type.find(
      (a) =>
        a.action_type === "purchase" ||
        a.action_type === "lead" ||
        a.action_type === "complete_registration"
    );
    if (costAction) {
      costPerConversion = costAction.value;
    }
  }

  return {
    spend: data.spend,
    impressions: data.impressions,
    clicks: data.clicks,
    reach: data.reach,
    cpc: data.cpc,
    cpm: data.cpm,
    ctr: data.ctr,
    cpp: data.cpp,
    frequency: data.frequency,
    conversions,
    costPerConversion,
    dateStart: data.date_start,
    dateStop: data.date_stop,
  };
}

/**
 * Transforms Graph API ad set to camelCase AdSet.
 */
function transformAdSet(adset: GraphApiAdSet): AdSet {
  return {
    id: adset.id,
    name: adset.name,
    status: adset.status,
    effectiveStatus: adset.effective_status,
    campaignId: adset.campaign_id,
    dailyBudget: adset.daily_budget,
    lifetimeBudget: adset.lifetime_budget,
    budgetRemaining: adset.budget_remaining,
    startTime: adset.start_time,
    endTime: adset.end_time,
    createdTime: adset.created_time,
    updatedTime: adset.updated_time,
    optimizationGoal: adset.optimization_goal,
    billingEvent: adset.billing_event,
    bidAmount: adset.bid_amount,
    insights: transformInsights(adset.insights),
  };
}

/**
 * Transforms Graph API creative to camelCase AdCreative.
 */
function transformCreative(
  creative?: GraphApiAd["creative"]
): AdCreative | undefined {
  if (!creative) return undefined;

  return {
    id: creative.id,
    name: creative.name,
    title: creative.title,
    body: creative.body,
    imageUrl: creative.image_url,
    thumbnailUrl: creative.thumbnail_url,
    effectiveObjectStoryId: creative.effective_object_story_id,
  };
}

/**
 * Transforms Graph API ad to camelCase Ad.
 */
function transformAd(ad: GraphApiAd): Ad {
  return {
    id: ad.id,
    name: ad.name,
    status: ad.status,
    effectiveStatus: ad.effective_status,
    adsetId: ad.adset_id,
    campaignId: ad.campaign_id,
    createdTime: ad.created_time,
    updatedTime: ad.updated_time,
    creative: transformCreative(ad.creative),
    insights: transformInsights(ad.insights),
  };
}

/**
 * Transforms Graph API paging to PaginationInfo.
 */
function transformPaging(paging?: GraphPaging): PaginationInfo {
  return {
    hasNextPage: !!paging?.next,
    hasPreviousPage: !!paging?.previous,
    nextCursor: paging?.cursors?.after,
    previousCursor: paging?.cursors?.before,
  };
}

// ================================
// Route Handler
// ================================

/**
 * GET /api/meta-business/marketing/[accountId]/adsets/[adsetId]
 *
 * Fetches a single ad set with its ads.
 *
 * Path Parameters:
 * - accountId: The ad account ID (for validation/context)
 * - adsetId: The ad set ID
 *
 * Query Parameters:
 * - adsLimit: Number of ads to return (default: 25, max: 100)
 * - adsAfter: Cursor for ads pagination
 *
 * Returns:
 * - adset: Ad set details with insights
 * - ads: Array of ads in this ad set
 * - adsPagination: Pagination info for ads
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ accountId: string; adsetId: string }> }
): Promise<NextResponse<GetAdSetResponse | GetAdSetErrorResponse>> {
  try {
    const { adsetId } = await params;

    // Get access token from environment variable
    const accessToken = process.env.TODELETE_ACCESS_TOKEN;

    if (!accessToken) {
      return NextResponse.json(
        {
          error: "Access token not configured",
          message: "TODELETE_ACCESS_TOKEN environment variable is not set",
          solution: "Set the TODELETE_ACCESS_TOKEN environment variable",
        },
        { status: 500 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const adsLimitParam = searchParams.get("adsLimit");
    const adsAfter = searchParams.get("adsAfter");

    // Validate and set limit (default: 25, max: 100)
    let adsLimit = 25;
    if (adsLimitParam) {
      const parsedLimit = Number.parseInt(adsLimitParam, 10);
      if (!Number.isNaN(parsedLimit) && parsedLimit > 0) {
        adsLimit = Math.min(parsedLimit, 100);
      }
    }

    // Build ads subquery
    let adsSubquery = `ads.limit(${adsLimit})`;
    if (adsAfter) {
      adsSubquery = `ads.limit(${adsLimit}).after(${adsAfter})`;
    }

    // Build fields parameter
    const fields = [
      "id",
      "name",
      "status",
      "effective_status",
      "campaign_id",
      "daily_budget",
      "lifetime_budget",
      "budget_remaining",
      "start_time",
      "end_time",
      "created_time",
      "updated_time",
      "optimization_goal",
      "billing_event",
      "bid_amount",
      "insights{spend,impressions,clicks,reach,cpc,cpm,ctr,cpp,frequency,actions,cost_per_action_type,date_start,date_stop}",
      `${adsSubquery}{id,name,status,effective_status,adset_id,campaign_id,created_time,updated_time,creative{id,name,title,body,image_url,thumbnail_url,effective_object_story_id},insights{spend,impressions,clicks,reach,cpc,cpm,ctr,date_start,date_stop}}`,
    ].join(",");

    // Make Graph API request
    const response = await metaApiCall<GraphApiAdSet>({
      domain: "FACEBOOK",
      method: "GET",
      path: adsetId,
      params: `fields=${fields}`,
      accessToken,
    });

    // Transform response to camelCase
    const adset = transformAdSet(response);
    const ads = response.ads?.data?.map(transformAd) ?? [];
    const adsPagination = transformPaging(response.ads?.paging);

    return NextResponse.json(
      {
        adset,
        ads,
        adsPagination,
      },
      { status: 200 }
    );
  } catch (error) {
    // Convert error to standardized GraphErrorReturn format
    const errorReturn = errorToGraphErrorReturn(error);

    console.error("Error fetching adset:", errorReturn);

    return NextResponse.json(
      {
        error: errorReturn.reason.title,
        message: errorReturn.reason.message,
        solution: errorReturn.reason.solution,
      },
      { status: errorReturn.statusCode }
    );
  }
}
