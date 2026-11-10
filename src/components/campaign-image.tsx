"use client";
import { useState } from "react";
import Image from "next/image";

export function CampaignImage({ src, title }: { src: string; title: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <div className="campaign-image-fallback">Banner indisponível</div>;
  return (
    <Image
      className="campaign-image"
      src={src}
      alt={title}
      fill
      unoptimized
      sizes="(max-width: 767px) 100vw, 33vw"
      onError={() => setFailed(true)}
    />
  );
}
