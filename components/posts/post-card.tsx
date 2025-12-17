"use client";

import { formatDistance } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion } from "framer-motion";
import {
  Calendar,
  CheckCircle,
  Clock,
  Copy,
  Edit2,
  ImageIcon,
  MoreHorizontal,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Post } from "@/lib/db/schema";
import type { PostStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

type PostCardProps = {
  post: Post;
  onDelete: (id: string) => Promise<void>;
  onDuplicate: (id: string) => Promise<void>;
};

const STATUS_CONFIG: Record<
  PostStatus,
  { label: string; icon: typeof Clock; className: string }
> = {
  draft: {
    label: "Rascunho",
    icon: Edit2,
    className: "bg-muted text-muted-foreground border-muted-foreground/20",
  },
  ready: {
    label: "Pronto",
    icon: CheckCircle,
    className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  },
  scheduled: {
    label: "Agendado",
    icon: Calendar,
    className: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  },
  posted: {
    label: "Publicado",
    icon: CheckCircle,
    className: "bg-green-500/10 text-green-600 border-green-500/20",
  },
  failed: {
    label: "Falhou",
    icon: Clock,
    className: "bg-red-500/10 text-red-600 border-red-500/20",
  },
};

export function PostCard({ post, onDelete, onDuplicate }: PostCardProps) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState(false);

  const statusConfig = STATUS_CONFIG[post.status];
  const StatusIcon = statusConfig.icon;

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete(post.id);
      toast.success("Post excluído com sucesso");
    } catch (error) {
      toast.error("Erro ao excluir post");
      console.error("Error deleting post:", error);
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
    }
  };

  const handleDuplicate = async () => {
    setIsDuplicating(true);
    try {
      await onDuplicate(post.id);
      toast.success("Post duplicado com sucesso");
    } catch (error) {
      toast.error("Erro ao duplicar post");
      console.error("Error duplicating post:", error);
    } finally {
      setIsDuplicating(false);
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.2 }}
      >
        <Card className="group relative overflow-hidden transition-all hover:shadow-lg hover:border-primary/20">
          {/* Thumbnail */}
          <Link href={`/posts/${post.id}`}>
            <div className="relative aspect-square w-full overflow-hidden bg-muted">
              {post.thumbnailImage || post.renderedImage ? (
                // biome-ignore lint/a11y/useAltText: Thumbnail image
                <img
                  alt={post.title ?? "Post thumbnail"}
                  className="size-full object-cover transition-transform group-hover:scale-105"
                  src={
                    post.thumbnailImage ??
                    (post.renderedImage?.startsWith("data:")
                      ? post.renderedImage
                      : `data:image/png;base64,${post.renderedImage}`)
                  }
                />
              ) : post.layers.length > 0 ? (
                <div className="flex size-full items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
                  <div className="text-center">
                    <ImageIcon className="mx-auto size-12 text-muted-foreground/50" />
                    <p className="mt-2 text-muted-foreground/50 text-sm">
                      {post.layers.length} camada{post.layers.length > 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex size-full items-center justify-center bg-gradient-to-br from-muted to-muted/50">
                  <ImageIcon className="size-12 text-muted-foreground/30" />
                </div>
              )}

              {/* Status badge overlay */}
              <div className="absolute top-2 left-2">
                <Badge
                  className={cn(
                    "gap-1 border backdrop-blur-sm",
                    statusConfig.className
                  )}
                  variant="outline"
                >
                  <StatusIcon className="size-3" />
                  {statusConfig.label}
                </Badge>
              </div>

              {/* Canvas size indicator */}
              <div className="absolute right-2 bottom-2">
                <Badge
                  className="backdrop-blur-sm"
                  variant="secondary"
                >
                  {post.width}×{post.height}
                </Badge>
              </div>
            </div>
          </Link>

          {/* Card content */}
          <CardHeader className="p-4 pb-2">
            <div className="flex items-start justify-between gap-2">
              <Link className="flex-1 min-w-0" href={`/posts/${post.id}`}>
                <CardTitle className="line-clamp-1 text-base font-medium transition-colors hover:text-primary">
                  {post.title ?? "Sem título"}
                </CardTitle>
              </Link>

              {/* Actions dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    className="size-8 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    size="icon"
                    variant="ghost"
                  >
                    <MoreHorizontal className="size-4" />
                    <span className="sr-only">Ações</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link href={`/posts/${post.id}`}>
                      <Edit2 className="mr-2 size-4" />
                      Editar
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    disabled={isDuplicating}
                    onClick={handleDuplicate}
                  >
                    <Copy className="mr-2 size-4" />
                    Duplicar
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => setIsDeleteDialogOpen(true)}
                  >
                    <Trash2 className="mr-2 size-4" />
                    Excluir
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <CardDescription className="line-clamp-2 text-xs">
              {post.caption || "Sem legenda"}
            </CardDescription>
          </CardHeader>

          <CardContent className="p-4 pt-0">
            <div className="flex items-center justify-between text-muted-foreground text-xs">
              <span>
                {formatDistance(new Date(post.updatedAt), new Date(), {
                  addSuffix: true,
                  locale: ptBR,
                })}
              </span>
              {post.scheduledAt && (
                <span className="flex items-center gap-1">
                  <Calendar className="size-3" />
                  {new Date(post.scheduledAt).toLocaleDateString("pt-BR")}
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Delete confirmation dialog */}
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir post?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O post será excluído permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
              onClick={handleDelete}
            >
              {isDeleting ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

