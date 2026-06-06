// components/chat/ImagePreviewModal.tsx
"use client";

import { Dialog, DialogContent, DialogTitle } from "../ui/dialog";
import {
  X,
  Download,
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { Button } from "../ui/button";

interface ImageItem {
  url: string;
  fileName: string;
}

interface ImagePreviewModalProps {
  open: boolean;
  onClose: () => void;
  images: ImageItem[];
  initialIndex?: number;
}

export function ImagePreviewModal({
  open,
  onClose,
  images,
  initialIndex = 0,
}: ImagePreviewModalProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [zoom, setZoom] = useState(100);

  const currentImage = images[currentIndex];
  const hasMultiple = images.length > 1;

  useEffect(() => {
    if (open) {
      setCurrentIndex(initialIndex);
      setZoom(100);
    }
  }, [open, initialIndex]);

  const goNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % images.length);
    setZoom(100);
  }, [images.length]);

  const goPrev = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
    setZoom(100);
  }, [images.length]);

  useEffect(() => {
    if (!open || !hasMultiple) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, hasMultiple, goNext, goPrev]);

  const handleDownload = () => {
    if (!currentImage) return;
    const link = document.createElement("a");
    link.href = currentImage.url;
    link.download = currentImage.fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 25, 200));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 25, 50));
  };

  if (!currentImage) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="!max-w-[96vw] !w-full h-[92vh] p-0 bg-black/95 flex flex-col overflow-hidden border-zinc-800">
        <DialogTitle className="sr-only">{currentImage.fileName}</DialogTitle>

        {/* Header */}
        <div className="w-full flex items-center justify-between p-4 bg-black/50 z-10 border-b border-zinc-800/50">
          <div className="text-white text-sm truncate flex-1 mr-4">
            {currentImage.fileName}
            {hasMultiple && (
              <span className="ml-2 text-white/60">
                ({currentIndex + 1}/{images.length})
              </span>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleZoomOut}
              disabled={zoom <= 50}
              className="text-white hover:bg-white/20 h-9 w-9"
            >
              <ZoomOut className="h-5 w-5" />
            </Button>
            <span className="text-white text-sm min-w-[50px] text-center select-none">
              {zoom}%
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleZoomIn}
              disabled={zoom >= 200}
              className="text-white hover:bg-white/20 h-9 w-9"
            >
              <ZoomIn className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDownload}
              className="text-white hover:bg-white/20 h-9 w-9"
            >
              <Download className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-white hover:bg-white/20 h-9 w-9"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Image Container Utama */}
        <div className="relative flex-1 w-full flex items-center justify-center p-2 min-h-0 overflow-auto select-none">
          {hasMultiple && (
            <button
              onClick={goPrev}
              className="absolute left-6 top-1/2 -translate-y-1/2 z-20 bg-black/60 hover:bg-black/80 text-white p-3 rounded-full transition-colors backdrop-blur-sm border border-white/10"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
          )}

          <div className="w-full h-full flex items-center justify-center p-2">
            <img
              src={currentImage.url}
              alt={currentImage.fileName}
              style={{
                transform: `scale(${zoom / 100})`,
                transition: "transform 0.2s ease-in-out",
              }}
              className="w-full h-full object-contain pointer-events-none"
            />
          </div>

          {hasMultiple && (
            <button
              onClick={goNext}
              className="absolute right-6 top-1/2 -translate-y-1/2 z-20 bg-black/60 hover:bg-black/80 text-white p-3 rounded-full transition-colors backdrop-blur-sm border border-white/10"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          )}
        </div>

        {/* Thumbnail strip */}
        {hasMultiple && (
          <div className="w-full flex items-center justify-center gap-2 p-4 bg-black/50 border-t border-zinc-800/50 z-10 overflow-x-auto">
            {images.map((img, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setCurrentIndex(idx);
                  setZoom(100);
                }}
                className={`w-14 h-14 rounded-md overflow-hidden border-2 flex-shrink-0 transition-all ${idx === currentIndex
                    ? "border-white opacity-100 scale-105 shadow-md shadow-black"
                    : "border-transparent opacity-40 hover:opacity-75"
                  }`}
              >
                <img
                  src={img.url}
                  alt={img.fileName}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}