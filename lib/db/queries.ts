import "server-only";

import {
  and,
  asc,
  count,
  desc,
  eq,
  gt,
  gte,
  inArray,
  isNull,
  lt,
  type SQL,
} from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import type { ArtifactKind } from "@/components/artifact";
import { ChatSDKError } from "../errors";
import type { AppUsage } from "../usage";
import type { Layer, PostStatus } from "../types";
import {
  type Chat,
  chat,
  type Company,
  company,
  type CompanyReferenceImage,
  companyReferenceImage,
  type DBMessage,
  document,
  type InstagramAccount,
  instagramAccount,
  message,
  type Post,
  post,
  type ScheduledPost,
  scheduledPost,
  type Suggestion,
  stream,
  suggestion,
  type User,
  user,
  type UserCompany,
  userCompany,
  vote,
} from "./schema";

// #region agent log
console.error("[DEBUG] Initializing database connection, POSTGRES_URL exists:", !!process.env.POSTGRES_URL, "POSTGRES_URL length:", process.env.POSTGRES_URL?.length ?? 0);
// #endregion
// biome-ignore lint: Forbidden non-null assertion.
const client = postgres(process.env.POSTGRES_URL!);
const db = drizzle(client);

export async function getUser(email: string): Promise<User[]> {
  // #region agent log
  console.error("[DEBUG] getUser called with email:", email);
  fetch('http://127.0.0.1:7242/ingest/e61e90b4-cddb-4b70-90e5-1497fbde9f03',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'queries.ts:getUser:entry',message:'getUser called',data:{email},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A,B,C,D,E'})}).catch(()=>{});
  // #endregion
  try {
    const result = await db.select().from(user).where(eq(user.email, email));
    // #region agent log
    console.error("[DEBUG] getUser success, found users:", result.length);
    fetch('http://127.0.0.1:7242/ingest/e61e90b4-cddb-4b70-90e5-1497fbde9f03',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'queries.ts:getUser:success',message:'getUser succeeded',data:{email,userCount:result.length},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A,B,C,D,E'})}).catch(()=>{});
    // #endregion
    return result;
  } catch (error) {
    // #region agent log
    const errorDetails = error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : { raw: String(error) };
    console.error("[DEBUG] getUser FAILED - Actual error:", JSON.stringify(errorDetails));
    fetch('http://127.0.0.1:7242/ingest/e61e90b4-cddb-4b70-90e5-1497fbde9f03',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'queries.ts:getUser:error',message:'getUser failed with actual error',data:{email,error:errorDetails},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A,B,C,D,E'})}).catch(()=>{});
    // #endregion
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get user by email"
    );
  }
}

export async function createUserFromOAuth(
  email: string,
  image_url?: string | null
) {
  // #region agent log
  console.error("[DEBUG] createUserFromOAuth called with email:", email);
  fetch('http://127.0.0.1:7242/ingest/e61e90b4-cddb-4b70-90e5-1497fbde9f03',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'queries.ts:createUserFromOAuth:entry',message:'createUserFromOAuth called',data:{email,hasImageUrl:!!image_url},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A,B,C,D,E'})}).catch(()=>{});
  // #endregion
  try {
    const result = await db
      .insert(user)
      .values({ email, image_url })
      .returning({
        id: user.id,
        email: user.email,
        image_url: user.image_url,
      });
    // #region agent log
    console.error("[DEBUG] createUserFromOAuth success, created user id:", result[0]?.id);
    fetch('http://127.0.0.1:7242/ingest/e61e90b4-cddb-4b70-90e5-1497fbde9f03',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'queries.ts:createUserFromOAuth:success',message:'createUserFromOAuth succeeded',data:{email,userId:result[0]?.id},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A,B,C,D,E'})}).catch(()=>{});
    // #endregion
    return result;
  } catch (error) {
    // #region agent log
    const errorDetails = error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : { raw: String(error) };
    console.error("[DEBUG] createUserFromOAuth FAILED - Actual error:", JSON.stringify(errorDetails));
    fetch('http://127.0.0.1:7242/ingest/e61e90b4-cddb-4b70-90e5-1497fbde9f03',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'queries.ts:createUserFromOAuth:error',message:'createUserFromOAuth failed with actual error',data:{email,error:errorDetails},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A,B,C,D,E'})}).catch(()=>{});
    // #endregion
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to create user from OAuth"
    );
  }
}

export async function updateUserImageUrl(userId: string, image_url: string) {
  try {
    return await db
      .update(user)
      .set({ image_url })
      .where(eq(user.id, userId));
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to update user image URL"
    );
  }
}

export async function saveChat({
  id,
  userId,
  title,
}: {
  id: string;
  userId: string;
  title: string;
}) {
  try {
    return await db.insert(chat).values({
      id,
      createdAt: new Date(),
      userId,
      title,
      visibility: "private",
    });
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to save chat");
  }
}

export async function deleteChatById({ id }: { id: string }) {
  try {
    await db.delete(vote).where(eq(vote.chatId, id));
    await db.delete(message).where(eq(message.chatId, id));
    await db.delete(stream).where(eq(stream.chatId, id));

    const [chatsDeleted] = await db
      .delete(chat)
      .where(eq(chat.id, id))
      .returning();
    return chatsDeleted;
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to delete chat by id"
    );
  }
}

export async function deleteAllChatsByUserId({ userId }: { userId: string }) {
  try {
    const userChats = await db
      .select({ id: chat.id })
      .from(chat)
      .where(eq(chat.userId, userId));

    if (userChats.length === 0) {
      return { deletedCount: 0 };
    }

    const chatIds = userChats.map((c) => c.id);

    await db.delete(vote).where(inArray(vote.chatId, chatIds));
    await db.delete(message).where(inArray(message.chatId, chatIds));
    await db.delete(stream).where(inArray(stream.chatId, chatIds));

    const deletedChats = await db
      .delete(chat)
      .where(eq(chat.userId, userId))
      .returning();

    return { deletedCount: deletedChats.length };
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to delete all chats by user id"
    );
  }
}

export async function getChatsByUserId({
  id,
  limit,
  startingAfter,
  endingBefore,
}: {
  id: string;
  limit: number;
  startingAfter: string | null;
  endingBefore: string | null;
}) {
  try {
    const extendedLimit = limit + 1;

    const query = (whereCondition?: SQL<any>) =>
      db
        .select()
        .from(chat)
        .where(
          whereCondition
            ? and(whereCondition, eq(chat.userId, id))
            : eq(chat.userId, id)
        )
        .orderBy(desc(chat.createdAt))
        .limit(extendedLimit);

    let filteredChats: Chat[] = [];

    if (startingAfter) {
      const [selectedChat] = await db
        .select()
        .from(chat)
        .where(eq(chat.id, startingAfter))
        .limit(1);

      if (!selectedChat) {
        throw new ChatSDKError(
          "not_found:database",
          `Chat with id ${startingAfter} not found`
        );
      }

      filteredChats = await query(gt(chat.createdAt, selectedChat.createdAt));
    } else if (endingBefore) {
      const [selectedChat] = await db
        .select()
        .from(chat)
        .where(eq(chat.id, endingBefore))
        .limit(1);

      if (!selectedChat) {
        throw new ChatSDKError(
          "not_found:database",
          `Chat with id ${endingBefore} not found`
        );
      }

      filteredChats = await query(lt(chat.createdAt, selectedChat.createdAt));
    } else {
      filteredChats = await query();
    }

    const hasMore = filteredChats.length > limit;

    return {
      chats: hasMore ? filteredChats.slice(0, limit) : filteredChats,
      hasMore,
    };
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get chats by user id"
    );
  }
}

