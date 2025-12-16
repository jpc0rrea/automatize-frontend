import { NextRequest, NextResponse } from "next/server";
import { metaApiCall } from "@/lib/meta-business/api";
import { errorToGraphErrorReturn } from "@/lib/meta-business/error";
import type {
  AdSet,
  DatePreset,
  GraphApiAdSet,
  GraphApiInsights,
  GraphPaging,
  InsightsMetrics,
  PaginationInfo,
} from "@/lib/meta-business/marketing/types";

// ================================
// Graph API Response Types
// ================================

type GraphApiAdSetsResponse = {
  data: GraphApiAdSet[];
  paging?: GraphPaging;
};

// ================================
// Route Types
// ================================

/**
 * Query parameters for GET /api/meta-business/marketing/[accountId]/adsets
 */
export type GetAdSetsQueryParams = {
  limit?: string;
  after?: string;
  before?: string;
  datePreset?: DatePreset;
  since?: string;
  until?: string;
  campaignId?: string;
};

/**
 * Successful response from GET adsets endpoint.
 */
export type GetAdSetsResponse = Partial<{
  data: AdSet[];
  pagination: PaginationInfo;
}>;

/**
 * Error response from adsets endpoint.
 */
export type GetAdSetsErrorResponse = {
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
 * GET /api/meta-business/marketing/[accountId]/adsets
 *
 * Fetches ad sets from a Meta ad account with inline insights.
 *
 * Path Parameters:
 * - accountId: The ad account ID (with or without 'act_' prefix)
 *
 * Query Parameters:
 * - limit: Number of adsets to return (default: 25, max: 100)
 * - after: Cursor for forward pagination
 * - before: Cursor for backward pagination
 * - datePreset: Predefined date range for insights (e.g., 'last_30d')
 * - since: Start date for insights (YYYY-MM-DD format)
 * - until: End date for insights (YYYY-MM-DD format)
 * - campaignId: Filter adsets by campaign ID (optional)
 *
 * Returns:
 * - data: Array of ad sets with insights
 * - pagination: Pagination info with cursors
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ accountId: string }> }
): Promise<NextResponse<GetAdSetsResponse | GetAdSetsErrorResponse>> {
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

    // Add campaign filter if provided
    if (campaignIdFilter) {
      queryParams.push(
        `filtering=[{"field":"campaign.id","operator":"EQUAL","value":"${campaignIdFilter}"}]`
      );
    }

    // Ensure account ID has act_ prefix
    const formattedAccountId = accountId.startsWith("act_")
      ? accountId
      : `act_${accountId}`;

    // Make Graph API request
    const response = await metaApiCall<GraphApiAdSetsResponse>({
      domain: "FACEBOOK",
      method: "GET",
      path: `${formattedAccountId}/adsets`,
      params: queryParams.join("&"),
      accessToken,
    });

    // Transform response to camelCase
    const adsets = response.data.map(transformAdSet);
    const pagination = transformPaging(response.paging);

    return NextResponse.json(
      {
        data: adsets,
        pagination,
      },
      { status: 200 }
    );
  } catch (error) {
    // Convert error to standardized GraphErrorReturn format
    const errorReturn = errorToGraphErrorReturn(error);

    console.error("Error fetching adsets:", errorReturn);

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
