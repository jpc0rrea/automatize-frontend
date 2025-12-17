"use client";

import equal from "fast-deep-equal";
import {
  type MouseEvent,
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from "react";
import useSWR from "swr";
import { useArtifact } from "@/hooks/use-artifact";
import type { Document } from "@/lib/db/schema";
import { fetcher } from "@/lib/utils";
import type { UIArtifact } from "./artifact";
import { FullscreenIcon, ImageIcon, LoaderIcon } from "./icons";
import { ImageEditor } from "./image-editor";

type ImagePreviewProps = {
  isReadonly: boolean;
  result?: {
    id: string;
    title: string;
    status?: string;
    error?: string;
  };
  isGenerating?: boolean;
};

export function ImagePreview({
  isReadonly,
  result,
  isGenerating,
}: ImagePreviewProps) {
  const { artifact, setArtifact } = useArtifact();

  const { data: documents, isLoading: isDocumentsFetching } = useSWR<
    Document[]
  >(
    result?.id && result?.status !== "failed"
      ? `/api/document?id=${result.id}`
      : null,
    fetcher
  );

  const previewDocument = useMemo(() => documents?.[0], [documents]);
  const hitboxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const boundingBox = hitboxRef.current?.getBoundingClientRect();

    if (artifact.documentId && boundingBox) {
      setArtifact((currentArtifact) => ({
        ...currentArtifact,
        boundingBox: {
          left: boundingBox.x,
          top: boundingBox.y,
          width: boundingBox.width,
          height: boundingBox.height,
        },
      }));
    }
  }, [artifact.documentId, setArtifact]);

  // Show compact result button when artifact is visible
  if (artifact.isVisible && result) {
    return <ImageToolResult isReadonly={isReadonly} result={result} />;
  }

  // Show generating state
  if (isGenerating || artifact.status === "streaming") {
    return <ImageGeneratingState title={result?.title} />;
  }

  // Show error state
  if (result?.status === "failed") {
    return (
      <div className="flex w-fit flex-row items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-red-600 dark:border-red-800 dark:bg-red-950/50">
        <ImageIcon />
        <span>Erro ao gerar imagem: {result.error}</span>
      </div>
    );
  }

  if (isDocumentsFetching) {
    return <ImageLoadingSkeleton />;
  }

  const document: Document | null = previewDocument ?? null;

  if (!document) {
    return <ImageLoadingSkeleton />;
  }

  return (
    <div className="relative w-full max-w-md cursor-pointer">
      <ImageHitboxLayer
        hitboxRef={hitboxRef}
        result={result}
        setArtifact={setArtifact}
      />
      <ImageHeader isStreaming={false} title={document.title} />
      <ImageContent document={document} />
    </div>
  );
}

// Generating state with animation
function ImageGeneratingState({ title }: { title?: string }) {
  return (
    <div className="flex w-fit flex-row items-center gap-3 rounded-xl border bg-gradient-to-r from-violet-50 to-purple-50 px-4 py-3 dark:from-violet-950/30 dark:to-purple-950/30 dark:border-violet-800">
      <div className="animate-spin text-violet-600 dark:text-violet-400">
        <LoaderIcon />
      </div>
      <div className="flex flex-col">
        <span className="font-medium text-violet-700 dark:text-violet-300">
          Gerando imagem...
        </span>
        {title && (
          <span className="text-sm text-violet-600/70 dark:text-violet-400/70">
            {title}
          </span>
        )}
      </div>
    </div>
  );
}

// Loading skeleton
function ImageLoadingSkeleton() {
  return (
    <div className="w-full max-w-md">
      <div className="flex h-[57px] flex-row items-center justify-between gap-2 rounded-t-2xl border border-b-0 p-4 dark:border-zinc-700 dark:bg-muted">
        <div className="flex flex-row items-center gap-3">
          <div className="text-muted-foreground">
            <div className="size-4 animate-pulse rounded-md bg-muted-foreground/20" />
          </div>
          <div className="h-4 w-24 animate-pulse rounded-lg bg-muted-foreground/20" />
        </div>
        <div>
          <FullscreenIcon />
        </div>
      </div>
      <div className="overflow-hidden rounded-b-2xl border border-t-0 bg-muted dark:border-zinc-700">
        <div className="h-[200px] w-full animate-pulse bg-muted-foreground/20" />
      </div>
    </div>
  );
}