export async function getChatById({ id }: { id: string }) {
  try {
    const [selectedChat] = await db.select().from(chat).where(eq(chat.id, id));
    if (!selectedChat) {
      return null;
    }

    return selectedChat;
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to get chat by id");
  }
}

export async function saveMessages({ messages }: { messages: DBMessage[] }) {
  try {
    return await db.insert(message).values(messages);
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to save messages");
  }
}

export async function getMessagesByChatId({ id }: { id: string }) {
  try {
    return await db
      .select()
      .from(message)
      .where(eq(message.chatId, id))
      .orderBy(asc(message.createdAt));
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get messages by chat id"
    );
  }
}

export async function voteMessage({
  chatId,
  messageId,
  type,
}: {
  chatId: string;
  messageId: string;
  type: "up" | "down";
}) {
  try {
    const [existingVote] = await db
      .select()
      .from(vote)
      .where(and(eq(vote.messageId, messageId)));

    if (existingVote) {
      return await db
        .update(vote)
        .set({ isUpvoted: type === "up" })
        .where(and(eq(vote.messageId, messageId), eq(vote.chatId, chatId)));
    }
    return await db.insert(vote).values({
      chatId,
      messageId,
      isUpvoted: type === "up",
    });
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to vote message");
  }
}

export async function getVotesByChatId({ id }: { id: string }) {
  try {
    return await db.select().from(vote).where(eq(vote.chatId, id));
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get votes by chat id"
    );
  }
}

