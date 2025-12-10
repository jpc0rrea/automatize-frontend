import { auth } from "@/app/(auth)/auth";
import {
  addCompanyReferenceImage,
  deleteCompanyReferenceImage,
  getCompanyReferenceImages,
  getUserCompanyRole,
} from "@/lib/db/queries";
import { ChatSDKError } from "@/lib/errors";

export async function GET(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return new ChatSDKError("unauthorized:api").toResponse();
  }

  const { searchParams } = new URL(request.url);
  const companyId = searchParams.get("companyId");

  if (!companyId) {
    return new ChatSDKError("bad_request:api", "Company ID is required").toResponse();
  }

  // Check user has access to this company
  const role = await getUserCompanyRole({
    userId: session.user.id,
    companyId,
  });

  if (!role) {
    return new ChatSDKError("forbidden:api", "You don't have access to this company").toResponse();
  }

  const images = await getCompanyReferenceImages({ companyId });

  return Response.json({ images }, { status: 200 });
}

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return new ChatSDKError("unauthorized:api").toResponse();
  }

  const body = await request.json();
  const { companyId, url, source, caption } = body as {
    companyId: string;
    url: string;
    source: "upload" | "instagram_scrape";
    caption?: string;
  };

  if (!companyId || !url || !source) {
    return new ChatSDKError(
      "bad_request:api",
      "companyId, url, and source are required"
    ).toResponse();
  }

  // Check user has access to this company
  const role = await getUserCompanyRole({
    userId: session.user.id,
    companyId,
  });

  if (!role) {
    return new ChatSDKError("forbidden:api", "You don't have access to this company").toResponse();
  }

  // Members can add images
  const image = await addCompanyReferenceImage({
    companyId,
    url,
    source,
    caption,
  });

  return Response.json({ image }, { status: 201 });
}

export async function DELETE(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return new ChatSDKError("unauthorized:api").toResponse();
  }

  const { searchParams } = new URL(request.url);
  const imageId = searchParams.get("id");
  const companyId = searchParams.get("companyId");

  if (!imageId || !companyId) {
    return new ChatSDKError("bad_request:api", "Image ID and Company ID are required").toResponse();
  }

  // Check user has access to this company
  const role = await getUserCompanyRole({
    userId: session.user.id,
    companyId,
  });

  if (!role) {
    return new ChatSDKError("forbidden:api", "You don't have access to this company").toResponse();
  }

  await deleteCompanyReferenceImage({ id: imageId });

  return Response.json({ success: true }, { status: 200 });
}

