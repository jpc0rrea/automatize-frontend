"use client";

import {
  ImageIcon,
  Loader2,
  Move,
  Palette,
  RotateCw,
  Scaling,
  Sparkles,
  Type,
} from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import type {
  ImageLayerData,
  Layer,
  LayerData,
  ShapeLayerData,
  TextLayerData,
} from "@/lib/types";

// Type for extracted text items
type ExtractedText = {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  fontWeight: number;
  color: string;
  textAlign: "left" | "center" | "right";
};

type PropertiesPanelProps = {
  layer: Layer | null;
  postId: string;
  canvasWidth: number;
  canvasHeight: number;
  onUpdateLayer: (id: string, changes: Partial<Layer>) => void;
  onUpdateLayerData: (id: string, dataChanges: Partial<LayerData>) => void;
  onAddLayer: (layer: Omit<Layer, "id" | "name">, name?: string) => Layer;
};

const FONT_FAMILIES = [
  "Inter",
  "Arial",
  "Helvetica",
  "Georgia",
  "Times New Roman",
  "Courier New",
  "Verdana",
  "Trebuchet MS",
];

const FONT_WEIGHTS = [
  { value: 100, label: "Thin" },
  { value: 200, label: "Extra Light" },
  { value: 300, label: "Light" },
  { value: 400, label: "Regular" },
  { value: 500, label: "Medium" },
  { value: 600, label: "Semi Bold" },
  { value: 700, label: "Bold" },
  { value: 800, label: "Extra Bold" },
  { value: 900, label: "Black" },
];