export async function saveDocument({
  id,
  title,
  kind,
  content,
  userId,
}: {
  id: string;
  title: string;
  kind: ArtifactKind;
  content: string;
  userId: string;
}) {
  try {
    return await db
      .insert(document)
      .values({
        id,
        title,
        kind,
        content,
        userId,
        createdAt: new Date(),
      })
      .returning();
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to save document");
  }
}

export async function getDocumentsById({ id }: { id: string }) {
  try {
    const documents = await db
      .select()
      .from(document)
      .where(eq(document.id, id))
      .orderBy(asc(document.createdAt));

    return documents;
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get documents by id"
    );
  }
}

export async function getDocumentById({ id }: { id: string }) {
  try {
    const [selectedDocument] = await db
      .select()
      .from(document)
      .where(eq(document.id, id))
      .orderBy(desc(document.createdAt));

    return selectedDocument;
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get document by id"
    );
  }
}

export async function deleteDocumentsByIdAfterTimestamp({
  id,
  timestamp,
}: {
  id: string;
  timestamp: Date;
}) {
  try {
    await db
      .delete(suggestion)
      .where(
        and(
          eq(suggestion.documentId, id),
          gt(suggestion.documentCreatedAt, timestamp)
        )
      );

    return await db
      .delete(document)
      .where(and(eq(document.id, id), gt(document.createdAt, timestamp)))
      .returning();
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to delete documents by id after timestamp"
    );
  }
}

export async function saveSuggestions({
  suggestions,
}: {
  suggestions: Suggestion[];
}) {
  try {
    return await db.insert(suggestion).values(suggestions);
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to save suggestions"
    );
  }
}

export async function getSuggestionsByDocumentId({
  documentId,
}: {
  documentId: string;
}) {
  try {
    return await db
      .select()
      .from(suggestion)
      .where(eq(suggestion.documentId, documentId));
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get suggestions by document id"
    );
  }
}

export async function getMessageById({ id }: { id: string }) {
  try {
    return await db.select().from(message).where(eq(message.id, id));
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get message by id"
    );
  }
}

