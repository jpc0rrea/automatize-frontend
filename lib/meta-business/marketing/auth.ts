import { graphFacebookBaseUrl, graphApiVersion } from "../constant";

// Facebook OAuth URLs
const FACEBOOK_AUTH_URL = "https://www.facebook.com";
const FACEBOOK_GRAPH_URL = graphFacebookBaseUrl;

// Required scopes for Marketing API access
export const MARKETING_SCOPES = [
  "read_insights",
  "ads_management",
  "ads_read",
  "business_management",
  "public_profile",
] as const;

/**
 * Get Meta Marketing configuration from environment variables
 */
function getMetaMarketingConfig() {
  const appId = process.env.NEXT_PUBLIC_META_GENERAL_APP_ID;
  const appSecret = process.env.META_GENERAL_APP_SECRET;
  const redirectUri = process.env.NEXT_PUBLIC_META_MARKETING_REDIRECT_URI;

  if (!appId || !appSecret || !redirectUri) {
    throw new Error(
      "Missing Meta Marketing configuration. Please set NEXT_PUBLIC_META_GENERAL_APP_ID, META_GENERAL_APP_SECRET, and NEXT_PUBLIC_META_MARKETING_REDIRECT_URI environment variables."
    );
  }

  return { appId, appSecret, redirectUri };
}

/**
 * Generate the Facebook OAuth authorization URL for Marketing API
 * Uses Facebook Login for Business with marketing permissions
 *
 * @param state - Optional state parameter to maintain state between request and callback
 * @returns The authorization URL to redirect users to
 */
export function generateMarketingAuthUrl(state?: string): string {
  const { appId, redirectUri } = getMetaMarketingConfig();

  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: redirectUri,
    scope: MARKETING_SCOPES.join(","),
    response_type: "code",
    // auth_type: "rerequest", // Uncomment to force re-authorization
    ...(state && { state }),
  });

  return `${FACEBOOK_AUTH_URL}/${graphApiVersion}/dialog/oauth?${params.toString()}`;
}

/**
 * Exchange authorization code for short-lived access token
 *
 * @param code - The authorization code received from Facebook
 * @returns Access token and expiration time
 */
export async function exchangeCodeForToken(code: string): Promise<{
  access_token: string;
  token_type: string;
  expires_in: number;
}> {
  const { appId, appSecret, redirectUri } = getMetaMarketingConfig();

  const params = new URLSearchParams({
    client_id: appId,
    client_secret: appSecret,
    redirect_uri: redirectUri,
    code,
  });

  const response = await fetch(
    `${FACEBOOK_GRAPH_URL}/${graphApiVersion}/oauth/access_token?${params.toString()}`
  );

  const data = await response.json();

  if (!response.ok || data.error) {
    console.error("Error exchanging code for token:", data);
    throw new Error(
      data.error?.message ?? data.error_description ?? "Failed to exchange code for token"
    );
  }

  return {
    access_token: data.access_token,
    token_type: data.token_type ?? "bearer",
    expires_in: data.expires_in ?? 3600, // Default to 1 hour if not provided
  };
}

/**
 * Exchange short-lived token for long-lived token
 * Long-lived tokens are valid for ~60 days
 *
 * @param shortLivedToken - The short-lived access token
 * @returns Long-lived access token and expiration time
 */
export async function getLongLivedToken(shortLivedToken: string): Promise<{
  access_token: string;
  token_type: string;
  expires_in: number;
}> {
  const { appId, appSecret } = getMetaMarketingConfig();

  const params = new URLSearchParams({
    grant_type: "fb_exchange_token",
    client_id: appId,
    client_secret: appSecret,
    fb_exchange_token: shortLivedToken,
  });

  const response = await fetch(
    `${FACEBOOK_GRAPH_URL}/${graphApiVersion}/oauth/access_token?${params.toString()}`
  );

  const data = await response.json();

  if (!response.ok || data.error) {
    console.error("Error getting long-lived token:", data);
    throw new Error(data.error?.message ?? "Failed to get long-lived token");
  }

  return {
    access_token: data.access_token,
    token_type: data.token_type ?? "bearer",
    expires_in: data.expires_in ?? 5184000, // Default to 60 days if not provided
  };
}

