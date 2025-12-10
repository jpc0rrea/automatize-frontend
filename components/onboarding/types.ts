export type BrandVoice = "formal" | "casual" | "playful" | "professional" | "friendly";

export type OnboardingFormData = {
  // Step 1: Basic Info
  name: string;
  websiteUrl: string;
  instagramHandle: string;
  
  // Step 2: Extracted/Editable info
  description: string;
  industry: string;
  
  // Step 3: Brand Identity
  brandVoice: BrandVoice | null;
  targetAudience: string;
  brandColors: string[];
  logoUrl: string;
  
  // Step 4: Content Preferences
  contentThemes: string[];
  hashtags: string[];
  preferredFormats: string[];
};

export type ExtractionResult = {
  website?: {
    success: boolean;
    data?: {
      name?: string;
      description?: string;
      industry?: string;
      brandVoice?: BrandVoice;
      targetAudience?: string;
      brandColors?: string[];
      logoUrl?: string;
    };
    error?: string;
  };
};

export const BRAND_VOICE_OPTIONS: { value: BrandVoice; label: string; description: string }[] = [
  { value: "formal", label: "Formal", description: "Linguagem corporativa e séria" },
  { value: "casual", label: "Casual", description: "Descontraído e acessível" },
  { value: "playful", label: "Divertido", description: "Leve e bem-humorado" },
  { value: "professional", label: "Profissional", description: "Confiante e competente" },
  { value: "friendly", label: "Amigável", description: "Caloroso e acolhedor" },
];

export const CONTENT_FORMAT_OPTIONS = [
  { value: "feed", label: "Posts de Feed" },
  { value: "carousel", label: "Carrosséis" },
  { value: "reels", label: "Reels" },
  { value: "stories", label: "Stories" },
];

export const DEFAULT_FORM_DATA: OnboardingFormData = {
  name: "",
  websiteUrl: "",
  instagramHandle: "",
  description: "",
  industry: "",
  brandVoice: null,
  targetAudience: "",
  brandColors: [],
  logoUrl: "",
  contentThemes: [],
  hashtags: [],
  preferredFormats: ["feed", "carousel"],
};

