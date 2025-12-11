import crypto from "node:crypto";

// Instagram Business Login configuration
const INSTAGRAM_GRAPH_URL = "https://graph.instagram.com";
const INSTAGRAM_AUTH_URL = "https://www.instagram.com/oauth/authorize";
const INSTAGRAM_TOKEN_URL = "https://api.instagram.com/oauth/access_token";
const INSTAGRAM_LONG_LIVED_TOKEN_URL = `${INSTAGRAM_GRAPH_URL}/access_token`;

// Environment variables
function getInstagramConfig() {
  const appId = process.env.NEXT_PUBLIC_INSTAGRAM_APP_ID;
  const appSecret = process.env.INSTAGRAM_APP_SECRET;
  const redirectUri = process.env.NEXT_PUBLIC_INSTAGRAM_REDIRECT_URI;
  const webhookVerifyToken = process.env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN;

  if (!appId || !appSecret || !redirectUri) {
    throw new Error(
      "Missing Instagram configuration. Please set NEXT_PUBLIC_INSTAGRAM_APP_ID, INSTAGRAM_APP_SECRET, and NEXT_PUBLIC_INSTAGRAM_REDIRECT_URI environment variables."
    );
  }

  return { appId, appSecret, redirectUri, webhookVerifyToken };
}

/**
 * Generate the Instagram OAuth authorization URL
 * Uses Business Login for Instagram with instagram_business_basic permission
 */
export function generateAuthUrl(state?: string): string {
  console.log("TODELETE: generateAuthUrl - Starting to generate auth URL");

  const { appId, redirectUri } = getInstagramConfig();

  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: redirectUri,
    scope:
      "instagram_business_basic,instagram_business_manage_messages,instagram_business_manage_comments,instagram_business_content_publish,instagram_business_manage_insights",
    response_type: "code",
    force_reauth: "true",
    ...(state && { state }),
  });

  const authUrl = `${INSTAGRAM_AUTH_URL}?${params.toString()}`;
  console.log("TODELETE: generateAuthUrl - Generated URL:", authUrl);

  return authUrl;
}

/**
 * Exchange authorization code for short-lived access token
 */
export async function exchangeCodeForToken(code: string): Promise<{
  access_token: string;
  user_id: string;
}> {
  console.log("TODELETE: exchangeCodeForToken - Starting token exchange");
  console.log(
    "TODELETE: exchangeCodeForToken - Code received:",
    code.substring(0, 20) + "..."
  );

  const { appId, appSecret, redirectUri } = getInstagramConfig();

  console.log("TODELETE: exchangeCodeForToken - Config loaded:", {
    appId,
    redirectUri,
    hasAppSecret: !!appSecret,
    codeLength: code.length,
  });

  console.log(
    "TODELETE: exchangeCodeForToken - Making request to Instagram token endpoint"
  );
  console.log("TODELETE: exchangeCodeForToken - Using redirectUri:", redirectUri);
  console.log("TODELETE: exchangeCodeForToken - Using appId:", appId);

  const response = await fetch(INSTAGRAM_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: appId,
      client_secret: appSecret,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
      code,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    console.error(
      "TODELETE: exchangeCodeForToken - Error during token exchange"
    );
    console.error(
      "TODELETE: exchangeCodeForToken - Response status:",
      response.status
    );
    console.error(
      "TODELETE: exchangeCodeForToken - Response data:",
      JSON.stringify(data, null, 2)
    );
    console.error(
      "TODELETE: exchangeCodeForToken - Request config:",
      {
        url: INSTAGRAM_TOKEN_URL,
        redirectUri,
        appId,
      }
    );
    throw new Error(data.error_message ?? "Failed to exchange code for token");
  }

  console.log("TODELETE: exchangeCodeForToken - Token exchange successful");
  console.log("TODELETE: exchangeCodeForToken - User ID:", {
    userId: data.user_id,
    responseData: data,
  });

  return {
    access_token: data.access_token,
    user_id: data.user_id.toString(),
  };
}

/**
 * Exchange short-lived token for long-lived token
 * Long-lived tokens are valid for 60 days
 */
