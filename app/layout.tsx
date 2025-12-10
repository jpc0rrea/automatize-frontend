import type { Metadata } from "next";
import localFont from "next/font/local";
import { Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/theme-provider";

import "./globals.css";
import { SessionProvider } from "next-auth/react";

export const metadata: Metadata = {
  metadataBase: new URL("https://automatizeja.com"),
  title: "AutomatizeJá | O alto nível exige precisão",
  description:
    "AutomatizeJá - A solução definitiva para marcas visionárias. Inteligência artificial de última geração para retargeting estratégico e resultados extraordinários.",
  keywords: [
    "automação",
    "inteligência artificial",
    "retargeting",
    "marketing digital",
    "AutomatizeJá",
  ],
  authors: [{ name: "AutomatizeJá" }],
  openGraph: {
    title: "AutomatizeJá | O alto nível exige precisão",
    description:
      "A solução definitiva para marcas visionárias. Inteligência artificial para resultados extraordinários.",
    siteName: "AutomatizeJá",
    locale: "pt_BR",
    type: "website",
    images: ["/logo/11.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "AutomatizeJá | O alto nível exige precisão",
    description:
      "A solução definitiva para marcas visionárias. IA para resultados extraordinários.",
    images: ["/logo/11.png"],
  },
};

export const viewport = {
  maximumScale: 1, // Disable auto-zoom on mobile Safari
};

// Urbane Font Family - textos
const urbane = localFont({
  src: [
    {
      path: "../fonts/Urbane-Thin.ttf",
      weight: "100",
      style: "normal",
    },
    {
      path: "../fonts/Urbane-ThinItalic.ttf",
      weight: "100",
      style: "italic",
    },
    {
      path: "../fonts/Urbane-ExtraLight.ttf",
      weight: "200",
      style: "normal",
    },
    {
      path: "../fonts/Urbane-ExtraLightItalic.ttf",
      weight: "200",
      style: "italic",
    },
    {
      path: "../fonts/Urbane-Light.ttf",
      weight: "300",
      style: "normal",
    },
    {
      path: "../fonts/Urbane-LightItalic.ttf",
      weight: "300",
      style: "italic",
    },
    {
      path: "../fonts/Urbane-Medium.ttf",
      weight: "500",
      style: "normal",
    },
    {
      path: "../fonts/Urbane-MediumItalic.ttf",
      weight: "500",
      style: "italic",
    },
    {
      path: "../fonts/Urbane-DemiBold.ttf",
      weight: "600",
      style: "normal",
    },
    {
      path: "../fonts/Urbane-DemiBoldItalic.ttf",
      weight: "600",
      style: "italic",
    },
    {
      path: "../fonts/Urbane-Bold.ttf",
      weight: "700",
      style: "normal",
    },
    {
      path: "../fonts/Urbane-BoldItalic.ttf",
      weight: "700",
      style: "italic",
    },
    {
      path: "../fonts/Urbane-Heavy.ttf",
      weight: "800",
      style: "normal",
    },
    {
      path: "../fonts/Urbane-HeavyItalic.ttf",
      weight: "800",
      style: "italic",
    },
  ],
  variable: "--font-urbane",
  display: "swap",
});

// IvyMode Font Family - títulos
const ivyMode = localFont({
  src: [
    {
      path: "../fonts/IvyMode-Thin.woff2",
      weight: "100",
      style: "normal",
    },
    {
      path: "../fonts/IvyMode-ThinItalic.woff2",
      weight: "100",
      style: "italic",
    },
    {
      path: "../fonts/IvyMode-Light.woff2",
      weight: "300",
      style: "normal",
    },
    {
      path: "../fonts/IvyMode-LightItalic.woff2",
      weight: "300",
      style: "italic",
    },
    {
      path: "../fonts/IvyMode-Regular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../fonts/IvyMode-Italic.woff2",
      weight: "400",
      style: "italic",
    },
    {
      path: "../fonts/IvyMode-SemiBold.woff2",
      weight: "600",
      style: "normal",
    },
    {
      path: "../fonts/IvyMode-SemiBoldItalic.woff2",
      weight: "600",
      style: "italic",
    },
    {
      path: "../fonts/IvyMode-Bold.woff2",
      weight: "700",
      style: "normal",
    },
    {
      path: "../fonts/IvyMode-BoldItalic.woff2",
      weight: "700",
      style: "italic",
    },
  ],
  variable: "--font-ivymode",
  display: "swap",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-geist-mono",
});

const LIGHT_THEME_COLOR = "#F5F5F5";
const DARK_THEME_COLOR = "#000000";
const THEME_COLOR_SCRIPT = `\
(function() {
  var html = document.documentElement;
  var meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute('name', 'theme-color');
    document.head.appendChild(meta);
  }
  function updateThemeColor() {
    var isDark = html.classList.contains('dark');
    meta.setAttribute('content', isDark ? '${DARK_THEME_COLOR}' : '${LIGHT_THEME_COLOR}');
  }
  var observer = new MutationObserver(updateThemeColor);
  observer.observe(html, { attributes: true, attributeFilter: ['class'] });
  updateThemeColor();
})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      className={`${urbane.variable} ${ivyMode.variable} ${geistMono.variable}`}
      // `next-themes` injects an extra classname to the body element to avoid
      // visual flicker before hydration. Hence the `suppressHydrationWarning`
      // prop is necessary to avoid the React hydration mismatch warning.
      // https://github.com/pacocoursey/next-themes?tab=readme-ov-file#with-app
      lang="pt-BR"
      suppressHydrationWarning
    >
      <head>
        <script
          // biome-ignore lint/security/noDangerouslySetInnerHtml: "Required"
          dangerouslySetInnerHTML={{
            __html: THEME_COLOR_SCRIPT,
          }}
        />
      </head>
      <body className="antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          disableTransitionOnChange
          enableSystem
        >
          <Toaster position="top-center" />
          <SessionProvider>{children}</SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
