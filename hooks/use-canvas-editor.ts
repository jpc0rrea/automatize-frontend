"use client";

import { useCallback, useEffect, useReducer, useRef } from "react";
import { toast } from "sonner";
import useSWR from "swr";
import type { Post } from "@/lib/db/schema";
import type {
  DEFAULT_SHAPE_LAYER,
  DEFAULT_TEXT_LAYER,
  ImageLayerData,
  Layer,
  LayerData,
  ShapeLayerData,
  TextLayerData,
} from "@/lib/types";
import { fetcher, generateUUID } from "@/lib/utils";

// =============================================
// Types
// =============================================

export type EditorTool = "select" | "text" | "shape" | "pan";

export type EditorState = {
  selectedLayerId: string | null;
  tool: EditorTool;
  zoom: number;
  panOffset: { x: number; y: number };
  isDragging: boolean;
  isResizing: boolean;
  history: Layer[][];
  historyIndex: number;
};

type EditorAction =
  | { type: "SELECT_LAYER"; id: string | null }
  | { type: "SET_TOOL"; tool: EditorTool }
  | { type: "SET_ZOOM"; zoom: number }
  | { type: "SET_PAN_OFFSET"; offset: { x: number; y: number } }
  | { type: "SET_DRAGGING"; isDragging: boolean }
  | { type: "SET_RESIZING"; isResizing: boolean }
  | { type: "PUSH_HISTORY"; layers: Layer[] }
  | { type: "UNDO" }
  | { type: "REDO" }
  | { type: "RESET_HISTORY"; layers: Layer[] };

// =============================================
// Constants
// =============================================

const MAX_HISTORY_SIZE = 50;
const ZOOM_STORAGE_KEY = "canvas-editor-zoom";

function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case "SELECT_LAYER":
      return { ...state, selectedLayerId: action.id };

    case "SET_TOOL":
      return {
        ...state,
        tool: action.tool,
        selectedLayerId: action.tool !== "select" ? null : state.selectedLayerId,
      };

    case "SET_ZOOM":
      return { ...state, zoom: Math.max(0.1, Math.min(3, action.zoom)) };

    case "SET_PAN_OFFSET":
      return { ...state, panOffset: action.offset };

    case "SET_DRAGGING":
      return { ...state, isDragging: action.isDragging };

    case "SET_RESIZING":
      return { ...state, isResizing: action.isResizing };

    case "PUSH_HISTORY": {
      const newHistory = state.history.slice(0, state.historyIndex + 1);
      newHistory.push(action.layers);
      // Keep only last MAX_HISTORY_SIZE entries
      const trimmedHistory = newHistory.slice(-MAX_HISTORY_SIZE);
      return {
        ...state,
        history: trimmedHistory,
        historyIndex: trimmedHistory.length - 1,
      };
    }

    case "UNDO":
      if (state.historyIndex > 0) {
        return { ...state, historyIndex: state.historyIndex - 1 };
      }
      return state;

    case "REDO":
      if (state.historyIndex < state.history.length - 1) {
        return { ...state, historyIndex: state.historyIndex + 1 };
      }
      return state;

    case "RESET_HISTORY":
      return {
        ...state,
        history: [action.layers],
        historyIndex: 0,
      };

    default:
      return state;
  }
}

const initialState: EditorState = {
  selectedLayerId: null,
  tool: "select",
  zoom: 1,
  panOffset: { x: 0, y: 0 },
  isDragging: false,
  isResizing: false,
  history: [[]],
  historyIndex: 0,
};

const getInitialState = (baseInitialState: EditorState): EditorState => {
  if (typeof window === "undefined") return baseInitialState;

  const savedZoom = localStorage.getItem(ZOOM_STORAGE_KEY);
  if (savedZoom) {
    const parsedZoom = parseFloat(savedZoom);
    if (!isNaN(parsedZoom)) {
      return { ...baseInitialState, zoom: parsedZoom };
    }
  }
  return baseInitialState;
};

