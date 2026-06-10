import { useEffect, useState } from "react";
import { Image as KonvaImage } from "react-konva";
import type { BackgroundImage as BackgroundImageType } from "../../../types";

interface BackgroundImageProps {
  config: BackgroundImageType;
}

export function BackgroundImage({ config }: BackgroundImageProps) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    const img = new window.Image();
    // Set crossOrigin before assigning src so a CDN-hosted background doesn't
    // taint the Konva stage and break PNG export (stage.toDataURL throws
    // SecurityError on a tainted canvas). Harmless on data: URLs, so it's
    // applied unconditionally. Requires Access-Control-Allow-Origin on the host.
    img.crossOrigin = "anonymous";
    img.onload = () => setImage(img);
    img.src = config.url;
  }, [config.url]);

  if (!image) return null;

  return (
    <KonvaImage
      image={image}
      x={0}
      y={0}
      width={config.width}
      height={config.height}
      opacity={config.opacity}
      listening={false}
    />
  );
}
