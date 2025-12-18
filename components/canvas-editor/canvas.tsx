"use client";

import {
  type MouseEvent as ReactMouseEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import type { Layer, TextLayerData } from "@/lib/types";

type CanvasProps = {
  width: number;
  height: number;
  layers: Layer[];
  selectedLayerId: string | null;
  zoom: number;
  panOffset: { x: number; y: number };
  onSelectLayer: (id: string | null) => void;
  onUpdateLayer: (id: string, changes: Partial<Layer>) => void;
  onSetDragging: (isDragging: boolean) => void;
  onSetResizing: (isResizing: boolean) => void;
  onCenterLayer?: (id: string) => void;
  tool: "select" | "text" | "shape" | "pan";
};

type ResizeHandle = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w" | null;

const HANDLE_SIZE = 8;
const SELECTION_PADDING = 4;

export function Canvas({
  width,
  height,
  layers,
  selectedLayerId,
  zoom,
  panOffset,
  onSelectLayer,
  onUpdateLayer,
  onSetDragging,
  onSetResizing,
  onCenterLayer,
  tool,
}: CanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [imageCache, setImageCache] = useState<Map<string, HTMLImageElement>>(
    new Map()
  );
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(
    null
  );
  const [activeHandle, setActiveHandle] = useState<ResizeHandle>(null);
  const [initialLayerState, setInitialLayerState] = useState<Layer | null>(
    null
  );

  // =============================================
  // Image Loading & Caching
  // =============================================

  useEffect(() => {
    const imageLayers = layers.filter((l) => l.data.type === "image");
    const newCache = new Map(imageCache);
    let cacheUpdated = false;

    for (const layer of imageLayers) {
      if (layer.data.type !== "image") continue;
      const src = layer.data.src;

      if (!newCache.has(src)) {
        const img = new Image();
        img.src = src.startsWith("data:")
          ? src
          : `data:image/png;base64,${src}`;
        img.onload = () => {
          setImageCache((prev) => new Map(prev).set(src, img));
        };
        newCache.set(src, img);
        cacheUpdated = true;
      }
    }

    if (cacheUpdated) {
      setImageCache(newCache);
    }
  }, [layers]);

  // =============================================
  // Drawing Functions
  // =============================================

  const drawLayer = useCallback(
    (ctx: CanvasRenderingContext2D, layer: Layer) => {
      if (!layer.visible) return;

      ctx.save();
      ctx.globalAlpha = layer.opacity;

      // Apply transformations
      ctx.translate(layer.x + layer.width / 2, layer.y + layer.height / 2);
      ctx.rotate((layer.rotation * Math.PI) / 180);
      ctx.translate(-layer.width / 2, -layer.height / 2);

      switch (layer.data.type) {
        case "image": {
          const cachedImg = imageCache.get(layer.data.src);
          if (cachedImg?.complete && cachedImg.naturalWidth > 0) {
            if (layer.data.fit === "cover") {
              // Cover: scale to fill, may crop
              const scale = Math.max(
                layer.width / cachedImg.naturalWidth,
                layer.height / cachedImg.naturalHeight
              );
              const sw = layer.width / scale;
              const sh = layer.height / scale;
              const sx = (cachedImg.naturalWidth - sw) / 2;
              const sy = (cachedImg.naturalHeight - sh) / 2;
              ctx.drawImage(
                cachedImg,
                sx,
                sy,
                sw,
                sh,
                0,
                0,
                layer.width,
                layer.height
              );
            } else if (layer.data.fit === "contain") {
              // Contain: fit within bounds
              const scale = Math.min(
                layer.width / cachedImg.naturalWidth,
                layer.height / cachedImg.naturalHeight
              );
              const w = cachedImg.naturalWidth * scale;
              const h = cachedImg.naturalHeight * scale;
              const x = (layer.width - w) / 2;
              const y = (layer.height - h) / 2;
              ctx.drawImage(cachedImg, x, y, w, h);
            } else {
              // Fill or none: stretch to fit
              ctx.drawImage(cachedImg, 0, 0, layer.width, layer.height);
            }
          } else {
            // Placeholder while loading
            ctx.fillStyle = "#e5e7eb";
            ctx.fillRect(0, 0, layer.width, layer.height);
            ctx.fillStyle = "#9ca3af";
            ctx.font = "14px sans-serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText("Loading...", layer.width / 2, layer.height / 2);
          }
          break;
        }

        case "text": {
          const data = layer.data as TextLayerData;
          ctx.fillStyle = data.color;
          ctx.font = `${data.fontStyle} ${data.fontWeight} ${data.fontSize}px ${data.fontFamily}`;
          ctx.textAlign = data.textAlign;
          ctx.textBaseline = "top";

          const lines = data.text.split("\n");
          const lineHeight = data.fontSize * data.lineHeight;

          let textX = 0;
          if (data.textAlign === "center") textX = layer.width / 2;
          else if (data.textAlign === "right") textX = layer.width;

          lines.forEach((line, i) => {
            ctx.fillText(line, textX, i * lineHeight);
          });
          break;
        }

        case "shape": {
          const { shape, fill, stroke, strokeWidth, borderRadius } = layer.data;

          ctx.fillStyle = fill;
          ctx.strokeStyle = stroke;
          ctx.lineWidth = strokeWidth;

          if (shape === "rectangle") {
            if (borderRadius > 0) {
              const r = Math.min(
                borderRadius,
                layer.width / 2,
                layer.height / 2
              );
              ctx.beginPath();
              ctx.moveTo(r, 0);
              ctx.lineTo(layer.width - r, 0);
              ctx.quadraticCurveTo(layer.width, 0, layer.width, r);
              ctx.lineTo(layer.width, layer.height - r);
              ctx.quadraticCurveTo(
                layer.width,
                layer.height,
                layer.width - r,
                layer.height
              );
              ctx.lineTo(r, layer.height);
              ctx.quadraticCurveTo(0, layer.height, 0, layer.height - r);
              ctx.lineTo(0, r);
              ctx.quadraticCurveTo(0, 0, r, 0);
              ctx.closePath();
              if (fill !== "transparent") ctx.fill();
              if (stroke !== "transparent" && strokeWidth > 0) ctx.stroke();
            } else {
              if (fill !== "transparent")
                ctx.fillRect(0, 0, layer.width, layer.height);
              if (stroke !== "transparent" && strokeWidth > 0)
                ctx.strokeRect(0, 0, layer.width, layer.height);
            }
          } else if (shape === "circle" || shape === "ellipse") {
            ctx.beginPath();
            ctx.ellipse(
              layer.width / 2,
              layer.height / 2,
              layer.width / 2,
              layer.height / 2,
              0,
              0,
              Math.PI * 2
            );
            if (fill !== "transparent") ctx.fill();
            if (stroke !== "transparent" && strokeWidth > 0) ctx.stroke();
          } else if (shape === "line") {
            ctx.beginPath();
            ctx.moveTo(0, layer.height / 2);
            ctx.lineTo(layer.width, layer.height / 2);
            ctx.stroke();
          }
          break;
        }
      }

      ctx.restore();
    },
    [imageCache]
  );

  const drawSelectionHandles = useCallback(
    (ctx: CanvasRenderingContext2D, layer: Layer) => {
      const padding = SELECTION_PADDING / zoom;
      const handleSize = HANDLE_SIZE / zoom;

      ctx.save();
      ctx.translate(layer.x + layer.width / 2, layer.y + layer.height / 2);
      ctx.rotate((layer.rotation * Math.PI) / 180);
      ctx.translate(-layer.width / 2, -layer.height / 2);

      // Draw selection border
      ctx.strokeStyle = "#3b82f6";
      ctx.lineWidth = 2 / zoom;
      ctx.setLineDash([5 / zoom, 5 / zoom]);
      ctx.strokeRect(
        -padding,
        -padding,
        layer.width + padding * 2,
        layer.height + padding * 2
      );
      ctx.setLineDash([]);

      // Draw resize handles
      const handlePositions = [
        { x: -padding - handleSize / 2, y: -padding - handleSize / 2 }, // nw
        {
          x: layer.width / 2 - handleSize / 2,
          y: -padding - handleSize / 2,
        }, // n
        {
          x: layer.width + padding - handleSize / 2,
          y: -padding - handleSize / 2,
        }, // ne
        {
          x: layer.width + padding - handleSize / 2,
          y: layer.height / 2 - handleSize / 2,
        }, // e
        {
          x: layer.width + padding - handleSize / 2,
          y: layer.height + padding - handleSize / 2,
        }, // se
        {
          x: layer.width / 2 - handleSize / 2,
          y: layer.height + padding - handleSize / 2,
        }, // s
        {
          x: -padding - handleSize / 2,
          y: layer.height + padding - handleSize / 2,
        }, // sw
        { x: -padding - handleSize / 2, y: layer.height / 2 - handleSize / 2 }, // w
      ];

      ctx.fillStyle = "#ffffff";
      ctx.strokeStyle = "#3b82f6";
      ctx.lineWidth = 2 / zoom;

      for (const pos of handlePositions) {
        ctx.fillRect(pos.x, pos.y, handleSize, handleSize);
        ctx.strokeRect(pos.x, pos.y, handleSize, handleSize);
      }

      ctx.restore();
    },
    [zoom]
  );

  // =============================================
  // Main Render Loop
  // =============================================

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw checkerboard background (transparency indicator)
    const checkSize = 10;
    for (let y = 0; y < height; y += checkSize) {
      for (let x = 0; x < width; x += checkSize) {
        ctx.fillStyle =
          (Math.floor(x / checkSize) + Math.floor(y / checkSize)) % 2 === 0
            ? "#f3f4f6"
            : "#e5e7eb";
        ctx.fillRect(x, y, checkSize, checkSize);
      }
    }

    // Draw layers (bottom to top)
    for (const layer of layers) {
      drawLayer(ctx, layer);
    }

    // Draw selection handles for selected layer
    const selectedLayer = layers.find((l) => l.id === selectedLayerId);
    if (selectedLayer && tool === "select") {
      drawSelectionHandles(ctx, selectedLayer);
    }
  }, [
    layers,
    selectedLayerId,
    width,
    height,
    imageCache,
    zoom,
    tool,
    drawLayer,
    drawSelectionHandles,
  ]);

  // =============================================
  // Hit Testing
  // =============================================

  const getCanvasCoords = (e: ReactMouseEvent<HTMLDivElement>) => {
    const container = containerRef.current;
    if (!container) return { x: 0, y: 0 };

    const rect = container.getBoundingClientRect();
    const containerCenterX = rect.width / 2;
    const containerCenterY = rect.height / 2;

    // Calculate canvas position (centered in container with pan offset)
    const canvasLeft = containerCenterX - (width * zoom) / 2 + panOffset.x;
    const canvasTop = containerCenterY - (height * zoom) / 2 + panOffset.y;

    const x = (e.clientX - rect.left - canvasLeft) / zoom;
    const y = (e.clientY - rect.top - canvasTop) / zoom;

    return { x, y };
  };

  const findLayerAtPoint = (x: number, y: number): Layer | null => {
    // Check from top to bottom (reverse order)
    for (let i = layers.length - 1; i >= 0; i--) {
      const layer = layers[i];
      if (!layer?.visible || layer.locked) continue;

      // Simple bounding box check (doesn't account for rotation)
      if (
        x >= layer.x &&
        x <= layer.x + layer.width &&
        y >= layer.y &&
        y <= layer.y + layer.height
      ) {
        return layer;
      }
    }
    return null;
  };

  const getResizeHandle = (
    x: number,
    y: number,
    layer: Layer
  ): ResizeHandle => {
    const handleSize = HANDLE_SIZE / zoom;
    const padding = SELECTION_PADDING / zoom;

    const handles: { handle: ResizeHandle; x: number; y: number }[] = [
      { handle: "nw", x: layer.x - padding, y: layer.y - padding },
      {
        handle: "n",
        x: layer.x + layer.width / 2,
        y: layer.y - padding,
      },
      {
        handle: "ne",
        x: layer.x + layer.width + padding,
        y: layer.y - padding,
      },
      {
        handle: "e",
        x: layer.x + layer.width + padding,
        y: layer.y + layer.height / 2,
      },
      {
        handle: "se",
        x: layer.x + layer.width + padding,
        y: layer.y + layer.height + padding,
      },
      {
        handle: "s",
        x: layer.x + layer.width / 2,
        y: layer.y + layer.height + padding,
      },
      {
        handle: "sw",
        x: layer.x - padding,
        y: layer.y + layer.height + padding,
      },
      { handle: "w", x: layer.x - padding, y: layer.y + layer.height / 2 },
    ];

    for (const h of handles) {
      if (
        x >= h.x - handleSize / 2 &&
        x <= h.x + handleSize / 2 &&
        y >= h.y - handleSize / 2 &&
        y <= h.y + handleSize / 2
      ) {
        return h.handle;
      }
    }

    return null;
  };

  // =============================================
  // Mouse Handlers
  // =============================================

  const handleMouseDown = (e: ReactMouseEvent<HTMLDivElement>) => {
    if (tool !== "select") return;

    const { x, y } = getCanvasCoords(e);

    // Check if clicking on resize handle of selected layer
    const selectedLayer = layers.find((l) => l.id === selectedLayerId);
    if (selectedLayer) {
      const handle = getResizeHandle(x, y, selectedLayer);
      if (handle) {
        setActiveHandle(handle);
        setInitialLayerState(selectedLayer);
        setDragStart({ x, y });
        onSetResizing(true);
        return;
      }
    }

    // Check if clicking on a layer
    const clickedLayer = findLayerAtPoint(x, y);
    if (clickedLayer) {
      onSelectLayer(clickedLayer.id);
      setInitialLayerState(clickedLayer);
      setDragStart({ x, y });
      onSetDragging(true);
    } else {
      onSelectLayer(null);
    }
  };

  const handleMouseMove = (e: ReactMouseEvent<HTMLDivElement>) => {
    if (!dragStart || !initialLayerState) return;

    const { x, y } = getCanvasCoords(e);
    const dx = x - dragStart.x;
    const dy = y - dragStart.y;

    if (activeHandle) {
      // Resizing
      let newX = initialLayerState.x;
      let newY = initialLayerState.y;
      let newWidth = initialLayerState.width;
      let newHeight = initialLayerState.height;

      switch (activeHandle) {
        case "nw":
          newX = initialLayerState.x + dx;
          newY = initialLayerState.y + dy;
          newWidth = initialLayerState.width - dx;
          newHeight = initialLayerState.height - dy;
          break;
        case "n":
          newY = initialLayerState.y + dy;
          newHeight = initialLayerState.height - dy;
          break;
        case "ne":
          newY = initialLayerState.y + dy;
          newWidth = initialLayerState.width + dx;
          newHeight = initialLayerState.height - dy;
          break;
        case "e":
          newWidth = initialLayerState.width + dx;
          break;
        case "se":
          newWidth = initialLayerState.width + dx;
          newHeight = initialLayerState.height + dy;
          break;
        case "s":
          newHeight = initialLayerState.height + dy;
          break;
        case "sw":
          newX = initialLayerState.x + dx;
          newWidth = initialLayerState.width - dx;
          newHeight = initialLayerState.height + dy;
          break;
        case "w":
          newX = initialLayerState.x + dx;
          newWidth = initialLayerState.width - dx;
          break;
      }

      // Ensure minimum size
      if (newWidth >= 10 && newHeight >= 10) {
        onUpdateLayer(initialLayerState.id, {
          x: newX,
          y: newY,
          width: newWidth,
          height: newHeight,
        });
      }
    } else {
      // Dragging
      onUpdateLayer(initialLayerState.id, {
        x: initialLayerState.x + dx,
        y: initialLayerState.y + dy,
      });
    }
  };

  const handleMouseUp = () => {
    setDragStart(null);
    setActiveHandle(null);
    setInitialLayerState(null);
    onSetDragging(false);
    onSetResizing(false);
  };

  const handleDoubleClick = (e: ReactMouseEvent<HTMLDivElement>) => {
    if (tool !== "select") return;

    const { x, y } = getCanvasCoords(e);
    const clickedLayer = findLayerAtPoint(x, y);

    if (clickedLayer && onCenterLayer) {
      onCenterLayer(clickedLayer.id);
    }
  };

  // =============================================
  // Cursor
  // =============================================

  const getCursor = () => {
    if (tool === "pan") return "grab";
    if (activeHandle) {
      const cursors: Record<NonNullable<ResizeHandle>, string> = {
        nw: "nwse-resize",
        n: "ns-resize",
        ne: "nesw-resize",
        e: "ew-resize",
        se: "nwse-resize",
        s: "ns-resize",
        sw: "nesw-resize",
        w: "ew-resize",
      };
      return cursors[activeHandle];
    }
    return "default";
  };

  return (
    <div
      ref={containerRef}
      className="relative flex h-full w-full items-center justify-center overflow-hidden bg-zinc-900/50"
      onDoubleClick={handleDoubleClick}
      onMouseDown={handleMouseDown}
      onMouseLeave={handleMouseUp}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      style={{ cursor: getCursor() }}
    >
      <div
        className="shadow-2xl"
        style={{
          transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom})`,
          transformOrigin: "center center",
        }}
      >
        <canvas
          ref={canvasRef}
          height={height}
          width={width}
          style={{
            display: "block",
          }}
        />
      </div>
    </div>
  );
}
