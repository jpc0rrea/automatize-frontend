"use client";

import { Globe, Instagram, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { OnboardingFormData } from "./types";

type StepBasicInfoProps = {
  formData: OnboardingFormData;
  updateFormData: (data: Partial<OnboardingFormData>) => void;
  isInstagramConnected?: boolean;
  instagramProfilePictureUrl?: string;
  instagramUsername?: string;
};

export function StepBasicInfo({
  formData,
  updateFormData,
  isInstagramConnected = false,
  instagramProfilePictureUrl,
  instagramUsername,
}: StepBasicInfoProps) {
  return (
    <div className="space-y-6">
      {/* Instagram Profile Preview */}
      {isInstagramConnected && (
        <div className="flex flex-col items-center gap-3 pb-4">
          <div className="relative">
            <div className="size-20 overflow-hidden rounded-full border-[3px] border-primary bg-muted sm:size-24 md:size-28">
              {instagramProfilePictureUrl ? (
                <img
                  alt={instagramUsername ? `@${instagramUsername}` : "Instagram profile"}
                  className="size-full object-cover"
                  src={instagramProfilePictureUrl}
                />
              ) : (
                <div className="flex size-full items-center justify-center bg-primary/10">
                  <User className="size-8 text-primary sm:size-10 md:size-12" />
                </div>
              )}
            </div>
            <div className="absolute -right-1 -bottom-1 flex size-6 items-center justify-center rounded-full border-2 border-background bg-linear-to-br from-[#833ab4] via-[#fd1d1d] to-[#fcb045] sm:size-7">
              <Instagram className="size-3 text-white sm:size-4" />
            </div>
          </div>
          {instagramUsername && (
            <span className="font-medium text-muted-foreground text-sm sm:text-base">
              @{instagramUsername}
            </span>
          )}
        </div>
      )}

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


    </div>
  );
}

