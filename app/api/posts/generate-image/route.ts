import { gateway } from "@ai-sdk/gateway";
import { generateText } from "ai";
import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/(auth)/auth";
import {
  getPostById,
  getUserReferenceImages,
  updatePost,
} from "@/lib/db/queries";

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      postId,
      prompt,
      width = 1080,
      height = 1080,
      aspectRatio = "1:1",
      referenceImageIds = [],
    } = body;

    if (!postId || !prompt) {
      return NextResponse.json(
        { error: "Post ID and prompt are required" },
        { status: 400 }
      );
    }

    // Verify the post belongs to the user
    const post = await getPostById({ id: postId, userId: session.user.id });
    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    // Get reference images if any are selected
    let selectedImages: Awaited<ReturnType<typeof getUserReferenceImages>> = [];
    if (referenceImageIds.length > 0) {
      const allReferenceImages = await getUserReferenceImages({
        userId: session.user.id,
      });
      selectedImages = allReferenceImages.filter((img) =>
        referenceImageIds.includes(img.id)
      );
      // Limit to 4 reference images to avoid token limits
      selectedImages = selectedImages.slice(0, 4);
    }

    // Build the content array for multimodal input
    const content: Array<
      | { type: "image"; image: string | URL }
      | { type: "text"; text: string }
    > = [];

    // Add reference images as visual content
    for (const refImage of selectedImages) {
      if (refImage.url) {
        try {
          // Handle both data URLs and regular URLs
          if (refImage.url.startsWith("data:")) {
            // For base64 data URLs, extract the base64 part
            const base64Data = refImage.url.split(",")[1];
            content.push({
              type: "image",
              image: base64Data,
            });
          } else {
            content.push({
              type: "image",
              image: new URL(refImage.url),
            });
          }
        } catch (error) {
          console.warn(
            `[generate-image] Invalid reference image URL: ${refImage.url}`,
            error
          );
        }
      }
    }

    // Build the text prompt with enhanced style matching instructions
    let textPrompt = `Create a high-quality social media image with the following specifications:

Format: ${aspectRatio} (${width}x${height} pixels)
Platform: Instagram

User Request: ${prompt}`;

    // Add style matching instructions if reference images are provided
    if (selectedImages.length > 0) {
      const imageDescriptions = selectedImages
        .map(
          (img, i) =>
            `Reference ${i + 1}: ${img.caption || "Brand reference image"}`
        )
        .join("\n");

      textPrompt += `\n\nCRITICAL STYLE MATCHING REQUIREMENTS:
You have been provided ${selectedImages.length} reference image${selectedImages.length > 1 ? "s" : ""} above. You MUST analyze these reference images and match their visual style, including:

- Color palette and color grading: Match the exact colors, tones, and color harmony
- Composition and layout: Replicate similar framing, positioning, and visual balance
- Lighting style: Match the lighting direction, intensity, and mood
- Visual aesthetic: Match the overall look and feel (e.g., minimalist, vibrant, moody, bright)
- Texture and surface qualities: Match surface textures, finishes, and material qualities
- Brand identity: Maintain consistency with the brand's visual language

Reference descriptions:
${imageDescriptions}

The generated image should look like it belongs to the same brand/style family as the reference images.`;
    }

    textPrompt += `\n\nImportant guidelines:
- Create a visually striking composition optimized for social media
- Use professional lighting and color grading
- Ensure the image is suitable for Instagram content
- Make the design modern, clean, and engaging
- The image should be eye-catching and scroll-stopping`;

    content.push({ type: "text", text: textPrompt });

    console.log("[generate-image] Starting generation...");
    console.log(
      `[generate-image] Using ${selectedImages.length} reference image(s)`
    );
    console.log("[generate-image] Prompt:", textPrompt.slice(0, 200) + "...");

    // Generate the image using Vercel AI SDK with Google Gemini
    const result = await generateText({
      model: gateway.languageModel("google/gemini-3-pro-image"),
      providerOptions: {
        google: { responseModalities: ["TEXT", "IMAGE"] },
      },
      messages: [
        {
          role: "user",
          content,
        },
      ],
    });

    console.log("[generate-image] Generation complete, processing files...");

    // Filter for image files from the response
    const imageFiles = result.files?.filter((f) =>
      f.mediaType?.startsWith("image/")
    );

    if (!imageFiles || imageFiles.length === 0) {
      console.error("[generate-image] No images in response");
      return NextResponse.json(
        { error: "No image was generated. Please try again." },
        { status: 500 }
      );
    }

    const imageFile = imageFiles[0];
    console.log(
      "[generate-image] Image received, mediaType:",
      imageFile.mediaType
    );

    // Convert to base64 for storage
    const base64Image = Buffer.from(imageFile.uint8Array).toString("base64");
    console.log(
      "[generate-image] Image converted to base64, size:",
      base64Image.length
    );

    // Update the post with the new canvas size if it changed
    if (post.width !== width || post.height !== height) {
      await updatePost({
        id: postId,
        userId: session.user.id,
        width,
        height,
      });
    }

    return NextResponse.json({
      imageUrl: `data:image/png;base64,${base64Image}`,
      width,
      height,
    });
  } catch (error) {
    console.error("[generate-image] Error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to generate image",
      },
      { status: 500 }
    );
  }
}

