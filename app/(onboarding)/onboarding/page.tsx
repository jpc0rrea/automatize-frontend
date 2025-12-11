"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  DEFAULT_FORM_DATA,
  StepBasicInfo,
  StepBrandIdentity,
  StepExtraction,
  StepReferenceImages,
  StepInstagramConnect,
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
  { id: 1, title: "Conectar Instagram", description: "Vincule sua conta do Instagram" },
  { id: 2, title: "Informações Básicas", description: "Nome e links da sua empresa" },
  { id: 3, title: "Extração IA", description: "Analisando sua marca" },
  { id: 4, title: "Identidade da Marca", description: "Tom de voz e cores" },
  { id: 5, title: "Conteúdo", description: "Preferências e referências" },
];

type InstagramAccount = {
  username: string;
  accountId: string;
};

export default function OnboardingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<OnboardingFormData>(DEFAULT_FORM_DATA);
  const [referenceImages, setReferenceImages] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [extractionComplete, setExtractionComplete] = useState(false);

  // Instagram connection state
  const [isInstagramConnected, setIsInstagramConnected] = useState(false);
  const [connectedInstagramAccount, setConnectedInstagramAccount] = useState<InstagramAccount | null>(null);
  const [isCheckingInstagram, setIsCheckingInstagram] = useState(true);

  // Check Instagram connection status on mount and handle callback params
  useEffect(() => {
    const checkInstagramConnection = async () => {
      try {
        const response = await fetch("/api/instagram-account");
        const data = await response.json();

        if (data.connected && data.account) {
          setIsInstagramConnected(true);
          setConnectedInstagramAccount(data.account);
          
          // Pre-fill Instagram handle if available
          if (data.account.username) {
            setFormData((prev) => ({
              ...prev,
              instagramHandle: data.account.username,
            }));
          }
        }
      } catch (error) {
        console.error("Error checking Instagram connection:", error);
      } finally {
        setIsCheckingInstagram(false);
      }
    };

    // Handle callback parameters from Instagram OAuth
    const instagramConnected = searchParams.get("instagram_connected");
    const instagramError = searchParams.get("instagram_error");
    const errorMessage = searchParams.get("error_message");
    const username = searchParams.get("username");

    if (instagramConnected === "true") {
      toast.success("Instagram conectado com sucesso!");
      
      // If username is in the URL params, use it immediately
      if (username) {
        setIsInstagramConnected(true);
        setConnectedInstagramAccount({
          username,
          accountId: "",
        });
        setFormData((prev) => ({
          ...prev,
          instagramHandle: username,
        }));
        setIsCheckingInstagram(false);
      } else {
        // Otherwise check the API
        checkInstagramConnection();
      }

      // Clean up URL parameters
      const url = new URL(window.location.href);
      url.searchParams.delete("instagram_connected");
      url.searchParams.delete("username");
      window.history.replaceState({}, "", url.toString());
    } else if (instagramError === "true") {
      toast.error(errorMessage ?? "Erro ao conectar Instagram. Tente novamente.");

      // Clean up URL parameters
      const url = new URL(window.location.href);
      url.searchParams.delete("instagram_error");
      url.searchParams.delete("error_message");
      window.history.replaceState({}, "", url.toString());

      setIsCheckingInstagram(false);
    } else {
      checkInstagramConnection();
    }
  }, [searchParams]);

  const updateFormData = useCallback((data: Partial<OnboardingFormData>) => {
    setFormData((prev) => ({ ...prev, ...data }));
  }, []);

  const handleAddImage = useCallback((url: string) => {
    setReferenceImages((prev) => [...prev, url]);
  }, []);

  const handleRemoveImage = useCallback((url: string) => {
    setReferenceImages((prev) => prev.filter((img) => img !== url));
  }, []);

  const handleCheckInstagramConnection = useCallback(async () => {
    setIsCheckingInstagram(true);
    try {
      const response = await fetch("/api/instagram-account");
      const data = await response.json();

      if (data.connected && data.account) {
        setIsInstagramConnected(true);
        setConnectedInstagramAccount(data.account);
      }
    } catch (error) {
      console.error("Error checking Instagram connection:", error);
    } finally {
      setIsCheckingInstagram(false);
    }
  }, []);

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return isInstagramConnected;
      case 2:
        return formData.name.trim().length > 0;
      case 3:
        // Pode prosseguir se a extração estiver completa ou não houver site para extrair
        return extractionComplete || !formData.websiteUrl;
      case 4:
        return true; // Brand identity is optional
      case 5:
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
            <StepInstagramConnect
              connectedAccount={connectedInstagramAccount}
              isConnected={isInstagramConnected}
              isLoading={isCheckingInstagram}
              onCheckConnection={handleCheckInstagramConnection}
            />
          )}
          {currentStep === 2 && (
            <StepBasicInfo formData={formData} updateFormData={updateFormData} />
          )}
          {currentStep === 3 && (
            <StepExtraction
              formData={formData}
              onExtractionComplete={() => setExtractionComplete(true)}
              updateFormData={updateFormData}
            />
          )}
          {currentStep === 4 && (
            <StepBrandIdentity formData={formData} updateFormData={updateFormData} />
          )}
          {currentStep === 5 && (
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
