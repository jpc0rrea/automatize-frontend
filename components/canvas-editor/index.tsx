"use client";

import { ArrowLeft, Loader2, Sparkles } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { SidebarToggle } from "@/components/sidebar-toggle";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { useCanvasEditor } from "@/hooks/use-canvas-editor";
import { AIGenerationPanel } from "./ai-generation-panel";
import { Canvas } from "./canvas";
import { EditorToolbar } from "./editor-toolbar";
import { LayersPanel } from "./layers-panel";
import { PropertiesPanel } from "./properties-panel";

type CanvasEditorProps = {
  postId: string;
};

export function CanvasEditor({ postId }: CanvasEditorProps) {
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState("");

  const {
    post,
    layers,
    selectedLayer,
    selectedLayerId,
    tool,
    zoom,
    panOffset,
    isLoading,
    error,
    canUndo,
    canRedo,
    undo,
    redo,
    addLayer,
    updateLayer,
    updateLayerData,
    deleteLayer,
    duplicateLayer,
    moveLayerUp,
    moveLayerDown,
    centerLayer,
    selectLayer,
    setTool,
    zoomIn,
    zoomOut,
    resetZoom,
    setDragging,
    setResizing,
    saveNow,
    updatePostMetadata,
    exportAndSaveRenderedImage,
  } = useCanvasEditor(postId);

  // =============================================
  // Keyboard Shortcuts
  // =============================================

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      // Undo/Redo
      if ((e.metaKey || e.ctrlKey) && e.key === "z") {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
        return;
      }

      // Save
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        saveNow();
        return;
      }

      // Delete selected layer
      if ((e.key === "Delete" || e.key === "Backspace") && selectedLayerId) {
        e.preventDefault();
        deleteLayer(selectedLayerId);
        return;
      }

      // Duplicate selected layer
      if ((e.metaKey || e.ctrlKey) && e.key === "d" && selectedLayerId) {
        e.preventDefault();
        duplicateLayer(selectedLayerId);
        return;
      }

      // Copy image to clipboard
      if ((e.metaKey || e.ctrlKey) && e.key === "c" && selectedLayer) {
        if (selectedLayer.data.type === "image") {
          e.preventDefault();
          const imgSrc = selectedLayer.data.src;

          // Create an image element and copy to clipboard
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.onload = async () => {
            try {
              const canvas = document.createElement("canvas");
              canvas.width = img.naturalWidth;
              canvas.height = img.naturalHeight;
              const ctx = canvas.getContext("2d");
              if (ctx) {
                ctx.drawImage(img, 0, 0);
                canvas.toBlob(async (blob) => {
                  if (blob) {
                    await navigator.clipboard.write([
                      new ClipboardItem({ "image/png": blob }),
                    ]);
                    toast.success(
                      "Imagem copiada para a área de transferência"
                    );
                  }
                }, "image/png");
              }
            } catch (error) {
              console.error("Error copying image:", error);
              toast.error("Erro ao copiar imagem");
            }
          };
          img.src = imgSrc.startsWith("data:")
            ? imgSrc
            : `data:image/png;base64,${imgSrc}`;
        }
        return;
      }

      // Tool shortcuts
      switch (e.key.toLowerCase()) {
        case "v":
          setTool("select");
          break;
        case "h":
          setTool("pan");
          break;
        case "t":
          addLayer(
            {
              visible: true,
              locked: false,
              x: 100,
              y: 100,
              width: 400,
              height: 100,
              rotation: 0,
              opacity: 1,
              data: {
                type: "text",
                text: "New Text",
                fontFamily: "Inter",
                fontSize: 48,
                fontWeight: 400,
                fontStyle: "normal",
                color: "#ffffff",
                textAlign: "center",
                lineHeight: 1.2,
                letterSpacing: 0,
                textDecoration: "none",
              },
            },
            "Text Layer"
          );
          break;
        case "r":
          addLayer(
            {
              visible: true,
              locked: false,
              x: 100,
              y: 100,
              width: 200,
              height: 200,
              rotation: 0,
              opacity: 1,
              data: {
                type: "shape",
                shape: "rectangle",
                fill: "#3b82f6",
                stroke: "transparent",
                strokeWidth: 0,
                borderRadius: 0,
              },
            },
            "Shape Layer"
          );
          break;
        case "escape":
          selectLayer(null);
          break;
        case "=":
        case "+":
          if (e.metaKey || e.ctrlKey) {
            e.preventDefault();
            zoomIn();
          }
          break;
        case "-":
          if (e.metaKey || e.ctrlKey) {
            e.preventDefault();
            zoomOut();
          }
          break;
        case "0":
          if (e.metaKey || e.ctrlKey) {
            e.preventDefault();
            resetZoom();
          }
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    undo,
    redo,
    saveNow,
    selectedLayerId,
    selectedLayer,
    deleteLayer,
    duplicateLayer,
    setTool,
    addLayer,
    selectLayer,
    zoomIn,
    zoomOut,
    resetZoom,
  ]);

  // =============================================
  // Export Handler
  // =============================================

  const handleExport = useCallback(async () => {
    // Get the canvas element and export
    const canvas = document.querySelector("canvas");
    if (!canvas) {
      toast.error("Canvas não encontrado");
      return;
    }

    try {
      await exportAndSaveRenderedImage(canvas);
    } catch (error) {
      console.error("Export error:", error);
    }
  }, [exportAndSaveRenderedImage]);

  // =============================================
  // Add Image Handler
  // =============================================

  const handleAddImage = useCallback(
    (src: string) => {
      // Create a temporary image to get dimensions
      const img = new Image();
      img.onload = () => {
        // Scale to fit within canvas while maintaining aspect ratio
        const maxWidth = (post?.width ?? 1080) * 0.8;
        const maxHeight = (post?.height ?? 1080) * 0.8;
        const scale = Math.min(
          maxWidth / img.naturalWidth,
          maxHeight / img.naturalHeight,
          1
        );

        const width = img.naturalWidth * scale;
        const height = img.naturalHeight * scale;
        const x = ((post?.width ?? 1080) - width) / 2;
        const y = ((post?.height ?? 1080) - height) / 2;

        addLayer(
          {
            visible: true,
            locked: false,
            x,
            y,
            width,
            height,
            rotation: 0,
            opacity: 1,
            data: {
              type: "image",
              src,
              fit: "fill",
            },
          },
          "Image Layer"
        );
      };
      img.src = src;
    },
    [post?.width, post?.height, addLayer]
  );

  // =============================================
  // Title Editing
  // =============================================

  const handleTitleClick = () => {
    setEditedTitle(post?.title ?? "");
    setIsEditingTitle(true);
  };

  const handleTitleSave = async () => {
    if (editedTitle.trim() !== post?.title) {
      try {
        await updatePostMetadata({ title: editedTitle.trim() });
      } catch (error) {
        // Error toast handled in hook
      }
    }
    setIsEditingTitle(false);
  };

  // =============================================
  // AI Panel Handlers (must be before conditional returns)
  // =============================================

  // Handle AI-generated image
  const handleImageGenerated = useCallback(
    (imageUrl: string, width: number, height: number) => {
      addLayer(
        {
          visible: true,
          locked: false,
          x: 0,
          y: 0,
          width,
          height,
          rotation: 0,
          opacity: 1,
          data: {
            type: "image",
            src: imageUrl,
            fit: "fill",
          },
        },
        "AI Generated Background"
      );
    },
    [addLayer]
  );

  // Handle canvas size change from AI panel
  const handleCanvasSizeChange = useCallback(
    async (width: number, height: number) => {
      if (post && (post.width !== width || post.height !== height)) {
        await updatePostMetadata({ width, height });
      }
    },
    [post, updatePostMetadata]
  );

  // =============================================
  // Loading & Error States
  // =============================================

  if (isLoading) {
    return (
      <div className="flex h-dvh items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="flex h-dvh flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Post não encontrado</p>
        <Link href="/">
          <Button variant="outline">
            <ArrowLeft className="mr-2 size-4" />
            Voltar para posts
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex h-dvh flex-col">
      {/* Header */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-background px-4">
        <div className="flex items-center gap-3">
          <SidebarToggle />
          <Link href="/">
            <Button size="icon" variant="ghost">
              <ArrowLeft className="size-5" />
            </Button>
          </Link>

          {isEditingTitle ? (
            <Input
              autoFocus
              className="h-8 w-64"
              onBlur={handleTitleSave}
              onChange={(e) => setEditedTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleTitleSave();
                if (e.key === "Escape") setIsEditingTitle(false);
              }}
              value={editedTitle}
            />
          ) : (
            <button
              className="font-semibold text-lg hover:text-primary transition-colors"
              onClick={handleTitleClick}
              type="button"
            >
              {post.title ?? "Sem título"}
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => setShowAIPanel(!showAIPanel)}
            size="sm"
            variant={showAIPanel ? "default" : "outline"}
          >
            <Sparkles className="mr-2 size-4" />
            AI Generator
          </Button>
        </div>
      </header>

      {/* Toolbar */}
      <EditorToolbar
        canRedo={canRedo}
        canUndo={canUndo}
        onAddImage={handleAddImage}
        onAddLayer={addLayer}
        onExport={handleExport}
        onRedo={redo}
        onResetZoom={resetZoom}
        onSave={saveNow}
        onSetTool={setTool}
        onUndo={undo}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        tool={tool}
        zoom={zoom}
      />

      {/* Main content */}
      <div className="flex-1 overflow-hidden">
        <ResizablePanelGroup direction="horizontal">
          {/* Layers Panel */}
          <ResizablePanel
            className="min-w-[200px]"
            defaultSize={15}
            maxSize={25}
            minSize={10}
          >
            <LayersPanel
              layers={layers}
              onDeleteLayer={deleteLayer}
              onDuplicateLayer={duplicateLayer}
              onMoveLayerDown={moveLayerDown}
              onMoveLayerUp={moveLayerUp}
              onSelectLayer={selectLayer}
              onUpdateLayer={updateLayer}
              selectedLayerId={selectedLayerId}
            />
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Canvas */}
          <ResizablePanel defaultSize={70}>
            <Canvas
              height={post.height}
              layers={layers}
              onCenterLayer={centerLayer}
              onSelectLayer={selectLayer}
              onSetDragging={setDragging}
              onSetResizing={setResizing}
              onUpdateLayer={updateLayer}
              panOffset={panOffset}
              selectedLayerId={selectedLayerId}
              tool={tool}
              width={post.width}
              zoom={zoom}
            />
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Properties Panel */}
          <ResizablePanel
            className="min-w-[200px]"
            defaultSize={15}
            maxSize={25}
            minSize={10}
          >
            <PropertiesPanel
              canvasHeight={post.height}
              canvasWidth={post.width}
              layer={selectedLayer ?? null}
              onAddLayer={addLayer}
              onUpdateLayer={updateLayer}
              onUpdateLayerData={updateLayerData}
              postId={postId}
            />
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      {/* AI Generation Dialog */}
      <Dialog open={showAIPanel} onOpenChange={setShowAIPanel}>
        <DialogContent className="max-w-2xl max-h-[90vh] p-0 gap-0 overflow-hidden flex flex-col">
          <DialogHeader className="sr-only">
            <DialogTitle>Gerar Imagem com AI</DialogTitle>
            <DialogDescription>
              Use AI para gerar imagens para seu post
            </DialogDescription>
          </DialogHeader>
          <AIGenerationPanel
            currentHeight={post.height}
            currentWidth={post.width}
            onCanvasSizeChange={handleCanvasSizeChange}
            onImageGenerated={(imageUrl, width, height) => {
              handleImageGenerated(imageUrl, width, height);
              setShowAIPanel(false);
            }}
            postId={postId}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
