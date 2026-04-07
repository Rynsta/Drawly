"use client";

import getStroke from "perfect-freehand";
import {
  type CSSProperties,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  BRUSH_SIZE_DEFAULT,
  BRUSH_SIZE_MAX,
  BRUSH_SIZE_MIN,
  BRUSH_SIZE_STEP,
  DRAW_COLORS,
} from "@/lib/constants";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/Button";
import { hapticLight } from "@/lib/haptics";
import { sfxClick } from "@/lib/sfx";
import {
  Circle,
  Eraser,
  Highlighter,
  PaintBucket,
  Paintbrush,
  Pencil,
  Slash,
  Square,
  Triangle,
} from "lucide-react";

export type DrawTool =
  | "brush"
  | "pencil"
  | "highlighter"
  | "eraser"
  | "line"
  | "rect"
  | "ellipse"
  | "triangle"
  | "bucket";

export type FreehandStroke = {
  kind: "freehand";
  points: [number, number, number][];
  color: string;
  size: number;
  erase?: boolean;
  opacity?: number;
  strokeOptions?: {
    thinning: number;
    smoothing: number;
    streamline: number;
  };
};

export type ShapeKind = "rect" | "ellipse" | "triangle";

export type ShapeStroke = {
  kind: "shape";
  shape: ShapeKind;
  x: number;
  y: number;
  w: number;
  h: number;
  strokeColor: string;
  fillColor: string;
  lineWidth: number;
};

export type BucketStroke = {
  kind: "bucket";
  x: number;
  y: number;
  color: string;
  tolerance: number;
};

export type StrokeRecord = FreehandStroke | ShapeStroke | BucketStroke;

type DragPreview = {
  tool: "line" | "rect" | "ellipse" | "triangle";
  sx: number;
  sy: number;
  ex: number;
  ey: number;
};

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "").slice(0, 6);
  if (h.length !== 6) return [0, 0, 0];
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

