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

  // Reset state when modal opens or initialIndex changes
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

  // Keyboard navigation
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
      <DialogContent className="max-w-4xl w-full p-0 bg-black/95">
        <DialogTitle className="sr-only">{currentImage.fileName}</DialogTitle>
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 bg-black/50">
          <div className="text-white text-sm truncate flex-1">
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
              className="text-white hover:bg-white/20"
            >
              <ZoomOut className="h-5 w-5" />
            </Button>
            <span className="text-white text-sm min-w-[60px] text-center">
              {zoom}%
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleZoomIn}
              disabled={zoom >= 200}
              className="text-white hover:bg-white/20"
            >
              <ZoomIn className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDownload}
              className="text-white hover:bg-white/20"
            >
              <Download className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-white hover:bg-white/20"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Image Container */}
        <div className="relative flex items-center justify-center min-h-[400px] max-h-[80vh] overflow-auto p-16">
          {/* Prev button */}
          {hasMultiple && (
            <button
              onClick={goPrev}
              className="absolute left-2 top-1/2 -translate-y-1/2 z-10 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-colors"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
          )}

          <img
            src={currentImage.url}
            alt={currentImage.fileName}
            style={{
              transform: `scale(${zoom / 100})`,
              transition: "transform 0.2s ease-in-out",
            }}
            className="max-w-full max-h-full object-contain"
          />

          {/* Next button */}
          {hasMultiple && (
            <button
              onClick={goNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 z-10 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-colors"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          )}
        </div>

        {/* Thumbnail strip for multiple images */}
        {hasMultiple && (
          <div className="absolute bottom-0 left-0 right-0 z-10 flex items-center justify-center gap-2 p-3 bg-black/50">
            {images.map((img, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setCurrentIndex(idx);
                  setZoom(100);
                }}
                className={`w-12 h-12 rounded-md overflow-hidden border-2 transition-all ${
                  idx === currentIndex
                    ? "border-white opacity-100 scale-110"
                    : "border-transparent opacity-50 hover:opacity-75"
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