export function PropertiesPanel({
  layer,
  postId,
  canvasWidth,
  canvasHeight,
  onUpdateLayer,
  onUpdateLayerData,
  onAddLayer,
}: PropertiesPanelProps) {
  if (!layer) {
    return (
      <div className="flex h-full flex-col border-l border-border bg-background">
        <div className="border-b border-border p-3">
          <h3 className="font-medium text-sm">Propriedades</h3>
        </div>
        <div className="flex flex-1 items-center justify-center p-4">
          <p className="text-center text-muted-foreground text-sm">
            Selecione uma camada para editar suas propriedades
          </p>
        </div>
      </div>
    );
  }

  const handleLayerChange = (field: keyof Layer, value: number | string) => {
    onUpdateLayer(layer.id, { [field]: value });
  };

  const handleDataChange = (field: string, value: unknown) => {
    onUpdateLayerData(layer.id, { [field]: value } as Partial<LayerData>);
  };

  return (
    <div className="flex h-full w-72 flex-col border-l border-border bg-background">
      <div className="border-b border-border p-3">
        <h3 className="font-medium text-sm">Propriedades</h3>
        <p className="text-muted-foreground text-xs">{layer.name}</p>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-6 p-4">
          {/* Transform section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium uppercase">
              <Move className="size-3" />
              Posição & Tamanho
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs" htmlFor="x">
                  X
                </Label>
                <Input
                  className="h-8"
                  id="x"
                  onChange={(e) =>
                    handleLayerChange("x", Number.parseInt(e.target.value, 10) || 0)
                  }
                  type="number"
                  value={Math.round(layer.x)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs" htmlFor="y">
                  Y
                </Label>
                <Input
                  className="h-8"
                  id="y"
                  onChange={(e) =>
                    handleLayerChange("y", Number.parseInt(e.target.value, 10) || 0)
                  }
                  type="number"
                  value={Math.round(layer.y)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs" htmlFor="width">
                  Largura
                </Label>
                <Input
                  className="h-8"
                  id="width"
                  min={10}
                  onChange={(e) =>
                    handleLayerChange("width", Number.parseInt(e.target.value, 10) || 100)
                  }
                  type="number"
                  value={Math.round(layer.width)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs" htmlFor="height">
                  Altura
                </Label>
                <Input
                  className="h-8"
                  id="height"
                  min={10}
                  onChange={(e) =>
                    handleLayerChange("height", Number.parseInt(e.target.value, 10) || 100)
                  }
                  type="number"
                  value={Math.round(layer.height)}
                />
              </div>
            </div>
          </div>

          {/* Rotation */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium uppercase">
              <RotateCw className="size-3" />
              Rotação
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs" htmlFor="rotation">
                  Ângulo
                </Label>
                <span className="text-muted-foreground text-xs">
                  {layer.rotation}°
                </span>
              </div>
              <Slider
                id="rotation"
                max={360}
                min={0}
                onValueChange={(value) =>
                  handleLayerChange("rotation", value[0] ?? 0)
                }
                step={1}
                value={[layer.rotation]}
              />
            </div>
          </div>

          {/* Opacity */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium uppercase">
              <Scaling className="size-3" />
              Opacidade
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs" htmlFor="opacity">
                  Opacidade
                </Label>
                <span className="text-muted-foreground text-xs">
                  {Math.round(layer.opacity * 100)}%
                </span>
              </div>
              <Slider
                id="opacity"
                max={1}
                min={0}
                onValueChange={(value) =>
                  handleLayerChange("opacity", value[0] ?? 1)
                }
                step={0.01}
                value={[layer.opacity]}
              />
            </div>
          </div>

          {/* Type-specific properties */}
          {layer.data.type === "text" && (
            <TextProperties
              data={layer.data}
              onDataChange={handleDataChange}
            />
          )}

          {layer.data.type === "shape" && (
            <ShapeProperties
              data={layer.data}
              onDataChange={handleDataChange}
            />
          )}

          {layer.data.type === "image" && (
            <ImageProperties
              canvasHeight={canvasHeight}
              canvasWidth={canvasWidth}
              data={layer.data}
              layerId={layer.id}
              onAddLayer={onAddLayer}
              onDataChange={handleDataChange}
              postId={postId}
            />
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

// =============================================
// Text Properties
// =============================================

function TextProperties({
  data,
  onDataChange,
}: {
  data: TextLayerData;
  onDataChange: (field: string, value: unknown) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium uppercase">
        <Type className="size-3" />
        Texto
      </div>

      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label className="text-xs" htmlFor="text">
            Conteúdo
          </Label>
          <Textarea
            className="min-h-[80px] resize-none"
            id="text"
            onChange={(e) => onDataChange("text", e.target.value)}
            placeholder="Digite seu texto..."
            value={data.text}
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs" htmlFor="fontFamily">
            Fonte
          </Label>
          <Select
            onValueChange={(v) => onDataChange("fontFamily", v)}
            value={data.fontFamily}
          >
            <SelectTrigger className="h-8" id="fontFamily">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FONT_FAMILIES.map((font) => (
                <SelectItem key={font} value={font}>
                  <span style={{ fontFamily: font }}>{font}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs" htmlFor="fontSize">
              Tamanho
            </Label>
            <Input
              className="h-8"
              id="fontSize"
              min={8}
              onChange={(e) =>
                onDataChange("fontSize", Number.parseInt(e.target.value, 10) || 16)
              }
              type="number"
              value={data.fontSize}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs" htmlFor="fontWeight">
              Peso
            </Label>
            <Select
              onValueChange={(v) => onDataChange("fontWeight", Number.parseInt(v, 10))}
              value={data.fontWeight.toString()}
            >
              <SelectTrigger className="h-8" id="fontWeight">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FONT_WEIGHTS.map((w) => (
                  <SelectItem key={w.value} value={w.value.toString()}>
                    {w.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs" htmlFor="color">
            Cor
          </Label>
          <div className="flex gap-2">
            <Input
              className="h-8 w-10 cursor-pointer p-1"
              id="color"
              onChange={(e) => onDataChange("color", e.target.value)}
              type="color"
              value={data.color}
            />
            <Input
              className="h-8 flex-1"
              onChange={(e) => onDataChange("color", e.target.value)}
              type="text"
              value={data.color}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs" htmlFor="textAlign">
            Alinhamento
          </Label>
          <Select
            onValueChange={(v) =>
              onDataChange("textAlign", v as "left" | "center" | "right")
            }
            value={data.textAlign}
          >
            <SelectTrigger className="h-8" id="textAlign">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="left">Esquerda</SelectItem>
              <SelectItem value="center">Centro</SelectItem>
              <SelectItem value="right">Direita</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs" htmlFor="lineHeight">
              Altura da linha
            </Label>
            <span className="text-muted-foreground text-xs">
              {data.lineHeight.toFixed(1)}
            </span>
          </div>
          <Slider
            id="lineHeight"
            max={3}
            min={0.5}
            onValueChange={(value) => onDataChange("lineHeight", value[0] ?? 1.2)}
            step={0.1}
            value={[data.lineHeight]}
          />
        </div>
      </div>
    </div>
  );
}

// =============================================
// Shape Properties
// =============================================

function ShapeProperties({
  data,
  onDataChange,
}: {
  data: ShapeLayerData;
  onDataChange: (field: string, value: unknown) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium uppercase">
        <Palette className="size-3" />
        Forma
      </div>

      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label className="text-xs" htmlFor="shape">
            Tipo
          </Label>
          <Select
            onValueChange={(v) => onDataChange("shape", v)}
            value={data.shape}
          >
            <SelectTrigger className="h-8" id="shape">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="rectangle">Retângulo</SelectItem>
              <SelectItem value="circle">Círculo</SelectItem>
              <SelectItem value="ellipse">Elipse</SelectItem>
              <SelectItem value="line">Linha</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs" htmlFor="fill">
            Preenchimento
          </Label>
          <div className="flex gap-2">
            <Input
              className="h-8 w-10 cursor-pointer p-1"
              id="fill"
              onChange={(e) => onDataChange("fill", e.target.value)}
              type="color"
              value={data.fill === "transparent" ? "#ffffff" : data.fill}
            />
            <Input
              className="h-8 flex-1"
              onChange={(e) => onDataChange("fill", e.target.value)}
              type="text"
              value={data.fill}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs" htmlFor="stroke">
            Borda
          </Label>
          <div className="flex gap-2">
            <Input
              className="h-8 w-10 cursor-pointer p-1"
              id="stroke"
              onChange={(e) => onDataChange("stroke", e.target.value)}
              type="color"
              value={data.stroke === "transparent" ? "#000000" : data.stroke}
            />
            <Input
              className="h-8 flex-1"
              onChange={(e) => onDataChange("stroke", e.target.value)}
              type="text"
              value={data.stroke}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs" htmlFor="strokeWidth">
            Espessura da borda
          </Label>
          <Input
            className="h-8"
            id="strokeWidth"
            min={0}
            onChange={(e) =>
              onDataChange("strokeWidth", Number.parseInt(e.target.value, 10) || 0)
            }
            type="number"
            value={data.strokeWidth}
          />
        </div>

        {data.shape === "rectangle" && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs" htmlFor="borderRadius">
                Arredondamento
              </Label>
              <span className="text-muted-foreground text-xs">
                {data.borderRadius}px
              </span>
            </div>
            <Slider
              id="borderRadius"
              max={100}
              min={0}
              onValueChange={(value) =>
                onDataChange("borderRadius", value[0] ?? 0)
              }
              step={1}
              value={[data.borderRadius]}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// =============================================
// Image Properties
// =============================================

function ImageProperties({
  data,
  layerId,
  postId,
  canvasWidth,
  canvasHeight,
  onDataChange,
}: {
  data: ImageLayerData;
  layerId: string;
  postId: string;
  canvasWidth: number;
  canvasHeight: number;
  onDataChange: (field: string, value: unknown) => void;
  onAddLayer: (layer: Omit<Layer, "id" | "name">, name?: string) => Layer;
}) {
  const [editPrompt, setEditPrompt] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [isExtractingText, setIsExtractingText] = useState(false);

  // State for text extraction dialog
  const [showTextEditDialog, setShowTextEditDialog] = useState(false);
  const [extractedTexts, setExtractedTexts] = useState<ExtractedText[]>([]);
  const [editedTexts, setEditedTexts] = useState<string[]>([]);
  const [isReplacingText, setIsReplacingText] = useState(false);
  // Track which image the extracted texts belong to (to know when to re-fetch)
  const [extractedFromImageSrc, setExtractedFromImageSrc] = useState<
    string | null
  >(null);

  const handleEditImage = useCallback(async () => {
    if (!editPrompt.trim()) {
      toast.error("Digite o que você deseja editar na imagem");
      return;
    }

    if (!data.src) {
      toast.error("Nenhuma imagem para editar");
      return;
    }

    setIsEditing(true);

    try {
      const response = await fetch("/api/posts/edit-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postId,
          prompt: editPrompt,
          sourceImageUrl: data.src,
          width: canvasWidth,
          height: canvasHeight,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Falha ao editar imagem");
      }

      const result = await response.json();

      if (result.imageUrl) {
        // Update the image source with the edited image
        onDataChange("src", result.imageUrl);
        toast.success("Imagem editada com sucesso!");
        setEditPrompt("");
      }
    } catch (error) {
      console.error("Edit error:", error);
      toast.error(
        error instanceof Error ? error.message : "Erro ao editar imagem"
      );
    } finally {
      setIsEditing(false);
    }
  }, [editPrompt, data.src, postId, canvasWidth, canvasHeight, onDataChange]);

  // Extract texts from image and show dialog for editing
  const handleExtractText = useCallback(async () => {
    if (!data.src) {
      toast.error("Nenhuma imagem para extrair texto");
      return;
    }

    // If we already have extracted texts for this image, just open the dialog
    if (
      extractedTexts.length > 0 &&
      extractedFromImageSrc === data.src
    ) {
      setShowTextEditDialog(true);
      return;
    }

    setIsExtractingText(true);

    try {
      const extractResponse = await fetch("/api/posts/extract-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postId,
          sourceImageUrl: data.src,
          canvasWidth,
          canvasHeight,
        }),
      });

      if (!extractResponse.ok) {
        const error = await extractResponse.json();
        throw new Error(error.error || "Falha ao extrair texto");
      }

      const extractResult = await extractResponse.json();

      if (extractResult.texts && extractResult.texts.length > 0) {
        // Store extracted texts and track which image they came from
        setExtractedTexts(extractResult.texts);
        setEditedTexts(extractResult.texts.map((t: ExtractedText) => t.text));
        setExtractedFromImageSrc(data.src);
        setShowTextEditDialog(true);
        toast.success(
          `${extractResult.texts.length} texto(s) encontrado(s)! Edite os textos abaixo.`
        );
      } else {
        toast.info("Nenhum texto encontrado na imagem");
      }
    } catch (error) {
      console.error("Extract text error:", error);
      toast.error(
        error instanceof Error ? error.message : "Erro ao extrair texto"
      );
    } finally {
      setIsExtractingText(false);
    }
  }, [
    data.src,
    postId,
    canvasWidth,
    canvasHeight,
    extractedTexts.length,
    extractedFromImageSrc,
  ]);

  // Handle saving edited texts - replaces texts in the image
  const handleSaveTextEdits = useCallback(async () => {
    if (!data.src) {
      toast.error("Nenhuma imagem para editar");
      return;
    }

    // Build the text replacements array
    const textReplacements = extractedTexts
      .map((original, index) => ({
        originalText: original.text,
        newText: editedTexts[index] ?? original.text,
      }))
      .filter((r) => r.originalText !== r.newText); // Only include changed texts

    if (textReplacements.length === 0) {
      toast.info("Nenhum texto foi alterado");
      setShowTextEditDialog(false);
      return;
    }

    setIsReplacingText(true);

    try {
      const response = await fetch("/api/posts/replace-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postId,
          sourceImageUrl: data.src,
          width: canvasWidth,
          height: canvasHeight,
          textReplacements,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Falha ao substituir textos");
      }

      const result = await response.json();

      if (result.imageUrl) {
        onDataChange("src", result.imageUrl);
        toast.success(
          `${textReplacements.length} texto(s) substituído(s) com sucesso!`
        );
        setShowTextEditDialog(false);
        // Reset all state since the image has changed
        setExtractedTexts([]);
        setEditedTexts([]);
        setExtractedFromImageSrc(null);
      }
    } catch (error) {
      console.error("Replace text error:", error);
      toast.error(
        error instanceof Error ? error.message : "Erro ao substituir textos"
      );
    } finally {
      setIsReplacingText(false);
    }
  }, [
    data.src,
    postId,
    canvasWidth,
    canvasHeight,
    extractedTexts,
    editedTexts,
    onDataChange,
  ]);

  // Handle updating individual text edits
  const handleTextChange = useCallback((index: number, newValue: string) => {
    setEditedTexts((prev) => {
      const updated = [...prev];
      updated[index] = newValue;
      return updated;
    });
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium uppercase">
        <ImageIcon className="size-3" />
        Imagem
      </div>

      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label className="text-xs" htmlFor="fit">
            Ajuste
          </Label>
          <Select
            onValueChange={(v) =>
              onDataChange("fit", v as "cover" | "contain" | "fill" | "none")
            }
            value={data.fit}
          >
            <SelectTrigger className="h-8" id="fit">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cover">Cobrir (recortar)</SelectItem>
              <SelectItem value="contain">Conter (manter proporção)</SelectItem>
              <SelectItem value="fill">Preencher (esticar)</SelectItem>
              <SelectItem value="none">Original</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Extract & Edit Text Section */}
        <div className="space-y-3 pt-3 border-t border-border">
          <div className="flex items-center gap-2">
            <Type className="size-3 text-primary" />
            <Label className="text-xs font-medium">Editar Textos</Label>
          </div>

          <p className="text-muted-foreground text-xs leading-relaxed">
            Detecta textos na imagem para que você possa editá-los diretamente.
          </p>

          <Button
            className="w-full"
            disabled={isExtractingText}
            onClick={handleExtractText}
            size="sm"
            variant="outline"
          >
            {isExtractingText ? (
              <>
                <Loader2 className="mr-2 size-3 animate-spin" />
                Detectando textos...
              </>
            ) : (
              <>
                <Type className="mr-2 size-3" />
                Detectar e Editar Textos
              </>
            )}
          </Button>
        </div>

        {/* Text Edit Dialog */}
        <Dialog open={showTextEditDialog} onOpenChange={setShowTextEditDialog}>
          <DialogContent className="max-w-lg max-h-[80vh] flex flex-col gap-0 p-0">
            <DialogHeader className="px-6 pt-6 pb-4">
              <div className="flex items-center justify-between">
                <DialogTitle className="flex items-center gap-2">
                  <Type className="size-4" />
                  Editar Textos da Imagem
                </DialogTitle>
                <Button
                  className="h-7 px-2 text-xs"
                  disabled={isExtractingText || isReplacingText}
                  onClick={async () => {
                    // Force re-extraction by clearing the cached source
                    setExtractedFromImageSrc(null);
                    setShowTextEditDialog(false);
                    // Small delay then re-trigger extraction
                    setTimeout(() => {
                      handleExtractText();
                    }, 100);
                  }}
                  size="sm"
                  variant="ghost"
                >
                  {isExtractingText ? (
                    <Loader2 className="size-3 animate-spin" />
                  ) : (
                    <RotateCw className="size-3" />
                  )}
                </Button>
              </div>
              <DialogDescription>
                Edite os textos abaixo. A IA substituirá os textos originais
                pelos novos na imagem.
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-hidden px-6">
              <ScrollArea className="h-[40vh]">
                <div className="space-y-4 pr-4">
                  {extractedTexts.map((extracted, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs text-muted-foreground">
                          Texto {index + 1}
                        </Label>
                        <span
                          className="text-xs px-1.5 py-0.5 rounded"
                          style={{
                            backgroundColor: extracted.color,
                            color:
                              extracted.color === "#ffffff" ||
                              extracted.color === "#fff"
                                ? "#000"
                                : "#fff",
                          }}
                        >
                          {extracted.color}
                        </span>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground whitespace-pre-wrap">
                          Original: &quot;{extracted.text}&quot;
                        </p>
                        <Textarea
                          className="min-h-[80px] resize-y"
                          disabled={isReplacingText}
                          onChange={(e) =>
                            handleTextChange(index, e.target.value)
                          }
                          placeholder="Digite o novo texto..."
                          value={editedTexts[index] ?? extracted.text}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>

            <DialogFooter className="px-6 py-4 border-t">
              <Button
                disabled={isReplacingText}
                onClick={() => setShowTextEditDialog(false)}
                variant="outline"
              >
                Cancelar
              </Button>
              <Button disabled={isReplacingText} onClick={handleSaveTextEdits}>
                {isReplacingText ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Substituindo...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 size-4" />
                    Aplicar Alterações
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* AI Image Edit Section */}
        <div className="space-y-3 pt-3 border-t border-border">
          <div className="flex items-center gap-2">
            <Sparkles className="size-3 text-primary" />
            <Label className="text-xs font-medium">Editar com AI</Label>
          </div>
          
          <p className="text-muted-foreground text-xs leading-relaxed">
            Descreva as alterações que você deseja fazer. A AI preservará o máximo possível da imagem original.
          </p>
          
          <Textarea
            className="min-h-[80px] resize-none text-sm"
            disabled={isEditing}
            onChange={(e) => setEditPrompt(e.target.value)}
            placeholder="Ex: Mude o fundo para azul, remova o texto, adicione mais brilho..."
            value={editPrompt}
          />
          
          <div className="flex flex-wrap gap-1">
            {[
              "Mudar fundo",
              "Melhorar cores",
              "Adicionar brilho",
              "Remover objetos",
            ].map((suggestion) => (
              <Button
                key={suggestion}
                className="h-6 px-2 text-xs"
                disabled={isEditing}
                onClick={() =>
                  setEditPrompt((prev) =>
                    prev ? `${prev}, ${suggestion.toLowerCase()}` : suggestion
                  )
                }
                size="sm"
                variant="outline"
              >
                {suggestion}
              </Button>
            ))}
          </div>
          
          <Button
            className="w-full"
            disabled={isEditing || !editPrompt.trim()}
            onClick={handleEditImage}
            size="sm"
          >
            {isEditing ? (
              <>
                <Loader2 className="mr-2 size-3 animate-spin" />
                Editando...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 size-3" />
                Aplicar Edição
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

