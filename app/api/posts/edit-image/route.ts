import { gateway } from "@ai-sdk/gateway";
import { generateText } from "ai";
import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/(auth)/auth";
import { getPostById } from "@/lib/db/queries";

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { postId, prompt, sourceImageUrl, width = 1080, height = 1080 } = body;

    if (!postId || !prompt || !sourceImageUrl) {
      return NextResponse.json(
        { error: "Post ID, prompt, and source image are required" },
        { status: 400 }
      );
    }

    // Verify the post belongs to the user
    const post = await getPostById({ id: postId, userId: session.user.id });
    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    // Build the edit prompt with strict instructions to preserve the original
    const editPrompt = `You are an AI image editor. You must edit the provided image following the user's instructions while preserving as much of the original image as possible.

CRITICAL INSTRUCTIONS:
- You MUST keep the original image as the base and only modify what the user explicitly asks for
- Do NOT recreate or reimagine the entire image
- Do NOT change elements that the user didn't ask to change
- Preserve the original composition, colors, lighting, and style unless specifically asked to change them
- Make minimal, targeted edits that fulfill the user's request
- The result should look like the original image with specific modifications, not a new image

User's edit request: ${prompt}

Output dimensions: ${width}x${height} pixels

Apply ONLY the requested changes to the image while keeping everything else identical to the original.`;

    console.log("[edit-image] Starting image edit...");
    console.log("[edit-image] Edit request:", prompt);

    // Prepare the image for the API
    // Handle both base64 data URLs and regular URLs
    let imageContent: { type: "image"; image: string } | { type: "image"; image: URL };
    
    if (sourceImageUrl.startsWith("data:")) {
      // Extract base64 from data URL
      const base64Data = sourceImageUrl.split(",")[1];
      imageContent = {
        type: "image",
        image: base64Data,
      };
    } else {
      imageContent = {
        type: "image",
        image: new URL(sourceImageUrl),
      };
    }

    // Generate the edited image using Vercel AI SDK with Google Gemini
    const result = await generateText({
      model: gateway.languageModel("google/gemini-3-pro-image"),
      providerOptions: {
        google: { responseModalities: ["TEXT", "IMAGE"] },
      },
      messages: [
        {
          role: "user",
          content: [
            imageContent,
            {
              type: "text",
              text: editPrompt,
            },
          ],
        },
      ],
    });

    console.log("[edit-image] Edit complete, processing files...");

    // Filter for image files from the response
    const imageFiles = result.files?.filter((f) =>
      f.mediaType?.startsWith("image/")
    );

    if (!imageFiles || imageFiles.length === 0) {
      console.error("[edit-image] No images in response");
      return NextResponse.json(
        { error: "Failed to edit image. Please try again." },
        { status: 500 }
      );
    }

    const imageFile = imageFiles[0];
    console.log("[edit-image] Edited image received, mediaType:", imageFile.mediaType);

    // Convert to base64 for storage
    const base64Image = Buffer.from(imageFile.uint8Array).toString("base64");
    console.log("[edit-image] Image converted to base64, size:", base64Image.length);

    return NextResponse.json({
      imageUrl: `data:image/png;base64,${base64Image}`,
      width,
      height,
    });
  } catch (error) {
    console.error("[edit-image] Error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to edit image",
      },
      { status: 500 }
    );
  }
}
