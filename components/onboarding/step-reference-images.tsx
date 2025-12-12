"use client";

import { useCallback, useState } from "react";
import { ImagePlus, Loader2, Play, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { InstagramMediaPicker } from "./instagram-media-picker";
import {
  CONTENT_FORMAT_OPTIONS,
  type InstagramSelectedMedia,
  type OnboardingFormData,
} from "./types";

type StepReferenceImagesProps = {
  formData: OnboardingFormData;
  updateFormData: (data: Partial<OnboardingFormData>) => void;
  referenceImages: string[];
  onAddImage: (url: string) => void;
  onRemoveImage: (url: string) => void;
};

/**
 * Extract hashtags from text and return them without the # symbol
 */
function extractHashtags(text: string): string[] {
  const hashtagRegex = /#(\w+)/g;
  const matches = text.match(hashtagRegex);
  if (!matches) {
    return [];
  }
  return matches.map((tag) => tag.replace("#", "").toLowerCase());
}

/**
 * Count hashtag frequency and return top N hashtags sorted by frequency
 */
function getTopHashtagsByFrequency(
  hashtags: string[],
  limit: number
): string[] {
  const frequencyMap = new Map<string, number>();

  for (const tag of hashtags) {
    frequencyMap.set(tag, (frequencyMap.get(tag) ?? 0) + 1);
  }

  return Array.from(frequencyMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([tag]) => tag);
}

export function StepReferenceImages({
  formData,
  updateFormData,
  referenceImages,
  onAddImage,
  onRemoveImage,
}: StepReferenceImagesProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [newTheme, setNewTheme] = useState("");
  const [newHashtag, setNewHashtag] = useState("");

  const handleFileUpload = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) {
        return;
      }

      setIsUploading(true);

      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) {
          toast.error("Apenas imagens são permitidas");
          continue;
        }

        const uploadFormData = new FormData();
        uploadFormData.append("file", file);

        try {
          const response = await fetch("/api/files/upload", {
            method: "POST",
            body: uploadFormData,
          });

          if (response.ok) {
            const data = await response.json();
            onAddImage(data.url);
          } else {
            const error = await response.json();
            toast.error(error.error ?? "Falha ao fazer upload");
          }
        } catch {
          toast.error("Erro ao fazer upload da imagem");
        }
      }

      setIsUploading(false);
    },
    [onAddImage]
  );

  const handleInstagramSelectionChange = useCallback(
    (selectedMedia: InstagramSelectedMedia[]) => {
      // Update selected Instagram media
      updateFormData({ selectedInstagramMedia: selectedMedia });

      // Extract hashtags from all selected media captions
      const allHashtags: string[] = [];
      for (const media of selectedMedia) {
        if (media.caption) {
          allHashtags.push(...extractHashtags(media.caption));
        }
      }

      // Get top 10 hashtags by frequency
      const topHashtags = getTopHashtagsByFrequency(allHashtags, 10);

      // Merge with existing hashtags (avoid duplicates)
      const existingHashtags = formData.hashtags;
      const mergedHashtags = [...existingHashtags];

      for (const tag of topHashtags) {
        if (!mergedHashtags.includes(tag)) {
          mergedHashtags.push(tag);
        }
      }

      // Update hashtags in form data
      updateFormData({ hashtags: mergedHashtags });
    },
    [formData.hashtags, updateFormData]
  );

  const handleRemoveInstagramMedia = useCallback(
    (mediaId: string) => {
      const updated = formData.selectedInstagramMedia.filter(
        (m) => m.id !== mediaId
      );
      updateFormData({ selectedInstagramMedia: updated });
    },
    [formData.selectedInstagramMedia, updateFormData]
  );

  const toggleFormat = (format: string) => {
    const current = formData.preferredFormats;
    const updated = current.includes(format)
      ? current.filter((f) => f !== format)
      : [...current, format];
    updateFormData({ preferredFormats: updated });
  };

  const addTheme = () => {
    if (newTheme.trim() && !formData.contentThemes.includes(newTheme.trim())) {
      updateFormData({
        contentThemes: [...formData.contentThemes, newTheme.trim()],
      });
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

  return (
    <div className="space-y-6">
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
          <input
            className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
            onChange={(e) => setNewTheme(e.target.value)}
            onKeyDown={(e) =>
              e.key === "Enter" && (e.preventDefault(), addTheme())
            }
            placeholder="Ex: Dicas de produtividade"
            value={newTheme}
          />
          <Button onClick={addTheme} size="sm" type="button" variant="outline">
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
            <input
              className="w-full rounded-md border border-input bg-background py-2 pr-3 pl-7 text-sm"
              onChange={(e) => setNewHashtag(e.target.value)}
              onKeyDown={(e) =>
                e.key === "Enter" && (e.preventDefault(), addHashtag())
              }
              placeholder="suahashtag"
              value={newHashtag}
            />
          </div>
          <Button
            onClick={addHashtag}
            size="sm"
            type="button"
            variant="outline"
          >
            Adicionar
          </Button>
        </div>
      </div>

      {/* Reference Images */}
      <div className="space-y-3">
        <Label>Imagens de Referência</Label>
        <p className="text-muted-foreground text-xs">
          Selecione fotos do seu Instagram ou faça upload de imagens que
          representam o estilo visual que você quer para seu conteúdo
        </p>

        {/* Instagram Media Picker Button */}
        <div className="flex flex-col md:flex-row items-stretch gap-2">
          <div className="flex flex-col items-center gap-2 md:flex-1">
            <div className="w-full [&_button]:w-full">
              <InstagramMediaPicker
                onSelectionChange={handleInstagramSelectionChange}
                selectedMedia={formData.selectedInstagramMedia}
              />
            </div>
            {formData.selectedInstagramMedia.length > 0 && (
              <span className="text-muted-foreground text-xs md:text-sm">
                {formData.selectedInstagramMedia.length} foto(s) selecionada(s)
                do Instagram
              </span>
            )}
          </div>

          {/* Upload button */}
          <Button
            className={cn(
              "w-full md:flex-1",
              isUploading && "pointer-events-none opacity-50"
            )}
            // Let this click pass to the input child button to trigger the file input
            onClick={(e) => e.currentTarget.querySelector("input")?.click()}
            variant="outline"
            type="button"
          >
            <input
              accept="image/*"
              className="hidden"
              disabled={isUploading}
              multiple
              onChange={(e) => handleFileUpload(e.target.files)}
              type="file"
            />
            {isUploading ? (
              <>
                <Upload className="mr-1.5 size-3 animate-pulse sm:mr-2 sm:size-4" />
                <span className="text-xs md:text-sm">Enviando...</span>
              </>
            ) : (
              <>
                <Upload className="mr-1.5 size-3 sm:mr-2 sm:size-4" />
                <span className="text-xs md:text-sm">
                  Enviar do dispositivo
                </span>
              </>
            )}
          </Button>
        </div>

        {/* Media Grid */}
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {/* Instagram Selected Media */}
          {formData.selectedInstagramMedia.map((media) => {
            const isVideo = media.mediaType === "VIDEO";
            const displayUrl =
              isVideo && media.thumbnailUrl
                ? media.thumbnailUrl
                : media.mediaUrl;

            return (
              <div className="group relative aspect-square" key={media.id}>
                <img
                  alt={media.caption ?? "Instagram media"}
                  className="size-full rounded-lg border-2 border-primary object-cover"
                  src={displayUrl}
                />
                {isVideo && (
                  <div className="absolute top-2 left-2 rounded-full bg-black/60 p-1">
                    <Play className="size-3 fill-white text-white" />
                  </div>
                )}
                <button
                  className="absolute top-1 right-1 rounded-full bg-background/80 p-1 opacity-0 transition-opacity group-hover:opacity-100"
                  onClick={() => handleRemoveInstagramMedia(media.id)}
                  type="button"
                >
                  <Trash2 className="size-4 text-white" />
                </button>
              </div>
            );
          })}

          {/* Uploaded Reference Images */}
          {referenceImages.map((url) => (
            <div className="group relative aspect-square" key={url}>
              <img
                alt="Reference"
                className="size-full rounded-lg border border-border object-cover"
                src={url}
              />
              <button
                className="absolute top-1 right-1 rounded-full bg-background/80 p-1 opacity-0 transition-opacity group-hover:opacity-100"
                onClick={() => onRemoveImage(url)}
                type="button"
              >
                <Trash2 className="size-4 text-destructive" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
