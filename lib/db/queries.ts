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
  lt,
  type SQL,
} from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import type { ArtifactKind } from "@/components/artifact";
import { ChatSDKError } from "../errors";
import type { AppUsage } from "../usage";
import {
  type Chat,
  chat,
  type Company,
  company,
  type CompanyReferenceImage,
  companyReferenceImage,
  type DBMessage,
  document,
  message,
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
  source,
  caption,
}: {
  companyId: string;
  url: string;
  source: "upload" | "instagram_scrape";
  caption?: string | null;
}): Promise<CompanyReferenceImage> {
  try {
    const [newImage] = await db
      .insert(companyReferenceImage)
      .values({
        companyId,
        url,
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