export async function deleteMessagesByChatIdAfterTimestamp({
  chatId,
  timestamp,
}: {
  chatId: string;
  timestamp: Date;
}) {
  try {
    const messagesToDelete = await db
      .select({ id: message.id })
      .from(message)
      .where(
        and(eq(message.chatId, chatId), gte(message.createdAt, timestamp))
      );

    const messageIds = messagesToDelete.map(
      (currentMessage) => currentMessage.id
    );

    if (messageIds.length > 0) {
      await db
        .delete(vote)
        .where(
          and(eq(vote.chatId, chatId), inArray(vote.messageId, messageIds))
        );

      return await db
        .delete(message)
        .where(
          and(eq(message.chatId, chatId), inArray(message.id, messageIds))
        );
    }
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to delete messages by chat id after timestamp"
    );
  }
}

export async function updateChatLastContextById({
  chatId,
  context,
}: {
  chatId: string;
  // Store merged server-enriched usage object
  context: AppUsage;
}) {
  try {
    return await db
      .update(chat)
      .set({ lastContext: context })
      .where(eq(chat.id, chatId));
  } catch (error) {
    console.warn("Failed to update lastContext for chat", chatId, error);
    return;
  }
}

export async function getMessageCountByUserId({
  id,
  differenceInHours,
}: {
  id: string;
  differenceInHours: number;
}) {
  try {
    const twentyFourHoursAgo = new Date(
      Date.now() - differenceInHours * 60 * 60 * 1000
    );

    const [stats] = await db
      .select({ count: count(message.id) })
      .from(message)
      .innerJoin(chat, eq(message.chatId, chat.id))
      .where(
        and(
          eq(chat.userId, id),
          gte(message.createdAt, twentyFourHoursAgo),
          eq(message.role, "user")
        )
      )
      .execute();

    return stats?.count ?? 0;
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get message count by user id"
    );
  }
}

export async function createStreamId({
  streamId,
  chatId,
}: {
  streamId: string;
  chatId: string;
}) {
  try {
    await db
      .insert(stream)
      .values({ id: streamId, chatId, createdAt: new Date() });
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to create stream id"
    );
  }
}

export async function getStreamIdsByChatId({ chatId }: { chatId: string }) {
  try {
    const streamIds = await db
      .select({ id: stream.id })
      .from(stream)
      .where(eq(stream.chatId, chatId))
      .orderBy(asc(stream.createdAt))
      .execute();

    return streamIds.map(({ id }) => id);
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get stream ids by chat id"
    );
  }
}

// ============================================================================
// Company CRUD Operations
// ============================================================================

export type CreateCompanyInput = {
  name: string;
  description?: string | null;
  websiteUrl?: string | null;
  instagramHandle?: string | null;
  industry?: string | null;
  brandVoice?: "formal" | "casual" | "playful" | "professional" | "friendly" | null;
  targetAudience?: string | null;
  brandColors?: string[] | null;
  logoUrl?: string | null;
  contentThemes?: string[] | null;
  hashtags?: string[] | null;
  preferredFormats?: string[] | null;
};

export async function createCompany({
  userId,
  companyData,
}: {
  userId: string;
  companyData: CreateCompanyInput;
}): Promise<Company> {
  try {
    const [newCompany] = await db
      .insert(company)
      .values({
        name: companyData.name,
        description: companyData.description,
        websiteUrl: companyData.websiteUrl,
        instagramHandle: companyData.instagramHandle,
        industry: companyData.industry,
        brandVoice: companyData.brandVoice,
        targetAudience: companyData.targetAudience,
        brandColors: companyData.brandColors,
        logoUrl: companyData.logoUrl,
        contentThemes: companyData.contentThemes,
        hashtags: companyData.hashtags,
        preferredFormats: companyData.preferredFormats,
        onboardingCompleted: false,
      })
      .returning();

    // Create user-company relationship with owner role
    await db.insert(userCompany).values({
      userId,
      companyId: newCompany.id,
      role: "owner",
    });

    return newCompany;
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to create company");
  }
}

export async function getCompanyById({
  id,
}: {
  id: string;
}): Promise<Company | null> {
  try {
    const [selectedCompany] = await db
      .select()
      .from(company)
      .where(eq(company.id, id));

    return selectedCompany ?? null;
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get company by id"
    );
  }
}

