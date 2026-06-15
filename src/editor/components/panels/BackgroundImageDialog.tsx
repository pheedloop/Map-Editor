import { useState, useRef } from "react";
import { Button, Dialog } from "../ui";

type SizeMode = "resize-canvas" | "fit-image";

interface BackgroundImageDialogProps {
  canvasWidth: number;
  canvasHeight: number;
  /**
   * When provided, the dialog delegates the upload to the host instead of
   * inlining a data URL. It sends the raw File and stores the returned hosted
   * URL. `width`/`height` may be null (e.g. dimension-less SVGs), in which case
   * the dialog measures the returned image client-side before confirming.
   */
  onUpload?: (file: File) => Promise<{
    url: string;
    width: number | null;
    height: number | null;
  }>;
  onConfirm: (
    url: string,
    imageWidth: number,
    imageHeight: number,
    mode: SizeMode
  ) => void;
  onClose: () => void;
}

/** Load a URL into an Image and read its intrinsic pixel dimensions. */
function measureImage(
  url: string
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    // Match the canvas loader so a cross-origin asset can be measured/exported.
    img.crossOrigin = "anonymous";
    img.onload = () =>
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => reject(new Error("Could not load image"));
    img.src = url;
  });
}

export function BackgroundImageDialog({
  canvasWidth,
  canvasHeight,
  onUpload,
  onConfirm,
  onClose,
}: BackgroundImageDialogProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [imageSize, setImageSize] = useState<{ width: number; height: number } | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<SizeMode>("fit-image");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    setFile(selected);
    setError(null);
    // Attempt a client-side preview + measurement. This only succeeds for
    // browser-renderable images; for PDF/DXF the load fails silently and the
    // host returns authoritative dimensions after upload.
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const img = new Image();
      img.onload = () => {
        setPreview(dataUrl);
        setImageSize({ width: img.width, height: img.height });
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(selected);
  };

  const reset = () => {
    setPreview(null);
    setImageSize(null);
    setFile(null);
    setError(null);
  };

  // With an upload handler, any selected file can be submitted (the server
  // validates). Without one, we need a rendered preview to inline its data URL.
  const canConfirm = onUpload ? !!file : !!preview && !!imageSize;

  const handleConfirm = async () => {
    if (!canConfirm) return;

    if (onUpload && file) {
      setPending(true);
      setError(null);
      try {
        const result = await onUpload(file);
        let { width, height } = result;
        if (width == null || height == null) {
          const measured = await measureImage(result.url);
          width = measured.width;
          height = measured.height;
        }
        // On success the parent applies state and closes this dialog.
        onConfirm(result.url, width, height, mode);
      } catch {
        // Generic message — the host surfaces its own detailed errors.
        setError("Upload failed. Please try again.");
        setPending(false);
      }
      return;
    }

    // Legacy inline path: store the data URL directly.
    if (preview && imageSize) {
      onConfirm(preview, imageSize.width, imageSize.height, mode);
    }
  };

  const selected = !!file;

  return (
    <Dialog
      title="Background Image"
      onClose={onClose}
      width="480px"
      footer={
        <>
          <Button variant="outline" color="neutral" onClick={onClose} disabled={pending}>Cancel</Button>
          <Button variant="solid" color="primary" onClick={handleConfirm} disabled={!canConfirm || pending}>
            {pending ? "Uploading…" : "Apply"}
          </Button>
        </>
      }
    >
      <div className="p-4 flex flex-col gap-4">
        {!selected ? (
          <div
            onClick={() => fileRef.current?.click()}
            className="flex flex-col items-center justify-center h-40 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-primary-400 hover:bg-gray-50 transition-colors"
          >
            <span className="text-sm text-gray-500">
              Click to select a file
            </span>
            <span className="text-xs text-gray-400 mt-1">
              PNG, JPG, SVG{onUpload ? ", PDF, DXF" : ""}
            </span>
            <input
              ref={fileRef}
              type="file"
              accept={onUpload ? "image/*,.pdf,.dxf,application/pdf" : "image/*"}
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
        ) : (
          <>
            <div className="flex items-center justify-center h-40 bg-gray-100 rounded-lg overflow-hidden">
              {preview ? (
                <img
                  src={preview}
                  alt="Preview"
                  className="max-h-full max-w-full object-contain"
                />
              ) : (
                <span className="text-xs text-gray-500 px-4 text-center truncate">
                  {file?.name}
                </span>
              )}
            </div>

            <div className="text-xs text-gray-500">
              {imageSize ? (
                <>
                  Image: {imageSize.width} &times; {imageSize.height}px
                  &nbsp;&middot;&nbsp;
                </>
              ) : null}
              Canvas: {canvasWidth} &times; {canvasHeight}px
            </div>

            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="sizeMode"
                  checked={mode === "fit-image"}
                  onChange={() => setMode("fit-image")}
                  className="accent-primary-600"
                />
                <div>
                  <span className="text-xs font-medium text-gray-700">
                    Fit image to canvas
                  </span>
                  <p className="text-[11px] text-gray-400">
                    Scale the image to match the current canvas size
                  </p>
                </div>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="sizeMode"
                  checked={mode === "resize-canvas"}
                  onChange={() => setMode("resize-canvas")}
                  className="accent-primary-600"
                />
                <div>
                  <span className="text-xs font-medium text-gray-700">
                    Resize canvas to match image
                  </span>
                  <p className="text-[11px] text-gray-400">
                    Change the floor plan dimensions to fit the image
                  </p>
                </div>
              </label>
            </div>

            {error && (
              <p className="text-xs text-red-600">{error}</p>
            )}

            <Button variant="ghost" color="neutral" className="px-0 self-start" onClick={reset} disabled={pending}>
              Choose different file
            </Button>
          </>
        )}
      </div>
    </Dialog>
  );
}
