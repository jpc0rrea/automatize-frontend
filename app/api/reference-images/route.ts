import { NextResponse } from "next/server";
import { auth } from "@/app/(auth)/auth";
import { getUserReferenceImages } from "@/lib/db/queries";

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const images = await getUserReferenceImages({
      userId: session.user.id,
    });

    return NextResponse.json({ images });
  } catch (error) {
    console.error("Error fetching reference images:", error);
    return NextResponse.json(
      { error: "Failed to fetch reference images" },
      { status: 500 }
    );
  }
}

