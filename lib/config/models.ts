/**
 * Centralized model configuration
 * Easy to swap models without changing code logic
 *
 * Note: Model selection is abstracted from users.
 * The system automatically chooses the appropriate model for each task.
 */

export const modelConfig = {
  /**
   * Main chat model for conversation
   * Used for understanding user requests and providing guidance
   */
  chat: {
    provider: "xai" as const,
    model: "xai/grok-4.1-fast-reasoning",
    description: "Main chat model with vision capabilities for understanding brand assets",
  },

  /**
   * Model for generating chat titles
   */
  title: {
    provider: "xai" as const,
    model: "xai/grok-4.1-fast-non-reasoning",
    description: "Fast model for title generation",
  },

  /**
   * Image generation model
   * Using Google's Gemini 2.5 Flash Image (Imagen 3 / "Nano Banana Pro") via Vercel AI Gateway
   * Docs: https://vercel.com/docs/ai-gateway/image-generation
   */
  image: {
    provider: "google" as const,
    // Gemini 2.5 Flash with image generation capabilities (Imagen 3)
    model: "google/gemini-3-pro-image",
    description: "High-quality image generation for social media content via Vercel AI Gateway",
  },
} as const;

/**
 * Image size presets for different social media platforms
 */
export const imageSizePresets = {
  square: {
    width: 1024,
    height: 1024,
    label: "Square (1:1)",
    platforms: ["Instagram Post", "Facebook Post"],
  },
  portrait: {
    width: 768,
    height: 1024,
    label: "Portrait (3:4)",
    platforms: ["Pinterest", "Instagram Portrait"],
  },
  landscape: {
    width: 1024,
    height: 768,
    label: "Landscape (4:3)",
    platforms: ["Facebook Cover", "Twitter Post"],
  },
  story: {
    width: 576,
    height: 1024,
    label: "Story (9:16)",
    platforms: ["Instagram Story", "TikTok", "Reels"],
  },
  wide: {
    width: 1024,
    height: 576,
    label: "Wide (16:9)",
    platforms: ["YouTube Thumbnail", "LinkedIn"],
  },
} as const;

export type ModelConfig = typeof modelConfig;
export type ImageSizePreset = keyof typeof imageSizePresets;

