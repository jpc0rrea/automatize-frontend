"use client";

import { Upload, Plus, X } from "lucide-react";
import { type ChangeEvent, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { BRAND_VOICE_OPTIONS, type OnboardingFormData } from "./types";

type StepBrandIdentityProps = {
  formData: OnboardingFormData;
  updateFormData: (data: Partial<OnboardingFormData>) => void;
  instagramProfilePictureUrl?: string;
};

export function StepBrandIdentity({ formData, updateFormData, instagramProfilePictureUrl }: StepBrandIdentityProps) {
  const [newColor, setNewColor] = useState("#4C49BE");
  const [isUploading, setIsUploading] = useState(false);
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Determine logo URL priority: Instagram profile > scraped logo > manual URL
  const logoUrl = instagramProfilePictureUrl || formData.logoUrl || "";

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setImageDimensions({
      width: img.naturalWidth,
      height: img.naturalHeight,
    });
  };

  // Reset dimensions when logo URL changes
  useEffect(() => {
    if (!logoUrl) {
      setImageDimensions(null);
    }
  }, [logoUrl]);

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) {
      return;
    }

    setIsUploading(true);

    const file = files[0];
    if (!file.type.startsWith("image/")) {
      toast.error("Apenas imagens são permitidas");
      setIsUploading(false);
      return;
    }

    const formDataUpload = new FormData();
    formDataUpload.append("file", file);

    try {
      const response = await fetch("/api/files/upload", {
        method: "POST",
        body: formDataUpload,
      });

      if (response.ok) {
        const data = await response.json();
        updateFormData({ logoUrl: data.url });
        toast.success("Logo enviado com sucesso");
      } else {
        const error = await response.json();
        toast.error(error.error ?? "Falha ao fazer upload");
      }
    } catch {
      toast.error("Erro ao fazer upload da imagem");
    } finally {
      setIsUploading(false);
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

  return (
    <div className="space-y-6">
      {/* Brand Voice */}
      <div className="space-y-3">
        <Label className="flex">Tom de Voz</Label>
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
              <span className="font-medium text-sm">
                <span className="mr-2">{option.emoji}</span>
                {option.label}
              </span>
              <span className="text-muted-foreground text-xs">{option.description}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Target Audience */}
      <div className="space-y-2">
        <Label htmlFor="targetAudience" className="flex"  >Público-Alvo</Label>
        <Textarea
          id="targetAudience"
          onChange={(e: ChangeEvent<HTMLTextAreaElement>) => updateFormData({ targetAudience: e.target.value })}
          placeholder="Descreva seu público-alvo ideal. Ex: Empreendedores de 25-45 anos interessados em tecnologia..."
          rows={3}
          value={formData.targetAudience}
        />
      </div>

      {/* Brand Colors */}
      <div className="space-y-3">
        <Label className="flex">Cores da Marca</Label>
        
        {/* Color chips */}
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

        {/* Add color input */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              className="absolute top-1/2 left-2 size-6 -translate-y-1/2 cursor-pointer border-none bg-transparent"
              onChange={(e: ChangeEvent<HTMLInputElement>) => setNewColor(e.target.value)}
              type="color"
              value={newColor}
            />
            <Input
              className="pl-10"
              onChange={(e: ChangeEvent<HTMLInputElement>) => setNewColor(e.target.value)}
              placeholder="#000000"
              value={newColor}
            />
          </div>
          <Button onClick={addColor} size="icon" type="button" variant="outline">
            <Plus className="size-4" />
          </Button>
        </div>
        <p className="text-muted-foreground text-xs">
          Adicione as cores principais da sua marca
        </p>
      </div>

      {/* Logo URL */}
      <div className="space-y-3">
        <Label htmlFor="logoUrl" className="flex">Logo da Marca</Label>
        
        {/* Logo Preview and Info */}
        {logoUrl && (
          <div className="flex flex-col gap-3 rounded-lg border border-border bg-muted/30 p-3 sm:flex-row sm:items-start sm:p-4">
            {/* Logo Preview - Left aligned on desktop */}
            <div className="flex shrink-0 justify-center sm:justify-start">
              <img
                alt="Logo preview"
                className="size-24 rounded-lg border border-border object-contain bg-background p-2 sm:size-32 md:size-40"
                onLoad={handleImageLoad}
                src={logoUrl}
              />
            </div>

            {/* Info Column - Right aligned on desktop */}
            <div className="flex flex-1 flex-col gap-2 justify-between">
              {/* Source */}
              <div>
                <span className="text-muted-foreground text-xs sm:text-sm">
                  {instagramProfilePictureUrl ? "Foto de perfil do Instagram" : formData.logoUrl ? "Logo extraído do site" : "Logo"}
                </span>
              </div>

              {/* Dimensions */}
              {imageDimensions && (
                <div>
                  <span className="text-muted-foreground text-xs sm:text-sm">
                    {imageDimensions.width} × {imageDimensions.height} px
                  </span>
                </div>
              )}

              {/* Upload Button */}
              <div className="mt-auto">
                <input
                  ref={fileInputRef}
                  accept="image/jpeg,image/png"
                  className="hidden"
                  onChange={(e) => handleFileUpload(e.target.files)}
                  type="file"
                />
                <Button
                  className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs sm:text-sm h-8 sm:h-9 px-3 sm:px-4"
                  disabled={isUploading}
                  onClick={() => fileInputRef.current?.click()}
                  type="button"
                  variant="default"
                >
                  {isUploading ? (
                    <>
                      <Upload className="mr-1.5 size-3 animate-pulse sm:mr-2 sm:size-4" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-1.5 size-3 sm:mr-2 sm:size-4" />
                      Escolher outra imagem
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Upload Button - Show when no logo */}
        {!logoUrl && (
          <div className="flex gap-2">
            <input
              ref={fileInputRef}
              accept="image/jpeg,image/png"
              className="hidden"
              onChange={(e) => handleFileUpload(e.target.files)}
              type="file"
            />
            <Button
              className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs sm:text-sm h-8 sm:h-9 px-3 sm:px-4"
              disabled={isUploading}
              onClick={() => fileInputRef.current?.click()}
              type="button"
              variant="default"
            >
              {isUploading ? (
                <>
                  <Upload className="mr-1.5 size-3 animate-pulse sm:mr-2 sm:size-4" />
                  Enviando...
                </>
              ) : (
                <>
                  <Upload className="mr-1.5 size-3 sm:mr-2 sm:size-4" />
                  Escolher outra imagem
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

