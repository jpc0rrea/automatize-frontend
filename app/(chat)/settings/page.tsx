"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  ImagePlus,
  Loader2,
  Palette,
  Plus,
  Save,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type BrandVoice = "formal" | "casual" | "playful" | "professional" | "friendly";

type Company = {
  id: string;
  name: string;
  description: string | null;
  websiteUrl: string | null;
  instagramHandle: string | null;
  industry: string | null;
  brandVoice: BrandVoice | null;
  targetAudience: string | null;
  brandColors: string[] | null;
  logoUrl: string | null;
  contentThemes: string[] | null;
  hashtags: string[] | null;
  preferredFormats: string[] | null;
  onboardingCompleted: boolean;
};

type ReferenceImage = {
  id: string;
  url: string;
  source: "upload" | "instagram_scrape";
  caption: string | null;
};

const BRAND_VOICE_OPTIONS: { value: BrandVoice; label: string; description: string }[] = [
  { value: "formal", label: "Formal", description: "Linguagem corporativa e séria" },
  { value: "casual", label: "Casual", description: "Descontraído e acessível" },
  { value: "playful", label: "Divertido", description: "Leve e bem-humorado" },
  { value: "professional", label: "Profissional", description: "Confiante e competente" },
  { value: "friendly", label: "Amigável", description: "Caloroso e acolhedor" },
];

const CONTENT_FORMAT_OPTIONS = [
  { value: "feed", label: "Posts de Feed" },
  { value: "carousel", label: "Carrosséis" },
  { value: "reels", label: "Reels" },
  { value: "stories", label: "Stories" },
];

