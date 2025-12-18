import { gateway } from "@ai-sdk/gateway";
import { generateText } from "ai";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/app/(auth)/auth";
import { getPostById } from "@/lib/db/queries";

const extractedTextSchema = z.object({
  texts: z.array(
    z.object({
      text: z.string(),
      x: z.number(),
      y: z.number(),
      width: z.number(),
      height: z.number(),
      fontSize: z.number(),
      fontWeight: z.number(),
      color: z.string(),
      textAlign: z.enum(["left", "center", "right"]),
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
    const { postId, sourceImageUrl, canvasWidth, canvasHeight } = body;

    if (!postId || !sourceImageUrl) {
      return NextResponse.json(
        { error: "Post ID and source image are required" },
        { status: 400 }
      );
    }

    // Verify the post belongs to the user
    const post = await getPostById({ id: postId, userId: session.user.id });
    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    const extractionPrompt = `Analyze this image and extract text elements, grouping them into logical TEXT BLOCKS or PARAGRAPHS.

CRITICAL GROUPING RULES:
- Group multiple lines that belong together into a SINGLE text block
- Text lines that are visually close together and form a paragraph should be ONE entry
- Headlines/titles that span multiple lines should be ONE entry
- A bullet point list should be grouped as ONE entry (not separate items)
- Only separate text into different entries if they are in DIFFERENT visual areas of the image or have DIFFERENT styling (different colors, very different font sizes)
- Use line breaks (\\n) within the "text" field to preserve line structure within a block

EXAMPLES OF CORRECT GROUPING:
- A title like "LAYBACK\\nQUER OPERAR COM MAIS\\nSEGURANÇA?" should be ONE entry with line breaks
- A paragraph with multiple sentences close together = ONE entry
- A headline at the top + body text at the bottom = TWO entries (different areas)
- Text in different colors or very different sizes = SEPARATE entries

For each TEXT BLOCK, provide:
- text: The complete text content with line breaks (\\n) preserving the original line structure
- x: number (pixel position from left)
- y: number (pixel position from top)  
- width: number (width in pixels)
- height: number (height in pixels covering ALL lines in the block)
- fontSize: number (the dominant/most common font size in pixels)
- fontWeight: number (100-900, where 400 is normal and 700 is bold)
- color: string (the dominant/most common hex color, e.g., #ffffff)
- textAlign: "left" | "center" | "right"

If there is no text in the image, return {"texts": []}.

Canvas dimensions: ${canvasWidth}x${canvasHeight} pixels

IMPORTANT: Return ONLY valid JSON, no markdown code blocks or extra text.`;

    console.log("[extract-text] Starting text extraction...");

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

    const result = await generateText({
      model: gateway.languageModel("google/gemini-2.0-flash"),
      messages: [
        {
          role: "user",
          content: [
            imageContent,
            {
              type: "text",
              text: extractionPrompt,
            },
          ],
        },
      ],
    });

    console.log("[extract-text] Raw response:", result.text);

    // Parse the response as JSON
    let extractedData: z.infer<typeof extractedTextSchema>;
    try {
      // Clean the response (remove markdown code blocks if present)
      let jsonStr = result.text.trim();
      if (jsonStr.startsWith("```json")) {
        jsonStr = jsonStr.slice(7);
      }
      if (jsonStr.startsWith("```")) {
        jsonStr = jsonStr.slice(3);
      }
      if (jsonStr.endsWith("```")) {
        jsonStr = jsonStr.slice(0, -3);
      }
      jsonStr = jsonStr.trim();

      const parsed = JSON.parse(jsonStr);
      extractedData = extractedTextSchema.parse(parsed);
    } catch (parseError) {
      console.error("[extract-text] Failed to parse response:", parseError);
      return NextResponse.json(
        { error: "Failed to parse text extraction results" },
        { status: 500 }
      );
    }

    console.log("[extract-text] Extracted texts:", extractedData.texts.length);

    return NextResponse.json({
      texts: extractedData.texts,
    });
  } catch (error) {
    console.error("[extract-text] Error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to extract text",
      },
      { status: 500 }
    );
  }
}
