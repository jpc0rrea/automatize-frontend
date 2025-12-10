import { type NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { isDevelopmentEnvironment } from "./lib/constants";

// Paths that should skip onboarding check
const skipOnboardingPaths = ["/onboarding", "/settings", "/api/company", "/api/files", "/api/auth", "/login"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  /*
   * Playwright starts the dev server and requires a 200 status to
   * begin the tests, so this ensures that the tests can start
   */
  if (pathname.startsWith("/ping")) {
    return new Response("pong", { status: 200 });
  }

  if (pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET,
    secureCookie: !isDevelopmentEnvironment,
  });

  // If not logged in and not on login page, redirect to login
  if (!token && pathname !== "/login") {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // If logged in and on login page, redirect to home
  if (token && pathname === "/login") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Skip onboarding check for certain paths
  if (skipOnboardingPaths.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // Check if user has completed onboarding (only for authenticated users)
  if (token) {
    try {
      const baseUrl = request.nextUrl.origin;
      const response = await fetch(`${baseUrl}/api/company`, {
        headers: {
          cookie: request.headers.get("cookie") ?? "",
        },
      });

      if (response.ok) {
        const data = await response.json();
        const companies = data.companies ?? [];
        const hasCompletedOnboarding = companies.some(
          (c: { onboardingCompleted: boolean }) => c.onboardingCompleted
        );

        // Redirect to onboarding if user hasn't completed it
        if (!hasCompletedOnboarding && pathname !== "/onboarding") {
          return NextResponse.redirect(new URL("/onboarding", request.url));
        }
      }
    } catch (error) {
      // If API call fails, allow the request to continue
      // The page will handle the redirect if needed
      console.error("Proxy onboarding check failed:", error);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/chat/:id",
    "/api/:path*",
    "/login",
    "/onboarding",
    "/settings",

    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     */
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