function hexToRgbaFill(hex: string, alpha: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${alpha})`;
}

function lineToPoints(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  steps = 28,
): [number, number, number][] {
  const pts: [number, number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    pts.push([ax + (bx - ax) * t, ay + (by - ay) * t, 0.5]);
  }
  return pts;
}

function renderFreehand(ctx: CanvasRenderingContext2D, s: FreehandStroke) {
  if (s.points.length < 2) return;
  const outline = getStroke(
    s.points.map(([x, y, p]) => [x, y, p]),
    {
      size: s.size,
      thinning: s.strokeOptions?.thinning ?? 0.62,
      smoothing: s.strokeOptions?.smoothing ?? 0.62,
      streamline: s.strokeOptions?.streamline ?? 0.52,
      simulatePressure: true,
    },
  );
  if (outline.length < 3) return;
  ctx.beginPath();
  ctx.moveTo(outline[0][0], outline[0][1]);
  for (let i = 1; i < outline.length; i++) {
    ctx.lineTo(outline[i][0], outline[i][1]);
  }
  ctx.closePath();
  if (s.erase) {
    ctx.globalCompositeOperation = "destination-out";
    ctx.globalAlpha = 1;
    ctx.fillStyle = "rgba(0,0,0,1)";
  } else {
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = s.opacity ?? 1;
    ctx.fillStyle = s.color;
  }
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
}

function renderShapePath(
  ctx: CanvasRenderingContext2D,
  shape: ShapeKind,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  ctx.beginPath();
  if (shape === "rect") {
    ctx.rect(x, y, w, h);
  } else if (shape === "ellipse") {
    const rx = Math.max(0.5, w / 2);
    const ry = Math.max(0.5, h / 2);
    ctx.ellipse(x + w / 2, y + h / 2, rx, ry, 0, 0, Math.PI * 2);
  } else {
    ctx.moveTo(x + w / 2, y);
    ctx.lineTo(x + w, y + h);
    ctx.lineTo(x, y + h);
    ctx.closePath();
  }
}

function renderShape(ctx: CanvasRenderingContext2D, s: ShapeStroke) {
  const { x, y, w, h, strokeColor, fillColor, lineWidth, shape } = s;
  if (w < 1 || h < 1) return;
  ctx.save();
  renderShapePath(ctx, shape, x, y, w, h);
  ctx.fillStyle = fillColor;
  ctx.fill();
  ctx.lineWidth = lineWidth;
  ctx.strokeStyle = strokeColor;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  renderShapePath(ctx, shape, x, y, w, h);
  ctx.stroke();
  ctx.restore();
}

const BUCKET_MAX_OPS = 900_000;

function floodFillImageData(
  data: ImageData,
  w: number,
  h: number,
  sx: number,
  sy: number,
  fr: number,
  fg: number,
  fb: number,
  tolerance: number,
): void {
  const xi = Math.floor(sx);
  const yi = Math.floor(sy);
  if (xi < 0 || yi < 0 || xi >= w || yi >= h) return;
  const d = data.data;
  const start = (yi * w + xi) * 4;
  const tr = d[start];
  const tg = d[start + 1];
  const tb = d[start + 2];
  const ta = d[start + 3];

  const within = (i: number) =>
    Math.abs(d[i] - tr) <= tolerance &&
    Math.abs(d[i + 1] - tg) <= tolerance &&
    Math.abs(d[i + 2] - tb) <= tolerance &&
    Math.abs(d[i + 3] - ta) <= tolerance;

  if (within(start) && Math.abs(d[start] - fr) <= 3 && Math.abs(d[start + 1] - fg) <= 3 && Math.abs(d[start + 2] - fb) <= 3) {
    return;
  }

  const stack: [number, number][] = [[xi, yi]];
  const seen = new Uint8Array(w * h);
  let ops = 0;

  while (stack.length && ops < BUCKET_MAX_OPS) {
    ops++;
    const [x, y] = stack.pop()!;
    if (x < 0 || y < 0 || x >= w || y >= h) continue;
    const pi = y * w + x;
    if (seen[pi]) continue;
    const i = pi * 4;
    if (!within(i)) continue;
    seen[pi] = 1;
    d[i] = fr;
    d[i + 1] = fg;
    d[i + 2] = fb;
    d[i + 3] = 255;
    stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }
}

/**
 * Flood fill uses the canvas bitmap (device pixels). Logical pointer coords
 * must be scaled from layout size to bitmap size — using w×h here was wrong
 * and only filled a corner of high-DPI canvases.
 */
function applyBucket(
  ctx: CanvasRenderingContext2D,
  logicalW: number,
  logicalH: number,
  s: BucketStroke,
) {
  const canvas = ctx.canvas;
  const cw = canvas.width;
  const ch = canvas.height;
  if (cw < 1 || ch < 1 || logicalW < 1 || logicalH < 1) return;
  const bx = Math.max(
    0,
    Math.min(cw - 1, Math.floor((s.x / logicalW) * cw)),
  );
  const by = Math.max(
    0,
    Math.min(ch - 1, Math.floor((s.y / logicalH) * ch)),
  );
  const im = ctx.getImageData(0, 0, cw, ch);
  const [r, g, b] = hexToRgb(s.color);
  floodFillImageData(im, cw, ch, bx, by, r, g, b, s.tolerance);
  ctx.putImageData(im, 0, 0);
}

function drawStrokeRecord(
  ctx: CanvasRenderingContext2D,
  s: StrokeRecord,
  w: number,
  h: number,
) {
  switch (s.kind) {
    case "freehand":
      renderFreehand(ctx, s);
      break;
    case "shape":
      renderShape(ctx, s);
      break;
    case "bucket":
      applyBucket(ctx, w, h, s);
      break;
    default:
      break;
  }
}

function drawDragPreview(ctx: CanvasRenderingContext2D, dp: DragPreview) {
  const { sx, sy, ex, ey, tool } = dp;
  ctx.save();
  ctx.strokeStyle = "rgba(99, 102, 241, 0.9)";
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 4]);
  ctx.lineJoin = "round";
  if (tool === "line") {
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(ex, ey);
    ctx.stroke();
  } else {
    const x = Math.min(sx, ex);
    const y = Math.min(sy, ey);
    const rw = Math.abs(ex - sx);
    const rh = Math.abs(ey - sy);
    if (tool === "rect") {
      ctx.strokeRect(x, y, rw, rh);
    } else if (tool === "ellipse") {
      const rx = Math.max(0.5, rw / 2);
      const ry = Math.max(0.5, rh / 2);
      ctx.beginPath();
      ctx.ellipse(x + rw / 2, y + rh / 2, rx, ry, 0, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(x + rw / 2, y);
      ctx.lineTo(x + rw, y + rh);
      ctx.lineTo(x, y + rh);
      ctx.closePath();
      ctx.stroke();
    }
  }
  ctx.setLineDash([]);
  ctx.restore();
}

function renderStrokes(
  ctx: CanvasRenderingContext2D,
  strokes: StrokeRecord[],
  w: number,
  h: number,
  dragPreview: DragPreview | null,
  live: FreehandStroke | null,
) {
  ctx.save();
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);
  for (const s of strokes) {
    drawStrokeRecord(ctx, s, w, h);
  }
  if (dragPreview) {
    drawDragPreview(ctx, dragPreview);
  }
  if (live && live.points.length >= 2) {
    renderFreehand(ctx, live);
  }
  ctx.restore();
}

function cloneStrokes(strokes: StrokeRecord[]): StrokeRecord[] {
  return strokes.map((s) => {
    if (s.kind === "freehand") {
      return {
        ...s,
        points: s.points.map((p) => [...p] as [number, number, number]),
        strokeOptions: s.strokeOptions ? { ...s.strokeOptions } : undefined,
      };
    }
    if (s.kind === "shape") {
      return { ...s };
    }
    return { ...s };
  });
}

type Draft = { history: StrokeRecord[][]; idx: number };

const HIGHLIGHTER_DEFAULT = "#fef08a";
const BUCKET_TOLERANCE = 52;

function normalizeHex(v: string): string | null {
  const t = v.trim();
  if (/^#[0-9A-Fa-f]{6}$/.test(t)) return t.toLowerCase();
  if (/^[0-9A-Fa-f]{6}$/.test(t)) return `#${t.toLowerCase()}`;
  return null;
}