export async function getCompaniesByUserId({
  userId,
}: {
  userId: string;
}): Promise<(Company & { role: UserCompany["role"] })[]> {
  try {
    const userCompanies = await db
      .select({
        id: company.id,
        name: company.name,
        description: company.description,
        websiteUrl: company.websiteUrl,
        instagramHandle: company.instagramHandle,
        industry: company.industry,
        brandVoice: company.brandVoice,
        targetAudience: company.targetAudience,
        brandColors: company.brandColors,
        logoUrl: company.logoUrl,
        contentThemes: company.contentThemes,
        hashtags: company.hashtags,
        preferredFormats: company.preferredFormats,
        onboardingCompleted: company.onboardingCompleted,
        createdAt: company.createdAt,
        updatedAt: company.updatedAt,
        role: userCompany.role,
      })
      .from(userCompany)
      .innerJoin(company, eq(userCompany.companyId, company.id))
      .where(eq(userCompany.userId, userId))
      .orderBy(desc(company.createdAt));

    return userCompanies;
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get companies by user id"
    );
  }
}

export async function getUserCompanyRole({
  userId,
  companyId,
}: {
  userId: string;
  companyId: string;
}): Promise<UserCompany["role"] | null> {
  try {
    const [relation] = await db
      .select({ role: userCompany.role })
      .from(userCompany)
      .where(
        and(eq(userCompany.userId, userId), eq(userCompany.companyId, companyId))
      );

    return relation?.role ?? null;
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get user company role"
    );
  }
}

export type UpdateCompanyInput = Partial<CreateCompanyInput> & {
  onboardingCompleted?: boolean;
};

export async function updateCompany({
  id,
  data,
}: {
  id: string;
  data: UpdateCompanyInput;
}): Promise<Company> {
  try {
    const [updatedCompany] = await db
      .update(company)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(company.id, id))
      .returning();

    return updatedCompany;
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to update company");
  }
}

export async function deleteCompany({ id }: { id: string }): Promise<void> {
  try {
    // Delete reference images first
    await db
      .delete(companyReferenceImage)
      .where(eq(companyReferenceImage.companyId, id));

    // Delete user-company relationships
    await db.delete(userCompany).where(eq(userCompany.companyId, id));

    // Delete the company
    await db.delete(company).where(eq(company.id, id));
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to delete company");
  }
}

export async function addUserToCompany({
  userId,
  companyId,
  role = "member",
}: {
  userId: string;
  companyId: string;
  role?: "owner" | "admin" | "member";
}): Promise<void> {
  try {
    await db.insert(userCompany).values({
      userId,
      companyId,
      role,
    });
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to add user to company"
    );
  }
}

export async function removeUserFromCompany({
  userId,
  companyId,
}: {
  userId: string;
  companyId: string;
}): Promise<void> {
  try {
    await db
      .delete(userCompany)
      .where(
        and(eq(userCompany.userId, userId), eq(userCompany.companyId, companyId))
      );
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to remove user from company"
    );
  }
}

// ============================================================================
// Company Reference Images Operations
// ============================================================================

export async function addCompanyReferenceImage({
  companyId,
  url,
  thumbnailUrl,
  source,
  caption,
}: {
  companyId: string;
  url: string;
  thumbnailUrl?: string | null;
  source: "upload" | "instagram_scrape";
  caption?: string | null;
}): Promise<CompanyReferenceImage> {
  try {
    const [newImage] = await db
      .insert(companyReferenceImage)
      .values({
        companyId,
        url,
        thumbnailUrl,
        source,
        caption,
      })
      .returning();

    return newImage;
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to add company reference image"
    );
  }
}

export async function getCompanyReferenceImages({
  companyId,
}: {
  companyId: string;
}): Promise<CompanyReferenceImage[]> {
  try {
    return await db
      .select()
      .from(companyReferenceImage)
      .where(eq(companyReferenceImage.companyId, companyId))
      .orderBy(desc(companyReferenceImage.createdAt));
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get company reference images"
    );
  }
}

