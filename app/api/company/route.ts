import { auth } from "@/app/(auth)/auth";
import {
  createCompany,
  getCompaniesByUserId,
  getCompanyById,
  getUserCompanyRole,
  updateCompany,
  deleteCompany,
  type CreateCompanyInput,
  type UpdateCompanyInput,
} from "@/lib/db/queries";
import { ChatSDKError } from "@/lib/errors";

export async function GET(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return new ChatSDKError("unauthorized:api").toResponse();
  }

  const { searchParams } = new URL(request.url);
  const companyId = searchParams.get("id");

  // If specific company ID is provided, return that company
  if (companyId) {
    const role = await getUserCompanyRole({
      userId: session.user.id,
      companyId,
    });

    if (!role) {
      return new ChatSDKError("forbidden:api", "You don't have access to this company").toResponse();
    }

    const company = await getCompanyById({ id: companyId });

    if (!company) {
      return new ChatSDKError("not_found:api", "Company not found").toResponse();
    }

    return Response.json({ company, role }, { status: 200 });
  }

  // Otherwise, return all companies for the user
  const companies = await getCompaniesByUserId({ userId: session.user.id });
  return Response.json({ companies }, { status: 200 });
}

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return new ChatSDKError("unauthorized:api").toResponse();
  }

  const body: CreateCompanyInput = await request.json();

  if (!body.name?.trim()) {
    return new ChatSDKError("bad_request:api", "Company name is required").toResponse();
  }

  const company = await createCompany({
    userId: session.user.id,
    companyData: body,
  });

  return Response.json({ company }, { status: 201 });
}

export async function PATCH(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return new ChatSDKError("unauthorized:api").toResponse();
  }

  const { searchParams } = new URL(request.url);
  const companyId = searchParams.get("id");

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

  // Only owners and admins can update company
  if (role === "member") {
    return new ChatSDKError("forbidden:api", "You don't have permission to update this company").toResponse();
  }

  const body: UpdateCompanyInput = await request.json();

  const company = await updateCompany({
    id: companyId,
    data: body,
  });

  return Response.json({ company }, { status: 200 });
}

export async function DELETE(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return new ChatSDKError("unauthorized:api").toResponse();
  }

  const { searchParams } = new URL(request.url);
  const companyId = searchParams.get("id");

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

  // Only owners can delete company
  if (role !== "owner") {
    return new ChatSDKError("forbidden:api", "Only owners can delete a company").toResponse();
  }

  await deleteCompany({ id: companyId });

  return Response.json({ success: true }, { status: 200 });
}