export default function SettingsPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [company, setCompany] = useState<Company | null>(null);
  const [referenceImages, setReferenceImages] = useState<ReferenceImage[]>([]);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    websiteUrl: "",
    instagramHandle: "",
    industry: "",
    brandVoice: null as BrandVoice | null,
    targetAudience: "",
    brandColors: [] as string[],
    logoUrl: "",
    contentThemes: [] as string[],
    hashtags: [] as string[],
    preferredFormats: [] as string[],
  });

  const [newColor, setNewColor] = useState("#4C49BE");
  const [newTheme, setNewTheme] = useState("");
  const [newHashtag, setNewHashtag] = useState("");

  // Load company data
  useEffect(() => {
    const loadCompany = async () => {
      try {
        const response = await fetch("/api/company");
        if (response.ok) {
          const data = await response.json();
          const companies = data.companies ?? [];
          if (companies.length > 0) {
            const comp = companies[0];
            setCompany(comp);
            setFormData({
              name: comp.name ?? "",
              description: comp.description ?? "",
              websiteUrl: comp.websiteUrl ?? "",
              instagramHandle: comp.instagramHandle ?? "",
              industry: comp.industry ?? "",
              brandVoice: comp.brandVoice,
              targetAudience: comp.targetAudience ?? "",
              brandColors: comp.brandColors ?? [],
              logoUrl: comp.logoUrl ?? "",
              contentThemes: comp.contentThemes ?? [],
              hashtags: comp.hashtags ?? [],
              preferredFormats: comp.preferredFormats ?? [],
            });

            // Load reference images
            const imagesResponse = await fetch(
              `/api/company/reference-images?companyId=${comp.id}`
            );
            if (imagesResponse.ok) {
              const imagesData = await imagesResponse.json();
              setReferenceImages(imagesData.images ?? []);
            }
          }
        }
      } catch (error) {
        console.error("Error loading company:", error);
        toast.error("Erro ao carregar dados da empresa");
      } finally {
        setIsLoading(false);
      }
    };

    loadCompany();
  }, []);

  const updateFormData = useCallback((data: Partial<typeof formData>) => {
    setFormData((prev) => ({ ...prev, ...data }));
  }, []);

  const handleSave = async () => {
    if (!company) {
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch(`/api/company?id=${company.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description || null,
          websiteUrl: formData.websiteUrl || null,
          instagramHandle: formData.instagramHandle || null,
          industry: formData.industry || null,
          brandVoice: formData.brandVoice,
          targetAudience: formData.targetAudience || null,
          brandColors: formData.brandColors.length > 0 ? formData.brandColors : null,
          logoUrl: formData.logoUrl || null,
          contentThemes: formData.contentThemes.length > 0 ? formData.contentThemes : null,
          hashtags: formData.hashtags.length > 0 ? formData.hashtags : null,
          preferredFormats:
            formData.preferredFormats.length > 0 ? formData.preferredFormats : null,
        }),
      });

      if (response.ok) {
        toast.success("Configurações salvas com sucesso!");
      } else {
        throw new Error("Failed to save");
      }
    } catch (error) {
      console.error("Error saving:", error);
      toast.error("Erro ao salvar configurações");
    } finally {
      setIsSaving(false);
    }
  };

  const handleExtract = async () => {
    if (!formData.websiteUrl) {
      toast.error("Informe um site para extrair informações");
      return;
    }

    setIsExtracting(true);

    try {
      const response = await fetch("/api/company/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          websiteUrl: formData.websiteUrl,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        const websiteData = result.website?.data;

        if (websiteData) {
          updateFormData({
            name: websiteData.name ?? formData.name,
            description: websiteData.description ?? formData.description,
            industry: websiteData.industry ?? formData.industry,
            brandVoice: websiteData.brandVoice ?? formData.brandVoice,
            targetAudience: websiteData.targetAudience ?? formData.targetAudience,
            brandColors: websiteData.brandColors ?? formData.brandColors,
            logoUrl: websiteData.logoUrl ?? formData.logoUrl,
          });
          toast.success("Informações extraídas com sucesso!");
        } else {
          toast.info("Não foi possível extrair informações automaticamente");
        }
      } else {
        throw new Error("Failed to extract");
      }
    } catch (error) {
      console.error("Error extracting:", error);
      toast.error("Erro ao extrair informações");
    } finally {
      setIsExtracting(false);
    }
  };

  const addColor = () => {
    if (newColor && !formData.brandColors.includes(newColor)) {
      updateFormData({ brandColors: [...formData.brandColors, newColor] });
    }
  };

  const removeColor = (color: string) => {
    updateFormData({
      brandColors: formData.brandColors.filter((c) => c !== color),
    });
  };

  const toggleFormat = (format: string) => {
    const current = formData.preferredFormats;
    const updated = current.includes(format)
      ? current.filter((f) => f !== format)
      : [...current, format];
    updateFormData({ preferredFormats: updated });
  };

  const addTheme = () => {
    if (newTheme.trim() && !formData.contentThemes.includes(newTheme.trim())) {
      updateFormData({ contentThemes: [...formData.contentThemes, newTheme.trim()] });
      setNewTheme("");
    }
  };

  const removeTheme = (theme: string) => {
    updateFormData({
      contentThemes: formData.contentThemes.filter((t) => t !== theme),
    });
  };

  const addHashtag = () => {
    const tag = newHashtag.trim().replace(/^#/, "");
    if (tag && !formData.hashtags.includes(tag)) {
      updateFormData({ hashtags: [...formData.hashtags, tag] });
      setNewHashtag("");
    }
  };

  const removeHashtag = (tag: string) => {
    updateFormData({
      hashtags: formData.hashtags.filter((t) => t !== tag),
    });
  };

  const handleImageUpload = async (files: FileList | null) => {
    if (!files || files.length === 0 || !company) {
      return;
    }

    setIsUploadingImage(true);

    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) {
        toast.error("Apenas imagens são permitidas");
        continue;
      }

      const formDataUpload = new FormData();
      formDataUpload.append("file", file);

      try {
        const uploadResponse = await fetch("/api/files/upload", {
          method: "POST",
          body: formDataUpload,
        });

        if (uploadResponse.ok) {
          const uploadData = await uploadResponse.json();

          // Add to company reference images
          const saveResponse = await fetch("/api/company/reference-images", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              companyId: company.id,
              url: uploadData.url,
              source: "upload",
            }),
          });

          if (saveResponse.ok) {
            const savedData = await saveResponse.json();
            setReferenceImages((prev) => [savedData.image, ...prev]);
          }
        } else {
          toast.error("Falha ao fazer upload");
        }
      } catch {
        toast.error("Erro ao fazer upload da imagem");
      }
    }

    setIsUploadingImage(false);
  };

  const handleRemoveImage = async (imageId: string) => {
    if (!company) {
      return;
    }

    try {
      const response = await fetch(
        `/api/company/reference-images?id=${imageId}&companyId=${company.id}`,
        { method: "DELETE" }
      );

      if (response.ok) {
        setReferenceImages((prev) => prev.filter((img) => img.id !== imageId));
        toast.success("Imagem removida");
      }
    } catch {
      toast.error("Erro ao remover imagem");
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-dvh items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!company) {
    return (
      <div className="flex h-dvh flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Nenhuma empresa encontrada</p>
        <Button onClick={() => router.push("/onboarding")}>
          Configurar Empresa
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-border bg-background px-4">
        <div className="flex items-center gap-3">
          <Button onClick={() => router.back()} size="icon" variant="ghost">
            <ArrowLeft className="size-5" />
          </Button>
          <h1 className="font-semibold text-lg">Configurações da Empresa</h1>
        </div>
        <Button disabled={isSaving} onClick={handleSave}>
          {isSaving ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : (
            <Save className="mr-2 size-4" />
          )}
          Salvar
        </Button>
      </header>

      {/* Content */}
      <div className="mx-auto w-full max-w-3xl space-y-6 p-4 pb-20">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="size-5" />
              Informações Básicas
            </CardTitle>
            <CardDescription>Dados principais da sua empresa</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome da Empresa *</Label>
              <Input
                id="name"
                onChange={(e) => updateFormData({ name: e.target.value })}
                placeholder="Nome da empresa"
                value={formData.name}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                onChange={(e) => updateFormData({ description: e.target.value })}
                placeholder="Descreva brevemente o que sua empresa faz..."
                rows={3}
                value={formData.description}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="websiteUrl">Site</Label>
                <Input
                  id="websiteUrl"
                  onChange={(e) => updateFormData({ websiteUrl: e.target.value })}
                  placeholder="https://www.suaempresa.com.br"
                  type="url"
                  value={formData.websiteUrl}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="instagramHandle">Instagram</Label>
                <div className="relative">
                  <span className="absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground">
                    @
                  </span>
                  <Input
                    className="pl-7"
                    id="instagramHandle"
                    onChange={(e) =>
                      updateFormData({
                        instagramHandle: e.target.value.replace("@", ""),
                      })
                    }
                    placeholder="suaempresa"
                    value={formData.instagramHandle}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="industry">Indústria / Nicho</Label>
              <Input
                id="industry"
                onChange={(e) => updateFormData({ industry: e.target.value })}
                placeholder="Ex: Tecnologia, Moda, Alimentação..."
                value={formData.industry}
              />
            </div>

            <Button
              className="w-full"
              disabled={isExtracting || !formData.websiteUrl}
              onClick={handleExtract}
              variant="outline"
            >
              {isExtracting ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Sparkles className="mr-2 size-4" />
              )}
              Extrair Informações com IA
            </Button>
          </CardContent>
        </Card>

        {/* Brand Identity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="size-5" />
              Identidade da Marca
            </CardTitle>
            <CardDescription>Tom de voz, cores e público-alvo</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Brand Voice */}
            <div className="space-y-3">
              <Label>Tom de Voz</Label>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {BRAND_VOICE_OPTIONS.map((option) => (
                  <button
                    className={cn(
                      "flex flex-col items-start rounded-lg border border-border p-3 text-left transition-colors hover:border-primary/50",
                      formData.brandVoice === option.value &&
                        "border-primary bg-primary/5 ring-1 ring-primary"
                    )}
                    key={option.value}
                    onClick={() => updateFormData({ brandVoice: option.value })}
                    type="button"
                  >
                    <span className="font-medium text-sm">{option.label}</span>
                    <span className="text-muted-foreground text-xs">
                      {option.description}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Target Audience */}
            <div className="space-y-2">
              <Label htmlFor="targetAudience">Público-Alvo</Label>
              <Textarea
                id="targetAudience"
                onChange={(e) => updateFormData({ targetAudience: e.target.value })}
                placeholder="Descreva seu público-alvo ideal..."
                rows={3}
                value={formData.targetAudience}
              />
            </div>

            {/* Brand Colors */}
            <div className="space-y-3">
              <Label>Cores da Marca</Label>
              <div className="flex flex-wrap gap-2">
                {formData.brandColors.map((color) => (
                  <div
                    className="flex items-center gap-1 rounded-full border border-border bg-background px-2 py-1"
                    key={color}
                  >
                    <div
                      className="size-4 rounded-full border border-border"
                      style={{ backgroundColor: color }}
                    />
                    <span className="font-mono text-xs">{color}</span>
                    <button
                      className="ml-1 rounded-full p-0.5 hover:bg-muted"
                      onClick={() => removeColor(color)}
                      type="button"
                    >
                      <X className="size-3" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    className="absolute top-1/2 left-2 size-6 -translate-y-1/2 cursor-pointer border-none bg-transparent"
                    onChange={(e) => setNewColor(e.target.value)}
                    type="color"
                    value={newColor}
                  />
                  <Input
                    className="pl-10"
                    onChange={(e) => setNewColor(e.target.value)}
                    placeholder="#000000"
                    value={newColor}
                  />
                </div>
                <Button onClick={addColor} size="icon" type="button" variant="outline">
                  <Plus className="size-4" />
                </Button>
              </div>
            </div>

            {/* Logo URL */}
            <div className="space-y-2">
              <Label htmlFor="logoUrl">URL do Logo</Label>
              <Input
                id="logoUrl"
                onChange={(e) => updateFormData({ logoUrl: e.target.value })}
                placeholder="https://..."
                type="url"
                value={formData.logoUrl}
              />
              {formData.logoUrl && (
                <div className="mt-2 flex items-center gap-2">
                  <img
                    alt="Logo preview"
                    className="size-12 rounded-lg border border-border object-contain"
                    src={formData.logoUrl}
                  />
                  <span className="text-muted-foreground text-xs">Preview do logo</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Content Preferences */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ImagePlus className="size-5" />
              Preferências de Conteúdo
            </CardTitle>
            <CardDescription>
              Formatos, temas e hashtags para geração de conteúdo
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Content Formats */}
            <div className="space-y-3">
              <Label>Formatos de Conteúdo Preferidos</Label>
              <div className="flex flex-wrap gap-2">
                {CONTENT_FORMAT_OPTIONS.map((format) => (
                  <button
                    className={cn(
                      "rounded-full border border-border px-4 py-2 text-sm transition-colors hover:border-primary/50",
                      formData.preferredFormats.includes(format.value) &&
                        "border-primary bg-primary/10 text-primary"
                    )}
                    key={format.value}
                    onClick={() => toggleFormat(format.value)}
                    type="button"
                  >
                    {format.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Content Themes */}
            <div className="space-y-3">
              <Label>Temas de Conteúdo</Label>
              <div className="flex flex-wrap gap-2">
                {formData.contentThemes.map((theme) => (
                  <span
                    className="flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-secondary-foreground text-sm"
                    key={theme}
                  >
                    {theme}
                    <button
                      className="ml-1 rounded-full p-0.5 hover:bg-background/50"
                      onClick={() => removeTheme(theme)}
                      type="button"
                    >
                      <Trash2 className="size-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  onChange={(e) => setNewTheme(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTheme())}
                  placeholder="Ex: Dicas de produtividade"
                  value={newTheme}
                />
                <Button onClick={addTheme} type="button" variant="outline">
                  Adicionar
                </Button>
              </div>
            </div>

            {/* Hashtags */}
            <div className="space-y-3">
              <Label>Hashtags Frequentes</Label>
              <div className="flex flex-wrap gap-2">
                {formData.hashtags.map((tag) => (
                  <span
                    className="flex items-center gap-1 rounded-full bg-accent/20 px-3 py-1 text-accent-foreground text-sm"
                    key={tag}
                  >
                    #{tag}
                    <button
                      className="ml-1 rounded-full p-0.5 hover:bg-background/50"
                      onClick={() => removeHashtag(tag)}
                      type="button"
                    >
                      <Trash2 className="size-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <span className="absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground">
                    #
                  </span>
                  <Input
                    className="pl-7"
                    onChange={(e) => setNewHashtag(e.target.value)}
                    onKeyDown={(e) =>
                      e.key === "Enter" && (e.preventDefault(), addHashtag())
                    }
                    placeholder="suahashtag"
                    value={newHashtag}
                  />
                </div>
                <Button onClick={addHashtag} type="button" variant="outline">
                  Adicionar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Reference Images */}
        <Card>
          <CardHeader>
            <CardTitle>Imagens de Referência</CardTitle>
            <CardDescription>
              Imagens que representam o estilo visual desejado para seu conteúdo
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
              {referenceImages.map((image) => (
                <div className="group relative aspect-square" key={image.id}>
                  <img
                    alt="Reference"
                    className="size-full rounded-lg border border-border object-cover"
                    src={image.url}
                  />
                  <button
                    className="absolute top-1 right-1 rounded-full bg-background/80 p-1 opacity-0 transition-opacity group-hover:opacity-100"
                    onClick={() => handleRemoveImage(image.id)}
                    type="button"
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </button>
                </div>
              ))}

              {/* Upload button */}
              <label
                className={cn(
                  "flex aspect-square cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border transition-colors hover:border-primary/50 hover:bg-muted/50",
                  isUploadingImage && "pointer-events-none opacity-50"
                )}
              >
                <input
                  accept="image/*"
                  className="hidden"
                  disabled={isUploadingImage}
                  multiple
                  onChange={(e) => handleImageUpload(e.target.files)}
                  type="file"
                />
                {isUploadingImage ? (
                  <Loader2 className="size-6 animate-spin text-muted-foreground" />
                ) : (
                  <>
                    <ImagePlus className="size-6 text-muted-foreground" />
                    <span className="text-center text-muted-foreground text-xs">Upload</span>
                  </>
                )}
              </label>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

