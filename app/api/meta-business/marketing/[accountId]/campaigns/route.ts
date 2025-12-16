import { NextRequest, NextResponse } from "next/server";

import { metaApiCall } from "@/lib/meta-business/api";
import { errorToGraphErrorReturn } from "@/lib/meta-business/error";
import type {
  Campaign,
  DatePreset,
  GraphApiCampaign,
  GraphApiInsights,
  GraphPaging,
  InsightsMetrics,
  PaginationInfo,
} from "@/lib/meta-business/marketing/types";

// ================================
// Graph API Response Types
// ================================

type GraphApiCampaignsResponse = {
  data: GraphApiCampaign[];
  paging?: GraphPaging;
};

// ================================
// Route Types
// ================================

/**
 * Query parameters for GET /api/meta-business/marketing/[accountId]/campaigns
 */
export type GetCampaignsQueryParams = {
  limit?: string;
  after?: string;
  before?: string;
  datePreset?: DatePreset;
  since?: string;
  until?: string;
};

/**
 * Successful response from GET campaigns endpoint.
 */
export type GetCampaignsResponse = Partial<{
  data: Campaign[];
  pagination: PaginationInfo;
}>;

/**
 * Error response from campaigns endpoint.
 */
export type GetCampaignsErrorResponse = {
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

  // Find conversions and cost per conversion from actions
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
 * Transforms Graph API campaign to camelCase Campaign.
 */
function transformCampaign(campaign: GraphApiCampaign): Campaign {
  return {
    id: campaign.id,
    name: campaign.name,
    status: campaign.status,
    effectiveStatus: campaign.effective_status,
    objective: campaign.objective,
    dailyBudget: campaign.daily_budget,
    lifetimeBudget: campaign.lifetime_budget,
    budgetRemaining: campaign.budget_remaining,
    startTime: campaign.start_time,
    stopTime: campaign.stop_time,
    createdTime: campaign.created_time,
    updatedTime: campaign.updated_time,
    insights: transformInsights(campaign.insights),
  };
}

/**
 * Transforms Graph API paging to PaginationInfo.
 */
function transformPaging(paging?: GraphPaging): PaginationInfo {
  console.log("TODELETE transformPaging", {
    paging,
  });
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
 * GET /api/meta-business/marketing/[accountId]/campaigns
 *
 * Fetches campaigns from a Meta ad account with inline insights.
 *
 * Path Parameters:
 * - accountId: The ad account ID (with or without 'act_' prefix)
 *
 * Query Parameters:
 * - limit: Number of campaigns to return (default: 25, max: 100)
 * - after: Cursor for forward pagination
 * - before: Cursor for backward pagination
 * - datePreset: Predefined date range for insights (e.g., 'last_30d')
 * - since: Start date for insights (YYYY-MM-DD format)
 * - until: End date for insights (YYYY-MM-DD format)
 *
 * Returns:
 * - data: Array of campaigns with insights
 * - pagination: Pagination info with cursors
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ accountId: string }> }
): Promise<NextResponse<GetCampaignsResponse | GetCampaignsErrorResponse>> {
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
      insightsParams.push(
        `(spend,impressions,clicks,reach,cpc,cpm,ctr,cpp,frequency,actions,cost_per_action_type,date_start,date_stop)`
      );
    } else if (since && until) {
      insightsParams.push(`time_range=('since':'${since}','until':'${until}')`);
      insightsParams.push(
        `{spend,impressions,clicks,reach,cpc,cpm,ctr,cpp,frequency,actions,cost_per_action_type,date_start,date_stop}`
      );
    }

    // if (insightsParams.length > 0) {
    //   insightsFields = `insights.${insightsParams.join(
    //     "."
    //   )}{spend,impressions,clicks,reach,cpc,cpm,ctr,cpp,frequency,actions,cost_per_action_type,date_start,date_stop}`;
    // }

    // Build fields parameter
    const fields = [
      "id",
      "name",
      "status",
      "effective_status",
      "objective",
      "daily_budget",
      "lifetime_budget",
      "budget_remaining",
      "start_time",
      "stop_time",
      "created_time",
      "updated_time",
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

    // Ensure account ID has act_ prefix
    const formattedAccountId = accountId.startsWith("act_")
      ? accountId
      : `act_${accountId}`;

    // Make Graph API request
    const response = await metaApiCall<GraphApiCampaignsResponse>({
      domain: "FACEBOOK",
      method: "GET",
      path: `${formattedAccountId}/campaigns`,
      params: queryParams.join("&"),
      accessToken,
    });

    // Transform response to camelCase
    const campaigns = response.data.map(transformCampaign);
    const pagination = transformPaging(response.paging);

    return NextResponse.json(
      {
        data: campaigns,
        pagination,
      },
      { status: 200 }
    );
  } catch (error) {
    // Convert error to standardized GraphErrorReturn format
    const errorReturn = errorToGraphErrorReturn(error);

    console.error("Error fetching campaigns:", errorReturn);

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
