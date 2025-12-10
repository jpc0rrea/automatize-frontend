import NextAuth, { type DefaultSession } from "next-auth";
import type { DefaultJWT } from "next-auth/jwt";
import Google from "next-auth/providers/google";
import {
  createUserFromOAuth,
  getUser,
  updateUserImageUrl,
} from "@/lib/db/queries";
import { authConfig } from "./auth.config";

declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
      image_url?: string | null;
    } & DefaultSession["user"];
  }

  // biome-ignore lint/nursery/useConsistentTypeDefinitions: "Required"
  interface User {
    id?: string;
    email?: string | null;
    image_url?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id: string;
    image_url?: string | null;
  }
}

export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth({
  ...authConfig,
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      // #region agent log
      console.error("[DEBUG] signIn callback started, provider:", account?.provider, "email:", user.email);
      fetch('http://127.0.0.1:7242/ingest/e61e90b4-cddb-4b70-90e5-1497fbde9f03',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auth.ts:signIn:entry',message:'signIn callback started',data:{provider:account?.provider,email:user.email},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A,B,C,D,E'})}).catch(()=>{});
      // #endregion
      try {
        if (account?.provider === "google" && user.email) {
          // #region agent log
          console.error("[DEBUG] Google provider detected, checking for existing user");
          fetch('http://127.0.0.1:7242/ingest/e61e90b4-cddb-4b70-90e5-1497fbde9f03',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auth.ts:signIn:beforeGetUser',message:'About to call getUser',data:{email:user.email},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A,B,C,D,E'})}).catch(()=>{});
          // #endregion
          const existingUsers = await getUser(user.email);
          // #region agent log
          console.error("[DEBUG] getUser returned, found:", existingUsers.length, "users");
          fetch('http://127.0.0.1:7242/ingest/e61e90b4-cddb-4b70-90e5-1497fbde9f03',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auth.ts:signIn:afterGetUser',message:'getUser returned',data:{email:user.email,userCount:existingUsers.length},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A,B,C,D,E'})}).catch(()=>{});
          // #endregion
          if (existingUsers.length === 0) {
            // Create new user with profile image from Google
            // #region agent log
            console.error("[DEBUG] No existing user, creating new user");
            fetch('http://127.0.0.1:7242/ingest/e61e90b4-cddb-4b70-90e5-1497fbde9f03',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auth.ts:signIn:creatingUser',message:'Creating new user',data:{email:user.email},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A,B,C,D,E'})}).catch(()=>{});
            // #endregion
            const [newUser] = await createUserFromOAuth(user.email, user.image);
            user.id = newUser.id;
            user.image_url = newUser.image_url;
            // #region agent log
            console.error("[DEBUG] New user created successfully, id:", newUser.id);
            fetch('http://127.0.0.1:7242/ingest/e61e90b4-cddb-4b70-90e5-1497fbde9f03',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auth.ts:signIn:userCreated',message:'New user created',data:{userId:newUser.id},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A,B,C,D,E'})}).catch(()=>{});
            // #endregion
          } else {
            // User exists - update their profile image if it changed
            user.id = existingUsers[0].id;
            if (user.image && existingUsers[0].image_url !== user.image) {
              await updateUserImageUrl(existingUsers[0].id, user.image);
              user.image_url = user.image;
            } else {
              user.image_url = existingUsers[0].image_url;
            }
            // #region agent log
            console.error("[DEBUG] Existing user found, id:", existingUsers[0].id);
            fetch('http://127.0.0.1:7242/ingest/e61e90b4-cddb-4b70-90e5-1497fbde9f03',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auth.ts:signIn:existingUser',message:'Existing user found',data:{userId:existingUsers[0].id},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A,B,C,D,E'})}).catch(()=>{});
            // #endregion
          }
        }
        // #region agent log
        console.error("[DEBUG] signIn callback returning true (success)");
        fetch('http://127.0.0.1:7242/ingest/e61e90b4-cddb-4b70-90e5-1497fbde9f03',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auth.ts:signIn:success',message:'signIn returning true',data:{userId:user.id},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A,B,C,D,E'})}).catch(()=>{});
        // #endregion
        return true;
      } catch (error) {
        // #region agent log
        const errorDetails = error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : { raw: String(error) };
        console.error("[DEBUG] signIn callback FAILED - Actual error:", JSON.stringify(errorDetails));
        fetch('http://127.0.0.1:7242/ingest/e61e90b4-cddb-4b70-90e5-1497fbde9f03',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auth.ts:signIn:error',message:'signIn callback failed',data:{error:errorDetails},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A,B,C,D,E'})}).catch(()=>{});
        // #endregion
        throw error;
      }
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.image_url = user.image_url ?? user.image;
      }

      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.image_url = token.image_url;
      }

      return session;
    },
  },
});
