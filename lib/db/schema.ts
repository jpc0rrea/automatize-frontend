import type { InferSelectModel } from "drizzle-orm";
import {
  boolean,
  foreignKey,
  integer,
  json,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import type { Layer, PostStatus } from "../types";
import type { AppUsage } from "../usage";

export const user = pgTable("users", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  email: varchar("email", { length: 64 }).notNull(),
  image_url: text("image_url"),
});

export type User = InferSelectModel<typeof user>;

export const chat = pgTable("chats", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  createdAt: timestamp("created_at").notNull(),
  title: text("title").notNull(),
  userId: uuid("user_id")
    .notNull()
    .references(() => user.id),
  visibility: varchar("visibility", { enum: ["public", "private"] })
    .notNull()
    .default("private"),
  lastContext: jsonb("last_context").$type<AppUsage | null>(),
});

export type Chat = InferSelectModel<typeof chat>;

export const message = pgTable("messages", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  chatId: uuid("chat_id")
    .notNull()
    .references(() => chat.id),
  role: varchar("role").notNull(),
  parts: json("parts").notNull(),
  attachments: json("attachments").notNull(),
  createdAt: timestamp("created_at").notNull(),
});

export type DBMessage = InferSelectModel<typeof message>;

export const vote = pgTable(
  "votes",
  {
    chatId: uuid("chat_id")
      .notNull()
      .references(() => chat.id),
    messageId: uuid("message_id")
      .notNull()
      .references(() => message.id),
    isUpvoted: boolean("is_upvoted").notNull(),
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.chatId, table.messageId] }),
    };
  }
);

export type Vote = InferSelectModel<typeof vote>;

export const document = pgTable(
  "documents",
  {
    id: uuid("id").notNull().defaultRandom(),
    createdAt: timestamp("created_at").notNull(),
    title: text("title").notNull(),
    content: text("content"),
    kind: varchar("text", { enum: ["text", "code", "image", "sheet"] })
      .notNull()
      .default("text"),
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id),
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.id, table.createdAt] }),
    };
  }
);

export type Document = InferSelectModel<typeof document>;

export const suggestion = pgTable(
  "suggestions",
  {
    id: uuid("id").notNull().defaultRandom(),
    documentId: uuid("document_id").notNull(),
    documentCreatedAt: timestamp("document_created_at").notNull(),
    originalText: text("original_text").notNull(),
    suggestedText: text("suggested_text").notNull(),
    description: text("description"),
    isResolved: boolean("is_resolved").notNull().default(false),
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id),
    createdAt: timestamp("created_at").notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.id] }),
    documentRef: foreignKey({
      columns: [table.documentId, table.documentCreatedAt],
      foreignColumns: [document.id, document.createdAt],
    }),
  })
);

export type Suggestion = InferSelectModel<typeof suggestion>;

export const stream = pgTable(
  "streams",
  {
    id: uuid("id").notNull().defaultRandom(),
    chatId: uuid("chat_id").notNull(),
    createdAt: timestamp("created_at").notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.id] }),
    chatRef: foreignKey({
      columns: [table.chatId],
      foreignColumns: [chat.id],
    }),
  })
);

export type Stream = InferSelectModel<typeof stream>;

// Company table for storing brand information
export const company = pgTable("companies", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  websiteUrl: varchar("website_url", { length: 512 }),
  instagramHandle: varchar("instagram_handle", { length: 64 }),
  industry: varchar("industry", { length: 128 }),
  brandVoice: varchar("brand_voice", {
    enum: ["formal", "casual", "playful", "professional", "friendly"],
  }),
  targetAudience: text("target_audience"),
  brandColors: jsonb("brand_colors").$type<string[]>(),
  logoUrl: text("logo_url"),
  contentThemes: jsonb("content_themes").$type<string[]>(),
  hashtags: jsonb("hashtags").$type<string[]>(),
  preferredFormats: jsonb("preferred_formats").$type<string[]>(),
  onboardingCompleted: boolean("onboarding_completed").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type Company = InferSelectModel<typeof company>;

// User-Company relationship (multi-tenant support)
export const userCompany = pgTable(
  "user_companies",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id),
    companyId: uuid("company_id")
      .notNull()
      .references(() => company.id),
    role: varchar("role", { enum: ["owner", "admin", "member"] })
      .notNull()
      .default("member"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.companyId] }),
  })
);

