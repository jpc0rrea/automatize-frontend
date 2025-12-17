"use client";

import {
  Download,
  ImagePlus,
  Minus,
  MousePointer2,
  Move,
  Plus,
  Redo2,
  RotateCcw,
  Save,
  Shapes,
  Type,
  Undo2,
} from "lucide-react";
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { EditorTool } from "@/hooks/use-canvas-editor";
import { DEFAULT_SHAPE_LAYER, DEFAULT_TEXT_LAYER, type Layer } from "@/lib/types";
import { cn } from "@/lib/utils";

type EditorToolbarProps = {
  tool: EditorTool;
  zoom: number;
  canUndo: boolean;
  canRedo: boolean;
  onSetTool: (tool: EditorTool) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onSave: () => void;
  onExport: () => void;
  onAddLayer: (template: Omit<Layer, "id" | "name">, name?: string) => void;
  onAddImage: (src: string) => void;
};

export function EditorToolbar({
  tool,
  zoom,
  canUndo,
  canRedo,
  onSetTool,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onUndo,
  onRedo,
  onSave,
  onExport,
  onAddLayer,
  onAddImage,
}: EditorToolbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      onAddImage(dataUrl);
    };
    reader.readAsDataURL(file);

    // Reset input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="flex h-12 items-center justify-between border-b border-border bg-background px-2">
      {/* Left section: Tools */}
      <div className="flex items-center gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              className={cn("size-9", tool === "select" && "bg-primary/10")}
              onClick={() => onSetTool("select")}
              size="icon"
              variant="ghost"
            >
              <MousePointer2 className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>Selecionar (V)</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              className={cn("size-9", tool === "pan" && "bg-primary/10")}
              onClick={() => onSetTool("pan")}
              size="icon"
              variant="ghost"
            >
              <Move className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>Mover canvas (H)</p>
          </TooltipContent>
        </Tooltip>

        <Separator className="mx-2 h-6" orientation="vertical" />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              className="size-9"
              onClick={() =>
                onAddLayer(DEFAULT_TEXT_LAYER, "Text Layer")
              }
              size="icon"
              variant="ghost"
            >
              <Type className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>Adicionar texto (T)</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              className="size-9"
              onClick={() =>
                onAddLayer(DEFAULT_SHAPE_LAYER, "Shape Layer")
              }
              size="icon"
              variant="ghost"
            >
              <Shapes className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>Adicionar forma (R)</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              className="size-9"
              onClick={() => fileInputRef.current?.click()}
              size="icon"
              variant="ghost"
            >
              <ImagePlus className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>Adicionar imagem (I)</p>
          </TooltipContent>
        </Tooltip>

        <input
          ref={fileInputRef}
          accept="image/*"
          className="hidden"
          onChange={handleFileSelect}
          type="file"
        />
      </div>

      {/* Center section: Zoom */}
      <div className="flex items-center gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              className="size-9"
              onClick={onZoomOut}
              size="icon"
              variant="ghost"
            >
              <Minus className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>Diminuir zoom (-)</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              className="min-w-[60px] text-xs"
              onClick={onResetZoom}
              variant="ghost"
            >
              {Math.round(zoom * 100)}%
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>Resetar zoom (0)</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              className="size-9"
              onClick={onZoomIn}
              size="icon"
              variant="ghost"
            >
              <Plus className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>Aumentar zoom (+)</p>
          </TooltipContent>
        </Tooltip>
      </div>

      {/* Right section: Actions */}
      <div className="flex items-center gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              className="size-9"
              disabled={!canUndo}
              onClick={onUndo}
              size="icon"
              variant="ghost"
            >
              <Undo2 className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>Desfazer (⌘Z)</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              className="size-9"
              disabled={!canRedo}
              onClick={onRedo}
              size="icon"
              variant="ghost"
            >
              <Redo2 className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>Refazer (⌘⇧Z)</p>
          </TooltipContent>
        </Tooltip>

        <Separator className="mx-2 h-6" orientation="vertical" />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              className="size-9"
              onClick={onSave}
              size="icon"
              variant="ghost"
            >
              <Save className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>Salvar (⌘S)</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              className="size-9"
              onClick={onExport}
              size="icon"
              variant="ghost"
            >
              <Download className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>Exportar imagem</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}

