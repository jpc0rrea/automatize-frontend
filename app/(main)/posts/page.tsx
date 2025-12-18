"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  Filter,
  Grid3X3,
  LayoutGrid,
  Loader2,
  RefreshCw,
  Search,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { NewPostCard, PostCard } from "@/components/posts";
import { SidebarToggle } from "@/components/sidebar-toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Post } from "@/lib/db/schema";
import type { PostStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

type PostsResponse = {
  posts: Post[];
  total: number;
};

const STATUS_OPTIONS: { value: PostStatus | "all"; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "draft", label: "Rascunhos" },
  { value: "ready", label: "Prontos" },
  { value: "scheduled", label: "Agendados" },
  { value: "posted", label: "Publicados" },
];

export default function PostsGalleryPage() {
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<PostStatus | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "compact">("grid");

  const fetchPosts = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") {
        params.set("status", statusFilter);
      }

      const response = await fetch(`/api/posts?${params.toString()}`);

      if (!response.ok) {
        if (response.status === 401) {
          router.push("/login");
          return;
        }
        throw new Error("Failed to fetch posts");
      }

      const data: PostsResponse = await response.json();
      setPosts(data.posts);
      setTotal(data.total);
    } catch (error) {
      console.error("Error fetching posts:", error);
      toast.error("Erro ao carregar posts");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [statusFilter, router]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchPosts();
  };

  const handleDelete = async (id: string) => {
    const response = await fetch(`/api/posts/${id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      throw new Error("Failed to delete post");
    }

    setPosts((prev) => prev.filter((p) => p.id !== id));
    setTotal((prev) => prev - 1);
  };

  const handleDuplicate = async (id: string) => {
    const response = await fetch(`/api/posts/${id}`, {
      method: "POST",
    });

    if (!response.ok) {
      throw new Error("Failed to duplicate post");
    }

    const newPost: Post = await response.json();
    setPosts((prev) => [newPost, ...prev]);
    setTotal((prev) => prev + 1);
  };

  // Filter posts by search query (client-side)
  const filteredPosts = posts.filter((post) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      (post.title?.toLowerCase().includes(query) ?? false) ||
      (post.caption?.toLowerCase().includes(query) ?? false)
    );
  });

  if (isLoading) {
    return (
      <div className="flex h-dvh items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex h-dvh flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center justify-between border-b border-border bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center gap-4">
          <SidebarToggle />
          <h1 className="font-semibold text-lg">Meus Posts</h1>
          <span className="text-muted-foreground text-sm">
            {total} post{total !== 1 ? "s" : ""}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative hidden sm:block">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="w-64 pl-9"
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar posts..."
              value={searchQuery}
            />
          </div>

          {/* Status filter */}
          <Select
            onValueChange={(v) => setStatusFilter(v as PostStatus | "all")}
            value={statusFilter}
          >
            <SelectTrigger className="w-[140px]">
              <Filter className="mr-2 size-4" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* View mode toggle */}
          <div className="hidden items-center rounded-md border p-1 sm:flex">
            <Button
              className={cn(
                "size-8",
                viewMode === "grid" && "bg-muted"
              )}
              onClick={() => setViewMode("grid")}
              size="icon"
              variant="ghost"
            >
              <LayoutGrid className="size-4" />
            </Button>
            <Button
              className={cn(
                "size-8",
                viewMode === "compact" && "bg-muted"
              )}
              onClick={() => setViewMode("compact")}
              size="icon"
              variant="ghost"
            >
              <Grid3X3 className="size-4" />
            </Button>
          </div>

          {/* Refresh */}
          <Button
            disabled={isRefreshing}
            onClick={handleRefresh}
            size="icon"
            variant="ghost"
          >
            <RefreshCw
              className={cn("size-4", isRefreshing && "animate-spin")}
            />
          </Button>
        </div>
      </header>

      {/* Mobile search */}
      <div className="border-b border-border p-4 sm:hidden">
        <div className="relative">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar posts..."
            value={searchQuery}
          />
        </div>
      </div>

      {/* Posts grid */}
      <div className="flex-1 overflow-y-auto p-4">
        <div
          className={cn(
            "mx-auto grid gap-4",
            viewMode === "grid"
              ? "max-w-6xl grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
              : "max-w-7xl grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
          )}
        >
          {/* New post card - always first */}
          <NewPostCard />

          {/* Existing posts */}
          <AnimatePresence mode="popLayout">
            {filteredPosts.map((post) => (
              <PostCard
                key={post.id}
                onDelete={handleDelete}
                onDuplicate={handleDuplicate}
                post={post}
              />
            ))}
          </AnimatePresence>
        </div>

        {/* Empty state */}
        {filteredPosts.length === 0 && !isLoading && (
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="mt-12 text-center"
            initial={{ opacity: 0, y: 20 }}
          >
            <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-muted">
              <LayoutGrid className="size-8 text-muted-foreground" />
            </div>
            <h3 className="font-medium text-lg">Nenhum post encontrado</h3>
            <p className="mt-1 text-muted-foreground text-sm">
              {searchQuery
                ? "Tente uma busca diferente"
                : statusFilter !== "all"
                  ? "Não há posts com esse status"
                  : "Crie seu primeiro post clicando no botão acima"}
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}

