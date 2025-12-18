"use client";

import {
  ChevronDown,
  Expand,
  ImageIcon,
  Loader2,
  Settings2,
  Sparkles,
  X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import useSWR from "swr";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { CompanyReferenceImage } from "@/lib/db/schema";
import { fetcher } from "@/lib/utils";

// Platform presets with dimensions
const PLATFORM_PRESETS = {
  "instagram-story": {
    name: "Instagram Stories",
    width: 1080,
    height: 1920,
    aspectRatio: "9:16",
    description: "Vertical para Stories e Reels",
  },
  "instagram-feed-square": {
    name: "Instagram Feed (Quadrado)",
    width: 1080,
    height: 1080,
    aspectRatio: "1:1",
    description: "Formato clássico do feed",
  },
  "instagram-feed-portrait": {
    name: "Instagram Feed (Retrato)",
    width: 1080,
    height: 1350,
    aspectRatio: "4:5",
    description: "Formato vertical para carrossel",
  },
  "instagram-feed-landscape": {
    name: "Instagram Feed (Paisagem)",
    width: 1080,
    height: 566,
    aspectRatio: "1.91:1",
    description: "Formato horizontal",
  },
} as const;

type PlatformKey = keyof typeof PLATFORM_PRESETS;

type AIGenerationPanelProps = {
  postId: string;
  currentWidth: number;
  currentHeight: number;
  onImageGenerated: (imageUrl: string, width: number, height: number) => void;
  onCanvasSizeChange: (width: number, height: number) => void;
};

type ReferenceImagesResponse = {
  images: CompanyReferenceImage[];
};

export function AIGenerationPanel({
  postId,
  currentWidth,
  currentHeight,
  onImageGenerated,
  onCanvasSizeChange,
}: AIGenerationPanelProps) {
  const [prompt, setPrompt] = useState("");
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformKey>(
    "instagram-feed-square"
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [showSettings, setShowSettings] = useState(true);
  const [selectedReferenceImages, setSelectedReferenceImages] = useState<
    string[]
  >([]);
  const [previewImage, setPreviewImage] =
    useState<CompanyReferenceImage | null>(null);

  // Fetch reference images
  const { data: referenceData, isLoading: isLoadingReferences } =
    useSWR<ReferenceImagesResponse>("/api/reference-images", fetcher);

  const referenceImages = referenceData?.images ?? [];

  // Auto-detect current platform based on dimensions
  useEffect(() => {
    const matchingPreset = Object.entries(PLATFORM_PRESETS).find(
      ([, preset]) =>
        preset.width === currentWidth && preset.height === currentHeight
    );
    if (matchingPreset) {
      setSelectedPlatform(matchingPreset[0] as PlatformKey);
    }
  }, [currentWidth, currentHeight]);

  const handlePlatformChange = (platform: PlatformKey) => {
    setSelectedPlatform(platform);
    const preset = PLATFORM_PRESETS[platform];
    onCanvasSizeChange(preset.width, preset.height);
  };

  const toggleReferenceImage = (imageId: string) => {
    setSelectedReferenceImages((prev) =>
      prev.includes(imageId)
        ? prev.filter((id) => id !== imageId)
        : [...prev, imageId]
    );
  };

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) {
      toast.error("Digite um prompt para gerar a imagem");
      return;
    }

    setIsGenerating(true);

    try {
      const preset = PLATFORM_PRESETS[selectedPlatform];

      // Build prompt with reference images context
      let fullPrompt = prompt;
      if (selectedReferenceImages.length > 0) {
        const selectedImages = referenceImages.filter((img) =>
          selectedReferenceImages.includes(img.id)
        );
        const imageDescriptions = selectedImages
          .map((img) => img.caption || "imagem de referência")
          .join(", ");
        fullPrompt = `${prompt}\n\nUse as seguintes referências de estilo: ${imageDescriptions}`;
      }

      // Call the generation API
      const response = await fetch("/api/posts/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postId,
          prompt: fullPrompt,
          width: preset.width,
          height: preset.height,
          aspectRatio: preset.aspectRatio,
          referenceImageIds: selectedReferenceImages,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Falha ao gerar imagem");
      }

      const data = await response.json();

      if (data.imageUrl) {
        onImageGenerated(data.imageUrl, preset.width, preset.height);
        toast.success("Imagem gerada com sucesso!");
        setPrompt("");
      }
    } catch (error) {
      console.error("Generation error:", error);
      toast.error(
        error instanceof Error ? error.message : "Erro ao gerar imagem"
      );
    } finally {
      setIsGenerating(false);
    }
  }, [
    prompt,
    selectedPlatform,
    selectedReferenceImages,
    referenceImages,
    postId,
    onImageGenerated,
  ]);

  const currentPreset = PLATFORM_PRESETS[selectedPlatform];

  return (
    <div className="flex max-h-[85vh] flex-col bg-background">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-border p-3">
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-primary" />
          <h3 className="font-medium text-sm">Gerar com AI</h3>
        </div>
        <Badge variant="secondary" className="text-xs">
          {currentPreset.aspectRatio}
        </Badge>
      </div>

      <ScrollArea className="flex-1 overflow-auto">
        <div className="space-y-4 p-4">
          {/* Platform Selection */}
          <Collapsible open={showSettings} onOpenChange={setShowSettings}>
            <CollapsibleTrigger asChild>
              <Button
                className="w-full justify-between"
                size="sm"
                variant="outline"
              >
                <div className="flex items-center gap-2">
                  <Settings2 className="size-4" />
                  <span>Configurações</span>
                </div>
                <ChevronDown
                  className={`size-4 transition-transform ${
                    showSettings ? "rotate-180" : ""
                  }`}
                />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-3 pt-3">
              <div className="space-y-2">
                <Label className="text-xs">Plataforma</Label>
                <Select
                  onValueChange={(v) => handlePlatformChange(v as PlatformKey)}
                  value={selectedPlatform}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PLATFORM_PRESETS).map(([key, preset]) => (
                      <SelectItem key={key} value={key}>
                        <div className="flex flex-col items-start">
                          <span>{preset.name}</span>
                          <span className="text-muted-foreground text-xs">
                            {preset.width}×{preset.height}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-muted-foreground text-xs">
                  {currentPreset.description}
                </p>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Reference Images */}
          <div className="space-y-2">
            <Label className="text-xs">Imagens de Referência</Label>
            {isLoadingReferences ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="size-4 animate-spin text-muted-foreground" />
              </div>
            ) : referenceImages.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-4 text-center">
                <ImageIcon className="mx-auto size-6 text-muted-foreground/50" />
                <p className="mt-2 text-muted-foreground text-xs">
                  Nenhuma imagem de referência
                </p>
                <p className="text-muted-foreground/70 text-xs">
                  Adicione imagens no onboarding
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {referenceImages.slice(0, 9).map((image) => {
                  const isSelected = selectedReferenceImages.includes(image.id);
                  return (
                    <div key={image.id} className="group relative">
                      <button
                        type="button"
                        className={`relative aspect-square w-full overflow-hidden rounded-md border-2 transition-all ${
                          isSelected
                            ? "border-primary ring-2 ring-primary/20"
                            : "border-transparent hover:border-muted-foreground/30"
                        }`}
                        onClick={() => toggleReferenceImage(image.id)}
                      >
                        {/* biome-ignore lint/a11y/useAltText: Reference thumbnail */}
                        <img
                          alt={image.caption ?? "Reference"}
                          className="size-full object-cover"
                          src={image.thumbnailUrl ?? image.url}
                        />
                        {isSelected && (
                          <div className="absolute inset-0 flex items-center justify-center bg-primary/20">
                            <div className="rounded-full bg-primary p-1">
                              <Sparkles className="size-3 text-primary-foreground" />
                            </div>
                          </div>
                        )}
                      </button>
                      {/* Expand button - shows on hover */}
                      <button
                        type="button"
                        className="absolute top-1 right-1 rounded-md bg-black/60 p-1 opacity-0 transition-opacity hover:bg-black/80 group-hover:opacity-100"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPreviewImage(image);
                        }}
                        title="Ver imagem completa"
                      >
                        <Expand className="size-3 text-white" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
            {selectedReferenceImages.length > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-xs">
                  {selectedReferenceImages.length} selecionada
                  {selectedReferenceImages.length > 1 ? "s" : ""}
                </span>
                <Button
                  className="h-6 px-2 text-xs"
                  onClick={() => setSelectedReferenceImages([])}
                  size="sm"
                  variant="ghost"
                >
                  <X className="mr-1 size-3" />
                  Limpar
                </Button>
              </div>
            )}
          </div>

          {/* Prompt Input */}
          <div className="space-y-2">
            <Label className="text-xs">Descreva sua imagem</Label>
            <Textarea
              className="min-h-[100px] resize-none"
              disabled={isGenerating}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Ex: Uma foto de produto elegante com fundo gradiente roxo, iluminação suave e sombras delicadas..."
              value={prompt}
            />
          </div>

          {/* Generate Button */}
          <Button
            className="w-full"
            disabled={isGenerating || !prompt.trim()}
            onClick={handleGenerate}
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Gerando...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 size-4" />
                Gerar Imagem
              </>
            )}
          </Button>

          {/* Quick Prompts */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">
              Sugestões rápidas
            </Label>
            <div className="flex flex-wrap gap-1.5">
              {[
                "Fundo gradiente",
                "Estilo minimalista",
                "Cores vibrantes",
                "Foto de produto",
                "Estilo editorial",
              ].map((suggestion) => (
                <Button
                  key={suggestion}
                  className="h-6 px-2 text-xs"
                  disabled={isGenerating}
                  onClick={() =>
                    setPrompt((prev) =>
                      prev ? `${prev}, ${suggestion.toLowerCase()}` : suggestion
                    )
                  }
                  size="sm"
                  variant="outline"
                >
                  {suggestion}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </ScrollArea>

      {/* Image Preview Dialog */}
      <Dialog
        open={!!previewImage}
        onOpenChange={(open) => !open && setPreviewImage(null)}
      >
        <DialogContent className="flex max-h-[90vh] max-w-3xl flex-col overflow-hidden p-0">
          <DialogHeader className="shrink-0 p-4 pb-2">
            <DialogTitle className="text-base">Imagem de Referência</DialogTitle>
            <DialogDescription className="text-xs">
              Clique fora para fechar
            </DialogDescription>
          </DialogHeader>
          <div className="relative min-h-0 flex-1 overflow-auto bg-muted/30">
            {previewImage && (
              /* biome-ignore lint/a11y/useAltText: Full preview image */
              <img
                alt={previewImage.caption ?? "Reference image preview"}
                className="h-auto max-h-[70vh] w-full object-contain"
                src={previewImage.url}
              />
            )}
          </div>
          {previewImage?.caption && (
            <div className="shrink-0 border-t border-border p-4 pt-2">
              <p className="text-sm text-muted-foreground">
                {previewImage.caption}
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
