import Image from "next/image";
import { redirect } from "next/navigation";
import { auth } from "@/app/(auth)/auth";
import { getCompaniesByUserId } from "@/lib/db/queries";

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
      <header className="flex h-16 items-center justify-center border-b border-border px-4">
        <div className="flex items-center gap-2">
          <Image
            alt="Automatize Já"
            className="dark:hidden block"
            height={32}
            src="/logo/1.png"
            width={32}
          />
          <Image
            alt="Automatize Já"
            className="hidden dark:block"
            height={32}
            src="/logo/2.png"
            width={32}
          />
          <span className="font-semibold text-lg">Automatize Já</span>
        </div>
      </header>
      <main className="flex flex-1 items-start justify-center px-4 py-8 md:items-center md:py-0">
        {children}
      </main>
    </div>
  );
}

