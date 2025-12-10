import { redirect } from "next/navigation";
import { auth, signOut } from "@/app/(auth)/auth";
import { getCompaniesByUserId } from "@/lib/db/queries";
import { LogOut } from "lucide-react";
import Form from "next/form";

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  // Check if user already has a completed company onboarding
  const companies = await getCompaniesByUserId({ userId: session.user.id });
  const hasCompletedOnboarding = companies.some((c) => c.onboardingCompleted);

  if (hasCompletedOnboarding) {
    redirect("/");
  }

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="flex h-16 items-center justify-between border-b border-border px-4">
        <div className="w-24" />
        <div className="flex items-center">
          {/* biome-ignore lint/a11y/useAltText: Alt text provided */}
          <img
            alt="Automatize Já"
            className="block dark:hidden"
            src="/logo/3.png"
            style={{ height: 32 }}
          />
          {/* biome-ignore lint/a11y/useAltText: Alt text provided */}
          <img
            alt="Automatize Já"
            className="hidden dark:block"
            src="/logo/9.png"
            style={{ height: 32 }}
          />
        </div>
        <div className="flex w-24 justify-end">
          <Form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button
              className="flex items-center gap-2 rounded-md px-3 py-2 text-muted-foreground text-sm transition-colors hover:bg-muted hover:text-foreground"
              type="submit"
            >
              <LogOut className="size-4" />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </Form>
        </div>
      </header>
      <main className="flex flex-1 items-start justify-center px-4 py-8 md:items-center md:py-0">
        {children}
      </main>
    </div>
  );
}

