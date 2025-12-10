/**
 * AI Prompts - Re-exported from centralized config
 *
 * All prompt configuration is now in lib/config/prompts.ts
 * This file provides backward compatibility and convenience exports
 */

import type { Geo } from "@vercel/functions";
import { interpolatePrompt, prompts } from "@/lib/config";
import type { Company } from "@/lib/db/schema";

// Re-export for convenience
export { prompts, interpolatePrompt } from "@/lib/config";

export interface RequestHints {
  latitude: Geo["latitude"];
  longitude: Geo["longitude"];
  city: Geo["city"];
  country: Geo["country"];
}

/**
 * Brand voice labels in Portuguese
 */
const BRAND_VOICE_LABELS: Record<string, string> = {
  formal: "Formal e Corporativo",
  casual: "Casual e Descontraído",
  playful: "Divertido e Criativo",
  professional: "Profissional e Técnico",
  friendly: "Amigável e Acolhedor",
};

/**
 * Build company context string from company data
 */
export function buildCompanyContext(company: Company): string {
  const variables: Record<string, string> = {
    companyName: company.name,
    description: company.description
      ? `**Descrição:** ${company.description}`
      : "",
    industry: company.industry ? `**Indústria/Nicho:** ${company.industry}` : "",
    targetAudience: company.targetAudience
      ? `**Público-alvo:** ${company.targetAudience}`
      : "",
    brandVoice: company.brandVoice
      ? `**Tom de voz:** ${BRAND_VOICE_LABELS[company.brandVoice] ?? company.brandVoice}`
      : "",
    brandColors:
      company.brandColors && company.brandColors.length > 0
        ? `**Cores da marca:** ${company.brandColors.join(", ")}`
        : "",
    contentThemes:
      company.contentThemes && company.contentThemes.length > 0
        ? `**Temas de conteúdo:** ${company.contentThemes.join(", ")}`
        : "",
    hashtags:
      company.hashtags && company.hashtags.length > 0
        ? `**Hashtags:** ${company.hashtags.map((h) => (h.startsWith("#") ? h : `#${h}`)).join(" ")}`
        : "",
    preferredFormats:
      company.preferredFormats && company.preferredFormats.length > 0
        ? `**Formatos preferidos:** ${company.preferredFormats.join(", ")}`
        : "",
  };

  return interpolatePrompt(prompts.companyContext, variables);
}

/**
 * Build request context from geolocation hints
 */
export const getRequestPromptFromHints = (requestHints: RequestHints) => `\
About the origin of user's request:
- lat: ${requestHints.latitude}
- lon: ${requestHints.longitude}
- city: ${requestHints.city}
- country: ${requestHints.country}
`;

/**
 * Build the system prompt for the chat
 * Now includes company context when available
 */
export const systemPrompt = ({
  requestHints,
  company,
}: {
  selectedChatModel?: string;
  requestHints: RequestHints;
  company?: Company | null;
}) => {
  const requestPrompt = getRequestPromptFromHints(requestHints);

  // If company is available, use systemBase + company context
  // Otherwise, use the legacy system prompt that asks for brand info
  if (company) {
    const companyContext = buildCompanyContext(company);
    return `${prompts.systemBase}\n\n${companyContext}\n\n${requestPrompt}`;
  }

  return `${prompts.system}\n\n${requestPrompt}`;
};

/**
 * Prompt for generating chat titles
 */
export const titlePrompt = prompts.title;
