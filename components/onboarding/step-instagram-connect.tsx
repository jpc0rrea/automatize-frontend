"use client";

import { CheckCircle2, Instagram, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type InstagramAccount = {
  username: string;
  accountId: string;
};

type StepInstagramConnectProps = {
  isConnected: boolean;
  connectedAccount: InstagramAccount | null;
  isLoading: boolean;
  onCheckConnection: () => Promise<void>;
};

const INSTAGRAM_SCOPES = [
  "instagram_business_basic",
  "instagram_business_manage_messages",
  "instagram_business_manage_comments",
  "instagram_business_content_publish",
  "instagram_business_manage_insights",
].join(",");

function buildInstagramAuthUrl(): string {
  const clientId = process.env.NEXT_PUBLIC_INSTAGRAM_APP_ID;
  const redirectUri = process.env.NEXT_PUBLIC_INSTAGRAM_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    console.error("Missing Instagram OAuth configuration");
    return "#";
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: INSTAGRAM_SCOPES,
    force_reauth: "true",
  });

  return `https://www.instagram.com/oauth/authorize?${params.toString()}`;
}

export function StepInstagramConnect({
  isConnected,
  connectedAccount,
  isLoading,
}: StepInstagramConnectProps) {
  const handleConnect = () => {
    // Redirect directly to Instagram OAuth page
    window.location.href = buildInstagramAuthUrl();
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
        <p className="mt-4 text-muted-foreground text-sm">
          Verificando conexão com Instagram...
        </p>
      </div>
    );
  }

  if (isConnected && connectedAccount) {
    return (
      <div className="flex flex-col items-center justify-center py-8">
        <div className="flex size-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
          <CheckCircle2 className="size-8 text-green-600 dark:text-green-400" />
        </div>
        <h3 className="mt-4 font-semibold text-lg">Instagram Conectado!</h3>
        <p className="mt-2 text-muted-foreground">
          Conta conectada: <span className="font-medium text-foreground">@{connectedAccount.username}</span>
        </p>
        <p className="mt-4 text-center text-muted-foreground text-sm">
          Clique em &quot;Próximo&quot; para continuar com o cadastro da sua empresa.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-8">
      <div className="flex size-16 items-center justify-center rounded-full bg-linear-to-br from-purple-500 via-pink-500 to-orange-400">
        <Instagram className="size-8 text-white" />
      </div>
      <h3 className="mt-4 font-semibold text-lg">Conecte seu Instagram</h3>
      <p className="mt-2 max-w-md text-center text-muted-foreground text-sm">
        Para começar, conecte a conta do Instagram da sua empresa. Isso nos permitirá 
        entender melhor seu conteúdo e ajudar a criar posts incríveis.
      </p>
      <Button
        className={cn(
          "mt-6 gap-2",
          "bg-linear-to-r from-purple-500 via-pink-500 to-orange-400",
          "hover:from-purple-600 hover:via-pink-600 hover:to-orange-500",
          "text-white"
        )}
        onClick={handleConnect}
        size="lg"
      >
        <Instagram className="size-5" />
        Conectar Instagram
      </Button>
      <p className="mt-4 max-w-sm text-center text-muted-foreground text-xs">
        Você será redirecionado para o Instagram para autorizar o acesso. 
        Suas credenciais são seguras e nunca armazenamos sua senha.
      </p>
    </div>
  );
}
