import { NextRequest, NextResponse } from "next/server";
import { metaApiCall } from "@/lib/meta-business/api";
import { errorToGraphErrorReturn } from "@/lib/meta-business/error";
import type {
  Ad,
  AdCreative,
  DatePreset,
  GraphApiAd,
  GraphApiInsights,
  GraphPaging,
  InsightsMetrics,
  PaginationInfo,
} from "@/lib/meta-business/marketing/types";

// ================================
// Graph API Response Types
// ================================

type GraphApiAdsResponse = {
  data: GraphApiAd[];
  paging?: GraphPaging;
};

// ================================
// Route Types
// ================================

/**
 * Query parameters for GET /api/meta-business/marketing/[accountId]/ads
 */
export type GetAdsQueryParams = {
  limit?: string;
  after?: string;
  before?: string;
  datePreset?: DatePreset;
  since?: string;
  until?: string;
  adsetId?: string;
  campaignId?: string;
};

/**
 * Successful response from GET ads endpoint.
 */
export type GetAdsResponse = Partial<{
  data: Ad[];
  pagination: PaginationInfo;
}>;

/**
 * Error response from ads endpoint.
 */
export type GetAdsErrorResponse = {
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
 * GET /api/meta-business/marketing/[accountId]/ads
 *
 * Fetches ads from a Meta ad account with inline insights.
 *
 * Path Parameters:
 * - accountId: The ad account ID (with or without 'act_' prefix)
 *
 * Query Parameters:
 * - limit: Number of ads to return (default: 25, max: 100)
 * - after: Cursor for forward pagination
 * - before: Cursor for backward pagination
 * - datePreset: Predefined date range for insights (e.g., 'last_30d')
 * - since: Start date for insights (YYYY-MM-DD format)
 * - until: End date for insights (YYYY-MM-DD format)
 * - adsetId: Filter ads by ad set ID (optional)
 * - campaignId: Filter ads by campaign ID (optional)
 *
 * Returns:
 * - data: Array of ads with insights
 * - pagination: Pagination info with cursors
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ accountId: string }> }
): Promise<NextResponse<GetAdsResponse | GetAdsErrorResponse>> {
  try {
    const { accountId } = await params;

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
    const limitParam = searchParams.get("limit");
    const after = searchParams.get("after");
    const before = searchParams.get("before");
    const datePreset = searchParams.get("datePreset");
    const since = searchParams.get("since");
    const until = searchParams.get("until");
    const adsetIdFilter = searchParams.get("adsetId");
    const campaignIdFilter = searchParams.get("campaignId");

    // Validate and set limit (default: 25, max: 100)
    let limit = 25;
    if (limitParam) {
      const parsedLimit = Number.parseInt(limitParam, 10);
      if (!Number.isNaN(parsedLimit) && parsedLimit > 0) {
        limit = Math.min(parsedLimit, 100);
      }
    }

    // Build insights fields with date filtering
    let insightsFields =
      "insights{spend,impressions,clicks,reach,cpc,cpm,ctr,cpp,frequency,actions,cost_per_action_type,date_start,date_stop}";

    // Add date filtering to insights
    const insightsParams: string[] = [];
    if (datePreset) {
      insightsParams.push(`date_preset=${datePreset}`);
    } else if (since && until) {
      insightsParams.push(`time_range={'since':'${since}','until':'${until}'}`);
    }

    if (insightsParams.length > 0) {
      insightsFields = `insights.${insightsParams.join(
        "."
      )}{spend,impressions,clicks,reach,cpc,cpm,ctr,cpp,frequency,actions,cost_per_action_type,date_start,date_stop}`;
    }

    // Build fields parameter
    const fields = [
      "id",
      "name",
      "status",
      "effective_status",
      "adset_id",
      "campaign_id",
      "created_time",
      "updated_time",
      "creative{id,name,title,body,image_url,thumbnail_url,effective_object_story_id}",
      insightsFields,
    ].join(",");

    // Build query params
    const queryParams: string[] = [`fields=${fields}`, `limit=${limit}`];

    if (after) {
      queryParams.push(`after=${after}`);
    }
    if (before) {
      queryParams.push(`before=${before}`);
    }

    // Add filters
    const filters: string[] = [];
    if (adsetIdFilter) {
      filters.push(
        `{"field":"adset.id","operator":"EQUAL","value":"${adsetIdFilter}"}`
      );
    }
    if (campaignIdFilter) {
      filters.push(
        `{"field":"campaign.id","operator":"EQUAL","value":"${campaignIdFilter}"}`
      );
    }
    if (filters.length > 0) {
      queryParams.push(`filtering=[${filters.join(",")}]`);
    }

    // Ensure account ID has act_ prefix
    const formattedAccountId = accountId.startsWith("act_")
      ? accountId
      : `act_${accountId}`;

    // Make Graph API request
    const response = await metaApiCall<GraphApiAdsResponse>({
      domain: "FACEBOOK",
      method: "GET",
      path: `${formattedAccountId}/ads`,
      params: queryParams.join("&"),
      accessToken,
    });

    // Transform response to camelCase
    const ads = response.data.map(transformAd);
    const pagination = transformPaging(response.paging);

    return NextResponse.json(
      {
        data: ads,
        pagination,
      },
      { status: 200 }
    );
  } catch (error) {
    // Convert error to standardized GraphErrorReturn format
    const errorReturn = errorToGraphErrorReturn(error);

    console.error("Error fetching ads:", errorReturn);

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
