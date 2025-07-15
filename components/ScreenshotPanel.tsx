import React from "react";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { Plus, Minus, RefreshCw } from "lucide-react";

interface ScreenshotPanelProps {
  screenshotUrl?: string;
}

const MIN_SCALE = 1;
const MAX_SCALE = 5;
const DEFAULT_SCALE = 1;
const ZOOM_STEP = 0.5;

export const ScreenshotPanel: React.FC<ScreenshotPanelProps> = ({ screenshotUrl }) => {
  if (!screenshotUrl) {
    return (
      <div className="flex items-center justify-center h-full text-slate-400">
        No screenshot available.
      </div>
    );
  }
  return (
    <div className="h-full w-full flex flex-col min-w-0 min-h-0">
      <TransformWrapper
        minScale={MIN_SCALE}
        maxScale={MAX_SCALE}
        initialScale={DEFAULT_SCALE}
        wheel={{ disabled: true }}
        doubleClick={{ disabled: true }}
        pinch={{ disabled: true }}
        panning={{ disabled: false }}
        zoomAnimation={{ size: 3 }}
        limitToBounds={true}
      >
        {({ zoomIn, zoomOut, resetTransform, ...rest }) => {
          const scale = (rest as any).state?.scale ?? 1;
          return (
            <>
              <div className="p-4 border-b border-slate-800 neon-accent flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="heading-3-neon">Screenshot</span>
                </div>
                <div className="flex gap-2 items-center">
                  <button
                    className="rounded bg-slate-800 hover:bg-slate-700 p-2 text-slate-200"
                    onClick={() => { zoomOut(ZOOM_STEP); }}
                    title="Zoom Out"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <button
                    className="rounded bg-slate-800 hover:bg-slate-700 p-2 text-slate-200"
                    onClick={() => { zoomIn(ZOOM_STEP); }}
                    title="Zoom In"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                  <button
                    className="rounded bg-slate-800 hover:bg-slate-700 p-2 text-slate-200"
                    onClick={() => {resetTransform(); }}
                    title="Fit to Screen"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="flex-1 bg-slate-900 rounded-b-lg border border-slate-700 border-t-0 overflow-hidden flex flex-col min-w-0 min-h-0">
                <TransformComponent>
                  <img
                    src={screenshotUrl}
                    alt="Mapping Screenshot"
                    className="select-none pointer-events-auto max-w-full max-h-full"
                    draggable={false}
                    style={{
                      width: "100%",
                      maxWidth: "100%",
                      height: "auto",
                      display: "block",
                      objectFit: "contain"
                    }}
                  />
                </TransformComponent>
              </div>
            </>
          );
        }}
      </TransformWrapper>
    </div>
  );
}; 