// Clickable result button to reopen artifact
type ImageToolResultProps = {
  result: {
    id: string;
    title: string;
    status?: string;
  };
  isReadonly: boolean;
};

function PureImageToolResult({ result, isReadonly }: ImageToolResultProps) {
  const { setArtifact } = useArtifact();

  return (
    <button
      className="flex w-fit cursor-pointer flex-row items-center gap-3 rounded-xl border bg-background px-3 py-2 transition-colors hover:bg-muted"
      onClick={(event) => {
        if (isReadonly) {
          return;
        }

        const rect = event.currentTarget.getBoundingClientRect();

        const boundingBox = {
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
        };

        setArtifact((currentArtifact) => ({
          documentId: result.id,
          kind: "image",
          content: currentArtifact.content,
          title: result.title,
          isVisible: true,
          status: "idle",
          boundingBox,
        }));
      }}
      type="button"
    >
      <div className="text-muted-foreground">
        <ImageIcon />
      </div>
      <div className="text-left">Imagem gerada: "{result.title}"</div>
    </button>
  );
}

const ImageToolResult = memo(PureImageToolResult, () => true);

// Hitbox layer for click handling
const PureImageHitboxLayer = ({
  hitboxRef,
  result,
  setArtifact,
}: {
  hitboxRef: React.RefObject<HTMLDivElement>;
  result?: {
    id: string;
    title: string;
  };
  setArtifact: (
    updaterFn: UIArtifact | ((currentArtifact: UIArtifact) => UIArtifact)
  ) => void;
}) => {
  const handleClick = useCallback(
    (event: MouseEvent<HTMLElement>) => {
      if (!result) {
        return;
      }

      const boundingBox = event.currentTarget.getBoundingClientRect();

      setArtifact((artifact) =>
        artifact.status === "streaming"
          ? { ...artifact, isVisible: true }
          : {
              ...artifact,
              title: result.title,
              documentId: result.id,
              kind: "image",
              isVisible: true,
              boundingBox: {
                left: boundingBox.x,
                top: boundingBox.y,
                width: boundingBox.width,
                height: boundingBox.height,
              },
            }
      );
    },
    [setArtifact, result]
  );

  return (
    <div
      aria-hidden="true"
      className="absolute top-0 left-0 z-10 size-full rounded-xl"
      onClick={handleClick}
      ref={hitboxRef}
      role="presentation"
    >
      <div className="flex w-full items-center justify-end p-4">
        <div className="absolute top-[13px] right-[9px] rounded-md p-2 hover:bg-zinc-100 dark:hover:bg-zinc-700">
          <FullscreenIcon />
        </div>
      </div>
    </div>
  );
};

const ImageHitboxLayer = memo(PureImageHitboxLayer, (prevProps, nextProps) => {
  if (!equal(prevProps.result, nextProps.result)) {
    return false;
  }
  return true;
});

// Header component
const PureImageHeader = ({
  title,
  isStreaming,
}: {
  title: string;
  isStreaming: boolean;
}) => (
  <div className="flex flex-row items-center justify-between gap-2 rounded-t-2xl border border-b-0 p-4 dark:border-zinc-700 dark:bg-muted">
    <div className="flex flex-row items-center gap-3">
      <div className="text-muted-foreground">
        {isStreaming ? (
          <div className="animate-spin">
            <LoaderIcon />
          </div>
        ) : (
          <ImageIcon />
        )}
      </div>
      <div className="font-medium">{title}</div>
    </div>
    <div className="w-8" />
  </div>
);

const ImageHeader = memo(PureImageHeader, (prevProps, nextProps) => {
  if (prevProps.title !== nextProps.title) {
    return false;
  }
  if (prevProps.isStreaming !== nextProps.isStreaming) {
    return false;
  }
  return true;
});

// Content component with image thumbnail
const ImageContent = ({ document }: { document: Document }) => {
  const { artifact } = useArtifact();

  return (
    <div className="overflow-hidden rounded-b-2xl border border-t-0 dark:border-zinc-700 dark:bg-muted">
      <ImageEditor
        content={document.content ?? ""}
        currentVersionIndex={0}
        isCurrentVersion={true}
        isInline={true}
        status={artifact.status}
        title={document.title}
      />
    </div>
  );
};
