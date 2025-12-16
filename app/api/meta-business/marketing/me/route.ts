import { NextRequest, NextResponse } from "next/server";
import { metaApiCall } from "@/lib/meta-business/api";
import { errorToGraphErrorReturn } from "@/lib/meta-business/error";

// ================================
// Graph API Response Types (snake_case)
// ================================

type GraphApiAdAccount = {
  id: string;
  name: string;
  account_id: string;
};

type GraphApiAdAccounts = {
  data: GraphApiAdAccount[];
  paging: {
    cursors: {
      before: string;
      after: string;
    };
  };
};

type GraphApiPicture = {
  data: {
    height: number;
    is_silhouette: boolean;
    url: string;
    width: number;
  };
};

type GraphApiMeResponse = {
  id: string;
  name: string;
  adaccounts: GraphApiAdAccounts;
  picture?: GraphApiPicture;
};

// ================================
// Route Types (camelCase)
// ================================

export type AdAccount = {
  id: string;
  name: string;
  accountId: string;
};

export type AdAccounts = {
  data: AdAccount[];
  paging: {
    cursors: {
      before: string;
      after: string;
    };
  };
};

export type GetMeResponse = Partial<{
  id: string;
  name: string;
  adAccounts: AdAccounts;
  pictureUrl: string;
}>;

export type GetMeErrorResponse = {
  error: string;
  message: string;
  solution?: string;
};

/**
 * GET /api/meta-business/marketing/me
 *
 * Fetches information about the authenticated user from Facebook Graph API.
 * Returns user ID, name, ad accounts, and picture URL (when available).
 *
 * Returns:
 * - id: User ID
 * - name: User name
 * - adAccounts: User's ad accounts with pagination (includes id, name, accountId)
 * - pictureUrl: User's profile picture URL (when available)
 */
export async function GET(
  _request: NextRequest
): Promise<NextResponse<GetMeResponse | GetMeErrorResponse>> {
  try {
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

    // Make Graph API request
    const response = await metaApiCall<GraphApiMeResponse>({
      domain: "FACEBOOK",
      method: "GET",
      path: "me",
      params: "fields=id,name,adaccounts{id,name,account_id},picture",
      accessToken,
    });

    // Transform response to camelCase
    const camelCaseResponse: GetMeResponse = {
      id: response.id,
      name: response.name,
      adAccounts: {
        data: response.adaccounts.data.map((account) => ({
          id: account.id,
          name: account.name,
          accountId: account.account_id,
        })),
        paging: {
          cursors: {
            before: response.adaccounts.paging.cursors.before,
            after: response.adaccounts.paging.cursors.after,
          },
        },
      },
    };

    // Add picture URL if available and not a silhouette
    if (response.picture?.data?.url && !response.picture.data.is_silhouette) {
      camelCaseResponse.pictureUrl = response.picture.data.url;
    }

    return NextResponse.json(camelCaseResponse, { status: 200 });
  } catch (error) {
    // Convert error to standardized GraphErrorReturn format
    const errorReturn = errorToGraphErrorReturn(error);

    // Log for debugging
    console.error("Error fetching user information:", errorReturn);

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