export async function deleteCompanyReferenceImage({
  id,
}: {
  id: string;
}): Promise<void> {
  try {
    await db
      .delete(companyReferenceImage)
      .where(eq(companyReferenceImage.id, id));
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to delete company reference image"
    );
  }
}

export async function getUserReferenceImages({
  userId,
}: {
  userId: string;
}): Promise<CompanyReferenceImage[]> {
  try {
    // Get all companies the user belongs to and their reference images
    const images = await db
      .select({
        id: companyReferenceImage.id,
        companyId: companyReferenceImage.companyId,
        url: companyReferenceImage.url,
        thumbnailUrl: companyReferenceImage.thumbnailUrl,
        source: companyReferenceImage.source,
        caption: companyReferenceImage.caption,
        createdAt: companyReferenceImage.createdAt,
      })
      .from(companyReferenceImage)
      .innerJoin(userCompany, eq(companyReferenceImage.companyId, userCompany.companyId))
      .where(eq(userCompany.userId, userId))
      .orderBy(desc(companyReferenceImage.createdAt));

    return images;
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get user reference images"
    );
  }
}

export async function hasUserCompletedOnboarding({
  userId,
}: {
  userId: string;
}): Promise<boolean> {
  try {
    const companies = await db
      .select({ onboardingCompleted: company.onboardingCompleted })
      .from(userCompany)
      .innerJoin(company, eq(userCompany.companyId, company.id))
      .where(eq(userCompany.userId, userId))
      .limit(1);

    return companies.length > 0 && companies[0].onboardingCompleted;
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to check onboarding status"
    );
  }
}

// ============================================================================
// Scheduled Post CRUD Operations
// ============================================================================

export type CreateScheduledPostInput = {
  mediaUrl: string;
  mediaType?: string | null;
  caption: string;
  locationId?: string | null;
  userTagsJson?: string | null;
  scheduledAt: Date;
};

export type UpdateScheduledPostInput = Partial<CreateScheduledPostInput> & {
  status?: string;
  retryAttempts?: number;
  lastAttemptAt?: Date | null;
  lastErrorMessage?: string | null;
  mediaContainerId?: string | null;
  mediaContainerStatus?: string | null;
  publishedAt?: Date | null;
};

export async function createScheduledPost({
  userId,
  data,
}: {
  userId: string;
  data: CreateScheduledPostInput;
}): Promise<ScheduledPost> {
  try {
    const [newPost] = await db
      .insert(scheduledPost)
      .values({
        userId,
        mediaUrl: data.mediaUrl,
        mediaType: data.mediaType,
        caption: data.caption,
        locationId: data.locationId,
        userTagsJson: data.userTagsJson,
        scheduledAt: data.scheduledAt,
      })
      .returning();

    return newPost;
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to create scheduled post"
    );
  }
}

export async function getScheduledPostById({
  id,
  userId,
}: {
  id: string;
  userId: string;
}): Promise<ScheduledPost | null> {
  try {
    const [post] = await db
      .select()
      .from(scheduledPost)
      .where(
        and(
          eq(scheduledPost.id, id),
          eq(scheduledPost.userId, userId),
          isNull(scheduledPost.deletedAt)
        )
      )
      .limit(1);

    return post ?? null;
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get scheduled post by id"
    );
  }
}

