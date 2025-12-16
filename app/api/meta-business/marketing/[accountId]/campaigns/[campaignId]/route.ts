import { NextRequest, NextResponse } from "next/server";
import { metaApiCall } from "@/lib/meta-business/api";
import { errorToGraphErrorReturn } from "@/lib/meta-business/error";
import type {
  AdSet,
  Campaign,
  GraphApiAdSet,
  GraphApiCampaign,
  GraphApiInsights,
  GraphPaging,
  InsightsMetrics,
  PaginationInfo,
} from "@/lib/meta-business/marketing/types";

// ================================
// Route Types
// ================================

/**
 * Query parameters for GET /api/meta-business/marketing/[accountId]/campaigns/[campaignId]
 */
export type GetCampaignQueryParams = {
  adsetsLimit?: string;
  adsetsAfter?: string;
};

/**
 * Successful response from GET campaign detail endpoint.
 */
export type GetCampaignResponse = Partial<{
  campaign: Campaign;
  adsets: AdSet[];
  adsetsPagination: PaginationInfo;
}>;

/**
 * Error response from campaign endpoint.
 */
export type GetCampaignErrorResponse = {
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
 * GET /api/meta-business/marketing/[accountId]/campaigns/[campaignId]
 *
 * Fetches a single campaign with its ad sets.
 *
 * Path Parameters:
 * - accountId: The ad account ID (for validation/context)
 * - campaignId: The campaign ID
 *
 * Query Parameters:
 * - adsetsLimit: Number of adsets to return (default: 25, max: 100)
 * - adsetsAfter: Cursor for adsets pagination
 *
 * Returns:
 * - campaign: Campaign details with insights
 * - adsets: Array of ad sets in this campaign
 * - adsetsPagination: Pagination info for adsets
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ accountId: string; campaignId: string }> }
): Promise<NextResponse<GetCampaignResponse | GetCampaignErrorResponse>> {
  try {
    const { campaignId } = await params;

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
    const adsetsLimitParam = searchParams.get("adsetsLimit");
    const adsetsAfter = searchParams.get("adsetsAfter");

    // Validate and set limit (default: 25, max: 100)
    let adsetsLimit = 25;
    if (adsetsLimitParam) {
      const parsedLimit = Number.parseInt(adsetsLimitParam, 10);
      if (!Number.isNaN(parsedLimit) && parsedLimit > 0) {
        adsetsLimit = Math.min(parsedLimit, 100);
      }
    }

    // Build adsets subquery
    let adsetsSubquery = `adsets.limit(${adsetsLimit})`;
    if (adsetsAfter) {
      adsetsSubquery = `adsets.limit(${adsetsLimit}).after(${adsetsAfter})`;
    }

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
      "insights{spend,impressions,clicks,reach,cpc,cpm,ctr,cpp,frequency,actions,cost_per_action_type,date_start,date_stop}",
      `${adsetsSubquery}{id,name,status,effective_status,campaign_id,daily_budget,lifetime_budget,budget_remaining,start_time,end_time,created_time,updated_time,optimization_goal,billing_event,bid_amount,insights{spend,impressions,clicks,reach,cpc,cpm,ctr,date_start,date_stop}}`,
    ].join(",");

    // Make Graph API request
    const response = await metaApiCall<GraphApiCampaign>({
      domain: "FACEBOOK",
      method: "GET",
      path: campaignId,
      params: `fields=${fields}`,
      accessToken,
    });

    // Transform response to camelCase
    const campaign = transformCampaign(response);
    const adsets = response.adsets?.data?.map(transformAdSet) ?? [];
    const adsetsPagination = transformPaging(response.adsets?.paging);

    return NextResponse.json(
      {
        campaign,
        adsets,
        adsetsPagination,
      },
      { status: 200 }
    );
  } catch (error) {
    // Convert error to standardized GraphErrorReturn format
    const errorReturn = errorToGraphErrorReturn(error);

    console.error("Error fetching campaign:", errorReturn);

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
