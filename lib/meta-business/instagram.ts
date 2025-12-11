import crypto from "node:crypto";
import axios from "axios";

// Instagram Business Login configuration
const INSTAGRAM_GRAPH_URL = "https://graph.instagram.com";
const INSTAGRAM_AUTH_URL = "https://www.instagram.com/oauth/authorize";
const INSTAGRAM_TOKEN_URL = "https://api.instagram.com/oauth/access_token";
const INSTAGRAM_LONG_LIVED_TOKEN_URL = `${INSTAGRAM_GRAPH_URL}/access_token`;

// Environment variables
function getInstagramConfig() {
  const appId = process.env.INSTAGRAM_APP_ID;
  const appSecret = process.env.INSTAGRAM_APP_SECRET;
  const redirectUri = process.env.INSTAGRAM_REDIRECT_URI;
  const webhookVerifyToken = process.env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN;

  if (!appId || !appSecret || !redirectUri) {
    throw new Error(
      "Missing Instagram configuration. Please set INSTAGRAM_APP_ID, INSTAGRAM_APP_SECRET, and INSTAGRAM_REDIRECT_URI environment variables."
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
      "instagram_business_basic,instagram_business_manage_messages,instagram_business_manage_comments,instagram_business_content_publish",
    response_type: "code",
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

  try {
    console.log(
      "TODELETE: exchangeCodeForToken - Making request to Instagram token endpoint"
    );

    const response = await axios.post(
      INSTAGRAM_TOKEN_URL,
      new URLSearchParams({
        client_id: appId,
        client_secret: appSecret,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
        code,
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    console.log("TODELETE: exchangeCodeForToken - Token exchange successful");
    console.log("TODELETE: exchangeCodeForToken - User ID:", {
      userId: response.data.user_id,
      responseData: response.data,
    });

    return {
      access_token: response.data.access_token,
      user_id: response.data.user_id.toString(),
    };
  } catch (error) {
    console.error(
      "TODELETE: exchangeCodeForToken - Error during token exchange:",
      error
    );
    if (axios.isAxiosError(error)) {
      console.error(
        "TODELETE: exchangeCodeForToken - Response data:",
        error.response?.data
      );
    }
    throw error;
  }
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
  console.log(
    "TODELETE: getLongLivedToken - Starting long-lived token exchange"
  );

  const { appSecret } = getInstagramConfig();

  try {
    const response = await axios.get(INSTAGRAM_LONG_LIVED_TOKEN_URL, {
      params: {
        grant_type: "ig_exchange_token",
        client_secret: appSecret,
        access_token: shortLivedToken,
      },
    });

    console.log(
      "TODELETE: getLongLivedToken - Long-lived token obtained successfully"
    );
    console.log(
      "TODELETE: getLongLivedToken - Expires in:",
      response.data.expires_in,
      "seconds"
    );

    return {
      access_token: response.data.access_token,
      token_type: response.data.token_type,
      expires_in: response.data.expires_in,
    };
  } catch (error) {
    console.error(
      "TODELETE: getLongLivedToken - Error getting long-lived token:",
      error
    );
    if (axios.isAxiosError(error)) {
      console.error(
        "TODELETE: getLongLivedToken - Response data:",
        error.response?.data
      );
    }
    throw error;
  }
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

  try {
    const response = await axios.get(INSTAGRAM_LONG_LIVED_TOKEN_URL, {
      params: {
        grant_type: "ig_refresh_token",
        access_token: currentToken,
      },
    });

    console.log(
      "TODELETE: refreshLongLivedToken - Token refreshed successfully"
    );
    console.log(
      "TODELETE: refreshLongLivedToken - New expiry:",
      response.data.expires_in,
      "seconds"
    );

    return {
      access_token: response.data.access_token,
      token_type: response.data.token_type,
      expires_in: response.data.expires_in,
    };
  } catch (error) {
    console.error(
      "TODELETE: refreshLongLivedToken - Error refreshing token:",
      error
    );
    if (axios.isAxiosError(error)) {
      console.error(
        "TODELETE: refreshLongLivedToken - Response data:",
        error.response?.data
      );
    }
    throw error;
  }
}

/**
 * Get Instagram user profile information
 */
export async function getUserProfile(
  accessToken: string,
  userId: string
): Promise<{
  id: string;
  username: string;
  account_type?: string;
  media_count?: number;
}> {
  console.log("TODELETE: getUserProfile - Fetching user profile for ID:", {
    userId,
    accessToken,
    fields: "id,username,account_type,media_count",
    endpoint: `${INSTAGRAM_GRAPH_URL}/${userId}`,
  });

  try {
    const meResponse = await axios.get(`${INSTAGRAM_GRAPH_URL}/me`, {
      params: {
        fields: "id,username,account_type,media_count",
        access_token: accessToken,
      },
    });

    console.log("TODELETE: getUserProfile - Me response:", meResponse.data);

    // const response = await axios.get(`${INSTAGRAM_GRAPH_URL}/${id}`, {
    //   params: {
    //     fields: "id,username,account_type,media_count",
    //     access_token: accessToken,
    //   },
    // });

    console.log("TODELETE: getUserProfile - Profile fetched successfully");
    console.log(
      "TODELETE: getUserProfile - Username:",
      meResponse.data.username
    );

    return meResponse.data;
  } catch (error) {
    console.error("TODELETE: getUserProfile - Error fetching profile:", error);
    if (axios.isAxiosError(error)) {
      console.error(
        "TODELETE: getUserProfile - Response data:",
        error.response?.data
      );
    }
    throw error;
  }
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

  try {
    const response = await axios.post(
      `${INSTAGRAM_GRAPH_URL}/${userId}/subscribed_apps`,
      new URLSearchParams({
        subscribed_fields: subscribedFields.join(","),
        access_token: accessToken,
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    console.log(
      "TODELETE: subscribeToWebhooks - Subscription successful:",
      response.data
    );
    return response.data.success === true;
  } catch (error) {
    console.error("TODELETE: subscribeToWebhooks - Error subscribing:", error);
    if (axios.isAxiosError(error)) {
      console.error(
        "TODELETE: subscribeToWebhooks - Response data:",
        error.response?.data
      );
    }
    throw error;
  }
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