export async function getScheduledPostsByUserId({
  userId,
  page = 1,
  perPage = 10,
  afterDate,
}: {
  userId: string;
  page?: number;
  perPage?: number;
  afterDate?: Date;
}): Promise<{ posts: ScheduledPost[]; total: number }> {
  try {
    const whereConditions = [
      eq(scheduledPost.userId, userId),
      isNull(scheduledPost.deletedAt),
    ];

    if (afterDate) {
      whereConditions.push(gte(scheduledPost.scheduledAt, afterDate));
    }

    const skip = (page - 1) * perPage;

    const [posts, countResult] = await Promise.all([
      db
        .select()
        .from(scheduledPost)
        .where(and(...whereConditions))
        .orderBy(asc(scheduledPost.scheduledAt))
        .limit(perPage)
        .offset(skip),
      db
        .select({ count: count() })
        .from(scheduledPost)
        .where(and(...whereConditions)),
    ]);

    return {
      posts,
      total: countResult[0]?.count ?? 0,
    };
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get scheduled posts by user id"
    );
  }
}

export async function updateScheduledPost({
  id,
  userId,
  data,
}: {
  id: string;
  userId: string;
  data: UpdateScheduledPostInput;
}): Promise<ScheduledPost> {
  try {
    const [updatedPost] = await db
      .update(scheduledPost)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(scheduledPost.id, id),
          eq(scheduledPost.userId, userId),
          isNull(scheduledPost.deletedAt)
        )
      )
      .returning();

    if (!updatedPost) {
      throw new ChatSDKError(
        "not_found:database",
        "Scheduled post not found"
      );
    }

    return updatedPost;
  } catch (error) {
    if (error instanceof ChatSDKError) {
      throw error;
    }
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to update scheduled post"
    );
  }
}

export async function deleteScheduledPost({
  id,
  userId,
}: {
  id: string;
  userId: string;
}): Promise<void> {
  try {
    // Soft delete by setting deletedAt
    await db
      .update(scheduledPost)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(
        and(
          eq(scheduledPost.id, id),
          eq(scheduledPost.userId, userId),
          isNull(scheduledPost.deletedAt)
        )
      );
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to delete scheduled post"
    );
  }
}

export async function getInstagramAccountByUserId({
  userId,
}: {
  userId: string;
}): Promise<InstagramAccount | null> {
  try {
    const [account] = await db
      .select()
      .from(instagramAccount)
      .where(
        and(
          eq(instagramAccount.userId, userId),
          isNull(instagramAccount.deletedAt)
        )
      )
      .limit(1);

    return account ?? null;
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get Instagram account by user id"
    );
  }
}

// =============================================
// Post (Canvas Editor) Queries
// =============================================

export async function createPost({
  userId,
  title,
  width = 1080,
  height = 1080,
  layers = [],
  caption,
  chatId,
}: {
  userId: string;
  title?: string;
  width?: number;
  height?: number;
  layers?: Layer[];
  caption?: string;
  chatId?: string;
}): Promise<Post> {
  try {
    const [newPost] = await db
      .insert(post)
      .values({
        userId,
        title: title ?? "Untitled Post",
        width,
        height,
        layers,
        caption,
        chatId,
        status: "draft",
      })
      .returning();

    if (!newPost) {
      throw new ChatSDKError("bad_request:database", "Failed to create post");
    }

    return newPost;
  } catch (error) {
    if (error instanceof ChatSDKError) {
      throw error;
    }
    throw new ChatSDKError("bad_request:database", "Failed to create post");
  }
}

export async function getPostById({
  id,
  userId,
}: {
  id: string;
  userId: string;
}): Promise<Post | null> {
  try {
    const [foundPost] = await db
      .select()
      .from(post)
      .where(
        and(eq(post.id, id), eq(post.userId, userId), isNull(post.deletedAt))
      )
      .limit(1);

    return foundPost ?? null;
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to get post");
  }
}

