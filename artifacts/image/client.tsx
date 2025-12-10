import { toast } from "sonner";
import { Artifact } from "@/components/create-artifact";
import {
  CheckCircleFillIcon,
  CopyIcon,
  DownloadIcon,
  RedoIcon,
  SparklesIcon,
  UndoIcon,
} from "@/components/icons";
import { ImageEditor } from "@/components/image-editor";

interface ImageMetadata {
  status: "draft" | "approved" | "posted";
  approvedAt?: string;
}

export const imageArtifact = new Artifact<"image", ImageMetadata>({
  kind: "image",
  description: "AI-generated images for social media content",
  initialize: ({ setMetadata }) => {
    setMetadata({
      status: "draft",
    });
  },
  onStreamPart: ({ streamPart, setArtifact }) => {
    if (streamPart.type === "data-imageDelta") {
      setArtifact((draftArtifact) => ({
        ...draftArtifact,
        content: streamPart.data,
        isVisible: true,
        status: "streaming",
      }));
    }
  },
  content: ImageEditor,
  actions: [
    {
      icon: <CheckCircleFillIcon size={18} />,
      label: "Approve",
      description: "Approve this image for posting",
      onClick: ({ setMetadata }) => {
        setMetadata((metadata) => ({
          ...metadata,
          status: "approved",
          approvedAt: new Date().toISOString(),
        }));
        toast.success("Image approved! Ready for posting.");
      },
      isDisabled: ({ metadata }) => metadata?.status === "approved",
    },
    {
      icon: <UndoIcon size={18} />,
      description: "View Previous version",
      onClick: ({ handleVersionChange }) => {
        handleVersionChange("prev");
      },
      isDisabled: ({ currentVersionIndex }) => currentVersionIndex === 0,
    },
    {
      icon: <RedoIcon size={18} />,
      description: "View Next version",
      onClick: ({ handleVersionChange }) => {
        handleVersionChange("next");
      },
      isDisabled: ({ isCurrentVersion }) => isCurrentVersion,
    },
    {
      icon: <DownloadIcon size={18} />,
      description: "Download image",
      onClick: ({ content }) => {
        const link = document.createElement("a");
        link.href = `data:image/png;base64,${content}`;
        link.download = `generated-image-${Date.now()}.png`;
        link.click();
        toast.success("Image downloaded!");
      },
    },
    {
      icon: <CopyIcon size={18} />,
      description: "Copy image to clipboard",
      onClick: ({ content }) => {
        const img = new Image();
        img.src = `data:image/png;base64,${content}`;

        img.onload = () => {
          const canvas = document.createElement("canvas");
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext("2d");
          ctx?.drawImage(img, 0, 0);
          canvas.toBlob((blob) => {
            if (blob) {
              navigator.clipboard.write([
                new ClipboardItem({ "image/png": blob }),
              ]);
            }
          }, "image/png");
        };

        toast.success("Copied image to clipboard!");
      },
    },
  ],
  toolbar: [
    {
      icon: <SparklesIcon />,
      description: "Generate variation",
      onClick: ({ sendMessage }) => {
        sendMessage({
          role: "user",
          parts: [
            {
              type: "text",
              text: "Generate a variation of this image with a slightly different composition or style.",
            },
          ],
        });
      },
    },
  ],
});
