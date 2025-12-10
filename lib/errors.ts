export type ErrorType =
  | "bad_request"
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "rate_limit"
  | "offline";

export type Surface =
  | "chat"
  | "auth"
  | "api"
  | "stream"
  | "database"
  | "history"
  | "vote"
  | "document"
  | "suggestions"
  | "activate_gateway";

export type ErrorCode = `${ErrorType}:${Surface}`;

export type ErrorVisibility = "response" | "log" | "none";

export const visibilityBySurface: Record<Surface, ErrorVisibility> = {
  database: "log",
  chat: "response",
  auth: "response",
  stream: "response",
  api: "response",
  history: "response",
  vote: "response",
  document: "response",
  suggestions: "response",
  activate_gateway: "response",
};

export class ChatSDKError extends Error {
  type: ErrorType;
  surface: Surface;
  statusCode: number;

  constructor(errorCode: ErrorCode, cause?: string) {
    super();

    const [type, surface] = errorCode.split(":");

    this.type = type as ErrorType;
    this.cause = cause;
    this.surface = surface as Surface;
    this.message = getMessageByErrorCode(errorCode);
    this.statusCode = getStatusCodeByType(this.type);
  }

  toResponse() {
    const code: ErrorCode = `${this.type}:${this.surface}`;
    const visibility = visibilityBySurface[this.surface];

    const { message, cause, statusCode } = this;

    if (visibility === "log") {
      console.error({
        code,
        message,
        cause,
      });

      return Response.json(
        { code: "", message: "Algo deu errado. Tente novamente mais tarde." },
        { status: statusCode }
      );
    }

    return Response.json({ code, message, cause }, { status: statusCode });
  }
}

export function getMessageByErrorCode(errorCode: ErrorCode): string {
  if (errorCode.includes("database")) {
    return "Ocorreu um erro ao executar uma consulta ao banco de dados.";
  }

  switch (errorCode) {
    case "bad_request:api":
      return "A solicitação não pôde ser processada. Verifique sua entrada e tente novamente.";

    case "bad_request:activate_gateway":
      return "O AI Gateway requer um cartão de crédito válido em arquivo para atender solicitações. Visite https://vercel.com/d?to=%2F%5Bteam%5D%2F%7E%2Fai%3Fmodal%3Dadd-credit-card para adicionar um cartão e desbloquear seus créditos gratuitos.";

    case "unauthorized:auth":
      return "Você precisa entrar antes de continuar.";
    case "forbidden:auth":
      return "Sua conta não tem acesso a este recurso.";

    case "rate_limit:chat":
      return "Você excedeu o número máximo de mensagens do dia. Tente novamente mais tarde.";
    case "not_found:chat":
      return "A conversa solicitada não foi encontrada. Verifique o ID da conversa e tente novamente.";
    case "forbidden:chat":
      return "Esta conversa pertence a outro usuário. Verifique o ID da conversa e tente novamente.";
    case "unauthorized:chat":
      return "Você precisa entrar para visualizar esta conversa. Entre e tente novamente.";
    case "offline:chat":
      return "Estamos tendo problemas para enviar sua mensagem. Verifique sua conexão com a internet e tente novamente.";

    case "not_found:document":
      return "O documento solicitado não foi encontrado. Verifique o ID do documento e tente novamente.";
    case "forbidden:document":
      return "Este documento pertence a outro usuário. Verifique o ID do documento e tente novamente.";
    case "unauthorized:document":
      return "Você precisa entrar para visualizar este documento. Entre e tente novamente.";
    case "bad_request:document":
      return "A solicitação para criar ou atualizar o documento foi inválida. Verifique sua entrada e tente novamente.";

    default:
      return "Algo deu errado. Tente novamente mais tarde.";
  }
}

function getStatusCodeByType(type: ErrorType) {
  switch (type) {
    case "bad_request":
      return 400;
    case "unauthorized":
      return 401;
    case "forbidden":
      return 403;
    case "not_found":
      return 404;
    case "rate_limit":
      return 429;
    case "offline":
      return 503;
    default:
      return 500;
  }
}