export async function getLongLivedToken(shortLivedToken: string): Promise<{
  access_token: string;
  token_type: string;
  expires_in: number;
}> {
  
  const { appSecret } = getInstagramConfig();

  const url = new URL(INSTAGRAM_LONG_LIVED_TOKEN_URL);
  url.searchParams.set("grant_type", "ig_exchange_token");
  url.searchParams.set("client_secret", appSecret);
  url.searchParams.set("access_token", shortLivedToken);

  console.log(
    "TODELETE: getLongLivedToken - Starting long-lived token exchange",
    {
      url: url.toString(),
      params: {
        grant_type: "ig_exchange_token",
        client_secret: appSecret,
        access_token: shortLivedToken,
      },
    }
  );

  const response = await fetch(url);
  const data = await response.json();

  if (!response.ok) {
    console.error(
      "TODELETE: getLongLivedToken - Error getting long-lived token"
    );
    console.error("TODELETE: getLongLivedToken - Response data:", data);
    throw new Error(data.error?.message ?? "Failed to get long-lived token");
  }

  console.log(
    "TODELETE: getLongLivedToken - Long-lived token obtained successfully"
  );
  console.log(
    "TODELETE: getLongLivedToken - Expires in:",
    data.expires_in,
    "seconds"
  );

  return {
    access_token: data.access_token,
    token_type: data.token_type,
    expires_in: data.expires_in,
  };
}

/**
 * Refresh a long-lived token
 * Can only be refreshed when token is at least 24 hours old but not expired
 */
export async function refreshLongLivedToken(currentToken: string): Promise<{
  access_token: string;
  token_type: string;
  expires_in: number;
}> {
  console.log("TODELETE: refreshLongLivedToken - Starting token refresh");

  const url = new URL(INSTAGRAM_LONG_LIVED_TOKEN_URL);
  url.searchParams.set("grant_type", "ig_refresh_token");
  url.searchParams.set("access_token", currentToken);

  const response = await fetch(url);
  const data = await response.json();

  if (!response.ok) {
    console.error(
      "TODELETE: refreshLongLivedToken - Error refreshing token"
    );
    console.error("TODELETE: refreshLongLivedToken - Response data:", data);
    throw new Error(data.error?.message ?? "Failed to refresh token");
  }

  console.log(
    "TODELETE: refreshLongLivedToken - Token refreshed successfully"
  );
  console.log(
    "TODELETE: refreshLongLivedToken - New expiry:",
    data.expires_in,
    "seconds"
  );

  return {
    access_token: data.access_token,
    token_type: data.token_type,
    expires_in: data.expires_in,
  };
}

/**
 * Instagram user profile response type
 */
export type InstagramUserProfile = {
  id: string;
  name?: string;
  username?: string;
  website?: string;
  biography?: string;
  profile_picture_url?: string;
  media_count?: number;
};

/**
 * Get Instagram user profile information
 */
export async function getUserProfile(
  accessToken: string,
): Promise<InstagramUserProfile> {
  console.log("TODELETE: getUserProfile - Fetching user profile");

  // First get the user ID from /me endpoint
  const meUrl = new URL(`${INSTAGRAM_GRAPH_URL}/me`);
  meUrl.searchParams.set("fields", "id");
  meUrl.searchParams.set("access_token", accessToken);

  const meResponse = await fetch(meUrl);
  const meData = await meResponse.json();

  if (!meResponse.ok) {
    console.error("TODELETE: getUserProfile - Error fetching /me");
    console.error("TODELETE: getUserProfile - Response data:", meData);
    throw new Error(meData.error?.message ?? "Failed to get user profile");
  }

  console.log("TODELETE: getUserProfile - Got user ID:", meData.id);

  // Now fetch full profile with all available fields
  const profileUrl = new URL(`${INSTAGRAM_GRAPH_URL}/${meData.id}`);
  profileUrl.searchParams.set(
    "fields",
    "id,name,username,website,biography,profile_picture_url,media_count"
  );
  profileUrl.searchParams.set("access_token", accessToken);

  const profileResponse = await fetch(profileUrl);
  const profileData = await profileResponse.json();

  if (!profileResponse.ok) {
    console.error("TODELETE: getUserProfile - Error fetching profile info");
    console.error("TODELETE: getUserProfile - Response data:", profileData);
    throw new Error(profileData.error?.message ?? "Failed to get user profile info");
  }

  console.log("TODELETE: getUserProfile - Profile fetched successfully");
  console.log("TODELETE: getUserProfile - Profile data:", profileData);

  return profileData;
}

/**
 * Subscribe to Instagram webhooks for a user
 * POST /{ig-user-id}/subscribed_apps
 */
