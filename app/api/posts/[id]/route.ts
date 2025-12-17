import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/(auth)/auth";
import {
  deletePost,
  duplicatePost,
  getPostById,
  updatePost,
} from "@/lib/db/queries";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const foundPost = await getPostById({
      id,
      userId: session.user.id,
    });

    if (!foundPost) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    return NextResponse.json(foundPost);
  } catch (error) {
    console.error("Error fetching post:", error);
    return NextResponse.json(
      { error: "Failed to fetch post" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await request.json();
    const {
      title,
      width,
      height,
      layers,
      renderedImage,
      thumbnailImage,
      caption,
      status,
      scheduledAt,
      publishedAt,
      scheduledPostId,
    } = body;

    const updatedPost = await updatePost({
      id,
      userId: session.user.id,
      title,
      width,
      height,
      layers,
      renderedImage,
      thumbnailImage,
      caption,
      status,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
      publishedAt: publishedAt ? new Date(publishedAt) : undefined,
      scheduledPostId,
    });

    return NextResponse.json(updatedPost);
  } catch (error) {
    console.error("Error updating post:", error);
    return NextResponse.json(
      { error: "Failed to update post" },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    await deletePost({
      id,
      userId: session.user.id,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting post:", error);
    return NextResponse.json(
      { error: "Failed to delete post" },
      { status: 500 }
    );
  }
}

// POST to duplicate
export async function POST(_request: NextRequest, { params }: Params) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const duplicatedPost = await duplicatePost({
      id,
      userId: session.user.id,
    });

    return NextResponse.json(duplicatedPost, { status: 201 });
  } catch (error) {
    console.error("Error duplicating post:", error);
    return NextResponse.json(
      { error: "Failed to duplicate post" },
      { status: 500 }
    );
  }
}

