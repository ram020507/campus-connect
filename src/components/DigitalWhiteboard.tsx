import { useRef, useState, useEffect, useCallback, forwardRef, useImperativeHandle } from "react";
import { Button } from "@/components/ui/button";
import { Pen, Eraser, Undo2, Redo2, Trash2, Download, Palette } from "lucide-react";

interface Stroke {
  points: { x: number; y: number }[];
  color: string;
  width: number;
  tool: "pen" | "eraser";
}

export interface WhiteboardRef {
  getStrokes: () => Stroke[];
  setStrokes: (strokes: Stroke[]) => void;
  toDataURL: () => string;
}

interface DigitalWhiteboardProps {
  onStrokesChange?: (strokes: Stroke[]) => void;
  readOnly?: boolean;
}

const COLORS = ["#000000", "#ef4444", "#3b82f6", "#22c55e", "#f59e0b", "#8b5cf6", "#ec4899", "#ffffff"];
const PEN_WIDTHS = [2, 4, 6, 8];

const DigitalWhiteboard = forwardRef<WhiteboardRef, DigitalWhiteboardProps>(
  ({ onStrokesChange, readOnly = false }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [strokes, setStrokes] = useState<Stroke[]>([]);
    const [currentStroke, setCurrentStroke] = useState<Stroke | null>(null);
    const [undoneStrokes, setUndoneStrokes] = useState<Stroke[]>([]);
    const [tool, setTool] = useState<"pen" | "eraser">("pen");
    const [color, setColor] = useState("#000000");
    const [penWidth, setPenWidth] = useState(4);
    const [showColors, setShowColors] = useState(false);
    const isDrawing = useRef(false);

    useImperativeHandle(ref, () => ({
      getStrokes: () => strokes,
      setStrokes: (newStrokes: Stroke[]) => {
        setStrokes(newStrokes);
        setUndoneStrokes([]);
      },
      toDataURL: () => canvasRef.current?.toDataURL("image/png") || "",
    }));

    const drawAll = useCallback(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const allStrokes = currentStroke ? [...strokes, currentStroke] : strokes;
      for (const stroke of allStrokes) {
        if (stroke.points.length < 2) continue;
        ctx.beginPath();
        ctx.strokeStyle = stroke.tool === "eraser" ? "#ffffff" : stroke.color;
        ctx.lineWidth = stroke.tool === "eraser" ? stroke.width * 4 : stroke.width;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
        for (let i = 1; i < stroke.points.length; i++) {
          ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
        }
        ctx.stroke();
      }
    }, [strokes, currentStroke]);

    useEffect(() => {
      drawAll();
    }, [drawAll]);

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const resizeCanvas = () => {
        const parent = canvas.parentElement;
        if (!parent) return;
        const rect = parent.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = Math.max(400, rect.height);
        drawAll();
      };
      resizeCanvas();
      window.addEventListener("resize", resizeCanvas);
      return () => window.removeEventListener("resize", resizeCanvas);
    }, []);

    const getPos = (e: React.MouseEvent | React.TouchEvent) => {
      const canvas = canvasRef.current!;
      const rect = canvas.getBoundingClientRect();
      if ("touches" in e) {
        return {
          x: e.touches[0].clientX - rect.left,
          y: e.touches[0].clientY - rect.top,
        };
      }
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
      if (readOnly) return;
      e.preventDefault();
      isDrawing.current = true;
      const pos = getPos(e);
      setCurrentStroke({
        points: [pos],
        color,
        width: penWidth,
        tool,
      });
    };

    const draw = (e: React.MouseEvent | React.TouchEvent) => {
      if (!isDrawing.current || readOnly) return;
      e.preventDefault();
      const pos = getPos(e);
      setCurrentStroke((prev) => {
        if (!prev) return null;
        return { ...prev, points: [...prev.points, pos] };
      });
    };

    const endDraw = () => {
      if (!isDrawing.current) return;
      isDrawing.current = false;
      if (currentStroke && currentStroke.points.length > 1) {
        const newStrokes = [...strokes, currentStroke];
        setStrokes(newStrokes);
        setUndoneStrokes([]);
        onStrokesChange?.(newStrokes);
      }
      setCurrentStroke(null);
    };

    const undo = () => {
      if (strokes.length === 0) return;
      const last = strokes[strokes.length - 1];
      setStrokes((prev) => prev.slice(0, -1));
      setUndoneStrokes((prev) => [...prev, last]);
      const newStrokes = strokes.slice(0, -1);
      onStrokesChange?.(newStrokes);
    };

    const redo = () => {
      if (undoneStrokes.length === 0) return;
      const last = undoneStrokes[undoneStrokes.length - 1];
      setUndoneStrokes((prev) => prev.slice(0, -1));
      const newStrokes = [...strokes, last];
      setStrokes(newStrokes);
      onStrokesChange?.(newStrokes);
    };

    const clear = () => {
      setStrokes([]);
      setUndoneStrokes([]);
      onStrokesChange?.([]);
    };

    const download = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const link = document.createElement("a");
      link.download = `whiteboard-${Date.now()}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    };

    return (
      <div className="flex flex-col h-full">
        {!readOnly && (
          <div className="flex flex-wrap items-center gap-1 p-2 border-b bg-card">
            <Button
              variant={tool === "pen" ? "default" : "outline"}
              size="sm"
              onClick={() => setTool("pen")}
            >
              <Pen className="h-4 w-4" />
            </Button>
            <Button
              variant={tool === "eraser" ? "default" : "outline"}
              size="sm"
              onClick={() => setTool("eraser")}
            >
              <Eraser className="h-4 w-4" />
            </Button>
            <div className="relative">
              <Button variant="outline" size="sm" onClick={() => setShowColors(!showColors)}>
                <Palette className="h-4 w-4" />
                <span
                  className="ml-1 w-3 h-3 rounded-full border"
                  style={{ backgroundColor: color }}
                />
              </Button>
              {showColors && (
                <div className="absolute top-full left-0 z-50 mt-1 p-2 bg-card border rounded-md shadow-lg flex gap-1 flex-wrap w-36">
                  {COLORS.map((c) => (
                    <button
                      key={c}
                      className={`w-6 h-6 rounded-full border-2 ${color === c ? "border-primary" : "border-muted"}`}
                      style={{ backgroundColor: c }}
                      onClick={() => { setColor(c); setShowColors(false); }}
                    />
                  ))}
                </div>
              )}
            </div>
            <select
              className="h-9 rounded-md border border-input bg-background px-2 text-xs"
              value={penWidth}
              onChange={(e) => setPenWidth(Number(e.target.value))}
            >
              {PEN_WIDTHS.map((w) => (
                <option key={w} value={w}>{w}px</option>
              ))}
            </select>
            <div className="w-px h-6 bg-border mx-1" />
            <Button variant="outline" size="sm" onClick={undo} disabled={strokes.length === 0}>
              <Undo2 className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={redo} disabled={undoneStrokes.length === 0}>
              <Redo2 className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={clear}>
              <Trash2 className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={download}>
              <Download className="h-4 w-4" />
            </Button>
          </div>
        )}
        <div className="flex-1 relative bg-white overflow-hidden">
          <canvas
            ref={canvasRef}
            className="absolute inset-0 touch-none"
            onMouseDown={startDraw}
            onMouseMove={draw}
            onMouseUp={endDraw}
            onMouseLeave={endDraw}
            onTouchStart={startDraw}
            onTouchMove={draw}
            onTouchEnd={endDraw}
          />
        </div>
      </div>
    );
  }
);

DigitalWhiteboard.displayName = "DigitalWhiteboard";

export default DigitalWhiteboard;
export type { Stroke };
