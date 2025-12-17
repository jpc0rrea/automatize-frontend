import type { InferUITool, UIMessage } from "ai";
import { z } from "zod";
import type { ArtifactKind } from "@/components/artifact";
import type { generateImage } from "./ai/tools/generate-image";
import type { Suggestion } from "./db/schema";
import type { AppUsage } from "./usage";

export type DataPart = { type: "append-message"; message: string };

export const messageMetadataSchema = z.object({
  createdAt: z.string(),
});

export type MessageMetadata = z.infer<typeof messageMetadataSchema>;

type generateImageTool = InferUITool<ReturnType<typeof generateImage>>;

export type ChatTools = {
  generateImage: generateImageTool;
};

export type CustomUIDataTypes = {
  textDelta: string;
  imageDelta: string;
  sheetDelta: string;
  codeDelta: string;
  suggestion: Suggestion;
  appendMessage: string;
  id: string;
  title: string;
  kind: ArtifactKind;
  clear: null;
  finish: null;
  usage: AppUsage;
};

export type ChatMessage = UIMessage<
  MessageMetadata,
  CustomUIDataTypes,
  ChatTools
>;

export type Attachment = {
  name: string;
  url: string;
  contentType: string;
};

// =============================================
// Canvas Editor Layer Types
// =============================================

/**
 * Base layer properties shared by all layer types
 */
export type BaseLayer = {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  // Position & size
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
};

/**
 * Image layer data for background images or imported images
 */
export type ImageLayerData = {
  type: "image";
  src: string; // base64 or URL
  fit: "cover" | "contain" | "fill" | "none";
};

/**
 * Text layer data for text elements
 */
export type TextLayerData = {
  type: "text";
  text: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900;
  fontStyle: "normal" | "italic";
  color: string;
  textAlign: "left" | "center" | "right";
  lineHeight: number;
  letterSpacing: number;
  textDecoration: "none" | "underline" | "line-through";
};

/**
 * Shape layer data for geometric shapes
 */
export type ShapeLayerData = {
  type: "shape";
  shape: "rectangle" | "circle" | "ellipse" | "line";
  fill: string;
  stroke: string;
  strokeWidth: number;
  borderRadius: number;
};

/**
 * Union type for layer data
 */
export type LayerData = ImageLayerData | TextLayerData | ShapeLayerData;

/**
 * Complete Layer type combining base properties with specific data
 */
export type Layer = BaseLayer & { data: LayerData };

/**
 * Post status for tracking the lifecycle of a post
 */
export type PostStatus = "draft" | "ready" | "scheduled" | "posted" | "failed";

/**
 * Post canvas dimensions presets
 */
export type CanvasPreset = {
  name: string;
  width: number;
  height: number;
  aspectRatio: string;
};

export const CANVAS_PRESETS: CanvasPreset[] = [
  { name: "Instagram Square", width: 1080, height: 1080, aspectRatio: "1:1" },
  { name: "Instagram Portrait", width: 1080, height: 1350, aspectRatio: "4:5" },
  { name: "Instagram Story", width: 1080, height: 1920, aspectRatio: "9:16" },
  { name: "Instagram Landscape", width: 1080, height: 566, aspectRatio: "1.91:1" },
  { name: "Facebook Post", width: 1200, height: 630, aspectRatio: "1.91:1" },
  { name: "Twitter Post", width: 1200, height: 675, aspectRatio: "16:9" },
];

/**
 * Default layer values for creating new layers
 */
export const DEFAULT_TEXT_LAYER: Omit<Layer, "id" | "name"> = {
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
};

export const DEFAULT_SHAPE_LAYER: Omit<Layer, "id" | "name"> = {
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
};
