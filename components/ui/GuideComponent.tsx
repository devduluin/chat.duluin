"use client";
import React, {
  createContext,
  useContext,
  useState,
  useRef,
  useEffect,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";

type GuidePosition = "top" | "right" | "bottom" | "left";

type GuideConfig = {
  title: string;
  description: string;
  icon?: React.ReactNode;
  position?: GuidePosition;
  onClose?: () => void;
  buttonText?: string;
};

type GuideContextType = {
  showGuide: (target: HTMLElement, config: GuideConfig) => void;
  hideGuide: () => void;
};

const GuideContext = createContext<GuideContextType | undefined>(undefined);

export function GuideProvider({ children }: { children: React.ReactNode }) {
  const [isVisible, setIsVisible] = useState(false);
  const [config, setConfig] = useState<GuideConfig>({
    title: "",
    description: "",
    buttonText: "Got it",
  });
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const showGuide = React.useCallback(
    (target: HTMLElement, config: GuideConfig) => {
      setTargetRect(target.getBoundingClientRect());
      setConfig({
        buttonText: "Got it",
        ...config,
      });
      setIsVisible(true);
    },
    []
  );

  const hideGuide = React.useCallback(() => {
    if (config.onClose) {
      config.onClose();
    }
    setIsVisible(false);
  }, [config]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        overlayRef.current &&
        !overlayRef.current.contains(e.target as Node)
      ) {
        hideGuide();
      }
    };

    if (isVisible) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isVisible, hideGuide]);

  const getPositionStyle = (
    rect: DOMRect,
    position: GuidePosition = "bottom"
  ) => {
    const offset = 12; // Space between target and tooltip
    const tooltipWidth = 280;
    const tooltipHeight = 160; // Approximate height

    // Calculate target center points
    const targetCenterX = rect.left + rect.width / 2;
    const targetCenterY = rect.top + rect.height / 2;

    switch (position) {
      case "top":
        return {
          left: targetCenterX,
          top: rect.top - offset,
          transform: "translate(-50%, -100%)", // Center horizontally, position above
        };
      case "right":
        return {
          left: rect.right + offset,
          top: targetCenterY - tooltipHeight / 2, // Position top at center minus half height
        };
      case "left":
        return {
          left: rect.left - offset - tooltipWidth,
          top: targetCenterY - tooltipHeight / 2, // Position top at center minus half height
        };
      case "bottom":
      default:
        return {
          left: targetCenterX - tooltipWidth / 2,
          top: rect.bottom + offset,
          transform: "translateX(-50%)", // Center horizontally, position below
        };
    }
  };

  const getArrowStyle = (position: GuidePosition = "bottom") => {
    const baseStyle = {
      position: "absolute",
      width: "12px",
      height: "12px",
      backgroundColor: "hsl(240 10% 96%)",
      transform: "rotate(45deg)",
      zIndex: 1,
    } as React.CSSProperties;

    switch (position) {
      case "top":
        return {
          ...baseStyle,
          bottom: "-6px",
          left: "50%",
          transform: "translateX(-50%) rotate(45deg)",
          boxShadow: "2px 2px 2px rgba(0,0,0,0.05)",
        };
      case "right":
        return {
          ...baseStyle,
          left: "-6px",
          top: "50%",
          transform: "translateY(-50%) rotate(45deg)",
          boxShadow: "-2px 2px 2px rgba(0,0,0,0.05)",
        };
      case "left":
        return {
          ...baseStyle,
          right: "-6px",
          top: "50%",
          transform: "translateY(-50%) rotate(45deg)",
          boxShadow: "2px -2px 2px rgba(0,0,0,0.05)",
        };
      case "bottom":
      default:
        return {
          ...baseStyle,
          top: "-6px",
          left: "50%",
          transform: "translateX(-50%) rotate(45deg)",
          boxShadow: "-2px -2px 2px rgba(0,0,0,0.05)",
        };
    }
  };

  // Removed body scroll lock to allow page interaction
  // The guide should not prevent users from scrolling or interacting with the page

  return (
    <GuideContext.Provider value={{ showGuide, hideGuide }}>
      {children}

      <AnimatePresence>
        {isVisible && targetRect && (
          <>
            {/* BACKDROP with masked hole */}
            <div className="fixed inset-0 z-[10] pointer-events-none">
              {/* Dimmed + blurred backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="absolute inset-0 bg-blue-700/30 backdrop-blur-[1px] pointer-events-none"
              />

              {/* Highlight ring over target */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed z-[9999] pointer-events-none ring-2 ring-white/80 rounded-md shadow-lg animate-pulse"
                style={{
                  left: `${targetRect.left - 4}px`,
                  top: `${targetRect.top - 4}px`,
                  width: `${targetRect.width + 8}px`,
                  height: `${targetRect.height + 8}px`,
                  background: "transparent",
                  backdropFilter: "none",
                  WebkitBackdropFilter: "none",
                }}
              />

              {/* TOOLTIP / POPOVER */}
              <motion.div
                ref={overlayRef}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ type: "spring", damping: 20, stiffness: 300 }}
                className="fixed z-[9999] p-4 max-h-[200px] rounded-xl bg-white border border-gray-200 shadow-xl max-w-[280px] pointer-events-auto"
                style={getPositionStyle(targetRect, config.position)}
              >
                {/* Arrow */}
                {config.position && (
                  <div style={getArrowStyle(config.position)} />
                )}

                <div className="relative z-[9999]">
                  <div className="flex justify-between items-start gap-3 mb-3">
                    <div className="flex items-start gap-3">
                      {/* Optional Icon */}
                      {/* {config.icon && (
                  <div className="flex-shrink-0 mt-0.5 p-1.5 bg-blue-100 rounded-lg text-blue-600">
                    {config.icon}
                  </div>
                )} */}
                      <div>
                        <h3 className="font-semibold text-sm text-gray-900 leading-tight inline-flex items-center gap-1">
                          <Lightbulb className="h-4 w-4 text-yellow-500" />
                          {config.title}
                        </h3>
                        <p className="text-xs text-gray-600 mt-1 text-justify">
                          {config.description}
                        </p>
                      </div>
                    </div>
                    {/* <button
                onClick={hideGuide}
                className="flex-shrink-0 p-1 rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
                aria-label="Close guide"
              >
                <X className="h-4 w-4" />
              </button> */}
                  </div>

                  <div className="flex justify-end mt-4">
                    <Button
                      size="xs"
                      className="bg-blue-600 text-xs hover:bg-blue-700 text-white"
                      onClick={hideGuide}
                    >
                      {config.buttonText}
                    </Button>
                  </div>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </GuideContext.Provider>
  );
}

export const useGuide = () => {
  const context = useContext(GuideContext);
  if (!context) {
    throw new Error("useGuide must be used within a GuideProvider");
  }
  return context;
};
