"use client";

import { Globe, Instagram } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { OnboardingFormData } from "./types";

type StepBasicInfoProps = {
  formData: OnboardingFormData;
  updateFormData: (data: Partial<OnboardingFormData>) => void;
  isInstagramConnected?: boolean;
};

export function StepBasicInfo({ formData, updateFormData, isInstagramConnected = false }: StepBasicInfoProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label className="flex" htmlFor="name">Nome da Empresa *</Label>
        <Input
          id="name"
          onChange={(e) => updateFormData({ name: e.target.value })}
          placeholder="Ex: Minha Empresa"
          value={formData.name}
        />
      </div>

      <div className="space-y-2">
        <Label className="flex" htmlFor="websiteUrl">
          <span className="flex items-center gap-2">
            <Globe className="size-4" />
            Site (opcional)
          </span>
        </Label>
        <Input
          id="websiteUrl"
          onChange={(e) => updateFormData({ websiteUrl: e.target.value })}
          placeholder="https://www.suaempresa.com.br"
          type="url"
          value={formData.websiteUrl}
        />
        <p className="text-muted-foreground text-xs">
          Usaremos IA para extrair informações sobre sua marca automaticamente
        </p>
      </div>

      <div className="space-y-2">
        <Label className="flex" htmlFor="instagramHandle">
          <span className="flex items-center gap-2">
            <Instagram className="size-4" />
            Instagram (opcional)
          </span>
        </Label>
        <div className="relative">
          <span className="absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground">
            @
          </span>
          <Input
            className="pl-7"
            disabled={isInstagramConnected}
            id="instagramHandle"
            onChange={(e) =>
              updateFormData({ instagramHandle: e.target.value.replace("@", "") })
            }
            placeholder="suaempresa"
            value={formData.instagramHandle}
          />
        </div>
        <p className="text-muted-foreground text-xs">
          {isInstagramConnected 
            ? "Instagram conectado na etapa anterior" 
            : "Informe o Instagram da sua empresa para referência"}
        </p>
      </div>
    </div>
  );
}