// =============================================
// Hook
// =============================================

// =============================================
// Thumbnail Generation Utilities
// =============================================

/**
 * Loads an image from a source (base64 or URL) and returns a Promise
 */
const loadImage = (src: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src.startsWith("data:") ? src : `data:image/png;base64,${src}`;
  });
};

/**
 * Renders a layer to a canvas context (without UI elements like selection handles)
 */
const drawLayerToContext = async (
  ctx: CanvasRenderingContext2D,
  layer: Layer,
  imageCache: Map<string, HTMLImageElement>
): Promise<void> => {
  if (!layer.visible) return;

  ctx.save();
  ctx.globalAlpha = layer.opacity;

  // Apply transformations
  ctx.translate(layer.x + layer.width / 2, layer.y + layer.height / 2);
  ctx.rotate((layer.rotation * Math.PI) / 180);
  ctx.translate(-layer.width / 2, -layer.height / 2);

  switch (layer.data.type) {
    case "image": {
      const imageData = layer.data as ImageLayerData;
      let img = imageCache.get(imageData.src);

      if (!img) {
        try {
          img = await loadImage(imageData.src);
          imageCache.set(imageData.src, img);
        } catch {
          // Placeholder for failed image load
          ctx.fillStyle = "#e5e7eb";
          ctx.fillRect(0, 0, layer.width, layer.height);
          ctx.restore();
          return;
        }
      }

      if (img.complete && img.naturalWidth > 0) {
        if (imageData.fit === "cover") {
          const scale = Math.max(
            layer.width / img.naturalWidth,
            layer.height / img.naturalHeight
          );
          const sw = layer.width / scale;
          const sh = layer.height / scale;
          const sx = (img.naturalWidth - sw) / 2;
          const sy = (img.naturalHeight - sh) / 2;
          ctx.drawImage(img, sx, sy, sw, sh, 0, 0, layer.width, layer.height);
        } else if (imageData.fit === "contain") {
          const scale = Math.min(
            layer.width / img.naturalWidth,
            layer.height / img.naturalHeight
          );
          const w = img.naturalWidth * scale;
          const h = img.naturalHeight * scale;
          const x = (layer.width - w) / 2;
          const y = (layer.height - h) / 2;
          ctx.drawImage(img, x, y, w, h);
        } else {
          ctx.drawImage(img, 0, 0, layer.width, layer.height);
        }
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

      for (let i = 0; i < lines.length; i++) {
        ctx.fillText(lines[i], textX, i * lineHeight);
      }
      break;
    }

    case "shape": {
      const shapeData = layer.data as ShapeLayerData;
      const { shape, fill, stroke, strokeWidth, borderRadius } = shapeData;

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
};

/**
 * Generates a thumbnail from layers by rendering to an offscreen canvas
 * and scaling down to maxSize (default 300px)
 */
const generateThumbnail = async (
  layers: Layer[],
  width: number,
  height: number,
  maxSize = 800
): Promise<string> => {
  // Create offscreen canvas for full-size rendering
  const fullCanvas = document.createElement("canvas");
  fullCanvas.width = width;
  fullCanvas.height = height;
  const fullCtx = fullCanvas.getContext("2d");

  if (!fullCtx) {
    throw new Error("Failed to get canvas context");
  }

  // Draw checkerboard background (transparency indicator)
  const checkSize = 10;
  for (let y = 0; y < height; y += checkSize) {
    for (let x = 0; x < width; x += checkSize) {
      fullCtx.fillStyle =
        (Math.floor(x / checkSize) + Math.floor(y / checkSize)) % 2 === 0
          ? "#f3f4f6"
          : "#e5e7eb";
      fullCtx.fillRect(x, y, checkSize, checkSize);
    }
  }

  // Load images and cache them
  const imageCache = new Map<string, HTMLImageElement>();
  const imageLayers = layers.filter((l) => l.data.type === "image");

  // Preload all images
  const imagePromises = imageLayers.map(async (layer) => {
    if (layer.data.type === "image") {
      const src = layer.data.src;
      if (!imageCache.has(src)) {
        try {
          const img = await loadImage(src);
          imageCache.set(src, img);
        } catch {
          // Image failed to load, will show placeholder in drawLayerToContext
        }
      }
    }
  });

  await Promise.all(imagePromises);

  // Draw all layers
  for (const layer of layers) {
    await drawLayerToContext(fullCtx, layer, imageCache);
  }

  // Calculate thumbnail dimensions maintaining aspect ratio
  const aspectRatio = width / height;
  let thumbWidth = maxSize;
  let thumbHeight = maxSize;

  if (aspectRatio > 1) {
    thumbHeight = maxSize / aspectRatio;
  } else {
    thumbWidth = maxSize * aspectRatio;
  }

  // Create thumbnail canvas
  const thumbCanvas = document.createElement("canvas");
  thumbCanvas.width = thumbWidth;
  thumbCanvas.height = thumbHeight;
  const thumbCtx = thumbCanvas.getContext("2d");

  if (!thumbCtx) {
    throw new Error("Failed to get thumbnail canvas context");
  }

  // Use high quality image smoothing
  thumbCtx.imageSmoothingEnabled = true;
  thumbCtx.imageSmoothingQuality = "high";

  // Scale and draw full canvas to thumbnail
  thumbCtx.drawImage(fullCanvas, 0, 0, thumbWidth, thumbHeight);

  // Convert to base64 (without data URL prefix)
  const dataUrl = thumbCanvas.toDataURL("image/png");
  return dataUrl.replace(/^data:image\/\w+;base64,/, "");
};

// =============================================
// Hook
// =============================================

export function useCanvasEditor(postId: string) {
  const [state, dispatch] = useReducer(
    editorReducer,
    initialState,
    getInitialState
  );
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const thumbnailIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const hasChangesRef = useRef(false);
  const lastThumbnailLayersRef = useRef<string>("");

  // Save zoom to localStorage when it changes
  useEffect(() => {
    localStorage.setItem(ZOOM_STORAGE_KEY, state.zoom.toString());
  }, [state.zoom]);

  // Fetch post data
  const {
    data: post,
    error,
    isLoading,
    mutate,
  } = useSWR<Post>(`/api/posts/${postId}`, fetcher, {
    onSuccess: (data) => {
      // Initialize history with current layers
      dispatch({ type: "RESET_HISTORY", layers: data.layers });
      // Initialize thumbnail tracking with current layers
      lastThumbnailLayersRef.current = JSON.stringify(data.layers);
      hasChangesRef.current = false;
    },
  });

  // Get current layers from history or post
  const layers =
    state.history[state.historyIndex] ?? post?.layers ?? [];

  // Track changes for thumbnail generation
  useEffect(() => {
    const layersString = JSON.stringify(layers);
    if (layersString !== lastThumbnailLayersRef.current) {
      hasChangesRef.current = true;
    }
  }, [layers]);

  // =============================================
  // Layer Operations
  // =============================================

  const addLayer = useCallback(
    (layerTemplate: Omit<Layer, "id" | "name">, name?: string) => {
      const newLayer: Layer = {
        ...layerTemplate,
        id: generateUUID(),
        name: name ?? `Layer ${layers.length + 1}`,
      };

      const newLayers = [...layers, newLayer];
      dispatch({ type: "PUSH_HISTORY", layers: newLayers });
      dispatch({ type: "SELECT_LAYER", id: newLayer.id });

      // Update local state and schedule save
      mutate(
        (current) =>
          current ? { ...current, layers: newLayers } : undefined,
        false
      );
      scheduleSave(newLayers);

      return newLayer;
    },
    [layers, mutate]
  );

  const updateLayer = useCallback(
    (id: string, changes: Partial<Layer>) => {
      const newLayers = layers.map((layer) =>
        layer.id === id ? { ...layer, ...changes } : layer
      );

      dispatch({ type: "PUSH_HISTORY", layers: newLayers });
      mutate(
        (current) =>
          current ? { ...current, layers: newLayers } : undefined,
        false
      );
      scheduleSave(newLayers);
    },
    [layers, mutate]
  );

  const updateLayerData = useCallback(
    (id: string, dataChanges: Partial<LayerData>) => {
      const layer = layers.find((l) => l.id === id);
      if (!layer) return;

      const newData = { ...layer.data, ...dataChanges } as LayerData;
      updateLayer(id, { data: newData });
    },
    [layers, updateLayer]
  );

  const deleteLayer = useCallback(
    (id: string) => {
      const newLayers = layers.filter((layer) => layer.id !== id);
      dispatch({ type: "PUSH_HISTORY", layers: newLayers });

      if (state.selectedLayerId === id) {
        dispatch({ type: "SELECT_LAYER", id: null });
      }

      mutate(
        (current) =>
          current ? { ...current, layers: newLayers } : undefined,
        false
      );
      scheduleSave(newLayers);
    },
    [layers, state.selectedLayerId, mutate]
  );

  const duplicateLayer = useCallback(
    (id: string) => {
      const layerToDuplicate = layers.find((l) => l.id === id);
      if (!layerToDuplicate) return;

      const newLayer: Layer = {
        ...layerToDuplicate,
        id: generateUUID(),
        name: `${layerToDuplicate.name} (copy)`,
        x: layerToDuplicate.x + 20,
        y: layerToDuplicate.y + 20,
      };

      const layerIndex = layers.findIndex((l) => l.id === id);
      const newLayers = [
        ...layers.slice(0, layerIndex + 1),
        newLayer,
        ...layers.slice(layerIndex + 1),
      ];

      dispatch({ type: "PUSH_HISTORY", layers: newLayers });
      dispatch({ type: "SELECT_LAYER", id: newLayer.id });
      mutate(
        (current) =>
          current ? { ...current, layers: newLayers } : undefined,
        false
      );
      scheduleSave(newLayers);
    },
    [layers, mutate]
  );

  const reorderLayers = useCallback(
    (fromIndex: number, toIndex: number) => {
      const newLayers = [...layers];
      const [removed] = newLayers.splice(fromIndex, 1);
      if (removed) {
        newLayers.splice(toIndex, 0, removed);
      }

      dispatch({ type: "PUSH_HISTORY", layers: newLayers });
      mutate(
        (current) =>
          current ? { ...current, layers: newLayers } : undefined,
        false
      );
      scheduleSave(newLayers);
    },
    [layers, mutate]
  );

  const moveLayerUp = useCallback(
    (id: string) => {
      const index = layers.findIndex((l) => l.id === id);
      if (index < layers.length - 1) {
        reorderLayers(index, index + 1);
      }
    },
    [layers, reorderLayers]
  );

  const moveLayerDown = useCallback(
    (id: string) => {
      const index = layers.findIndex((l) => l.id === id);
      if (index > 0) {
        reorderLayers(index, index - 1);
      }
    },
    [layers, reorderLayers]
  );

  const centerLayer = useCallback(
    (id: string) => {
      const layer = layers.find((l) => l.id === id);
      if (!layer || !post) return;

      // Calculate center position
      const centerX = (post.width - layer.width) / 2;
      const centerY = (post.height - layer.height) / 2;

      updateLayer(id, { x: centerX, y: centerY });
      toast.success("Camada centralizada");
    },
    [layers, post, updateLayer]
  );

  // =============================================
  // Selection
  // =============================================

  const selectLayer = useCallback((id: string | null) => {
    dispatch({ type: "SELECT_LAYER", id });
  }, []);

  const selectedLayer = layers.find((l) => l.id === state.selectedLayerId);

  // =============================================
  // History (Undo/Redo)
  // =============================================

  const canUndo = state.historyIndex > 0;
  const canRedo = state.historyIndex < state.history.length - 1;

  const undo = useCallback(() => {
    if (!canUndo) return;
    dispatch({ type: "UNDO" });

    const previousLayers = state.history[state.historyIndex - 1];
    if (previousLayers) {
      mutate(
        (current) =>
          current ? { ...current, layers: previousLayers } : undefined,
        false
      );
      scheduleSave(previousLayers);
    }
  }, [canUndo, state.history, state.historyIndex, mutate]);

  const redo = useCallback(() => {
    if (!canRedo) return;
    dispatch({ type: "REDO" });

    const nextLayers = state.history[state.historyIndex + 1];
    if (nextLayers) {
      mutate(
        (current) =>
          current ? { ...current, layers: nextLayers } : undefined,
        false
      );
      scheduleSave(nextLayers);
    }
  }, [canRedo, state.history, state.historyIndex, mutate]);

  // =============================================
  // Tools & View
  // =============================================

  const setTool = useCallback((tool: EditorTool) => {
    dispatch({ type: "SET_TOOL", tool });
  }, []);

  const setZoom = useCallback((zoom: number) => {
    dispatch({ type: "SET_ZOOM", zoom });
  }, []);

  const zoomIn = useCallback(() => {
    dispatch({ type: "SET_ZOOM", zoom: state.zoom * 1.25 });
  }, [state.zoom]);

  const zoomOut = useCallback(() => {
    dispatch({ type: "SET_ZOOM", zoom: state.zoom / 1.25 });
  }, [state.zoom]);

  const resetZoom = useCallback(() => {
    dispatch({ type: "SET_ZOOM", zoom: 1 });
    dispatch({ type: "SET_PAN_OFFSET", offset: { x: 0, y: 0 } });
  }, []);

  const setPanOffset = useCallback((offset: { x: number; y: number }) => {
    dispatch({ type: "SET_PAN_OFFSET", offset });
  }, []);

  // =============================================
  // Persistence
  // =============================================

  const scheduleSave = useCallback(
    (layersToSave: Layer[]) => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = setTimeout(async () => {
        try {
          const response = await fetch(`/api/posts/${postId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ layers: layersToSave }),
          });

          if (!response.ok) {
            throw new Error("Failed to save");
          }
        } catch (error) {
          console.error("Error saving layers:", error);
          toast.error("Erro ao salvar alterações");
        }
      }, 1000); // Debounce 1 second
    },
    [postId]
  );

  const saveNow = useCallback(async () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    try {
      const response = await fetch(`/api/posts/${postId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ layers }),
      });

      if (!response.ok) {
        throw new Error("Failed to save");
      }

      toast.success("Alterações salvas");
    } catch (error) {
      console.error("Error saving:", error);
      toast.error("Erro ao salvar alterações");
    }
  }, [postId, layers]);

  const updatePostMetadata = useCallback(
    async (updates: {
      title?: string;
      caption?: string;
      status?: string;
      width?: number;
      height?: number;
    }) => {
      try {
        const response = await fetch(`/api/posts/${postId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates),
        });

        if (!response.ok) {
          throw new Error("Failed to update post");
        }

        const updatedPost = await response.json();
        mutate(updatedPost, false);
        return updatedPost;
      } catch (error) {
        console.error("Error updating post:", error);
        toast.error("Erro ao atualizar post");
        throw error;
      }
    },
    [postId, mutate]
  );

  // =============================================
  // Export
  // =============================================

  const exportToDataUrl = useCallback(
    async (canvas: HTMLCanvasElement): Promise<string> => {
      return canvas.toDataURL("image/png");
    },
    []
  );

  const exportAndSaveRenderedImage = useCallback(
    async (canvas: HTMLCanvasElement) => {
      try {
        const dataUrl = await exportToDataUrl(canvas);
        // Remove the data:image/png;base64, prefix
        const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, "");

        // Generate thumbnail from the full image
        const thumbnail = await generateThumbnail(
          layers,
          post?.width ?? 1080,
          post?.height ?? 1080,
          800
        );

        const response = await fetch(`/api/posts/${postId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            renderedImage: base64,
            thumbnailImage: thumbnail,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to save rendered image");
        }

        toast.success("Imagem exportada com sucesso");
        return base64;
      } catch (error) {
        console.error("Error exporting image:", error);
        toast.error("Erro ao exportar imagem");
        throw error;
      }
    },
    [postId, exportToDataUrl, layers, post?.width, post?.height]
  );

  // =============================================
  // Thumbnail Generation
  // =============================================

  const generateAndSaveThumbnail = useCallback(async () => {
    if (!post || layers.length === 0) return;

    try {
      const thumbnail = await generateThumbnail(
        layers,
        post.width,
        post.height,
        800
      );

      const response = await fetch(`/api/posts/${postId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ thumbnailImage: thumbnail }),
      });

      if (!response.ok) {
        throw new Error("Failed to save thumbnail");
      }

      // Update local state
      mutate(
        (current) =>
          current ? { ...current, thumbnailImage: thumbnail } : undefined,
        false
      );

      lastThumbnailLayersRef.current = JSON.stringify(layers);
      hasChangesRef.current = false;
    } catch (error) {
      console.error("Error generating thumbnail:", error);
      // Don't show toast for automatic thumbnail generation to avoid spam
    }
  }, [post, layers, postId, mutate]);

  // Periodic thumbnail generation (every 30 seconds)
  useEffect(() => {
    if (!post) return;

    thumbnailIntervalRef.current = setInterval(() => {
      if (hasChangesRef.current) {
        generateAndSaveThumbnail();
      }
    }, 30000); // 30 seconds

    return () => {
      if (thumbnailIntervalRef.current) {
        clearInterval(thumbnailIntervalRef.current);
      }
    };
  }, [post, generateAndSaveThumbnail]);

  // Generate thumbnail on unmount/navigation
  useEffect(() => {
    return () => {
      // Generate thumbnail on unmount if there are layers and changes
      // This ensures we capture the latest state when navigating away
      if (post && layers.length > 0 && hasChangesRef.current) {
        // Fire-and-forget: don't await, just trigger the generation
        generateAndSaveThumbnail().catch((error) => {
          console.error("Error generating thumbnail on unmount:", error);
        });
      }
    };
  }, [post, layers, generateAndSaveThumbnail]);

  return {
    // State
    post,
    layers,
    selectedLayer,
    selectedLayerId: state.selectedLayerId,
    tool: state.tool,
    zoom: state.zoom,
    panOffset: state.panOffset,
    isDragging: state.isDragging,
    isResizing: state.isResizing,
    isLoading,
    error,

    // History
    canUndo,
    canRedo,
    undo,
    redo,

    // Layer operations
    addLayer,
    updateLayer,
    updateLayerData,
    deleteLayer,
    duplicateLayer,
    reorderLayers,
    moveLayerUp,
    moveLayerDown,
    centerLayer,
    selectLayer,

    // Tools & View
    setTool,
    setZoom,
    zoomIn,
    zoomOut,
    resetZoom,
    setPanOffset,
    setDragging: (isDragging: boolean) =>
      dispatch({ type: "SET_DRAGGING", isDragging }),
    setResizing: (isResizing: boolean) =>
      dispatch({ type: "SET_RESIZING", isResizing }),

    // Persistence
    saveNow,
    updatePostMetadata,

    // Export
    exportToDataUrl,
    exportAndSaveRenderedImage,

    // Refresh
    refresh: mutate,
  };
}

export type CanvasEditorState = ReturnType<typeof useCanvasEditor>;

