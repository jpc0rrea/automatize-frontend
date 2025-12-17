import { gateway } from "@ai-sdk/gateway";
import { generateText } from "ai";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/app/(auth)/auth";
import { getPostById } from "@/lib/db/queries";

const replaceTextSchema = z.object({
  postId: z.string(),
  sourceImageUrl: z.string(),
  width: z.number().optional().default(1080),
  height: z.number().optional().default(1080),
  textReplacements: z.array(
    z.object({
      originalText: z.string(),
      newText: z.string(),
    })
  ),
});

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const validatedBody = replaceTextSchema.parse(body);
    const { postId, sourceImageUrl, width, height, textReplacements } =
      validatedBody;

    // Verify the post belongs to the user
    const post = await getPostById({ id: postId, userId: session.user.id });
    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    // Build the replacement instructions
    const replacementInstructions = textReplacements
      .map(
        (r, i) =>
          `${i + 1}. Replace "${r.originalText}" with "${r.newText}"`
      )
      .join("\n");

    const replacePrompt = `You are an AI image editor specialized in text replacement. Your task is to replace specific texts in the image while keeping EVERYTHING else exactly the same.

CRITICAL INSTRUCTIONS:
- You MUST find and replace the following texts in the image:

${replacementInstructions}

- Keep the EXACT same position for each text
- Keep the EXACT same font style, size, and weight
- Keep the EXACT same text color
- Keep the EXACT same text alignment
- Keep the EXACT same background and all other elements
- DO NOT change anything else in the image
- The result should look like the original image but with the new text content
- If a text cannot be found, leave that area unchanged

Output dimensions: ${width}x${height} pixels

Replace ONLY the specified texts and preserve everything else identically.`;

    console.log("[replace-text] Starting text replacement...");
    console.log(
      "[replace-text] Replacements:",
      textReplacements.length,
      "texts to replace"
    );

    // Prepare the image for the API
    let imageContent:
      | { type: "image"; image: string }
      | { type: "image"; image: URL };

    if (sourceImageUrl.startsWith("data:")) {
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
              text: replacePrompt,
            },
          ],
        },
      ],
    });

    console.log("[replace-text] Replacement complete, processing files...");

    // Filter for image files from the response
    const imageFiles = result.files?.filter((f) =>
      f.mediaType?.startsWith("image/")
    );

    if (!imageFiles || imageFiles.length === 0) {
      console.error("[replace-text] No images in response");
      return NextResponse.json(
        { error: "Failed to replace text. Please try again." },
        { status: 500 }
      );
    }

    const imageFile = imageFiles[0];
    console.log(
      "[replace-text] Edited image received, mediaType:",
      imageFile.mediaType
    );

    // Convert to base64 for storage
    const base64Image = Buffer.from(imageFile.uint8Array).toString("base64");
    console.log(
      "[replace-text] Image converted to base64, size:",
      base64Image.length
    );

    return NextResponse.json({
      imageUrl: `data:image/png;base64,${base64Image}`,
      width,
      height,
    });
  } catch (error) {
    console.error("[replace-text] Error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to replace text",
      },
      { status: 500 }
    );
  }
}

