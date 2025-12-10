import { auth } from "@/app/(auth)/auth";
import { extractFromWebsite } from "@/lib/firecrawl";
import { ChatSDKError } from "@/lib/errors";

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return new ChatSDKError("unauthorized:api").toResponse();
  }

  const body = await request.json();
  const { websiteUrl } = body as {
    websiteUrl?: string;
  };

  if (!websiteUrl) {
    return new ChatSDKError(
      "bad_request:api",
      "O campo websiteUrl é obrigatório"
    ).toResponse();
  }

  // Validate URL
  try {
    new URL(websiteUrl);
  } catch {
    return new ChatSDKError(
      "bad_request:api",
      "Formato de URL inválido"
    ).toResponse();
  }

  const result = await extractFromWebsite(websiteUrl);

  return Response.json({
    success: true,
    website: result,
  }, { status: 200 });
}

