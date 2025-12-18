"use client";

import { useCallback, useReducer, useRef } from "react";
import { toast } from "sonner";
import useSWR from "swr";
import type { Post } from "@/lib/db/schema";
import type {
  DEFAULT_SHAPE_LAYER,
  DEFAULT_TEXT_LAYER,
  Layer,
  LayerData,
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
// Reducer
// =============================================

const MAX_HISTORY_SIZE = 50;

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

// =============================================
// Hook
// =============================================

export function useCanvasEditor(postId: string) {
  const [state, dispatch] = useReducer(editorReducer, initialState);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
    },
  });

  // Get current layers from history or post
  const layers =
    state.history[state.historyIndex] ?? post?.layers ?? [];

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

        const response = await fetch(`/api/posts/${postId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            renderedImage: base64,
            thumbnailImage: base64, // Could generate a smaller thumbnail
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
    [postId, exportToDataUrl]
  );

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

