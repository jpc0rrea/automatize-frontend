import { z } from "zod";

const textPartSchema = z.object({
  type: z.enum(["text"]),
  text: z.string().min(1).max(2000),
});

const filePartSchema = z.object({
  type: z.enum(["file"]),
  mediaType: z.enum(["image/jpeg", "image/png"]),
  name: z.string().min(1).max(100),
  url: z.string().url(),
});

const partSchema = z.union([textPartSchema, filePartSchema]);

export const postRequestBodySchema = z.object({
  id: z.string().uuid(),
  message: z.object({
    id: z.string().uuid(),
    role: z.enum(["user"]),
    parts: z.array(partSchema),
  }),
  // Model selection is now handled internally - kept for backward compatibility
  selectedChatModel: z
    .enum(["chat-model", "chat-model-reasoning"])
    .optional()
    .default("chat-model"),
  // All chats are private - kept for backward compatibility
  selectedVisibilityType: z
    .enum(["public", "private"])
    .optional()
    .default("private"),
});

export type PostRequestBody = z.infer<typeof postRequestBodySchema>;
