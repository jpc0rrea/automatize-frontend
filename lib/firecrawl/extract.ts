import "server-only";

import { firecrawl } from "./client";

// Types based on Firecrawl's branding response
export type BrandingColors = {
  primary?: string;
  secondary?: string;
  accent?: string;
  background?: string;
  textPrimary?: string;
  textSecondary?: string;
  link?: string;
  success?: string;
  warning?: string;
  error?: string;
};

export type BrandingProfile = {
  colorScheme?: "light" | "dark";
  logo?: string;
  colors?: BrandingColors;
  fonts?: Array<{ family: string }>;
  typography?: {
    fontFamilies?: {
      primary?: string;
      heading?: string;
      code?: string;
    };
    fontSizes?: Record<string, string>;
    fontWeights?: Record<string, number>;
  };
  personality?: {
    tone?: string;
    energy?: string;
    targetAudience?: string;
  };
  images?: {
    logo?: string;
    favicon?: string;
    ogImage?: string;
  };
};

export type ExtractedCompanyData = {
  name?: string;
  description?: string;
  industry?: string;
  brandVoice?: "formal" | "casual" | "playful" | "professional" | "friendly";
  targetAudience?: string;
  brandColors?: string[];
  logoUrl?: string;
};

export type WebsiteExtractionResult = {
  success: boolean;
  data?: ExtractedCompanyData;
  branding?: BrandingProfile;
  markdown?: string;
  error?: string;
};


// Map Firecrawl personality tone to our brand voice enum
function mapToneToBrandVoice(
  tone?: string
): "formal" | "casual" | "playful" | "professional" | "friendly" | undefined {
  if (!tone) {
    return undefined;
  }

  const lowerTone = tone.toLowerCase();

  if (lowerTone.includes("formal") || lowerTone.includes("corporate")) {
    return "formal";
  }
  if (lowerTone.includes("casual") || lowerTone.includes("relaxed")) {
    return "casual";
  }
  if (lowerTone.includes("playful") || lowerTone.includes("fun")) {
    return "playful";
  }
  if (lowerTone.includes("professional") || lowerTone.includes("business")) {
    return "professional";
  }
  if (lowerTone.includes("friendly") || lowerTone.includes("warm")) {
    return "friendly";
  }

  return "professional"; // Default
}

// Extract brand colors from Firecrawl branding response
function extractBrandColors(colors?: BrandingColors): string[] {
  if (!colors) {
    return [];
  }

  const colorValues: string[] = [];

  if (colors.primary) {
    colorValues.push(colors.primary);
  }
  if (colors.secondary) {
    colorValues.push(colors.secondary);
  }
  if (colors.accent) {
    colorValues.push(colors.accent);
  }

  return colorValues;
}

/**
 * Extract company information from a website URL using Firecrawl
 * Uses the branding format for automatic brand identity extraction
 */
export async function extractFromWebsite(
  url: string
): Promise<WebsiteExtractionResult> {
  try {
    const result = await firecrawl.scrape(url, {
      formats: [
        "markdown",
        "branding",
        {
          type: "json",
          prompt:
            "Extraia as informações da empresa em português brasileiro. Todas as descrições e textos devem estar em português.",
          schema: {
            type: "object",
            properties: {
              company_name: {
                type: "string",
                description: "O nome da empresa ou marca",
              },
              company_description: {
                type: "string",
                description:
                  "Uma breve descrição do que a empresa faz em português (2-3 frases)",
              },
              industry: {
                type: "string",
                description:
                  "A indústria ou nicho em que a empresa atua em português (ex: 'Tecnologia', 'Moda', 'Alimentação')",
              },
              target_audience: {
                type: "string",
                description:
                  "O público-alvo da empresa em português (ex: 'Jovens empreendedores de 25-35 anos interessados em tecnologia')",
              },
              products_services: {
                type: "array",
                items: { type: "string" },
                description: "Principais produtos ou serviços oferecidos em português",
              },
            },
          },
        },
      ],
      // Set location to Brazil with Portuguese language preference
      location: {
        country: "BR",
        languages: ["pt-BR", "pt"],
      },
    });

    // Firecrawl returns the data directly, check if we got expected fields
    if (!result || !result.markdown) {
      return {
        success: false,
        error: "Failed to scrape website",
      };
    }

    const branding = result.branding as BrandingProfile | undefined;
    const json = result.json as {
      company_name?: string;
      company_description?: string;
      industry?: string;
      target_audience?: string;
    } | undefined;

    // Map extracted data to our company schema
    const extractedData: ExtractedCompanyData = {
      name: json?.company_name,
      description: json?.company_description,
      industry: json?.industry,
      brandVoice: mapToneToBrandVoice(branding?.personality?.tone),
      // Prefer JSON extracted target audience (in Portuguese) over branding personality
      targetAudience: json?.target_audience ?? branding?.personality?.targetAudience,
      brandColors: extractBrandColors(branding?.colors),
      logoUrl: branding?.logo ?? branding?.images?.logo,
    };

    return {
      success: true,
      data: extractedData,
      branding,
      markdown: result.markdown,
    };
  } catch (error) {
    console.error("Error extracting from website:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}


