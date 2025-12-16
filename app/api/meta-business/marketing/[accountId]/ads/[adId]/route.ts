import { NextRequest, NextResponse } from "next/server";
import { metaApiCall } from "@/lib/meta-business/api";
import { errorToGraphErrorReturn } from "@/lib/meta-business/error";
import type {
  Ad,
  AdCreative,
  GraphApiAd,
  GraphApiInsights,
  InsightsMetrics,
} from "@/lib/meta-business/marketing/types";

// ================================
// Route Types
// ================================

/**
 * Successful response from GET ad detail endpoint.
 */
export type GetAdResponse = Partial<{
  ad: Ad;
}>;

/**
 * Error response from ad endpoint.
 */
export type GetAdErrorResponse = {
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
function transformInsights(
  insights?: { data: GraphApiInsights[] }
): InsightsMetrics | undefined {
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

// ================================
// Route Handler
// ================================

/**
 * GET /api/meta-business/marketing/[accountId]/ads/[adId]
 *
 * Fetches a single ad with its details.
 *
 * Path Parameters:
 * - accountId: The ad account ID (for validation/context)
 * - adId: The ad ID
 *
 * Returns:
 * - ad: Ad details with creative info and insights
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ accountId: string; adId: string }> }
): Promise<NextResponse<GetAdResponse | GetAdErrorResponse>> {
  try {
    const { adId } = await params;

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
      "insights{spend,impressions,clicks,reach,cpc,cpm,ctr,cpp,frequency,actions,cost_per_action_type,date_start,date_stop}",
    ].join(",");

    // Make Graph API request
    const response = await metaApiCall<GraphApiAd>({
      domain: "FACEBOOK",
      method: "GET",
      path: adId,
      params: `fields=${fields}`,
      accessToken,
    });

    // Transform response to camelCase
    const ad = transformAd(response);

    return NextResponse.json(
      {
        ad,
      },
      { status: 200 }
    );
  } catch (error) {
    // Convert error to standardized GraphErrorReturn format
    const errorReturn = errorToGraphErrorReturn(error);

    console.error("Error fetching ad:", errorReturn);

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

