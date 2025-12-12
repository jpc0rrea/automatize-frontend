"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Instagram, Loader2, Play } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import type { InstagramSelectedMedia, InstagramMediaType } from "./types";

const MAX_SELECTIONS = 15;

type InstagramMediaItem = {
  id: string;
  media_url: string;
  caption?: string;
  media_type: InstagramMediaType;
  thumbnail_url?: string;
};

type InstagramMediaPickerProps = {
  selectedMedia: InstagramSelectedMedia[];
  onSelectionChange: (media: InstagramSelectedMedia[]) => void;
};

export function InstagramMediaPicker({
  selectedMedia,
  onSelectionChange,
}: InstagramMediaPickerProps) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [media, setMedia] = useState<InstagramMediaItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | undefined>(undefined);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [tempSelected, setTempSelected] = useState<InstagramSelectedMedia[]>(
    []
  );

  const fetchMedia = useCallback(async (cursor?: string) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ limit: "20" });
      if (cursor) {
        params.set("after", cursor);
      }

      const response = await fetch(
        `/api/meta-business/instagram/media?${params.toString()}`
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error ?? "Failed to fetch media");
      }

      const data = await response.json();

      if (cursor) {
        setMedia((prev) => [...prev, ...data.media]);
      } else {
        setMedia(data.media);
      }

      setNextCursor(data.pagination.nextCursor);
      setHasNextPage(data.pagination.hasNextPage);
    } catch (error) {
      console.error("Error fetching Instagram media:", error);
      toast.error("Erro ao carregar mídias do Instagram");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch media when dialog opens
  useEffect(() => {
    if (open && media.length === 0) {
      fetchMedia();
    }
  }, [open, media.length, fetchMedia]);

  // Sync temp selection with actual selection when opening
  useEffect(() => {
    if (open) {
      setTempSelected(selectedMedia);
    }
  }, [open, selectedMedia]);

  const handleLoadMore = () => {
    if (nextCursor) {
      fetchMedia(nextCursor);
    }
  };

  const handleToggleSelection = (item: InstagramMediaItem) => {
    const isSelected = tempSelected.some((m) => m.id === item.id);

    if (isSelected) {
      setTempSelected((prev) => prev.filter((m) => m.id !== item.id));
    } else {
      if (tempSelected.length >= MAX_SELECTIONS) {
        toast.error(`Você pode selecionar no máximo ${MAX_SELECTIONS} fotos`);
        return;
      }

      const newMedia: InstagramSelectedMedia = {
        id: item.id,
        mediaUrl: item.media_url,
        thumbnailUrl: item.thumbnail_url,
        caption: item.caption,
        mediaType: item.media_type,
      };

      setTempSelected((prev) => [...prev, newMedia]);
    }
  };

  const handleConfirm = () => {
    onSelectionChange(tempSelected);
    setOpen(false);
  };

  const handleCancel = () => {
    setTempSelected(selectedMedia);
    setOpen(false);
  };

  const content = (
    <div className="flex flex-col gap-4">
      <div className="text-muted-foreground text-sm">
        Selecione até {MAX_SELECTIONS} fotos ou vídeos do seu Instagram.
        <span className="ml-2 font-medium text-primary">
          {tempSelected.length}/{MAX_SELECTIONS} selecionadas
        </span>
      </div>

      {isLoading && media.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      ) : media.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
          <Instagram className="size-12" />
          <p>Nenhuma mídia encontrada</p>
        </div>
      ) : (
        <ScrollArea className="h-[400px] md:h-[500px]">
          <div className="grid grid-cols-3 gap-2 pr-4 md:grid-cols-4">
            {media.map((item) => {
              const isSelected = tempSelected.some((m) => m.id === item.id);
              const isVideo = item.media_type === "VIDEO";
              const displayUrl =
                isVideo && item.thumbnail_url
                  ? item.thumbnail_url
                  : item.media_url;

              return (
                <button
                  className={cn(
                    "group relative aspect-square overflow-hidden rounded-lg border-2 transition-all",
                    isSelected
                      ? "border-primary ring-2 ring-primary/30"
                      : "border-transparent hover:border-muted-foreground/30"
                  )}
                  key={item.id}
                  onClick={() => handleToggleSelection(item)}
                  type="button"
                >
                  <img
                    alt={item.caption ?? "Instagram media"}
                    className="size-full object-cover"
                    src={displayUrl}
                  />

                  {/* Video indicator */}
                  {isVideo && (
                    <div className="absolute top-2 left-2 rounded-full bg-black/60 p-1">
                      <Play className="size-3 fill-white text-white" />
                    </div>
                  )}

                  {/* Selection indicator */}
                  {isSelected && (
                    <div className="absolute right-2 bottom-2 flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <Check className="size-4" />
                    </div>
                  )}

                  {/* Hover overlay */}
                  <div
                    className={cn(
                      "absolute inset-0 bg-black/20 opacity-0 transition-opacity",
                      !isSelected && "group-hover:opacity-100"
                    )}
                  />
                </button>
              );
            })}
          </div>

          {/* Load More Button */}
          {hasNextPage && (
            <div className="flex justify-center py-4">
              <Button
                disabled={isLoading}
                onClick={handleLoadMore}
                size="sm"
                variant="outline"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Carregando...
                  </>
                ) : (
                  "Carregar mais"
                )}
              </Button>
            </div>
          )}
        </ScrollArea>
      )}
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerTrigger asChild>
          <Button type="button" variant="outline">
            <Instagram className="mr-2 size-4 text-xs md:text-sm" />
            <span className="text-xs md:text-sm">Selecionar do Instagram</span>
          </Button>
        </DrawerTrigger>
        <DrawerContent className="max-h-[90vh]">
          <DrawerHeader className="text-left">
            <DrawerTitle>Selecionar Fotos do Instagram</DrawerTitle>
            <DrawerDescription>
              Escolha fotos do seu perfil para usar como referência
            </DrawerDescription>
          </DrawerHeader>
          <div className="px-4">{content}</div>
          <DrawerFooter className="pt-2">
            <Button onClick={handleConfirm} type="button">
              Confirmar Seleção ({tempSelected.length})
            </Button>
            <DrawerClose asChild>
              <Button onClick={handleCancel} type="button" variant="outline">
                Cancelar
              </Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline">
          <Instagram className="mr-2 size-4" />
          Selecionar do Instagram
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Selecionar Fotos do Instagram</DialogTitle>
          <DialogDescription>
            Escolha fotos do seu perfil para usar como referência
          </DialogDescription>
        </DialogHeader>
        {content}
        <DialogFooter>
          <Button onClick={handleCancel} type="button" variant="outline">
            Cancelar
          </Button>
          <Button onClick={handleConfirm} type="button">
            Confirmar Seleção ({tempSelected.length})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
