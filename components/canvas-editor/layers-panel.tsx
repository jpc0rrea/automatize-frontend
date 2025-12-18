"use client";

import {
  ArrowDown,
  ArrowUp,
  Copy,
  Eye,
  EyeOff,
  ImageIcon,
  Lock,
  MoreHorizontal,
  Shapes,
  Trash2,
  Type,
  Unlock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Layer } from "@/lib/types";
import { cn } from "@/lib/utils";

type LayersPanelProps = {
  layers: Layer[];
  selectedLayerId: string | null;
  onSelectLayer: (id: string | null) => void;
  onUpdateLayer: (id: string, changes: Partial<Layer>) => void;
  onDeleteLayer: (id: string) => void;
  onDuplicateLayer: (id: string) => void;
  onMoveLayerUp: (id: string) => void;
  onMoveLayerDown: (id: string) => void;
};

const LAYER_TYPE_ICONS = {
  image: ImageIcon,
  text: Type,
  shape: Shapes,
};

export function LayersPanel({
  layers,
  selectedLayerId,
  onSelectLayer,
  onUpdateLayer,
  onDeleteLayer,
  onDuplicateLayer,
  onMoveLayerUp,
  onMoveLayerDown,
}: LayersPanelProps) {
  const toggleVisibility = (id: string, visible: boolean) => {
    onUpdateLayer(id, { visible: !visible });
  };

  const toggleLock = (id: string, locked: boolean) => {
    onUpdateLayer(id, { locked: !locked });
  };

  // Render layers in reverse order (top layer first in the list)
  const reversedLayers = [...layers].reverse();

  return (
    <div className="flex h-full flex-col border-l border-border bg-background">
      <div className="flex items-center justify-between border-b border-border p-3">
        <h3 className="font-medium text-sm">Camadas</h3>
        <span className="text-muted-foreground text-xs">
          {layers.length} {layers.length === 1 ? "camada" : "camadas"}
        </span>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2">
          {reversedLayers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="mb-2 rounded-full bg-muted p-3">
                <ImageIcon className="size-5 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground text-sm">
                Nenhuma camada
              </p>
              <p className="text-muted-foreground/70 text-xs">
                Adicione elementos ao canvas
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {reversedLayers.map((layer, index) => {
                const Icon = LAYER_TYPE_ICONS[layer.data.type];
                const isSelected = layer.id === selectedLayerId;
                const actualIndex = layers.length - 1 - index;

                return (
                  <div
                    key={layer.id}
                    className={cn(
                      "group flex items-center gap-2 rounded-md p-2 transition-colors cursor-pointer",
                      isSelected
                        ? "bg-primary/10 border border-primary/20"
                        : "hover:bg-muted border border-transparent",
                      !layer.visible && "opacity-50"
                    )}
                    onClick={() => onSelectLayer(layer.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        onSelectLayer(layer.id);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                  >
                    {/* Layer icon */}
                    <div
                      className={cn(
                        "flex size-8 shrink-0 items-center justify-center rounded",
                        layer.data.type === "image" && "bg-purple-500/10",
                        layer.data.type === "text" && "bg-blue-500/10",
                        layer.data.type === "shape" && "bg-orange-500/10"
                      )}
                    >
                      <Icon
                        className={cn(
                          "size-4",
                          layer.data.type === "image" && "text-purple-500",
                          layer.data.type === "text" && "text-blue-500",
                          layer.data.type === "shape" && "text-orange-500"
                        )}
                      />
                    </div>

                    {/* Layer name */}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {layer.name}
                      </p>
                      <p className="truncate text-muted-foreground text-xs">
                        {layer.data.type === "text"
                          ? (layer.data.text?.slice(0, 20) ?? "Empty") +
                            (layer.data.text?.length > 20 ? "..." : "")
                          : layer.data.type === "shape"
                            ? layer.data.shape
                            : "Image"}
                      </p>
                    </div>

                    {/* Quick actions */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        className="size-7"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleVisibility(layer.id, layer.visible);
                        }}
                        size="icon"
                        variant="ghost"
                      >
                        {layer.visible ? (
                          <Eye className="size-3.5" />
                        ) : (
                          <EyeOff className="size-3.5" />
                        )}
                      </Button>
                      <Button
                        className="size-7"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleLock(layer.id, layer.locked);
                        }}
                        size="icon"
                        variant="ghost"
                      >
                        {layer.locked ? (
                          <Lock className="size-3.5" />
                        ) : (
                          <Unlock className="size-3.5" />
                        )}
                      </Button>
                    </div>

                    {/* More actions dropdown */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          className="size-7 opacity-0 group-hover:opacity-100"
                          onClick={(e) => e.stopPropagation()}
                          size="icon"
                          variant="ghost"
                        >
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          disabled={actualIndex === layers.length - 1}
                          onClick={() => onMoveLayerUp(layer.id)}
                        >
                          <ArrowUp className="mr-2 size-4" />
                          Mover para cima
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          disabled={actualIndex === 0}
                          onClick={() => onMoveLayerDown(layer.id)}
                        >
                          <ArrowDown className="mr-2 size-4" />
                          Mover para baixo
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => onDuplicateLayer(layer.id)}
                        >
                          <Copy className="mr-2 size-4" />
                          Duplicar
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => onDeleteLayer(layer.id)}
                        >
                          <Trash2 className="mr-2 size-4" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