export async function subscribeToWebhooks(
  accessToken: string,
  userId: string,
  subscribedFields: string[]
): Promise<boolean> {
  console.log(
    "TODELETE: subscribeToWebhooks - Subscribing to webhooks for user:",
    userId
  );
  console.log(
    "TODELETE: subscribeToWebhooks - Fields:",
    subscribedFields.join(", ")
  );

  const response = await fetch(
    `${INSTAGRAM_GRAPH_URL}/${userId}/subscribed_apps`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        subscribed_fields: subscribedFields.join(","),
        access_token: accessToken,
      }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    console.error("TODELETE: subscribeToWebhooks - Error subscribing");
    console.error("TODELETE: subscribeToWebhooks - Response data:", data);
    throw new Error(data.error?.message ?? "Failed to subscribe to webhooks");
  }

  console.log(
    "TODELETE: subscribeToWebhooks - Subscription successful:",
    data
  );
  return data.success === true;
}

/**
 * Verify webhook signature from Meta
 * Uses SHA256 HMAC with app secret
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string
): boolean {
  console.log(
    "TODELETE: verifyWebhookSignature - Starting signature verification"
  );

  const { appSecret } = getInstagramConfig();

  // Signature format: sha256=<hash>
  const expectedSignature = signature.replace("sha256=", "");

  const hmac = crypto.createHmac("sha256", appSecret);
  hmac.update(payload);
  const calculatedSignature = hmac.digest("hex");

  const isValid = crypto.timingSafeEqual(
    Buffer.from(expectedSignature),
    Buffer.from(calculatedSignature)
  );

  console.log("TODELETE: verifyWebhookSignature - Signature valid:", isValid);

  return isValid;
}

/**
 * Verify webhook verification request from Meta
 */
export function verifyWebhookChallenge(
  mode: string,
  token: string,
  challenge: string
): string | null {
  console.log("TODELETE: verifyWebhookChallenge - Verifying webhook challenge");
  console.log("TODELETE: verifyWebhookChallenge - Mode:", mode);
  console.log("TODELETE: verifyWebhookChallenge - Token received:", token);

  const { webhookVerifyToken } = getInstagramConfig();

  if (mode === "subscribe" && token === webhookVerifyToken) {
    console.log(
      "TODELETE: verifyWebhookChallenge - Challenge verified successfully"
    );
    return challenge;
  }

  console.log(
    "TODELETE: verifyWebhookChallenge - Challenge verification failed"
  );
  console.log(
    "TODELETE: verifyWebhookChallenge - Expected token:",
    webhookVerifyToken
  );

  return null;
}

// Webhook field types for Business Login for Instagram
export const WEBHOOK_FIELDS = {
  MESSAGES: "messages",
  MESSAGING_SEEN: "messaging_seen",
  MESSAGE_EDIT: "message_edit",
  MESSAGING_REFERRAL: "messaging_referral",
  COMMENTS: "comments",
  LIVE_COMMENTS: "live_comments",
  STORY_INSIGHTS: "story_insights",
} as const;

// All webhook fields to subscribe to
export const ALL_WEBHOOK_FIELDS = Object.values(WEBHOOK_FIELDS);

// Types for webhook payloads
export type InstagramWebhookEntry = {
  id: string;
  time: number;
  messaging?: InstagramMessagingEvent[];
  field?: string;
  value?: Record<string, unknown>;
  changes?: Array<{
    field: string;
    value: Record<string, unknown>;
  }>;
};

export type InstagramMessagingEvent = {
  sender: { id: string };
  recipient: { id: string };
  timestamp: number;
  message?: {
    mid: string;
    text?: string;
    attachments?: Array<{
      type: string;
      payload: { url: string };
    }>;
    is_echo?: boolean;
    is_deleted?: boolean;
    is_unsupported?: boolean;
    quick_reply?: { payload: string };
    reply_to?: { mid: string } | { story: { url: string; id: string } };
    referral?: {
      ref?: string;
      ad_id?: string;
      source?: string;
      type?: string;
      ads_context_data?: {
        ad_title?: string;
        photo_url?: string;
        video_url?: string;
      };
    };
  };
  read?: { mid: string };
  message_edit?: {
    mid: string;
    text: string;
    num_edit: number;
  };
  postback?: {
    mid: string;
    title: string;
    payload: string;
  };
  referral?: {
    ref?: string;
    source?: string;
    type?: string;
  };
};

export type InstagramWebhookPayload = {
  object: "instagram";
  entry: InstagramWebhookEntry[];
};
