"use client";

import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Loader2, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ExtractionResult, OnboardingFormData } from "./types";

type StepExtractionProps = {
  formData: OnboardingFormData;
  updateFormData: (data: Partial<OnboardingFormData>) => void;
  onExtractionComplete: () => void;
};

export function StepExtraction({
  formData,
  updateFormData,
  onExtractionComplete,
}: StepExtractionProps) {
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionResult, setExtractionResult] = useState<ExtractionResult | null>(null);
  const [hasExtracted, setHasExtracted] = useState(false);

  // Only extract from website (Instagram extraction not supported yet)
  const hasUrlToExtract = Boolean(formData.websiteUrl);

  useEffect(() => {
    // Auto-start extraction when component mounts if we have a website URL
    if (hasUrlToExtract && !hasExtracted) {
      startExtraction();
    } else if (!hasUrlToExtract) {
      // No website URL to extract, mark as complete
      onExtractionComplete();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startExtraction = async () => {
    if (!hasUrlToExtract) {
      return;
    }

    setIsExtracting(true);
    setExtractionResult(null);

    try {
      const response = await fetch("/api/company/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          websiteUrl: formData.websiteUrl,
        }),
      });

      if (!response.ok) {
        throw new Error("Falha ao extrair informações");
      }

      const result: { website?: ExtractionResult["website"] } = await response.json();

      setExtractionResult(result);

      // Auto-fill form with extracted data
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
      }

      setHasExtracted(true);
      onExtractionComplete();
    } catch (error) {
      console.error("Erro na extração:", error);
      setExtractionResult({
        website: { success: false, error: "Falha ao extrair informações do site" },
      });
      setHasExtracted(true);
      onExtractionComplete();
    } finally {
      setIsExtracting(false);
    }
  };

  if (isExtracting) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-12">
        <div className="relative">
          <Loader2 className="size-12 animate-spin text-primary" />
          <Sparkles className="-top-1 -right-1 absolute size-5 text-accent" />
        </div>
        <div className="text-center">
          <h3 className="font-medium text-lg">Extraindo informações...</h3>
          <p className="text-muted-foreground text-sm">
            Nossa IA está analisando seu site
          </p>
        </div>
      </div>
    );
  }

  if (!hasUrlToExtract) {
    return (
      <div className="space-y-6">
        <div className="rounded-lg border border-border bg-muted/50 p-4 text-center">
          <p className="text-muted-foreground text-sm">
            Nenhum site informado. Preencha as informações manualmente.
          </p>
        </div>
        <ManualFields formData={formData} updateFormData={updateFormData} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Extraction Status */}
      {extractionResult && (
        <div className="space-y-3">
          <ExtractionStatus
            label="Site"
            success={extractionResult.website?.success ?? false}
          />
        </div>
      )}

      {/* Editable Fields */}
      <ManualFields formData={formData} updateFormData={updateFormData} />
    </div>
  );
}

function ExtractionStatus({ label, success }: { label: string; success: boolean }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-background p-3">
      {success ? (
        <CheckCircle2 className="size-5 text-green-500" />
      ) : (
        <AlertCircle className="size-5 text-yellow-500" />
      )}
      <span className="font-medium text-sm">{label}</span>
      <span className="text-muted-foreground text-xs">
        {success ? "Extraído com sucesso" : "Não foi possível extrair"}
      </span>
    </div>
  );
}

function ManualFields({
  formData,
  updateFormData,
}: {
  formData: OnboardingFormData;
  updateFormData: (data: Partial<OnboardingFormData>) => void;
}) {
  return (
    <>
      <div className="space-y-2">
        <Label className="flex" htmlFor="name">Nome da Empresa</Label>
        <Input
          id="name"
          onChange={(e) => updateFormData({ name: e.target.value })}
          placeholder="Nome da sua empresa"
          value={formData.name}
        />
      </div>

      <div className="space-y-2">
        <Label className="flex" htmlFor="description">Descrição</Label>
        <Textarea
          id="description"
          onChange={(e) => updateFormData({ description: e.target.value })}
          placeholder="Descreva brevemente o que sua empresa faz..."
          rows={3}
          value={formData.description}
        />
      </div>

      <div className="space-y-2">
        <Label className="flex" htmlFor="industry">Indústria / Nicho</Label>
        <Input
          id="industry"
          onChange={(e) => updateFormData({ industry: e.target.value })}
          placeholder="Ex: Tecnologia, Moda, Alimentação..."
          value={formData.industry}
        />
      </div>
    </>
  );
}

