import { InstagramMessagingEvent, InstagramWebhookEntry, InstagramWebhookPayload, verifyWebhookChallenge, verifyWebhookSignature } from "@/lib/meta-business/instagram";
import { NextResponse } from "next/server";


/**
 * GET /api/instagram/webhook
 *
 * Handles webhook verification requests from Meta.
 * When you configure webhooks in the Meta App Dashboard, Meta sends a GET request
 * with hub.mode, hub.verify_token, and hub.challenge parameters.
 *
 * Query parameters:
 * - hub.mode: Should be "subscribe"
 * - hub.verify_token: The token you set in the App Dashboard
 * - hub.challenge: A challenge string that must be returned to confirm the endpoint
 */
export async function GET(request: Request) {
  console.log(
    "TODELETE: /api/instagram/webhook GET - Verification request received"
  );
  console.log("TODELETE: /api/instagram/webhook GET - URL:", request.url);

  try {
    const { searchParams } = new URL(request.url);

    const mode = searchParams.get("hub.mode");
    const token = searchParams.get("hub.verify_token");
    const challenge = searchParams.get("hub.challenge");

    console.log("TODELETE: /api/instagram/webhook GET - hub.mode:", mode);
    console.log(
      "TODELETE: /api/instagram/webhook GET - hub.verify_token:",
      token
    );
    console.log(
      "TODELETE: /api/instagram/webhook GET - hub.challenge:",
      challenge
    );

    if (!mode || !token || !challenge) {
      console.log(
        "TODELETE: /api/instagram/webhook GET - Missing required parameters"
      );
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      );
    }

    const validatedChallenge = verifyWebhookChallenge(mode, token, challenge);

    if (validatedChallenge) {
      console.log(
        "TODELETE: /api/instagram/webhook GET - Challenge verified, returning challenge"
      );
      // Return the challenge as plain text (required by Meta)
      return new NextResponse(validatedChallenge, {
        status: 200,
        headers: { "Content-Type": "text/plain" },
      });
    }

    console.log("TODELETE: /api/instagram/webhook GET - Verification failed");
    return NextResponse.json(
      { error: "Webhook verification failed" },
      { status: 403 }
    );
  } catch (error) {
    console.error("TODELETE: /api/instagram/webhook GET - Error:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/instagram/webhook
 *
 * Handles webhook event notifications from Meta.
 * Meta sends POST requests with JSON payloads when subscribed events occur.
 *
 * Headers:
 * - X-Hub-Signature-256: SHA256 HMAC signature of the payload
 *
 * Body:
 * - JSON payload containing webhook event data
 */
export async function POST(request: Request) {
  console.log(
    "TODELETE: /api/instagram/webhook POST - Event notification received"
  );
  console.log(
    "TODELETE: /api/instagram/webhook POST - Timestamp:",
    new Date().toISOString()
  );

  try {
    // Get the raw body for signature verification
    const rawBody = await request.text();
    console.log(
      "TODELETE: /api/instagram/webhook POST - Raw body length:",
      rawBody.length
    );
    console.log("TODELETE: /api/instagram/webhook POST - Raw body:", rawBody);

    // Get the signature header
    const signature = request.headers.get("X-Hub-Signature-256");
    console.log(
      "TODELETE: /api/instagram/webhook POST - Signature header present:",
      !!signature
    );

    // Verify the signature (optional but recommended)
    if (signature) {
      const isValid = verifyWebhookSignature(rawBody, signature);
      console.log(
        "TODELETE: /api/instagram/webhook POST - Signature verification:",
        isValid ? "PASSED" : "FAILED"
      );

      if (!isValid) {
        console.log(
          "TODELETE: /api/instagram/webhook POST - Invalid signature, rejecting request"
        );
        return NextResponse.json(
          { error: "Invalid signature" },
          { status: 401 }
        );
      }
    } else {
      console.log(
        "TODELETE: /api/instagram/webhook POST - No signature header, proceeding without verification"
      );
    }

    // Parse the JSON payload
    let payload: InstagramWebhookPayload;
    try {
      payload = JSON.parse(rawBody);
    } catch (parseError) {
      console.error(
        "TODELETE: /api/instagram/webhook POST - JSON parse error:",
        parseError
      );
      return NextResponse.json(
        { error: "Invalid JSON payload" },
        { status: 400 }
      );
    }

    console.log(
      "TODELETE: /api/instagram/webhook POST - Payload object:",
      payload.object
    );
    console.log(
      "TODELETE: /api/instagram/webhook POST - Number of entries:",
      payload.entry?.length ?? 0
    );

    // Verify this is an Instagram webhook
    if (payload.object !== "instagram") {
      console.log(
        "TODELETE: /api/instagram/webhook POST - Not an Instagram webhook, ignoring"
      );
      return NextResponse.json({ received: true });
    }

    // Process each entry in the webhook
    for (const entry of payload.entry) {
      await processWebhookEntry(entry);
    }

    // Always respond with 200 OK to acknowledge receipt
    // Meta will retry if it doesn't receive a 200 response
    console.log(
      "TODELETE: /api/instagram/webhook POST - Responding with 200 OK"
    );
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("TODELETE: /api/instagram/webhook POST - Error:", error);

    // Still return 200 to prevent Meta from retrying
    // Log the error for investigation
    return NextResponse.json({
      received: true,
      error: "Processing error logged",
    });
  }
}

/**
 * Process a single webhook entry
 */
async function processWebhookEntry(
  entry: InstagramWebhookEntry
): Promise<void> {
  console.log("TODELETE: processWebhookEntry - Processing entry");
  console.log(
    "TODELETE: processWebhookEntry - Entry ID (Instagram Account ID):",
    entry.id
  );
  console.log(
    "TODELETE: processWebhookEntry - Entry time:",
    entry.time,
    new Date(entry.time * 1000).toISOString()
  );

  // Handle messaging events (Business Login for Instagram)
  if (entry.messaging && entry.messaging.length > 0) {
    console.log("TODELETE: processWebhookEntry - Processing messaging events");
    for (const messagingEvent of entry.messaging) {
      await processMessagingEvent(entry.id, messagingEvent);
    }
  }

  // Handle field-based events (comments, etc.)
  if (entry.field && entry.value) {
    console.log("TODELETE: processWebhookEntry - Processing field event");
    console.log("TODELETE: processWebhookEntry - Field:", entry.field);
    console.log(
      "TODELETE: processWebhookEntry - Value:",
      JSON.stringify(entry.value)
    );
    await processFieldEvent(entry.id, entry.field, entry.value);
  }

  // Handle changes array (Facebook Login for Business format)
  if (entry.changes && entry.changes.length > 0) {
    console.log("TODELETE: processWebhookEntry - Processing changes");
    for (const change of entry.changes) {
      console.log(
        "TODELETE: processWebhookEntry - Change field:",
        change.field
      );
      console.log(
        "TODELETE: processWebhookEntry - Change value:",
        JSON.stringify(change.value)
      );
      await processFieldEvent(entry.id, change.field, change.value);
    }
  }
}

/**
 * Process messaging events (messages, message_seen, etc.)
 */
async function processMessagingEvent(
  instagramAccountId: string,
  event: InstagramMessagingEvent
): Promise<void> {
  console.log("TODELETE: processMessagingEvent - Processing messaging event");
  console.log(
    "TODELETE: processMessagingEvent - Instagram Account ID:",
    instagramAccountId
  );
  console.log("TODELETE: processMessagingEvent - Sender ID:", event.sender.id);
  console.log(
    "TODELETE: processMessagingEvent - Recipient ID:",
    event.recipient.id
  );
  console.log(
    "TODELETE: processMessagingEvent - Timestamp:",
    event.timestamp,
    new Date(event.timestamp).toISOString()
  );

  // Handle different message types
  if (event.message) {
    console.log("TODELETE: processMessagingEvent - Message event");
    console.log(
      "TODELETE: processMessagingEvent - Message ID:",
      event.message.mid
    );

    if (event.message.is_echo) {
      console.log(
        "TODELETE: processMessagingEvent - This is an echo (sent by app user)"
      );
    }

    if (event.message.is_deleted) {
      console.log("TODELETE: processMessagingEvent - Message was deleted");
    }

    if (event.message.text) {
      console.log(
        "TODELETE: processMessagingEvent - Message text:",
        event.message.text
      );
    }

    if (event.message.attachments) {
      console.log(
        "TODELETE: processMessagingEvent - Attachments count:",
        event.message.attachments.length
      );
      for (const attachment of event.message.attachments) {
        console.log(
          "TODELETE: processMessagingEvent - Attachment type:",
          attachment.type
        );
        console.log(
          "TODELETE: processMessagingEvent - Attachment URL:",
          attachment.payload.url
        );
      }
    }

    if (event.message.quick_reply) {
      console.log(
        "TODELETE: processMessagingEvent - Quick reply payload:",
        event.message.quick_reply.payload
      );
    }

    if (event.message.reply_to) {
      console.log(
        "TODELETE: processMessagingEvent - Reply to:",
        JSON.stringify(event.message.reply_to)
      );
    }

    if (event.message.referral) {
      console.log(
        "TODELETE: processMessagingEvent - Referral (from ad):",
        JSON.stringify(event.message.referral)
      );
    }

    // TODO: Store message in database or forward to message handling service
  }

  // Handle message read events
  if (event.read) {
    console.log("TODELETE: processMessagingEvent - Message read event");
    console.log(
      "TODELETE: processMessagingEvent - Read message ID:",
      event.read.mid
    );

    // TODO: Update message status in database
  }

  // Handle message edit events
  if (event.message_edit) {
    console.log("TODELETE: processMessagingEvent - Message edit event");
    console.log(
      "TODELETE: processMessagingEvent - Edited message ID:",
      event.message_edit.mid
    );
    console.log(
      "TODELETE: processMessagingEvent - New text:",
      event.message_edit.text
    );
    console.log(
      "TODELETE: processMessagingEvent - Edit count:",
      event.message_edit.num_edit
    );

    // TODO: Update message in database
  }

  // Handle postback events (icebreakers, persistent menu)
  if (event.postback) {
    console.log("TODELETE: processMessagingEvent - Postback event");
    console.log(
      "TODELETE: processMessagingEvent - Postback message ID:",
      event.postback.mid
    );
    console.log(
      "TODELETE: processMessagingEvent - Postback title:",
      event.postback.title
    );
    console.log(
      "TODELETE: processMessagingEvent - Postback payload:",
      event.postback.payload
    );

    // TODO: Handle postback based on payload
  }

  // Handle referral events (from Instagram.me links)
  if (event.referral) {
    console.log("TODELETE: processMessagingEvent - Referral event");
    console.log(
      "TODELETE: processMessagingEvent - Referral ref:",
      event.referral.ref
    );
    console.log(
      "TODELETE: processMessagingEvent - Referral source:",
      event.referral.source
    );
    console.log(
      "TODELETE: processMessagingEvent - Referral type:",
      event.referral.type
    );

    // TODO: Track referral source
  }
}

/**
 * Process field-based events (comments, mentions, story_insights)
 */
async function processFieldEvent(
  instagramAccountId: string,
  field: string,
  value: Record<string, unknown>
): Promise<void> {
  console.log("TODELETE: processFieldEvent - Processing field event");
  console.log(
    "TODELETE: processFieldEvent - Instagram Account ID:",
    instagramAccountId
  );
  console.log("TODELETE: processFieldEvent - Field:", field);

  switch (field) {
    case "comments":
      console.log("TODELETE: processFieldEvent - Comment event");
      console.log(
        "TODELETE: processFieldEvent - Comment ID:",
        value.id ?? value.comment_id
      );
      console.log("TODELETE: processFieldEvent - Comment text:", value.text);
      console.log(
        "TODELETE: processFieldEvent - From:",
        JSON.stringify(value.from)
      );
      console.log(
        "TODELETE: processFieldEvent - Media:",
        JSON.stringify(value.media)
      );

      // TODO: Store comment or trigger notification
      break;

    case "live_comments":
      console.log("TODELETE: processFieldEvent - Live comment event");
      console.log(
        "TODELETE: processFieldEvent - Comment ID:",
        value.id ?? value.comment_id
      );
      console.log("TODELETE: processFieldEvent - Comment text:", value.text);

      // TODO: Handle live comment
      break;

    case "mentions":
      console.log("TODELETE: processFieldEvent - Mention event");
      console.log("TODELETE: processFieldEvent - Media ID:", value.media_id);
      console.log(
        "TODELETE: processFieldEvent - Comment ID:",
        value.comment_id
      );

      // TODO: Handle mention
      break;

    case "story_insights":
      console.log("TODELETE: processFieldEvent - Story insights event");
      console.log("TODELETE: processFieldEvent - Story ID:", value.id);
      console.log(
        "TODELETE: processFieldEvent - Impressions:",
        value.impressions
      );
      console.log("TODELETE: processFieldEvent - Reach:", value.reach);
      console.log("TODELETE: processFieldEvent - Replies:", value.replies);

      // TODO: Store story insights
      break;

    default:
      console.log("TODELETE: processFieldEvent - Unknown field type:", field);
      console.log(
        "TODELETE: processFieldEvent - Value:",
        JSON.stringify(value)
      );
  }
}
