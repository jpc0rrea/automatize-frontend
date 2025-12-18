"use client";

import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CANVAS_PRESETS } from "@/lib/types";

export function NewPostCard() {
  const router = useRouter();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [selectedPreset, setSelectedPreset] = useState("0"); // Instagram Square

  const handleCreate = async () => {
    setIsCreating(true);
    try {
      const preset = CANVAS_PRESETS[Number.parseInt(selectedPreset, 10)];
      
      const response = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title || "Novo Post",
          width: preset?.width ?? 1080,
          height: preset?.height ?? 1080,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create post");
      }

      const newPost = await response.json();
      toast.success("Post criado com sucesso!");
      router.push(`/posts/${newPost.id}`);
    } catch (error) {
      toast.error("Erro ao criar post");
      console.error("Error creating post:", error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleQuickCreate = async () => {
    setIsCreating(true);
    try {
      const response = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Novo Post",
          width: 1080,
          height: 1080,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create post");
      }

      const newPost = await response.json();
      router.push(`/posts/${newPost.id}`);
    } catch (error) {
      toast.error("Erro ao criar post");
      console.error("Error creating post:", error);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, delay: 0.1 }}
        className="group"
      >
        <button
          type="button"
          className="relative flex aspect-square w-full cursor-pointer flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed border-muted-foreground/20 bg-muted/30 transition-all hover:border-primary/50 hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          disabled={isCreating}
          onClick={handleQuickCreate}
          onContextMenu={(e) => {
            e.preventDefault();
            setIsDialogOpen(true);
          }}
        >
          <div className="flex size-16 items-center justify-center rounded-full bg-primary/10 transition-colors group-hover:bg-primary/20">
            <Plus className="size-8 text-primary" />
          </div>
          <div className="text-center">
            <p className="font-medium text-foreground">Novo Post</p>
            <p className="text-muted-foreground text-xs">
              Clique direito para opções
            </p>
          </div>
        </button>
      </motion.div>

      {/* Create dialog with options */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar Novo Post</DialogTitle>
            <DialogDescription>
              Configure as opções do seu novo post.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Título</Label>
              <Input
                id="title"
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Meu novo post"
                value={title}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="preset">Tamanho do Canvas</Label>
              <Select
                onValueChange={setSelectedPreset}
                value={selectedPreset}
              >
                <SelectTrigger id="preset">
                  <SelectValue placeholder="Selecione um formato" />
                </SelectTrigger>
                <SelectContent>
                  {CANVAS_PRESETS.map((preset, index) => (
                    <SelectItem key={preset.name} value={index.toString()}>
                      {preset.name} ({preset.width}×{preset.height})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              disabled={isCreating}
              onClick={() => setIsDialogOpen(false)}
              variant="outline"
            >
              Cancelar
            </Button>
            <Button disabled={isCreating} onClick={handleCreate}>
              {isCreating ? "Criando..." : "Criar Post"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