const DRAG_TOOLS = new Set<DrawTool>(["line", "rect", "ellipse", "triangle"]);

function clampBrushSize(n: number) {
  return Math.max(
    BRUSH_SIZE_MIN,
    Math.min(BRUSH_SIZE_MAX, Math.round(n)),
  );
}

function ToolGlyph({
  tool,
  className,
}: {
  tool: DrawTool;
  className?: string;
}) {
  const iconProps = {
    className: cn("h-5 w-5 shrink-0", className),
    strokeWidth: 1.75,
    "aria-hidden": true as const,
  };
  switch (tool) {
    case "brush":
      return <Paintbrush {...iconProps} />;
    case "pencil":
      return <Pencil {...iconProps} />;
    case "highlighter":
      return <Highlighter {...iconProps} />;
    case "eraser":
      return <Eraser {...iconProps} />;
    case "line":
      return <Slash {...iconProps} />;
    case "rect":
      return <Square {...iconProps} />;
    case "ellipse":
      return <Circle {...iconProps} />;
    case "triangle":
      return <Triangle {...iconProps} />;
    case "bucket":
      return <PaintBucket {...iconProps} />;
    default:
      return null;
  }
}

const TOOL_META: { id: DrawTool; label: string }[] = [
  { id: "brush", label: "Brush" },
  { id: "pencil", label: "Pencil" },
  { id: "highlighter", label: "Highlighter" },
  { id: "eraser", label: "Eraser" },
  { id: "line", label: "Line" },
  { id: "rect", label: "Square" },
  { id: "ellipse", label: "Circle" },
  { id: "triangle", label: "Triangle" },
  { id: "bucket", label: "Fill bucket" },
];

