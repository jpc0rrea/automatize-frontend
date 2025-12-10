"use client";

import { Plus, X } from "lucide-react";
import { type ChangeEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { BRAND_VOICE_OPTIONS, type OnboardingFormData } from "./types";

type StepBrandIdentityProps = {
  formData: OnboardingFormData;
  updateFormData: (data: Partial<OnboardingFormData>) => void;
};

export function StepBrandIdentity({ formData, updateFormData }: StepBrandIdentityProps) {
  const [newColor, setNewColor] = useState("#4C49BE");

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
              <span className="font-medium text-sm">{option.label}</span>
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
      <div className="space-y-2">
        <Label htmlFor="logoUrl" className="flex">URL do Logo (opcional)</Label>
        <Input
          id="logoUrl"
          onChange={(e: ChangeEvent<HTMLInputElement>) => updateFormData({ logoUrl: e.target.value })}
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
    </div>
  );
}

