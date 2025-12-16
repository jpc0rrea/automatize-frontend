import { NextRequest, NextResponse } from "next/server";
import { metaApiCall } from "@/lib/meta-business/api";
import { errorToGraphErrorReturn } from "@/lib/meta-business/error";
import type {
  DatePreset,
  GraphApiInsights,
  InsightsMetrics,
  TimeIncrement,
} from "@/lib/meta-business/marketing/types";

// ================================
// Graph API Response Types
// ================================

type GraphApiInsightsResponse = {
  data: GraphApiInsights[];
};

// ================================
// Route Types
// ================================

/**
 * Query parameters for GET campaign insights endpoint.
 */
export type GetCampaignInsightsQueryParams = {
  datePreset?: DatePreset;
  since?: string;
  until?: string;
  timeIncrement?: TimeIncrement;
};

/**
 * Successful response from GET campaign insights endpoint.
 */
export type GetCampaignInsightsResponse = Partial<{
  campaignId: string;
  insights?: InsightsMetrics;
  insightsArray?: InsightsMetrics[];
}>;

/**
 * Error response from campaign insights endpoint.
 */
export type GetCampaignInsightsErrorResponse = {
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
function transformInsights(data: GraphApiInsights): InsightsMetrics {
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

// ================================
// Route Handler
// ================================

/**
 * GET /api/meta-business/marketing/[accountId]/campaigns/[campaignId]/insights
 *
 * Fetches insights for a specific campaign with date filtering.
 *
 * Path Parameters:
 * - accountId: The ad account ID (for validation/context)
 * - campaignId: The campaign ID
 *
 * Query Parameters:
 * - datePreset: Predefined date range (e.g., 'last_30d', 'this_month')
 * - since: Start date for custom range (YYYY-MM-DD format)
 * - until: End date for custom range (YYYY-MM-DD format)
 * - timeIncrement: Time breakdown (e.g., 'day', 'week', 'month', 'quarterly')
 *
 * Note: Either datePreset OR (since + until) should be provided.
 * If none provided, defaults to lifetime.
 * When timeIncrement is provided, returns insightsArray with one entry per period.
 *
 * Returns:
 * - campaignId: The campaign ID
 * - insights: Full insights metrics for the period (when timeIncrement is not provided)
 * - insightsArray: Array of insights metrics per time period (when timeIncrement is provided)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ accountId: string; campaignId: string }> }
): Promise<
  NextResponse<GetCampaignInsightsResponse | GetCampaignInsightsErrorResponse>
> {
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
    const datePreset = searchParams.get("datePreset");
    const since = searchParams.get("since");
    const until = searchParams.get("until");
    const timeIncrement = searchParams.get("timeIncrement");

    // Build fields parameter
    const fields = [
      "spend",
      "impressions",
      "clicks",
      "reach",
      "cpc",
      "cpm",
      "ctr",
      "cpp",
      "frequency",
      "actions",
      "cost_per_action_type",
      "date_start",
      "date_stop",
    ].join(",");

    // Build query params
    const queryParams: string[] = [`fields=${fields}`];

    // Add date filtering
    if (datePreset) {
      queryParams.push(`date_preset=${datePreset}`);
    } else if (since && until) {
      queryParams.push(`time_range={"since":"${since}","until":"${until}"}`);
    }

    if (timeIncrement) {
      queryParams.push(`time_increment=${timeIncrement}`);
    }

    // Make Graph API request
    const response = await metaApiCall<GraphApiInsightsResponse>({
      domain: "FACEBOOK",
      method: "GET",
      path: `${campaignId}/insights`,
      params: queryParams.join("&"),
      accessToken,
    });

    // Transform response
    // When timeIncrement is provided, return array; otherwise return single object
    if (timeIncrement && response.data && response.data.length > 0) {
      const insightsArray = response.data.map(transformInsights);
      return NextResponse.json(
        {
          campaignId,
          insightsArray,
        },
        { status: 200 }
      );
    }

    // Single insights object (no time increment)
    const insights = response.data?.[0]
      ? transformInsights(response.data[0])
      : undefined;

    return NextResponse.json(
      {
        campaignId,
        insights,
      },
      { status: 200 }
    );
  } catch (error) {
    // Convert error to standardized GraphErrorReturn format
    const errorReturn = errorToGraphErrorReturn(error);

    console.error("Error fetching campaign insights:", errorReturn);

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
