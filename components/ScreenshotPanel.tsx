import React from "react";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";

interface ScreenshotPanelProps {
  screenshotUrl?: string;
}

const MIN_SCALE = 0.5;
const MAX_SCALE = 5;

export const ScreenshotPanel: React.FC<ScreenshotPanelProps> = ({ screenshotUrl }) => {
  if (!screenshotUrl) {
    return (
      <div className="flex items-center justify-center h-full text-slate-400">
        No screenshot available.
      </div>
    );
  }
  return (
    <div className="h-full w-full flex flex-col">
      {/* Styled header to match Test Results */}
      <div className="p-4 border-b border-slate-800 neon-accent flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-semibold neon-text">Screenshot</span>
        </div>
      </div>
      <div className="flex-1 bg-slate-900 rounded-b-lg border border-slate-700 border-t-0 overflow-auto flex flex-col">
        <TransformWrapper
          wheel={{ step: 3 }}
          minScale={MIN_SCALE}
          maxScale={MAX_SCALE}
          zoomAnimation={{ size: 3 }}
        >
          {({ setTransform, ...rest }) => {
            const scale = (rest as any).state?.scale ?? 1;
            return (
              <div
                className="h-full w-full"
                style={{ minHeight: 0, minWidth: 0 }}
                onDoubleClick={() => {
                  if (scale > MAX_SCALE - 0.2) {
                    setTransform(0, 0, MIN_SCALE, 200, "easeOut");
                  } else {
                    setTransform(0, 0, MAX_SCALE, 200, "easeOut");
                  }
                }}
              >
                <TransformComponent>
                  <div className="h-full w-full flex items-center justify-center">
                    <img
                      src={screenshotUrl}
                      alt="Mapping Screenshot"
                      className="select-none"
                      draggable={false}
                      style={{
                        width: "100%",
                        height: "auto",
                        display: "block"
                      }}
                    />
                  </div>
                </TransformComponent>
              </div>
            );
          }}
        </TransformWrapper>
      </div>
      <div className="text-xs text-slate-500 mt-2 px-4">Scroll, pinch, or use mouse wheel to zoom and pan. Double-click to zoom to max/min.</div>
    </div>
  );
}; 