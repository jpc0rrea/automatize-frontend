/**
 * Script to delete a user and all associated data from the database.
 *
 * Usage:
 *   bun run scripts/delete-user.ts <user-email-or-id>
 *
 * This will delete:
 * - User record
 * - All chats (and their messages, votes, streams)
 * - All documents and suggestions
 * - All user-company relationships
 * - Companies (if user is the only member)
 * - Company reference images (for deleted companies)
 * - Instagram accounts
 * - Scheduled posts
 * - Canvas posts
 */

import { eq, inArray, and } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import {
  user,
  chat,
  message,
  vote,
  stream,
  document,
  suggestion,
  company,
  userCompany,
  companyReferenceImage,
  instagramAccount,
  scheduledPost,
  post,
} from "../lib/db/schema";

const POSTGRES_URL = process.env.POSTGRES_URL;

if (!POSTGRES_URL) {
  console.error("❌ POSTGRES_URL environment variable is not set");
  process.exit(1);
}

const client = postgres(POSTGRES_URL);
const db = drizzle(client);

async function deleteUser(emailOrId: string) {
  console.log(`\n🔍 Looking for user: ${emailOrId}`);

  // Find the user by email or ID
  const users = await db.select().from(user).where(eq(user.email, emailOrId));

  let targetUser = users[0];

  // If not found by email, try by ID
  if (!targetUser) {
    const usersById = await db
      .select()
      .from(user)
      .where(eq(user.id, emailOrId));
    targetUser = usersById[0];
  }

  if (!targetUser) {
    console.error(`❌ User not found: ${emailOrId}`);
    process.exit(1);
  }

  const userId = targetUser.id;
  console.log(`✅ Found user: ${targetUser.email} (ID: ${userId})`);
  console.log("\n📊 Starting deletion process...\n");

  // 1. Get all chat IDs for this user
  const userChats = await db
    .select({ id: chat.id })
    .from(chat)
    .where(eq(chat.userId, userId));
  const chatIds = userChats.map((c) => c.id);

  if (chatIds.length > 0) {
    // Delete votes for user's chats
    const votesDeleted = await db
      .delete(vote)
      .where(inArray(vote.chatId, chatIds))
      .returning();
    console.log(`   🗑️  Deleted ${votesDeleted.length} votes`);

    // Delete messages for user's chats
    const messagesDeleted = await db
      .delete(message)
      .where(inArray(message.chatId, chatIds))
      .returning();
    console.log(`   🗑️  Deleted ${messagesDeleted.length} messages`);

    // Delete streams for user's chats
    const streamsDeleted = await db
      .delete(stream)
      .where(inArray(stream.chatId, chatIds))
      .returning();
    console.log(`   🗑️  Deleted ${streamsDeleted.length} streams`);

    // Update posts to remove chatId reference (before deleting chats)
    await db
      .update(post)
      .set({ chatId: null })
      .where(inArray(post.chatId, chatIds));
  }

  // Delete chats
  const chatsDeleted = await db
    .delete(chat)
    .where(eq(chat.userId, userId))
    .returning();
  console.log(`   🗑️  Deleted ${chatsDeleted.length} chats`);

  // 2. Get all document IDs for this user
  const userDocs = await db
    .select({ id: document.id, createdAt: document.createdAt })
    .from(document)
    .where(eq(document.userId, userId));
  const docIds = userDocs.map((d) => d.id);

  if (docIds.length > 0) {
    // Delete suggestions for user's documents
    const suggestionsDeleted = await db
      .delete(suggestion)
      .where(inArray(suggestion.documentId, docIds))
      .returning();
    console.log(`   🗑️  Deleted ${suggestionsDeleted.length} suggestions`);
  }

  // Also delete suggestions created by this user
  const userSuggestionsDeleted = await db
    .delete(suggestion)
    .where(eq(suggestion.userId, userId))
    .returning();
  if (userSuggestionsDeleted.length > 0) {
    console.log(
      `   🗑️  Deleted ${userSuggestionsDeleted.length} user-created suggestions`
    );
  }

  // Delete documents
  const documentsDeleted = await db
    .delete(document)
    .where(eq(document.userId, userId))
    .returning();
  console.log(`   🗑️  Deleted ${documentsDeleted.length} documents`);

  // 3. Handle companies
  // Get all companies this user is associated with
  const userCompanyRelations = await db
    .select({
      companyId: userCompany.companyId,
      role: userCompany.role,
    })
    .from(userCompany)
    .where(eq(userCompany.userId, userId));

  const companyIds = userCompanyRelations.map((uc) => uc.companyId);

  // Delete user-company relationships for this user
  const userCompanyDeleted = await db
    .delete(userCompany)
    .where(eq(userCompany.userId, userId))
    .returning();
  console.log(
    `   🗑️  Deleted ${userCompanyDeleted.length} user-company relationships`
  );

  // For each company, check if there are other users
  let companiesDeleted = 0;
  let referenceImagesDeleted = 0;

  for (const companyId of companyIds) {
    // Check if company has other users
    const otherUsers = await db
      .select({ userId: userCompany.userId })
      .from(userCompany)
      .where(eq(userCompany.companyId, companyId))
      .limit(1);

    if (otherUsers.length === 0) {
      // No other users, delete the company and its reference images
      const refImagesDeleted = await db
        .delete(companyReferenceImage)
        .where(eq(companyReferenceImage.companyId, companyId))
        .returning();
      referenceImagesDeleted += refImagesDeleted.length;

      await db.delete(company).where(eq(company.id, companyId));
      companiesDeleted++;
    }
  }

  console.log(`   🗑️  Deleted ${referenceImagesDeleted} reference images`);
  console.log(`   🗑️  Deleted ${companiesDeleted} companies (orphaned)`);

  // 4. Delete Instagram accounts
  const instagramDeleted = await db
    .delete(instagramAccount)
    .where(eq(instagramAccount.userId, userId))
    .returning();
  console.log(`   🗑️  Deleted ${instagramDeleted.length} Instagram accounts`);

  // 5. Delete scheduled posts
  const scheduledPostsDeleted = await db
    .delete(scheduledPost)
    .where(eq(scheduledPost.userId, userId))
    .returning();
  console.log(`   🗑️  Deleted ${scheduledPostsDeleted.length} scheduled posts`);

  // 6. Delete canvas posts
  const postsDeleted = await db
    .delete(post)
    .where(eq(post.userId, userId))
    .returning();
  console.log(`   🗑️  Deleted ${postsDeleted.length} canvas posts`);

  // 7. Finally, delete the user
  const userDeleted = await db
    .delete(user)
    .where(eq(user.id, userId))
    .returning();
  console.log(`   🗑️  Deleted ${userDeleted.length} user record`);

  console.log(`\n✅ Successfully deleted user: ${targetUser.email}\n`);
}

// Main execution
const emailOrId = process.argv[2];

if (!emailOrId) {
  console.error("Usage: bun run scripts/delete-user.ts <user-email-or-id>");
  process.exit(1);
}

deleteUser(emailOrId)
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Error deleting user:", error);
    process.exit(1);
  });
