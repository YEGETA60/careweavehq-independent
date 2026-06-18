import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Eraser } from "lucide-react";

interface SignaturePadProps {
  value?: string;
  onChange: (dataUrl: string) => void;
  label?: string;
  height?: number;
}

export function SignaturePad({ value, onChange, label, height = 160 }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);
  const [hasInk, setHasInk] = useState(!!value);

  // Initialize canvas size for crisp lines
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = height * dpr;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "hsl(var(--foreground))";
    if (value) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0, rect.width, height);
      img.src = value;
    }
  }, [height, value]);

  const getPoint = (e: React.PointerEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const start = (e: React.PointerEvent) => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    drawing.current = true;
    const { x, y } = getPoint(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    (e.target as Element).setPointerCapture(e.pointerId);
  };

  const move = (e: React.PointerEvent) => {
    if (!drawing.current) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const { x, y } = getPoint(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasInk(true);
  };

  const end = () => {
    if (!drawing.current) return;
    drawing.current = false;
    const canvas = canvasRef.current;
    if (!canvas) return;
    onChange(canvas.toDataURL("image/png"));
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasInk(false);
    onChange("");
  };

  return (
    <div className="space-y-2">
      {label && <p className="text-sm font-medium text-foreground">{label}</p>}
      <div className="border border-border rounded-md bg-card relative">
        <canvas
          ref={canvasRef}
          style={{ height, width: "100%", touchAction: "none" }}
          className="rounded-md"
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={end}
          onPointerLeave={end}
        />
        {!hasInk && (
          <span className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground pointer-events-none">
            Sign here
          </span>
        )}
      </div>
      <div className="flex justify-end no-print">
        <Button type="button" variant="ghost" size="sm" onClick={clear}>
          <Eraser className="h-3 w-3 mr-1" /> Clear
        </Button>
      </div>
    </div>
  );
}