export async function getPostsByUserId({
  userId,
  status,
  limit = 20,
  offset = 0,
}: {
  userId: string;
  status?: PostStatus;
  limit?: number;
  offset?: number;
}): Promise<{ posts: Post[]; total: number }> {
  try {
    const whereConditions = [eq(post.userId, userId), isNull(post.deletedAt)];

    if (status) {
      whereConditions.push(eq(post.status, status));
    }

    const whereClause = and(...whereConditions);

    const [posts, [countResult]] = await Promise.all([
      db
        .select()
        .from(post)
        .where(whereClause)
        .orderBy(desc(post.updatedAt))
        .limit(limit)
        .offset(offset),
      db.select({ count: count() }).from(post).where(whereClause),
    ]);

    return {
      posts,
      total: countResult?.count ?? 0,
    };
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to get posts");
  }
}

export async function updatePost({
  id,
  userId,
  title,
  width,
  height,
  layers,
  renderedImage,
  thumbnailImage,
  caption,
  status,
  scheduledAt,
  publishedAt,
  scheduledPostId,
}: {
  id: string;
  userId: string;
  title?: string;
  width?: number;
  height?: number;
  layers?: Layer[];
  renderedImage?: string;
  thumbnailImage?: string;
  caption?: string;
  status?: PostStatus;
  scheduledAt?: Date | null;
  publishedAt?: Date | null;
  scheduledPostId?: string | null;
}): Promise<Post> {
  try {
    const updateData: Partial<Post> & { updatedAt: Date } = {
      updatedAt: new Date(),
    };

    if (title !== undefined) updateData.title = title;
    if (width !== undefined) updateData.width = width;
    if (height !== undefined) updateData.height = height;
    if (layers !== undefined) updateData.layers = layers;
    if (renderedImage !== undefined) updateData.renderedImage = renderedImage;
    if (thumbnailImage !== undefined)
      updateData.thumbnailImage = thumbnailImage;
    if (caption !== undefined) updateData.caption = caption;
    if (status !== undefined) updateData.status = status;
    if (scheduledAt !== undefined) updateData.scheduledAt = scheduledAt;
    if (publishedAt !== undefined) updateData.publishedAt = publishedAt;
    if (scheduledPostId !== undefined)
      updateData.scheduledPostId = scheduledPostId;

    const [updatedPost] = await db
      .update(post)
      .set(updateData)
      .where(
        and(eq(post.id, id), eq(post.userId, userId), isNull(post.deletedAt))
      )
      .returning();

    if (!updatedPost) {
      throw new ChatSDKError("not_found:database", "Post not found");
    }

    return updatedPost;
  } catch (error) {
    if (error instanceof ChatSDKError) {
      throw error;
    }
    throw new ChatSDKError("bad_request:database", "Failed to update post");
  }
}

export async function updatePostLayers({
  id,
  userId,
  layers,
}: {
  id: string;
  userId: string;
  layers: Layer[];
}): Promise<Post> {
  return updatePost({ id, userId, layers });
}

export async function deletePost({
  id,
  userId,
}: {
  id: string;
  userId: string;
}): Promise<void> {
  try {
    // Soft delete by setting deletedAt
    await db
      .update(post)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(
        and(eq(post.id, id), eq(post.userId, userId), isNull(post.deletedAt))
      );
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to delete post");
  }
}

export async function duplicatePost({
  id,
  userId,
}: {
  id: string;
  userId: string;
}): Promise<Post> {
  try {
    const originalPost = await getPostById({ id, userId });

    if (!originalPost) {
      throw new ChatSDKError("not_found:database", "Post not found");
    }

    const [duplicatedPost] = await db
      .insert(post)
      .values({
        userId,
        title: `${originalPost.title ?? "Untitled"} (copy)`,
        width: originalPost.width,
        height: originalPost.height,
        layers: originalPost.layers,
        caption: originalPost.caption,
        status: "draft",
      })
      .returning();

    if (!duplicatedPost) {
      throw new ChatSDKError(
        "bad_request:database",
        "Failed to duplicate post"
      );
    }

    return duplicatedPost;
  } catch (error) {
    if (error instanceof ChatSDKError) {
      throw error;
    }
    throw new ChatSDKError("bad_request:database", "Failed to duplicate post");
  }
}