export type UserCompany = InferSelectModel<typeof userCompany>;

// Reference images for the company (for social media content generation)
export const companyReferenceImage = pgTable("company_reference_image", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  companyId: uuid("company_id")
    .notNull()
    .references(() => company.id),
  url: text("url").notNull(),
  thumbnailUrl: text("thumbnail_url"),
  source: varchar("source", { enum: ["upload", "instagram_scrape"] }).notNull(),
  caption: text("caption"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type CompanyReferenceImage = InferSelectModel<
  typeof companyReferenceImage
>;

// Instagram Account table for storing Instagram account connections
export const instagramAccount = pgTable(
  "instagram_accounts",
  {
    id: text("id").primaryKey().notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id),
    accountId: text("account_id").notNull(),
    username: text("username"),
    name: text("name"),
    website: text("website"),
    biography: text("biography"),
    profilePictureUrl: text("profile_picture_url"),
    mediaCount: integer("media_count"),
    accessToken: text("access_token").notNull(),
    tokenExpiresAt: timestamp("token_expires_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    deletedAt: timestamp("deleted_at"),
  },
  (table) => ({
    uniqueUserAccount: unique("instagram_accounts_user_id_account_id_unique").on(
      table.userId,
      table.accountId
    ),
  })
);

export type InstagramAccount = InferSelectModel<typeof instagramAccount>;

// Scheduled posts for Instagram publishing
export const scheduledPost = pgTable(
  "scheduled_posts",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id),
    mediaUrl: text("media_url").notNull(),
    mediaType: varchar("media_type", { length: 32 }),
    caption: text("caption").notNull(),
    locationId: text("location_id"),
    userTagsJson: text("user_tags_json"),
    scheduledAt: timestamp("scheduled_at").notNull(),
    status: varchar("status", { length: 32 }).notNull().default("pending"),
    retryAttempts: integer("retry_attempts").notNull().default(0),
    lastAttemptAt: timestamp("last_attempt_at"),
    lastErrorMessage: text("last_error_message"),
    mediaContainerId: text("media_container_id"),
    mediaContainerStatus: varchar("media_container_status", { length: 32 }),
    publishedAt: timestamp("published_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    deletedAt: timestamp("deleted_at"),
  },
  (table) => ({
    uniqueMediaContainerId: unique("scheduled_posts_media_container_id_unique").on(
      table.mediaContainerId
    ),
  })
);

export type ScheduledPost = InferSelectModel<typeof scheduledPost>;

// Post table for canvas-based content creation
export const post = pgTable("posts", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => user.id),

  // Canvas dimensions
  width: integer("width").notNull().default(1080),
  height: integer("height").notNull().default(1080),

  // Layers stored as JSONB (flexible & simple)
  layers: jsonb("layers").$type<Layer[]>().notNull().default([]),

  // Final rendered image (base64 or URL for storage/CDN)
  renderedImage: text("rendered_image"),
  thumbnailImage: text("thumbnail_image"),

  // Post metadata
  title: varchar("title", { length: 255 }),
  caption: text("caption"),
  status: varchar("status", {
    enum: ["draft", "ready", "scheduled", "posted", "failed"],
  })
    .$type<PostStatus>()
    .notNull()
    .default("draft"),

  // Scheduling
  scheduledAt: timestamp("scheduled_at"),
  publishedAt: timestamp("published_at"),

  // Reference to scheduled post (if scheduled)
  scheduledPostId: uuid("scheduled_post_id").references(() => scheduledPost.id),

  // Related chat (for AI conversation context)
  chatId: uuid("chat_id").references(() => chat.id),

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  deletedAt: timestamp("deleted_at"),
});

export type Post = InferSelectModel<typeof post>;
