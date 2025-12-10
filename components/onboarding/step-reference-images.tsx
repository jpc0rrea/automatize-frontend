"use client";

import { useCallback, useState } from "react";
import { ImagePlus, Loader2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { CONTENT_FORMAT_OPTIONS, type OnboardingFormData } from "./types";

type StepReferenceImagesProps = {
  formData: OnboardingFormData;
  updateFormData: (data: Partial<OnboardingFormData>) => void;
  referenceImages: string[];
  onAddImage: (url: string) => void;
  onRemoveImage: (url: string) => void;
};

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

        const formData = new FormData();
        formData.append("file", file);

        try {
          const response = await fetch("/api/files/upload", {
            method: "POST",
            body: formData,
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
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTheme())}
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
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addHashtag())}
              placeholder="suahashtag"
              value={newHashtag}
            />
          </div>
          <Button onClick={addHashtag} size="sm" type="button" variant="outline">
            Adicionar
          </Button>
        </div>
      </div>

      {/* Reference Images */}
      <div className="space-y-3">
        <Label>Imagens de Referência</Label>
        <p className="text-muted-foreground text-xs">
          Faça upload de posts de exemplo ou imagens que representam o estilo visual que você
          quer para seu conteúdo
        </p>

        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
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

          {/* Upload button */}
          <label
            className={cn(
              "flex aspect-square cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border transition-colors hover:border-primary/50 hover:bg-muted/50",
              isUploading && "pointer-events-none opacity-50"
            )}
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
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            ) : (
              <>
                <ImagePlus className="size-6 text-muted-foreground" />
                <span className="text-center text-muted-foreground text-xs">Upload</span>
              </>
            )}
          </label>
        </div>
      </div>
    </div>
  );
}

