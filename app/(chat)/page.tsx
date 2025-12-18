import { redirect } from "next/navigation";
import { Suspense } from "react";
import { PostsGallery } from "@/components/posts/posts-gallery";
import { DataStreamHandler } from "@/components/data-stream-handler";
import { auth } from "../(auth)/auth";

export default function Page() {
  return (
    <Suspense fallback={<div className="flex h-dvh" />}>
      <PostsPage />
    </Suspense>
  );
}

async function PostsPage() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  return (
    <>
      <PostsGallery />
      <DataStreamHandler />
    </>
  );
}
