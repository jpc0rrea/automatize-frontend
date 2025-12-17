import { redirect } from "next/navigation";
import { auth } from "@/app/(auth)/auth";
import { CanvasEditor } from "@/components/canvas-editor";

type PostEditorPageProps = {
  params: Promise<{ id: string }>;
};

export default async function PostEditorPage({ params }: PostEditorPageProps) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const { id } = await params;

  return <CanvasEditor postId={id} />;
}

