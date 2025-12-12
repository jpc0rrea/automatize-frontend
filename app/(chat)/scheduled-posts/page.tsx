"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ArrowLeft,
  Calendar as CalendarIcon,
  ChevronDown,
  Clock,
  Edit,
  ImageIcon,
  Loader2,
  Play,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type ScheduledPost = {
  id: string;
  userId: string;
  mediaUrl: string;
  mediaType: string;
  caption: string;
  locationId: string | null;
  userTagsJson: string | null;
  scheduledAt: string;
  status: string;
  retryAttempts: number;
  lastAttemptAt: string | null;
  lastErrorMessage: string | null;
  mediaContainerId: string | null;
  mediaContainerStatus: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type GetScheduledPostsResponse = {
  pager: {
    page: number;
    perPage: number;
    total: number;
  };
  posts: ScheduledPost[];
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  retry: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  posted: "bg-green-500/10 text-green-600 border-green-500/20",
  failed: "bg-red-500/10 text-red-600 border-red-500/20",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendente",
  retry: "Tentando novamente",
  posted: "Publicado",
  failed: "Falhou",
};

const MEDIA_CONTAINER_STATUS_LABELS: Record<string, string> = {
  IN_PROGRESS: "Processando",
  FINISHED: "Pronto",
  ERROR: "Erro",
};

export default function ScheduledPostsPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [posts, setPosts] = useState<ScheduledPost[]>([]);
  const [pager, setPager] = useState({ page: 1, perPage: 20, total: 0 });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [publishingPostId, setPublishingPostId] = useState<string | null>(null);

  // Create post dialog state
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newPost, setNewPost] = useState({
    mediaUrl: "",
    mediaType: "IMAGE" as "IMAGE" | "VIDEO" | "REELS",
    caption: "",
    scheduledDate: undefined as Date | undefined,
    scheduledTime: "12:00",
  });
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  // Edit post dialog state
  const [editingPost, setEditingPost] = useState<ScheduledPost | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editPost, setEditPost] = useState({
    mediaUrl: "",
    mediaType: "IMAGE" as "IMAGE" | "VIDEO" | "REELS",
    caption: "",
    scheduledDate: undefined as Date | undefined,
    scheduledTime: "12:00",
  });
  const [isEditCalendarOpen, setIsEditCalendarOpen] = useState(false);

  // Delete confirmation dialog state
  const [deletingPostId, setDeletingPostId] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const fetchPosts = useCallback(async () => {
    try {
      const now = new Date().toISOString();
      const response = await fetch(
        `/api/meta-business/instagram/scheduled-post?per_page=${
          pager.perPage
        }&page=${pager.page}&after=${encodeURIComponent(now)}`
      );

      if (response.ok) {
        const data: GetScheduledPostsResponse = await response.json();
        setPosts(data.posts);
        setPager(data.pager);
      } else if (response.status === 401) {
        toast.error("Sessão expirada. Faça login novamente.");
        router.push("/login");
      } else {
        throw new Error("Failed to fetch posts");
      }
    } catch (error) {
      console.error("Error fetching scheduled posts:", error);
      toast.error("Erro ao carregar posts agendados");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [pager.page, pager.perPage, router]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchPosts();
  };

  const getActionButtonText = (post: ScheduledPost): string => {
    if (post.status === "posted") {
      return "Publicado";
    }
    if (post.status === "retry") {
      return "Tentar novamente";
    }
    if (post.mediaContainerId && post.status === "pending") {
      return "Verificar postagem";
    }
    return "Publicar Agora";
  };

  const handlePublishNow = async (postId: string) => {
    setPublishingPostId(postId);

    try {
      const response = await fetch(
        `/api/meta-business/instagram/scheduled-post/${postId}`,
        {
          method: "POST",
        }
      );

      if (response.ok) {
        const updatedPost: ScheduledPost = await response.json();

        setPosts((prev) =>
          prev.map((p) => (p.id === postId ? updatedPost : p))
        );

        if (updatedPost.status === "posted") {
          toast.success("Post publicado com sucesso!");
        } else if (updatedPost.status === "retry") {
          toast.warning(
            `Publicação em andamento. Status: ${
              updatedPost.mediaContainerStatus ?? "processando"
            }`
          );
        } else {
          toast.info("Processamento iniciado. Atualize para ver o status.");
        }
      } else if (response.status === 401) {
        toast.error("Sessão expirada. Faça login novamente.");
        router.push("/login");
      } else {
        const error = await response.json();
        toast.error(error.error ?? "Erro ao publicar post");
      }
    } catch (error) {
      console.error("Error publishing post:", error);
      toast.error("Erro ao publicar post");
    } finally {
      setPublishingPostId(null);
    }
  };

  const handleEditClick = (post: ScheduledPost) => {
    if (post.status === "posted") {
      toast.error("Não é possível editar um post já publicado");
      return;
    }

    const scheduledDate = new Date(post.scheduledAt);
    const hours = scheduledDate.getHours().toString().padStart(2, "0");
    const minutes = scheduledDate.getMinutes().toString().padStart(2, "0");

    setEditingPost(post);
    setEditPost({
      mediaUrl: post.mediaUrl,
      mediaType: (post.mediaType ?? "IMAGE") as "IMAGE" | "VIDEO" | "REELS",
      caption: post.caption,
      scheduledDate,
      scheduledTime: `${hours}:${minutes}`,
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdatePost = async () => {
    if (!editingPost) return;

    if (!editPost.mediaUrl || !editPost.caption) {
      toast.error("URL da mídia e legenda são obrigatórios");
      return;
    }

    if (!editPost.scheduledDate) {
      toast.error("Selecione uma data para agendar o post");
      return;
    }

    setIsEditing(true);

    try {
      // Combine date and time
      const [hours, minutes] = editPost.scheduledTime.split(":").map(Number);
      const scheduledAt = new Date(editPost.scheduledDate);
      scheduledAt.setHours(hours, minutes, 0, 0);

      const response = await fetch(
        `/api/meta-business/instagram/scheduled-post/${editingPost.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mediaUrl: editPost.mediaUrl,
            mediaType: editPost.mediaType,
            caption: editPost.caption,
            scheduledAt: scheduledAt.toISOString(),
          }),
        }
      );

      if (response.ok) {
        const updated: ScheduledPost = await response.json();
        setPosts((prev) =>
          prev.map((p) => (p.id === editingPost.id ? updated : p))
        );
        toast.success("Post atualizado com sucesso!");
        setIsEditDialogOpen(false);
        setEditingPost(null);
      } else if (response.status === 401) {
        toast.error("Sessão expirada. Faça login novamente.");
        router.push("/login");
      } else {
        const error = await response.json();
        toast.error(error.error ?? "Erro ao atualizar post");
      }
    } catch (error) {
      console.error("Error updating scheduled post:", error);
      toast.error("Erro ao atualizar post");
    } finally {
      setIsEditing(false);
    }
  };

  const handleDeleteClick = (postId: string) => {
    setDeletingPostId(postId);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingPostId) return;

    try {
      const response = await fetch(
        `/api/meta-business/instagram/scheduled-post/${deletingPostId}`,
        {
          method: "DELETE",
        }
      );

      if (response.ok) {
        setPosts((prev) => prev.filter((p) => p.id !== deletingPostId));
        setPager((prev) => ({ ...prev, total: prev.total - 1 }));
        toast.success("Post excluído com sucesso!");
        setIsDeleteDialogOpen(false);
        setDeletingPostId(null);
      } else if (response.status === 401) {
        toast.error("Sessão expirada. Faça login novamente.");
        router.push("/login");
      } else {
        const error = await response.json();
        toast.error(error.error ?? "Erro ao excluir post");
      }
    } catch (error) {
      console.error("Error deleting scheduled post:", error);
      toast.error("Erro ao excluir post");
    } finally {
      setDeletingPostId(null);
    }
  };

  const handleCreatePost = async () => {
    if (!newPost.mediaUrl || !newPost.caption) {
      toast.error("URL da mídia e legenda são obrigatórios");
      return;
    }

    if (!newPost.scheduledDate) {
      toast.error("Selecione uma data para agendar o post");
      return;
    }

    setIsCreating(true);

    try {
      // Combine date and time
      const [hours, minutes] = newPost.scheduledTime.split(":").map(Number);
      const scheduledAt = new Date(newPost.scheduledDate);
      scheduledAt.setHours(hours, minutes, 0, 0);

      const response = await fetch(
        "/api/meta-business/instagram/scheduled-post",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mediaUrl: newPost.mediaUrl,
            mediaType: newPost.mediaType,
            caption: newPost.caption,
            scheduledAt: scheduledAt.toISOString(),
          }),
        }
      );

      if (response.ok) {
        const created: ScheduledPost = await response.json();
        setPosts((prev) => [created, ...prev]);
        setPager((prev) => ({ ...prev, total: prev.total + 1 }));
        toast.success("Post agendado com sucesso!");
        setIsCreateDialogOpen(false);
        setNewPost({
          mediaUrl: "",
          mediaType: "IMAGE",
          caption: "",
          scheduledDate: undefined,
          scheduledTime: "12:00",
        });
      } else if (response.status === 401) {
        toast.error("Sessão expirada. Faça login novamente.");
        router.push("/login");
      } else {
        const error = await response.json();
        toast.error(error.error ?? "Erro ao criar post agendado");
      }
    } catch (error) {
      console.error("Error creating scheduled post:", error);
      toast.error("Erro ao criar post agendado");
    } finally {
      setIsCreating(false);
    }
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "dd/MM/yyyy 'às' HH:mm", {
      locale: ptBR,
    });
  };

  if (isLoading) {
    return (
      <div className="flex h-dvh items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-border bg-background px-4">
        <div className="flex items-center gap-3">
          <Button onClick={() => router.back()} size="icon" variant="ghost">
            <ArrowLeft className="size-5" />
          </Button>
          <h1 className="font-semibold text-lg">Posts Agendados</h1>
        </div>
        <div className="flex items-center gap-2">
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
          <Dialog
            open={isCreateDialogOpen}
            onOpenChange={setIsCreateDialogOpen}
          >
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 size-4" />
                Novo Post
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Agendar Novo Post</DialogTitle>
                <DialogDescription>
                  Preencha os campos abaixo para agendar um novo post no
                  Instagram.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                {/* Media URL */}
                <div className="space-y-2">
                  <Label htmlFor="mediaUrl">URL da Mídia *</Label>
                  <Input
                    id="mediaUrl"
                    onChange={(e) =>
                      setNewPost((prev) => ({
                        ...prev,
                        mediaUrl: e.target.value,
                      }))
                    }
                    placeholder="https://example.com/image.jpg"
                    value={newPost.mediaUrl}
                  />
                  <p className="text-muted-foreground text-xs">
                    URL pública da imagem ou vídeo a ser publicado
                  </p>
                </div>

                {/* Media Type */}
                <div className="space-y-2">
                  <Label htmlFor="mediaType">Tipo de Mídia</Label>
                  <Select
                    onValueChange={(value: "IMAGE" | "VIDEO" | "REELS") =>
                      setNewPost((prev) => ({ ...prev, mediaType: value }))
                    }
                    value={newPost.mediaType}
                  >
                    <SelectTrigger id="mediaType">
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="IMAGE">Imagem</SelectItem>
                      <SelectItem value="VIDEO">Vídeo</SelectItem>
                      <SelectItem value="REELS">Reels</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Caption */}
                <div className="space-y-2">
                  <Label htmlFor="caption">Legenda *</Label>
                  <Textarea
                    id="caption"
                    onChange={(e) =>
                      setNewPost((prev) => ({
                        ...prev,
                        caption: e.target.value,
                      }))
                    }
                    placeholder="Escreva a legenda do seu post..."
                    rows={4}
                    value={newPost.caption}
                  />
                </div>

                {/* Date and Time */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Data *</Label>
                    <Popover
                      open={isCalendarOpen}
                      onOpenChange={setIsCalendarOpen}
                    >
                      <PopoverTrigger asChild>
                        <Button
                          className="w-full justify-between font-normal"
                          variant="outline"
                        >
                          {newPost.scheduledDate
                            ? format(newPost.scheduledDate, "dd/MM/yyyy", {
                                locale: ptBR,
                              })
                            : "Selecione a data"}
                          <ChevronDown className="ml-2 size-4 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent align="start" className="w-auto p-0">
                        <Calendar
                          disabled={(date) => date < new Date()}
                          mode="single"
                          onSelect={(date) => {
                            setNewPost((prev) => ({
                              ...prev,
                              scheduledDate: date,
                            }));
                            setIsCalendarOpen(false);
                          }}
                          selected={newPost.scheduledDate}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="scheduledTime">Horário *</Label>
                    <div className="relative">
                      <Clock className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        className="pl-9"
                        id="scheduledTime"
                        onChange={(e) =>
                          setNewPost((prev) => ({
                            ...prev,
                            scheduledTime: e.target.value,
                          }))
                        }
                        type="time"
                        value={newPost.scheduledTime}
                      />
                    </div>
                  </div>
                </div>

                {/* Preview */}
                {newPost.mediaUrl && (
                  <div className="space-y-2">
                    <Label>Preview</Label>
                    <div className="overflow-hidden rounded-lg border border-border">
                      {newPost.mediaType === "IMAGE" ? (
                        // biome-ignore lint/a11y/useAltText: Preview image
                        <img
                          alt="Preview"
                          className="h-32 w-full object-cover"
                          src={newPost.mediaUrl}
                        />
                      ) : (
                        <div className="flex h-32 w-full items-center justify-center bg-muted">
                          <ImageIcon className="size-8 text-muted-foreground" />
                          <span className="sr-only">Vídeo preview</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button
                  onClick={() => setIsCreateDialogOpen(false)}
                  variant="outline"
                >
                  Cancelar
                </Button>
                <Button disabled={isCreating} onClick={handleCreatePost}>
                  {isCreating ? (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  ) : (
                    <CalendarIcon className="mr-2 size-4" />
                  )}
                  Agendar Post
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      {/* Content */}
      <div className="mx-auto w-full max-w-6xl p-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="size-5" />
              Posts Agendados
            </CardTitle>
            <CardDescription>
              {pager.total > 0
                ? `${pager.total} post${pager.total > 1 ? "s" : ""} agendado${
                    pager.total > 1 ? "s" : ""
                  } a partir de agora`
                : "Nenhum post agendado para o futuro"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {posts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <CalendarIcon className="mb-4 size-12 text-muted-foreground" />
                <h3 className="font-medium text-lg">Nenhum post agendado</h3>
                <p className="mt-1 text-muted-foreground text-sm">
                  Clique em "Novo Post" para agendar sua primeira publicação.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[80px]">Mídia</TableHead>
                      <TableHead className="min-w-[200px]">Legenda</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Agendado para</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Container</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {posts.map((post) => (
                      <TableRow key={post.id}>
                        <TableCell>
                          <div className="size-12 overflow-hidden rounded-md border border-border bg-muted">
                            {post.mediaType === "IMAGE" ? (
                              // biome-ignore lint/a11y/useAltText: Thumbnail
                              <img
                                alt="Post thumbnail"
                                className="size-full object-cover"
                                src={post.mediaUrl}
                              />
                            ) : (
                              <div className="flex size-full items-center justify-center">
                                <ImageIcon className="size-5 text-muted-foreground" />
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <p className="line-clamp-2 text-sm">{post.caption}</p>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{post.mediaType}</Badge>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {formatDate(post.scheduledAt)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={cn(
                              "border",
                              STATUS_COLORS[post.status] ??
                                STATUS_COLORS.pending
                            )}
                            variant="outline"
                          >
                            {STATUS_LABELS[post.status] ?? post.status}
                          </Badge>
                          {post.lastErrorMessage && (
                            <p className="mt-1 line-clamp-1 text-destructive text-xs">
                              {post.lastErrorMessage}
                            </p>
                          )}
                        </TableCell>
                        <TableCell>
                          {post.mediaContainerStatus && (
                            <Badge variant="secondary">
                              {MEDIA_CONTAINER_STATUS_LABELS[
                                post.mediaContainerStatus
                              ] ?? post.mediaContainerStatus}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              disabled={
                                publishingPostId === post.id ||
                                post.status === "posted"
                              }
                              onClick={() => handlePublishNow(post.id)}
                              size="sm"
                              variant={
                                post.status === "posted" ? "ghost" : "default"
                              }
                            >
                              {publishingPostId === post.id ? (
                                <Loader2 className="mr-2 size-4 animate-spin" />
                              ) : (
                                <Play className="mr-2 size-4" />
                              )}
                              {getActionButtonText(post)}
                            </Button>
                            <Button
                              disabled={post.status === "posted"}
                              onClick={() => handleEditClick(post)}
                              size="sm"
                              variant="outline"
                            >
                              <Edit className="size-4" />
                            </Button>
                            <Button
                              disabled={post.status === "posted"}
                              onClick={() => handleDeleteClick(post.id)}
                              size="sm"
                              variant="outline"
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Pagination info */}
            {pager.total > pager.perPage && (
              <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
                <p className="text-muted-foreground text-sm">
                  Mostrando {posts.length} de {pager.total} posts
                </p>
                <div className="flex gap-2">
                  <Button
                    disabled={pager.page <= 1}
                    onClick={() =>
                      setPager((prev) => ({ ...prev, page: prev.page - 1 }))
                    }
                    size="sm"
                    variant="outline"
                  >
                    Anterior
                  </Button>
                  <Button
                    disabled={pager.page * pager.perPage >= pager.total}
                    onClick={() =>
                      setPager((prev) => ({ ...prev, page: prev.page + 1 }))
                    }
                    size="sm"
                    variant="outline"
                  >
                    Próximo
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar Post Agendado</DialogTitle>
            <DialogDescription>
              Atualize os campos abaixo para modificar o post agendado.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Media URL */}
            <div className="space-y-2">
              <Label htmlFor="editMediaUrl">URL da Mídia *</Label>
              <Input
                id="editMediaUrl"
                onChange={(e) =>
                  setEditPost((prev) => ({ ...prev, mediaUrl: e.target.value }))
                }
                placeholder="https://example.com/image.jpg"
                value={editPost.mediaUrl}
              />
              <p className="text-muted-foreground text-xs">
                URL pública da imagem ou vídeo a ser publicado
              </p>
            </div>

            {/* Media Type */}
            <div className="space-y-2">
              <Label htmlFor="editMediaType">Tipo de Mídia</Label>
              <Select
                onValueChange={(value: "IMAGE" | "VIDEO" | "REELS") =>
                  setEditPost((prev) => ({ ...prev, mediaType: value }))
                }
                value={editPost.mediaType}
              >
                <SelectTrigger id="editMediaType">
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="IMAGE">Imagem</SelectItem>
                  <SelectItem value="VIDEO">Vídeo</SelectItem>
                  <SelectItem value="REELS">Reels</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Caption */}
            <div className="space-y-2">
              <Label htmlFor="editCaption">Legenda *</Label>
              <Textarea
                id="editCaption"
                onChange={(e) =>
                  setEditPost((prev) => ({ ...prev, caption: e.target.value }))
                }
                placeholder="Escreva a legenda do seu post..."
                rows={4}
                value={editPost.caption}
              />
            </div>

            {/* Date and Time */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Data *</Label>
                <Popover
                  open={isEditCalendarOpen}
                  onOpenChange={setIsEditCalendarOpen}
                >
                  <PopoverTrigger asChild>
                    <Button
                      className="w-full justify-between font-normal"
                      variant="outline"
                    >
                      {editPost.scheduledDate
                        ? format(editPost.scheduledDate, "dd/MM/yyyy", {
                            locale: ptBR,
                          })
                        : "Selecione a data"}
                      <ChevronDown className="ml-2 size-4 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="w-auto p-0">
                    <Calendar
                      disabled={(date) => date < new Date()}
                      mode="single"
                      onSelect={(date) => {
                        setEditPost((prev) => ({
                          ...prev,
                          scheduledDate: date,
                        }));
                        setIsEditCalendarOpen(false);
                      }}
                      selected={editPost.scheduledDate}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label htmlFor="editScheduledTime">Horário *</Label>
                <div className="relative">
                  <Clock className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="pl-9"
                    id="editScheduledTime"
                    onChange={(e) =>
                      setEditPost((prev) => ({
                        ...prev,
                        scheduledTime: e.target.value,
                      }))
                    }
                    type="time"
                    value={editPost.scheduledTime}
                  />
                </div>
              </div>
            </div>

            {/* Preview */}
            {editPost.mediaUrl && (
              <div className="space-y-2">
                <Label>Preview</Label>
                <div className="overflow-hidden rounded-lg border border-border">
                  {editPost.mediaType === "IMAGE" ? (
                    // biome-ignore lint/a11y/useAltText: Preview image
                    <img
                      alt="Preview"
                      className="h-32 w-full object-cover"
                      src={editPost.mediaUrl}
                    />
                  ) : (
                    <div className="flex h-32 w-full items-center justify-center bg-muted">
                      <ImageIcon className="size-8 text-muted-foreground" />
                      <span className="sr-only">Vídeo preview</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              onClick={() => setIsEditDialogOpen(false)}
              variant="outline"
            >
              Cancelar
            </Button>
            <Button disabled={isEditing} onClick={handleUpdatePost}>
              {isEditing ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Edit className="mr-2 size-4" />
              )}
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Post Agendado?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O post agendado será excluído
              permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeletingPostId(null)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteConfirm}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