export function DrawingCanvas({
  className,
  disabled,
  onExport,
}: {
  className?: string;
  disabled?: boolean;
  onExport: (dataUrl: string) => void;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [draft, setDraft] = useState<Draft>({ history: [[]], idx: 0 });
  const strokes = useMemo(
    () => draft.history[draft.idx] ?? [],
    [draft.history, draft.idx],
  );

  const [color, setColor] = useState<string>(DRAW_COLORS[0]);
  const [hexInput, setHexInput] = useState<string>(DRAW_COLORS[0]);
  const [brushSize, setBrushSize] = useState(BRUSH_SIZE_DEFAULT);
  const [activeTool, setActiveTool] = useState<DrawTool>("brush");
  const drawing = useRef(false);
  const currentStroke = useRef<FreehandStroke | null>(null);
  const dragPreview = useRef<DragPreview | null>(null);
  const [cursor, setCursor] = useState<{
    x: number;
    y: number;
    show: boolean;
  }>({ x: 0, y: 0, show: false });

  const shapeLineWidth = useMemo(
    () => Math.max(2, Math.min(18, brushSize * 0.4)),
    [brushSize],
  );

  const previewDiameter = useMemo(() => {
    if (activeTool === "pencil") return brushSize * 1.35;
    if (activeTool === "highlighter") return brushSize * 2.4;
    if (activeTool === "eraser") return brushSize * 2.2;
    if (activeTool === "bucket") return 16;
    return brushSize * 2;
  }, [activeTool, brushSize]);

  const showBrushRing = useMemo(
    () =>
      ["brush", "pencil", "highlighter", "eraser", "bucket"].includes(
        activeTool,
      ),
    [activeTool],
  );

  const layoutSize = useCallback(() => {
    const el = wrapRef.current;
    if (!el) return { w: 800, h: 520 };
    const rect = el.getBoundingClientRect();
    const w = Math.max(320, Math.floor(rect.width));
    const h = Math.max(280, Math.floor(rect.height));
    return { w, h };
  }, []);

  const pushSnapshot = useCallback((next: StrokeRecord[]) => {
    const snap = cloneStrokes(next);
    setDraft((d) => {
      const base = d.history.slice(0, d.idx + 1);
      const history = [...base, snap];
      return { history, idx: history.length - 1 };
    });
  }, []);

  const undo = useCallback(() => {
    setDraft((d) => ({ ...d, idx: Math.max(0, d.idx - 1) }));
  }, []);

  const redo = useCallback(() => {
    setDraft((d) => ({
      ...d,
      idx: Math.min(d.history.length - 1, d.idx + 1),
    }));
  }, []);

  const clear = useCallback(() => {
    pushSnapshot([]);
  }, [pushSnapshot]);

  const paint = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { w, h } = layoutSize();
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    if (canvas.width !== Math.floor(w * dpr)) {
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const live = currentStroke.current;
    const dp = dragPreview.current;
    renderStrokes(ctx, strokes, w, h, dp, live);
  }, [layoutSize, strokes]);

  useEffect(() => {
    const el = wrapRef.current;
    const canvas = canvasRef.current;
    if (!canvas || !el) return;
    const paintFrame = () => requestAnimationFrame(paint);
    const ro = new ResizeObserver(paintFrame);
    ro.observe(el);
    requestAnimationFrame(paint);
    return () => ro.disconnect();
  }, [paint]);

  useEffect(() => {
    requestAnimationFrame(paint);
  }, [paint]);

  const beginFreehandStroke = (x: number, y: number, pressure: number) => {
    if (activeTool === "eraser") {
      currentStroke.current = {
        kind: "freehand",
        points: [[x, y, pressure]],
        color: "#000",
        size: brushSize * 2.2,
        erase: true,
      };
      return;
    }
    if (activeTool === "pencil") {
      currentStroke.current = {
        kind: "freehand",
        points: [[x, y, pressure]],
        color,
        size: brushSize * 1.45,
        strokeOptions: {
          thinning: 0.82,
          smoothing: 0.55,
          streamline: 0.62,
        },
      };
      return;
    }
    if (activeTool === "highlighter") {
      currentStroke.current = {
        kind: "freehand",
        points: [[x, y, pressure]],
        color,
        size: brushSize * 2.35,
        opacity: 0.42,
        strokeOptions: {
          thinning: 0.35,
          smoothing: 0.72,
          streamline: 0.48,
        },
      };
      return;
    }
    currentStroke.current = {
      kind: "freehand",
      points: [[x, y, pressure]],
      color,
      size: brushSize * 2,
    };
  };

  const updateCursor = (e: React.PointerEvent) => {
    if (disabled) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    if (x < 0 || y < 0 || x > rect.width || y > rect.height) {
      setCursor((c) => ({ ...c, show: false }));
      return;
    }
    setCursor({ x, y, show: true });
  };

  const commitDragShape = () => {
    const dp = dragPreview.current;
    dragPreview.current = null;
    if (!dp) return;
    const { sx, sy, ex, ey, tool } = dp;
    const x = Math.min(sx, ex);
    const y = Math.min(sy, ey);
    const rw = Math.abs(ex - sx);
    const rh = Math.abs(ey - sy);
    if (rw < 4 || rh < 4) {
      requestAnimationFrame(paint);
      return;
    }
    if (tool === "line") {
      const pts = lineToPoints(sx, sy, ex, ey);
      const stroke: FreehandStroke = {
        kind: "freehand",
        points: pts,
        color,
        size: brushSize * 2,
      };
      pushSnapshot([...strokes, stroke]);
      requestAnimationFrame(paint);
      return;
    }
    const shapeMap: Record<string, ShapeKind> = {
      rect: "rect",
      ellipse: "ellipse",
      triangle: "triangle",
    };
    const shape = shapeMap[tool];
    if (!shape) {
      requestAnimationFrame(paint);
      return;
    }
    const stroke: ShapeStroke = {
      kind: "shape",
      shape,
      x,
      y,
      w: rw,
      h: rh,
      strokeColor: color,
      fillColor: hexToRgbaFill(color, 0.22),
      lineWidth: shapeLineWidth,
    };
    pushSnapshot([...strokes, stroke]);
    requestAnimationFrame(paint);
  };

  const performBucket = (x: number, y: number) => {
    const stroke: BucketStroke = {
      kind: "bucket",
      x,
      y,
      color,
      tolerance: BUCKET_TOLERANCE,
    };
    pushSnapshot([...strokes, stroke]);
    requestAnimationFrame(paint);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (disabled) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (activeTool === "bucket") {
      e.currentTarget.setPointerCapture(e.pointerId);
      performBucket(x, y);
      return;
    }

    e.currentTarget.setPointerCapture(e.pointerId);
    const p = typeof e.pressure === "number" && e.pressure > 0 ? e.pressure : 0.5;
    drawing.current = true;

    if (DRAG_TOOLS.has(activeTool)) {
      dragPreview.current = {
        tool: activeTool as DragPreview["tool"],
        sx: x,
        sy: y,
        ex: x,
        ey: y,
      };
      currentStroke.current = null;
      requestAnimationFrame(paint);
      return;
    }

    dragPreview.current = null;
    beginFreehandStroke(x, y, p);
    requestAnimationFrame(paint);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    updateCursor(e);
    const canvas = canvasRef.current;
    if (!canvas || !drawing.current || disabled) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const p = typeof e.pressure === "number" && e.pressure > 0 ? e.pressure : 0.5;

    if (dragPreview.current) {
      dragPreview.current = {
        ...dragPreview.current,
        ex: x,
        ey: y,
      };
      requestAnimationFrame(paint);
      return;
    }

    if (!currentStroke.current) return;
    currentStroke.current.points.push([x, y, p]);
    requestAnimationFrame(paint);
  };

  const endStroke = () => {
    if (!drawing.current || disabled) {
      drawing.current = false;
      return;
    }
    drawing.current = false;

    if (dragPreview.current) {
      commitDragShape();
      return;
    }

    const finished = currentStroke.current;
    currentStroke.current = null;
    if (!finished || finished.points.length < 2) {
      requestAnimationFrame(paint);
      return;
    }
    const copy: FreehandStroke = {
      ...finished,
      kind: "freehand",
      points: finished.points.map((pt) => [...pt] as [number, number, number]),
      strokeOptions: finished.strokeOptions
        ? { ...finished.strokeOptions }
        : undefined,
    };
    pushSnapshot([...strokes, copy]);
    requestAnimationFrame(paint);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (disabled) return;
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      if (e.key === "[" || e.key === "]") {
        e.preventDefault();
        setBrushSize((s) =>
          e.key === "["
            ? clampBrushSize(s - BRUSH_SIZE_STEP)
            : clampBrushSize(s + BRUSH_SIZE_STEP),
        );
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [disabled, undo, redo]);

  const exportPng = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png", 0.88);
    onExport(dataUrl);
  }, [onExport]);

  const bumpBrush = (dir: -1 | 1) => {
    setBrushSize((s) => clampBrushSize(s + dir * BRUSH_SIZE_STEP));
  };

  const canDecreaseBrush =
    clampBrushSize(brushSize - BRUSH_SIZE_STEP) < brushSize;
  const canIncreaseBrush =
    clampBrushSize(brushSize + BRUSH_SIZE_STEP) > brushSize;

  const applyHex = (raw: string) => {
    setHexInput(raw);
    const n = normalizeHex(raw);
    if (n) {
      setColor(n);
      setActiveTool((t) => (t === "eraser" ? "brush" : t));
    }
  };

  const pickTool = (t: DrawTool) => {
    hapticLight();
    sfxClick();
    setActiveTool(t);
    if (t === "highlighter" && (color === "#18181b" || color === "#ffffff")) {
      setColor(HIGHLIGHTER_DEFAULT);
      setHexInput(HIGHLIGHTER_DEFAULT);
    }
  };

  const colorSwatches = useMemo(
    () =>
      DRAW_COLORS.map((c) => (
        <button
          key={c}
          type="button"
          aria-label={`Color ${c}`}
          className={cn(
            "h-8 w-8 rounded-full ring-2 ring-offset-2 ring-offset-zinc-900 transition-transform hover:scale-105",
            color === c && activeTool !== "eraser" ? "ring-white" : "ring-transparent",
            c === "#ffffff" ? "border border-white/30" : "",
          )}
          style={{ backgroundColor: c }}
          onClick={() => {
            setColor(c);
            setHexInput(c);
            if (activeTool === "eraser") setActiveTool("brush");
          }}
        />
      )),
    [color, activeTool],
  );

  const previewStyle: CSSProperties = {
    position: "absolute",
    left: cursor.x - previewDiameter / 2,
    top: cursor.y - previewDiameter / 2,
    width: previewDiameter,
    height: previewDiameter,
    borderRadius: activeTool === "bucket" ? "4px" : "50%",
    pointerEvents: "none",
    zIndex: 5,
    boxSizing: "border-box",
    ...(activeTool === "eraser"
      ? {
          border: "2px solid rgba(55, 65, 81, 0.95)",
          backgroundColor: "rgba(255,255,255,0.15)",
          boxShadow: "0 0 0 1px rgba(255,255,255,0.4)",
        }
      : activeTool === "highlighter"
        ? {
            border: "1px solid rgba(0,0,0,0.2)",
            backgroundColor: color,
            opacity: 0.45,
            boxShadow: "0 0 0 1px rgba(255,255,255,0.35)",
          }
        : activeTool === "bucket"
          ? {
              border: "2px solid rgba(0,0,0,0.45)",
              backgroundColor: color,
              boxShadow: "0 0 0 1px rgba(255,255,255,0.55)",
            }
          : {
              border: "2px solid rgba(0,0,0,0.35)",
              backgroundColor: color,
              boxShadow: "0 0 0 1px rgba(255,255,255,0.5)",
            }),
  };

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div
        ref={wrapRef}
        className="relative w-full overflow-hidden rounded-2xl ring-1 ring-white/10"
      >
        <canvas
          ref={canvasRef}
          className="drawing-surface block w-full touch-none bg-white"
          style={{
            cursor: disabled
              ? "not-allowed"
              : cursor.show && !DRAG_TOOLS.has(activeTool)
                ? "none"
                : "crosshair",
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endStroke}
          onPointerCancel={endStroke}
          onPointerEnter={(e) => updateCursor(e)}
          onPointerLeave={() => {
            if (drawing.current) endStroke();
            setCursor((c) => ({ ...c, show: false }));
          }}
        />
        {cursor.show && !disabled && showBrushRing && (
          <div
            className="pointer-events-none"
            style={previewStyle}
            aria-hidden
          />
        )}
        {disabled && (
          <div className="absolute inset-0 z-10 bg-night/40 backdrop-blur-[2px]" />
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {TOOL_META.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            aria-label={label}
            title={label}
            disabled={disabled}
            onClick={() => pickTool(id)}
            className={cn(
              "flex h-11 w-11 items-center justify-center rounded-2xl border transition-all duration-200 ease-out",
              "hover:-translate-y-1 hover:shadow-lg hover:shadow-violet-500/15",
              "active:translate-y-0 active:scale-[0.96] disabled:pointer-events-none disabled:opacity-40",
              activeTool === id
                ? "border-violet-400/45 bg-gradient-to-br from-violet-500/35 to-fuchsia-600/25 text-white shadow-md shadow-violet-900/30"
                : "border-white/15 bg-white/[0.07] text-zinc-200 hover:border-white/25 hover:bg-white/12",
            )}
          >
            <ToolGlyph tool={id} />
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-2">{colorSwatches}</div>
        <label className="flex cursor-pointer items-center gap-2 rounded-full border border-white/15 bg-white/5 px-2 py-1.5 text-xs text-zinc-300 hover:bg-white/10">
          <span className="sr-only">Custom color</span>
          <input
            type="color"
            value={color.length === 7 ? color : "#000000"}
            onChange={(e) => {
              const v = e.target.value.toLowerCase();
              setColor(v);
              setHexInput(v);
              if (activeTool === "eraser") setActiveTool("brush");
            }}
            className="h-7 w-10 cursor-pointer rounded border-0 bg-transparent p-0"
            disabled={disabled}
          />
          Custom
        </label>
        <div className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-night-deep/80 px-2 py-1">
          <span className="text-[10px] uppercase tracking-wider text-zinc-500">
            Hex
          </span>
          <input
            type="text"
            value={hexInput}
            onChange={(e) => applyHex(e.target.value)}
            onBlur={() => {
              const n = normalizeHex(hexInput);
              if (n) setHexInput(n);
              else setHexInput(color);
            }}
            spellCheck={false}
            maxLength={7}
            disabled={disabled}
            className="w-[5.5rem] rounded-md border border-white/10 bg-night px-2 py-1 font-mono text-xs text-white outline-none focus:ring-1 focus:ring-violet-500"
            placeholder="#000000"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-zinc-500">Size</span>
        <Button
          type="button"
          variant="secondary"
          className="min-w-[2.5rem] px-2 text-sm font-bold"
          disabled={disabled || !canDecreaseBrush}
          onClick={() => bumpBrush(-1)}
          aria-label="Decrease brush size"
        >
          −
        </Button>
        <input
          type="number"
          min={BRUSH_SIZE_MIN}
          max={BRUSH_SIZE_MAX}
          step={1}
          value={brushSize}
          disabled={disabled}
          onChange={(e) => {
            const v = parseInt(e.target.value, 10);
            if (Number.isFinite(v)) setBrushSize(clampBrushSize(v));
          }}
          onBlur={() => setBrushSize((s) => clampBrushSize(s))}
          aria-label="Brush size"
          className="w-[3.25rem] rounded-lg border border-white/15 bg-night px-1.5 py-1.5 text-center font-mono text-xs tabular-nums text-zinc-100 outline-none focus:ring-1 focus:ring-violet-500 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
        <span className="text-xs tabular-nums text-zinc-500">px</span>
        <Button
          type="button"
          variant="secondary"
          className="min-w-[2.5rem] px-2 text-sm font-bold"
          disabled={disabled || !canIncreaseBrush}
          onClick={() => bumpBrush(1)}
          aria-label="Increase brush size"
        >
          +
        </Button>
        <span className="text-xs text-zinc-500">
          step ±{BRUSH_SIZE_STEP} · [ / ]
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" onClick={undo} disabled={disabled}>
          Undo
        </Button>
        <Button type="button" variant="secondary" onClick={redo} disabled={disabled}>
          Redo
        </Button>
        <Button type="button" variant="ghost" onClick={clear} disabled={disabled}>
          Clear
        </Button>
        <Button type="button" onClick={exportPng} disabled={disabled}>
          Submit drawing
        </Button>
      </div>
    </div>
  );
}
