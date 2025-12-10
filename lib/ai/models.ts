/**
 * Chat models configuration
 *
 * Note: Model selection is abstracted from users.
 * The system automatically uses the default model for all interactions.
 * This file is kept for backward compatibility with existing code.
 */

export const DEFAULT_CHAT_MODEL = "chat-model" as const;

export interface ChatModel {
  id: string;
  name: string;
  description: string;
}

/**
 * Available chat models - kept for reference and internal use
 * Users don't select models; the system uses the default automatically
 */
export const chatModels: ChatModel[] = [
  {
    id: "chat-model",
    name: "Creative Assistant",
    description:
      "AI assistant for social media content and image generation",
  },
];
