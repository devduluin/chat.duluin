// components/chat/ImagePreviewModal.tsx
"use client";

import { Dialog, DialogContent } from "../ui/dialog";
import { X, Download, ZoomIn, ZoomOut } from "lucide-react";
import { useState } from "react";
import { Button } from "../ui/button";

interface ImagePreviewModalProps {
  open: boolean;
  onClose: () => void;
  imageUrl: string;
  fileName: string;
}

export function ImagePreviewModal({
  open,
  onClose,
  imageUrl,
  fileName,
}: ImagePreviewModalProps) {
  const [zoom, setZoom] = useState(100);

  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = imageUrl;
    link.download = fileName;
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

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-full p-0 bg-black/95">
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 bg-black/50">
          <div className="text-white text-sm truncate flex-1">{fileName}</div>
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
        <div className="flex items-center justify-center min-h-[400px] max-h-[80vh] overflow-auto p-16">
          <img
            src={imageUrl}
            alt={fileName}
            style={{
              transform: `scale(${zoom / 100})`,
              transition: "transform 0.2s ease-in-out",
            }}
            className="max-w-full max-h-full object-contain"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
