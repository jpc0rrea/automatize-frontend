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
      if (account?.provider === "google" && user.email) {
        const existingUsers = await getUser(user.email);
        if (existingUsers.length === 0) {
          // Create new user with profile image from Google
          const [newUser] = await createUserFromOAuth(user.email, user.image);
          user.id = newUser.id;
          user.image_url = newUser.image_url;
        } else {
          // User exists - update their profile image if it changed
          user.id = existingUsers[0].id;
          if (user.image && existingUsers[0].image_url !== user.image) {
            await updateUserImageUrl(existingUsers[0].id, user.image);
            user.image_url = user.image;
          } else {
            user.image_url = existingUsers[0].image_url;
          }
        }
      }
      return true;
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
