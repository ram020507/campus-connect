import { useRef, useState, useEffect, useCallback, forwardRef, useImperativeHandle } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Pen, Eraser, Undo2, Redo2, Trash2, Download, Palette } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Point { x: number; y: number }

interface StrokeEvent {
  type: "stroke" | "erase" | "clear";
  strokeId: string;
  points: Point[];
  color: string;
  size: number;
  sender: string;
}

export interface WhiteboardRef {
  getStrokes: () => StrokeEvent[];
  setStrokes: (strokes: StrokeEvent[]) => void;
  toDataURL: () => string;
}

interface DigitalWhiteboardProps {
  sessionId?: string;
  userId?: string;
  readOnly?: boolean;
  disabled?: boolean;
}

const COLORS = ["#000000", "#ef4444", "#3b82f6", "#22c55e", "#f59e0b", "#8b5cf6", "#ec4899", "#ffffff"];

const genId = () => Math.random().toString(36).substring(2, 10);

const DigitalWhiteboard = forwardRef<WhiteboardRef, DigitalWhiteboardProps>(
  ({ sessionId, userId = "anon", readOnly = false, disabled = false }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const eventsRef = useRef<StrokeEvent[]>([]);
    const [tool, setTool] = useState<"pen" | "eraser">("pen");
    const [color, setColor] = useState("#000000");
    const [penWidth, setPenWidth] = useState(4);
    const [showColors, setShowColors] = useState(false);
    const [undoStack, setUndoStack] = useState<StrokeEvent[]>([]);
    const isDrawing = useRef(false);
    const currentPoints = useRef<Point[]>([]);
    const currentStrokeId = useRef<string>("");
    const broadcastThrottle = useRef<number>(0);
    const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
    const [, forceUpdate] = useState(0);

    useImperativeHandle(ref, () => ({
      getStrokes: () => eventsRef.current,
      setStrokes: (s: StrokeEvent[]) => { eventsRef.current = s; redraw(); },
      toDataURL: () => canvasRef.current?.toDataURL("image/png") || "",
    }));

    const getCanvas = useCallback(() => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const ctx = canvas.getContext("2d");
      return ctx ? { canvas, ctx } : null;
    }, []);

    const drawStroke = useCallback((ctx: CanvasRenderingContext2D, ev: StrokeEvent) => {
      if (ev.type === "clear") return;
      if (ev.points.length < 2) return;
      ctx.beginPath();
      ctx.strokeStyle = ev.type === "erase" ? "#ffffff" : ev.color;
      ctx.lineWidth = ev.type === "erase" ? ev.size * 4 : ev.size;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.moveTo(ev.points[0].x, ev.points[0].y);
      for (let i = 1; i < ev.points.length; i++) {
        ctx.lineTo(ev.points[i].x, ev.points[i].y);
      }
      ctx.stroke();
    }, []);

    const redraw = useCallback(() => {
      const c = getCanvas();
      if (!c) return;
      const { canvas, ctx } = c;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      for (const ev of eventsRef.current) {
        if (ev.type === "clear") {
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        } else {
          drawStroke(ctx, ev);
        }
      }
    }, [getCanvas, drawStroke]);

    // Resize canvas
    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const resize = () => {
        const parent = canvas.parentElement;
        if (!parent) return;
        const rect = parent.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        canvas.width = rect.width * dpr;
        canvas.height = Math.max(400, rect.height) * dpr;
        canvas.style.width = `${rect.width}px`;
        canvas.style.height = `${Math.max(400, rect.height)}px`;
        const ctx = canvas.getContext("2d");
        if (ctx) ctx.scale(dpr, dpr);
        redraw();
      };
      resize();
      window.addEventListener("resize", resize);
      return () => window.removeEventListener("resize", resize);
    }, []);

    // Load persisted board events on mount
    useEffect(() => {
      if (!sessionId) return;
      const loadEvents = async () => {
        const { data } = await supabase
          .from("board_events")
          .select("*")
          .eq("session_id", sessionId)
          .order("created_at", { ascending: true });
        if (data && data.length > 0) {
          eventsRef.current = data.map((d: any) => ({
            type: d.event_type as StrokeEvent["type"],
            strokeId: d.stroke_id || genId(),
            points: (d.points as any) || [],
            color: d.color || "#000000",
            size: d.size || 4,
            sender: d.sender,
          }));
          redraw();
        }
      };
      loadEvents();
    }, [sessionId]);

    // Supabase Realtime broadcast for live drawing
    useEffect(() => {
      if (!sessionId) return;
      const channelName = `bev-live-${sessionId}`;
      const channel = supabase.channel(channelName, {
        config: { broadcast: { self: false } },
      });
      channelRef.current = channel;

      channel.on("broadcast", { event: "draw-points" }, ({ payload }) => {
        if (payload.sender === userId) return;
        // Live streaming points - draw incrementally
        const c = getCanvas();
        if (!c) return;
        const { ctx } = c;
        const pts = payload.points as Point[];
        if (pts.length < 2) return;
        ctx.beginPath();
        ctx.strokeStyle = payload.type === "erase" ? "#ffffff" : payload.color;
        ctx.lineWidth = payload.type === "erase" ? payload.size * 4 : payload.size;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
        ctx.stroke();
      });

      channel.on("broadcast", { event: "stroke-complete" }, ({ payload }) => {
        if (payload.sender === userId) return;
        const ev: StrokeEvent = payload as StrokeEvent;
        eventsRef.current.push(ev);
        if (ev.type === "clear") {
          redraw();
        }
        // Already drawn incrementally, no need to redraw for strokes
      });

      channel.subscribe();

      return () => { supabase.removeChannel(channel); channelRef.current = null; };
    }, [sessionId, userId, getCanvas, redraw]);

    const getPos = (e: React.MouseEvent | React.TouchEvent): Point => {
      const canvas = canvasRef.current!;
      const rect = canvas.getBoundingClientRect();
      if ("touches" in e) {
        return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
      }
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    const broadcastLivePoints = useCallback((pts: Point[], type: string, clr: string, sz: number) => {
      const now = Date.now();
      if (now - broadcastThrottle.current < 40) return; // ~25fps
      broadcastThrottle.current = now;
      channelRef.current?.send({
        type: "broadcast",
        event: "draw-points",
        payload: { points: pts.slice(-5), color: clr, size: sz, type, sender: userId },
      });
    }, [userId]);

    const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
      if (readOnly || disabled) return;
      e.preventDefault();
      isDrawing.current = true;
      const pos = getPos(e);
      currentStrokeId.current = genId();
      currentPoints.current = [pos];
    };

    const draw = (e: React.MouseEvent | React.TouchEvent) => {
      if (!isDrawing.current || readOnly || disabled) return;
      e.preventDefault();
      const pos = getPos(e);
      currentPoints.current.push(pos);

      // Draw locally
      const c = getCanvas();
      if (c && currentPoints.current.length >= 2) {
        const pts = currentPoints.current;
        const p1 = pts[pts.length - 2];
        const p2 = pts[pts.length - 1];
        c.ctx.beginPath();
        c.ctx.strokeStyle = tool === "eraser" ? "#ffffff" : color;
        c.ctx.lineWidth = tool === "eraser" ? penWidth * 4 : penWidth;
        c.ctx.lineCap = "round";
        c.ctx.lineJoin = "round";
        c.ctx.moveTo(p1.x, p1.y);
        c.ctx.lineTo(p2.x, p2.y);
        c.ctx.stroke();
      }

      broadcastLivePoints(currentPoints.current, tool, color, penWidth);
    };

    const endDraw = () => {
      if (!isDrawing.current) return;
      isDrawing.current = false;
      if (currentPoints.current.length > 1) {
        const ev: StrokeEvent = {
          type: tool === "eraser" ? "erase" : "stroke",
          strokeId: currentStrokeId.current,
          points: currentPoints.current,
          color,
          size: penWidth,
          sender: userId,
        };
        eventsRef.current.push(ev);
        setUndoStack([]);
        forceUpdate((n) => n + 1);

        // Broadcast completion
        channelRef.current?.send({
          type: "broadcast",
          event: "stroke-complete",
          payload: ev,
        });

        // Persist to DB
        if (sessionId) {
          supabase.from("board_events").insert({
            session_id: sessionId,
            event_type: ev.type,
            stroke_id: ev.strokeId,
            points: ev.points as any,
            color: ev.color,
            size: ev.size,
            sender: ev.sender,
          }).then(() => {});
        }
      }
      currentPoints.current = [];
    };

    const undo = () => {
      if (eventsRef.current.length === 0) return;
      const last = eventsRef.current.pop()!;
      setUndoStack((prev) => [...prev, last]);
      redraw();
      forceUpdate((n) => n + 1);
    };

    const redo = () => {
      if (undoStack.length === 0) return;
      const last = undoStack[undoStack.length - 1];
      setUndoStack((prev) => prev.slice(0, -1));
      eventsRef.current.push(last);
      redraw();
      forceUpdate((n) => n + 1);
    };

    const clear = () => {
      const ev: StrokeEvent = {
        type: "clear",
        strokeId: genId(),
        points: [],
        color: "",
        size: 0,
        sender: userId,
      };
      eventsRef.current.push(ev);
      setUndoStack([]);
      redraw();
      forceUpdate((n) => n + 1);

      channelRef.current?.send({
        type: "broadcast",
        event: "stroke-complete",
        payload: ev,
      });

      if (sessionId) {
        supabase.from("board_events").insert({
          session_id: sessionId,
          event_type: "clear",
          stroke_id: ev.strokeId,
          points: [] as any,
          color: "",
          size: 0,
          sender: ev.sender,
        }).then(() => {});
      }
    };

    const download = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      // Create a temp canvas without DPR scaling for download
      const tmpCanvas = document.createElement("canvas");
      const rect = canvas.getBoundingClientRect();
      tmpCanvas.width = rect.width;
      tmpCanvas.height = rect.height;
      const tmpCtx = tmpCanvas.getContext("2d")!;
      tmpCtx.drawImage(canvas, 0, 0, tmpCanvas.width, tmpCanvas.height);
      const link = document.createElement("a");
      link.download = `whiteboard-${Date.now()}.png`;
      link.href = tmpCanvas.toDataURL("image/png");
      link.click();
    };

    const isLocked = readOnly || disabled;

    return (
      <div className="flex flex-col h-full">
        {!readOnly && (
          <div className="flex flex-wrap items-center gap-1 p-2 border-b bg-card">
            <Button variant={tool === "pen" ? "default" : "outline"} size="sm" onClick={() => setTool("pen")} disabled={disabled}>
              <Pen className="h-4 w-4" />
            </Button>
            <Button variant={tool === "eraser" ? "default" : "outline"} size="sm" onClick={() => setTool("eraser")} disabled={disabled}>
              <Eraser className="h-4 w-4" />
            </Button>
            <div className="relative">
              <Button variant="outline" size="sm" onClick={() => setShowColors(!showColors)} disabled={disabled}>
                <Palette className="h-4 w-4" />
                <span className="ml-1 w-3 h-3 rounded-full border" style={{ backgroundColor: color }} />
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
            <div className="w-20 flex items-center gap-1">
              <Slider
                value={[penWidth]}
                min={1}
                max={12}
                step={1}
                onValueChange={([v]) => setPenWidth(v)}
                disabled={disabled}
              />
              <span className="text-xs text-muted-foreground w-6">{penWidth}px</span>
            </div>
            <div className="w-px h-6 bg-border mx-1" />
            <Button variant="outline" size="sm" onClick={undo} disabled={disabled || eventsRef.current.length === 0}>
              <Undo2 className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={redo} disabled={disabled || undoStack.length === 0}>
              <Redo2 className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={clear} disabled={disabled}>
              <Trash2 className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={download}>
              <Download className="h-4 w-4" />
            </Button>
          </div>
        )}
        {disabled && (
          <div className="bg-accent/30 text-accent-foreground text-xs text-center py-1">
            Teacher is presenting — your input is temporarily disabled.
          </div>
        )}
        <div className="flex-1 relative bg-white overflow-hidden">
          <canvas
            ref={canvasRef}
            className="absolute inset-0 touch-none"
            style={{ cursor: isLocked ? "not-allowed" : "crosshair" }}
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
export type { StrokeEvent as Stroke };