/**
 * Facebook user profile response type
 */
export type FacebookUserProfile = {
  id: string;
  name?: string;
  picture?: {
    data: {
      url: string;
      is_silhouette: boolean;
      height: number;
      width: number;
    };
  };
};

/**
 * Get Facebook user profile information
 *
 * @param accessToken - The access token
 * @returns User profile data
 */
export async function getFacebookUserProfile(
  accessToken: string
): Promise<FacebookUserProfile> {
  const params = new URLSearchParams({
    fields: "id,name,picture",
    access_token: accessToken,
  });

  const response = await fetch(
    `${FACEBOOK_GRAPH_URL}/${graphApiVersion}/me?${params.toString()}`
  );

  const data = await response.json();

  if (!response.ok || data.error) {
    console.error("Error fetching user profile:", data);
    throw new Error(data.error?.message ?? "Failed to get user profile");
  }

  return data;
}

/**
 * Ad account from Facebook Graph API
 */
export type FacebookAdAccount = {
  id: string; // Format: "act_123456789"
  account_id: string; // Format: "123456789"
  name: string;
  currency?: string;
  timezone_id?: string;
  timezone_name?: string;
  account_status?: number;
};

/**
 * Response from fetching ad accounts
 */
export type FacebookAdAccountsResponse = {
  data: FacebookAdAccount[];
  paging?: {
    cursors: {
      before: string;
      after: string;
    };
    next?: string;
  };
};

/**
 * Get user's ad accounts from Facebook
 *
 * @param accessToken - The access token
 * @returns List of ad accounts the user has access to
 */
export async function getAdAccounts(
  accessToken: string
): Promise<FacebookAdAccountsResponse> {
  const params = new URLSearchParams({
    fields: "id,account_id,name,currency,timezone_id,timezone_name,account_status",
    access_token: accessToken,
  });

  const response = await fetch(
    `${FACEBOOK_GRAPH_URL}/${graphApiVersion}/me/adaccounts?${params.toString()}`
  );

  const data = await response.json();

  if (!response.ok || data.error) {
    console.error("Error fetching ad accounts:", data);
    throw new Error(data.error?.message ?? "Failed to get ad accounts");
  }

  return data;
}

/**
 * Refresh a long-lived token
 * Can only be refreshed when token has not expired
 *
 * @param currentToken - The current long-lived token
 * @returns New access token and expiration time
 */
export async function refreshLongLivedToken(currentToken: string): Promise<{
  access_token: string;
  token_type: string;
  expires_in: number;
}> {
  const { appId, appSecret } = getMetaMarketingConfig();

  const params = new URLSearchParams({
    grant_type: "fb_exchange_token",
    client_id: appId,
    client_secret: appSecret,
    fb_exchange_token: currentToken,
  });

  const response = await fetch(
    `${FACEBOOK_GRAPH_URL}/${graphApiVersion}/oauth/access_token?${params.toString()}`
  );

  const data = await response.json();

  if (!response.ok || data.error) {
    console.error("Error refreshing token:", data);
    throw new Error(data.error?.message ?? "Failed to refresh token");
  }

  return {
    access_token: data.access_token,
    token_type: data.token_type ?? "bearer",
    expires_in: data.expires_in ?? 5184000,
  };
}

/**
 * Debug/inspect an access token to get information about it
 *
 * @param accessToken - The access token to inspect
 * @returns Token debug information
 */
export async function debugToken(accessToken: string): Promise<{
  app_id: string;
  type: string;
  application: string;
  data_access_expires_at: number;
  expires_at: number;
  is_valid: boolean;
  scopes: string[];
  user_id: string;
}> {
  const { appId, appSecret } = getMetaMarketingConfig();

  const params = new URLSearchParams({
    input_token: accessToken,
    access_token: `${appId}|${appSecret}`,
  });

  const response = await fetch(
    `${FACEBOOK_GRAPH_URL}/${graphApiVersion}/debug_token?${params.toString()}`
  );

  const data = await response.json();

  if (!response.ok || data.error) {
    console.error("Error debugging token:", data);
    throw new Error(data.error?.message ?? "Failed to debug token");
  }

  return data.data;
}

