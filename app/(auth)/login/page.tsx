"use client";

import { GoogleSignInButton } from "@/components/google-sign-in-button";

export default function Page() {
  return (
    <div className="flex h-dvh w-screen items-start justify-center bg-background pt-12 md:items-center md:pt-0">
      <div className="flex w-full max-w-md flex-col gap-8 overflow-hidden rounded-2xl">
        <div className="flex flex-col items-center justify-center gap-2 px-4 text-center sm:px-16">
          <h3 className="font-semibold text-xl dark:text-zinc-50">Entrar</h3>
          <p className="text-gray-500 text-sm dark:text-zinc-400">
            Entre com sua conta Google para continuar
          </p>
        </div>

        <div className="flex flex-col gap-4 px-4 sm:px-16">
          <GoogleSignInButton />
        </div>
      </div>
    </div>
  );
}
