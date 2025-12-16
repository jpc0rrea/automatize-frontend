import { CampaignObjective } from "./types";

/**
 * Retorna o nome do objetivo da campanha em português (pt-BR)
 */
export function getCampaignObjectiveLabel(
  objective: CampaignObjective
): string {
  switch (objective) {
    case CampaignObjective.APP_INSTALLS:
      return "Instalações de aplicativo";
    case CampaignObjective.BRAND_AWARENESS:
      return "Reconhecimento de marca";
    case CampaignObjective.CONVERSIONS:
      return "Conversões";
    case CampaignObjective.EVENT_RESPONSES:
      return "Respostas a eventos";
    case CampaignObjective.LEAD_GENERATION:
      return "Geração de cadastros";
    case CampaignObjective.LINK_CLICKS:
      return "Cliques no link";
    case CampaignObjective.LOCAL_AWARENESS:
      return "Reconhecimento local";
    case CampaignObjective.MESSAGES:
      return "Mensagens";
    case CampaignObjective.OFFER_CLAIMS:
      return "Solicitações de oferta";
    case CampaignObjective.OUTCOME_APP_PROMOTION:
      return "Promoção de aplicativo";
    case CampaignObjective.OUTCOME_AWARENESS:
      return "Reconhecimento";
    case CampaignObjective.OUTCOME_ENGAGEMENT:
      return "Engajamento";
    case CampaignObjective.OUTCOME_LEADS:
      return "Leads";
    case CampaignObjective.OUTCOME_SALES:
      return "Vendas";
    case CampaignObjective.OUTCOME_TRAFFIC:
      return "Tráfego";
    case CampaignObjective.PAGE_LIKES:
      return "Curtidas na página";
    case CampaignObjective.POST_ENGAGEMENT:
      return "Engajamento com publicação";
    case CampaignObjective.PRODUCT_CATALOG_SALES:
      return "Vendas no catálogo de produtos";
    case CampaignObjective.REACH:
      return "Alcance";
    case CampaignObjective.STORE_VISITS:
      return "Visitas à loja";
    case CampaignObjective.VIDEO_VIEWS:
      return "Visualizações de vídeo";
    default:
      return "Desconhecido";
  }
}
