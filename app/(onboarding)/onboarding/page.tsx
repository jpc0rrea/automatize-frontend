"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  DEFAULT_FORM_DATA,
  StepBasicInfo,
  StepBrandIdentity,
  StepExtraction,
  StepReferenceImages,
  type OnboardingFormData,
} from "@/components/onboarding";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

const STEPS = [
  { id: 1, title: "Informações Básicas", description: "Nome e links da sua empresa" },
  { id: 2, title: "Extração IA", description: "Analisando sua marca" },
  { id: 3, title: "Identidade da Marca", description: "Tom de voz e cores" },
  { id: 4, title: "Conteúdo", description: "Preferências e referências" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<OnboardingFormData>(DEFAULT_FORM_DATA);
  const [referenceImages, setReferenceImages] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [extractionComplete, setExtractionComplete] = useState(false);

  const updateFormData = useCallback((data: Partial<OnboardingFormData>) => {
    setFormData((prev) => ({ ...prev, ...data }));
  }, []);

  const handleAddImage = useCallback((url: string) => {
    setReferenceImages((prev) => [...prev, url]);
  }, []);

  const handleRemoveImage = useCallback((url: string) => {
    setReferenceImages((prev) => prev.filter((img) => img !== url));
  }, []);

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return formData.name.trim().length > 0;
      case 2:
        // Pode prosseguir se a extração estiver completa ou não houver site para extrair
        return extractionComplete || !formData.websiteUrl;
      case 3:
        return true; // Brand identity is optional
      case 4:
        return true; // Reference images are optional
      default:
        return false;
    }
  };

  const goToNextStep = () => {
    if (currentStep < STEPS.length && canProceed()) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const goToPreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error("Nome da empresa é obrigatório");
      return;
    }

    setIsSubmitting(true);

    try {
      // Create company
      const companyResponse = await fetch("/api/company", {
        method: "POST",
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

      if (!companyResponse.ok) {
        throw new Error("Falha ao criar empresa");
      }

      const { company } = await companyResponse.json();

      // Add reference images
      for (const imageUrl of referenceImages) {
        await fetch("/api/company/reference-images", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            companyId: company.id,
            url: imageUrl,
            source: "upload",
          }),
        });
      }

      // Mark onboarding as completed
      await fetch(`/api/company?id=${company.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ onboardingCompleted: true }),
      });

      toast.success("Empresa criada com sucesso!");
      router.push("/");
    } catch (error) {
      console.error("Error creating company:", error);
      toast.error("Erro ao criar empresa. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-2xl">
      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {STEPS.map((step, index) => (
            <div className="flex flex-1 items-center" key={step.id}>
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "flex size-10 items-center justify-center rounded-full border-2 transition-colors",
                    currentStep > step.id
                      ? "border-primary bg-primary text-primary-foreground"
                      : currentStep === step.id
                        ? "border-primary text-primary"
                        : "border-muted text-muted-foreground"
                  )}
                >
                  {currentStep > step.id ? (
                    <Check className="size-5" />
                  ) : (
                    <span className="font-medium text-sm">{step.id}</span>
                  )}
                </div>
                <span
                  className={cn(
                    "mt-2 hidden text-center text-xs sm:block",
                    currentStep >= step.id ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  {step.title}
                </span>
              </div>
              {index < STEPS.length - 1 && (
                <div
                  className={cn(
                    "mx-2 h-0.5 flex-1 transition-colors",
                    currentStep > step.id ? "bg-primary" : "bg-muted"
                  )}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <Card>
        <CardHeader>
          <CardTitle>{STEPS[currentStep - 1].title}</CardTitle>
          <CardDescription>{STEPS[currentStep - 1].description}</CardDescription>
        </CardHeader>
        <CardContent>
          {currentStep === 1 && (
            <StepBasicInfo formData={formData} updateFormData={updateFormData} />
          )}
          {currentStep === 2 && (
            <StepExtraction
              formData={formData}
              onExtractionComplete={() => setExtractionComplete(true)}
              updateFormData={updateFormData}
            />
          )}
          {currentStep === 3 && (
            <StepBrandIdentity formData={formData} updateFormData={updateFormData} />
          )}
          {currentStep === 4 && (
            <StepReferenceImages
              formData={formData}
              onAddImage={handleAddImage}
              onRemoveImage={handleRemoveImage}
              referenceImages={referenceImages}
              updateFormData={updateFormData}
            />
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="mt-6 flex justify-between">
        <Button
          disabled={currentStep === 1}
          onClick={goToPreviousStep}
          variant="outline"
        >
          <ArrowLeft className="mr-2 size-4" />
          Voltar
        </Button>

        {currentStep < STEPS.length ? (
          <Button disabled={!canProceed()} onClick={goToNextStep}>
            Próximo
            <ArrowRight className="ml-2 size-4" />
          </Button>
        ) : (
          <Button disabled={isSubmitting} onClick={handleSubmit}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Criando...
              </>
            ) : (
              <>
                Concluir
                <Check className="ml-2 size-4" />
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}

