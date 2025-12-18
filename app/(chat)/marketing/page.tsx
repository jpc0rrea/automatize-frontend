"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2, LogIn, TrendingUp, CheckCircle, XCircle } from "lucide-react";
import { AccountSelector } from "./components/account-selector";
import { CampaignsTable } from "./components/campaigns-table";
import { CampaignDetail } from "./components/campaign-detail";
import type { Campaign } from "@/lib/meta-business/marketing/types";
import { Button } from "@/components/ui/button";

type AdAccount = {
  id: string;
  name: string | null;
  accountId: string;
  adAccountId: string;
  currency: string | null;
  timezoneId: string | null;
  timezoneName: string | null;
  accountStatus: number | null;
};

type GetMeResponse = {
  id: string;
  facebookUserId: string;
  name: string | null;
  pictureUrl: string | null;
  adAccounts: AdAccount[];
  tokenExpiresAt: string | null;
};

type GetMeErrorResponse = {
  error: string;
  message: string;
  solution?: string;
};

const META_MARKETING_SCOPES = [
  "read_insights",
  "ads_management",
  "ads_read",
  "business_management",
  "public_profile",
].join(",");

export default function MarketingPage() {
  const searchParams = useSearchParams();
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(true);
  const [accounts, setAccounts] = useState<AdAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(
    null
  );
  const [userPicture, setUserPicture] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Auth status from URL params
  const [authMessage, setAuthMessage] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Campaign detail state
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(
    null
  );
  const [isCampaignDetailOpen, setIsCampaignDetailOpen] = useState(false);

  function buildMetaMarketingAuthUrl(): string {
    const clientId = process.env.NEXT_PUBLIC_META_GENERAL_APP_ID;
    const redirectUri = process.env.NEXT_PUBLIC_META_MARKETING_REDIRECT_URI;

    if (!clientId || !redirectUri) {
      console.error("Missing Meta Marketing OAuth configuration");
      return "#";
    }

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: META_MARKETING_SCOPES,
    });

    return `https://www.facebook.com/v24.0/dialog/oauth?${params.toString()}`;
  }

  // Check for auth status in URL params
  useEffect(() => {
    const authSuccess = searchParams.get("auth_success");
    const authError = searchParams.get("auth_error");
    const errorMessage = searchParams.get("error_message");
    const name = searchParams.get("name");

    if (authSuccess === "true") {
      setAuthMessage({
        type: "success",
        message: name
          ? `Conta conectada com sucesso: ${name}`
          : "Conta conectada com sucesso!",
      });
      // Clear URL params after showing message
      setTimeout(() => {
        window.history.replaceState({}, "", "/marketing");
      }, 100);
    } else if (authError === "true") {
      setAuthMessage({
        type: "error",
        message: errorMessage ?? "Erro ao conectar conta",
      });
      // Clear URL params after showing message
      setTimeout(() => {
        window.history.replaceState({}, "", "/marketing");
      }, 100);
    }

    // Auto-hide message after 5 seconds
    if (authSuccess || authError) {
      setTimeout(() => {
        setAuthMessage(null);
      }, 5000);
    }
  }, [searchParams]);

  // Fetch ad accounts on mount
  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const response = await fetch("/api/meta-business/marketing/me");

        if (response.status === 404) {
          // No connected account - not an error, just not connected yet
          setIsConnected(false);
          setAccounts([]);
          return;
        }

        if (response.status === 401) {
          // Not authenticated - redirect to login
          setError("Você precisa estar logado para acessar esta página");
          return;
        }

        if (!response.ok) {
          const errorData: GetMeErrorResponse = await response.json();
          throw new Error(errorData.message);
        }

        const data: GetMeResponse = await response.json();
        setIsConnected(true);
        setAccounts(data.adAccounts ?? []);
        setUserPicture(data.pictureUrl ?? undefined);

        // Auto-select first account if available
        if (data.adAccounts && data.adAccounts.length > 0) {
          setSelectedAccountId(data.adAccounts[0].accountId);
        }
      } catch (err) {
        console.error("Error fetching accounts:", err);
        setError("Não foi possível carregar as contas de anúncios");
      } finally {
        setIsLoadingAccounts(false);
      }
    };

    fetchAccounts();
  }, []);

  const handleCampaignClick = (campaign: Campaign) => {
    setSelectedCampaign(campaign);
    setIsCampaignDetailOpen(true);
  };

  const handleCloseCampaignDetail = () => {
    setIsCampaignDetailOpen(false);
    setSelectedCampaign(null);
  };

  const handleConnectFacebook = () => {
    window.location.href = buildMetaMarketingAuthUrl();
  };

  return (
    <div className="flex flex-col min-h-dvh">
      {/* Auth Message Banner */}
      {authMessage && (
        <div
          className={`px-4 py-3 flex items-center gap-2 ${
            authMessage.type === "success"
              ? "bg-green-500/10 text-green-600 dark:text-green-400"
              : "bg-destructive/10 text-destructive"
          }`}
        >
          {authMessage.type === "success" ? (
            <CheckCircle className="size-4" />
          ) : (
            <XCircle className="size-4" />
          )}
          <span className="text-sm">{authMessage.message}</span>
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-border bg-background px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <TrendingUp className="size-5 text-primary" />
          <h1 className="font-semibold text-lg hidden sm:block">
            Marketing Dashboard
          </h1>
          <h1 className="font-semibold text-lg sm:hidden">Marketing</h1>
          <Button
            variant="outline"
            size="icon"
            onClick={handleConnectFacebook}
            title={isConnected ? "Reconectar conta" : "Conectar ao Facebook"}
          >
            <LogIn className="size-4" />
          </Button>
        </div>
        {!isLoadingAccounts && accounts.length > 0 && (
          <AccountSelector
            accounts={accounts.map((acc) => ({
              id: acc.id,
              name: acc.name ?? "Sem nome",
              accountId: acc.accountId,
            }))}
            selectedAccountId={selectedAccountId}
            onSelectAccount={setSelectedAccountId}
            userPicture={userPicture}
          />
        )}
      </header>

      {/* Content */}
      <main className="flex-1 p-4 sm:p-6">
        {isLoadingAccounts ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="size-8 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-destructive">{error}</p>
            <p className="text-muted-foreground text-sm mt-2">
              Verifique sua conexão e tente novamente
            </p>
          </div>
        ) : !isConnected ? (
          <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
            <div className="rounded-full bg-muted p-6">
              <LogIn className="size-12 text-muted-foreground" />
            </div>
            <div>
              <h2 className="text-xl font-semibold mb-2">
                Conecte sua conta do Facebook
              </h2>
              <p className="text-muted-foreground max-w-md">
                Para visualizar suas campanhas e métricas de anúncios, conecte
                sua conta do Facebook com acesso às contas de anúncios.
              </p>
            </div>
            <Button onClick={handleConnectFacebook} className="gap-2">
              <LogIn className="size-4" />
              Conectar ao Facebook
            </Button>
          </div>
        ) : accounts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-muted-foreground">
              Nenhuma conta de anúncios encontrada
            </p>
            <p className="text-muted-foreground text-sm mt-2">
              Verifique se você tem acesso a contas de anúncios no Facebook
            </p>
          </div>
        ) : selectedAccountId ? (
          <CampaignsTable
            accountId={selectedAccountId}
            onCampaignClick={handleCampaignClick}
          />
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-muted-foreground">
              Selecione uma conta de anúncios para visualizar as campanhas
            </p>
          </div>
        )}
      </main>

      {/* Campaign Detail Sheet */}
      {selectedCampaign && selectedAccountId && (
        <CampaignDetail
          campaign={selectedCampaign}
          accountId={selectedAccountId}
          isOpen={isCampaignDetailOpen}
          onClose={handleCloseCampaignDetail}
        />
      )}
    </div>
  );
}
