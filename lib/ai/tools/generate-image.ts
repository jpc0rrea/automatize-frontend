import { gateway } from "@ai-sdk/gateway";
import { generateText, tool, type UIMessageStreamWriter } from "ai";
import type { Session } from "next-auth";
import { z } from "zod";
import {
  imageSizePresets,
  interpolatePrompt,
  modelConfig,
  prompts,
  type ImageSizePreset,
} from "@/lib/config";
import { saveDocument } from "@/lib/db/queries";
import type { ChatMessage } from "@/lib/types";
import { generateUUID } from "@/lib/utils";

interface GenerateImageProps {
  session: Session;
  dataStream: UIMessageStreamWriter<ChatMessage>;
}

export const generateImage = ({ session, dataStream }: GenerateImageProps) =>
  tool({
    description:
      "Generate an image for social media content or advertising based on user instructions and optional brand guidelines.",
    inputSchema: z.object({
      prompt: z.string().describe("Description of the image to generate"),
      title: z.string().describe("Short title for the generated image"),
      brandContext: z
        .object({
          brandName: z.string().optional(),
          colors: z.string().optional(),
          style: z.string().optional(),
          tone: z.string().optional(),
        })
        .optional()
        .describe("Optional brand guidelines to incorporate"),
      aspectRatio: z
        .enum(["square", "portrait", "landscape", "story", "wide"])
        .default("square")
        .describe(
          "Aspect ratio for the image: square (1:1), portrait (3:4), landscape (4:3), story (9:16), wide (16:9)"
        ),
    }),
    execute: async ({ prompt, title, brandContext, aspectRatio }) => {
      const id = generateUUID();

      // Build the full prompt with brand context
      let brandContextStr = "";
      if (brandContext) {
        brandContextStr = interpolatePrompt(prompts.brandContext, {
          brandName: brandContext.brandName ?? "Not specified",
          colors: brandContext.colors ?? "Not specified",
          style: brandContext.style ?? "Modern and professional",
          tone: brandContext.tone ?? "Professional",
        });
      }

      const fullPrompt = interpolatePrompt(prompts.imageGeneration, {
        userPrompt: prompt,
        brandContext: brandContextStr,
      });

      // Get image dimensions from preset
      const sizePreset = imageSizePresets[aspectRatio as ImageSizePreset];

      // Stream metadata to client
      dataStream.write({
        type: "data-kind",
        data: "image",
        transient: true,
      });

      dataStream.write({
        type: "data-id",
        data: id,
        transient: true,
      });

      dataStream.write({
        type: "data-title",
        data: title,
        transient: true,
      });

      dataStream.write({
        type: "data-clear",
        data: null,
        transient: true,
      });

      try {
        const modelId = `${modelConfig.image.model}`;
        console.log("[generateImage] Starting image generation via Vercel AI Gateway...");
        console.log("[generateImage] Model:", modelId);
        console.log("[generateImage] Prompt:", fullPrompt.slice(0, 100) + "...");

        // Use Vercel AI SDK's generateText with Google Gemini for image generation
        // Must use gateway.languageModel() directly for image generation
        const result = await generateText({
          model: gateway.languageModel(modelId),
          providerOptions: {
            google: { responseModalities: ["TEXT", "IMAGE"] },
          },
          prompt: fullPrompt,
        });

        console.log("[generateImage] Generation complete, processing files...");

        // Filter for image files from the response
        const imageFiles = result.files?.filter((f) =>
          f.mediaType?.startsWith("image/")
        );

        if (!imageFiles || imageFiles.length === 0) {
          console.error("[generateImage] No images in response");
          throw new Error("No image was generated. Please try again.");
        }

        const imageFile = imageFiles[0];
        console.log("[generateImage] Image received, mediaType:", imageFile.mediaType);

        // Convert to base64 for storage and streaming
        const base64Image = Buffer.from(imageFile.uint8Array).toString("base64");
        console.log("[generateImage] Image converted to base64, size:", base64Image.length);

        // Stream the image to client
        dataStream.write({
          type: "data-imageDelta",
          data: base64Image,
          transient: true,
        });

        dataStream.write({ type: "data-finish", data: null, transient: true });

        // Save to database
        if (session?.user?.id) {
          await saveDocument({
            id,
            title,
            content: base64Image,
            kind: "image",
            userId: session.user.id,
          });
          console.log("[generateImage] Image saved to database with id:", id);
        }

        return {
          id,
          title,
          aspectRatio,
          platforms: sizePreset.platforms,
          status: "generated",
          message:
            "Image generated successfully. The user can now review and approve it for posting.",
        };
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";

        console.error("[generateImage] Error:", errorMessage);
        if (error instanceof Error && error.stack) {
          console.error("[generateImage] Stack:", error.stack);
        }

        dataStream.write({ type: "data-finish", data: null, transient: true });

        return {
          id,
          title,
          status: "failed",
          error: errorMessage,
        };
      }
    },
  });
