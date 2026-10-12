import type { Stroke, BackgroundType, Point } from '../types';

export interface CanvasDimensions {
  width: number;
  height: number;
}

// Draw the authentic notebook paper background
export function drawPaperBackground(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  background: BackgroundType
) {
  ctx.save();
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  if (background === 'lined') {
    // Ruled / Lined notebook paper
    const lineSpacing = 32;
    const topMargin = 50;

    // Red left margin line
    const marginX = 64;
    ctx.beginPath();
    ctx.moveTo(marginX, 0);
    ctx.lineTo(marginX, height);
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.35)'; // soft red margin
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Secondary subtle double line
    ctx.beginPath();
    ctx.moveTo(marginX + 4, 0);
    ctx.lineTo(marginX + 4, height);
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.15)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Horizontal ruled lines
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    for (let y = topMargin; y < height; y += lineSpacing) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
  } else if (background === 'graph') {
    // Graph / Grid paper
    const gridSize = 24;

    ctx.strokeStyle = '#f1f5f9';
    ctx.lineWidth = 1;
    for (let x = 0; x < width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Major grid lines every 5 units
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1.2;
    for (let x = 0; x < width; x += gridSize * 5) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += gridSize * 5) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
  } else if (background === 'dotted') {
    // Dotted bullet journal paper
    const dotSpacing = 24;
    ctx.fillStyle = '#cbd5e1';

    for (let x = dotSpacing; x < width; x += dotSpacing) {
      for (let y = dotSpacing; y < height; y += dotSpacing) {
        ctx.beginPath();
        ctx.arc(x, y, 1.25, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  ctx.restore();
}

// Render a single stroke with smooth quadratic curve interpolation
export function renderStroke(ctx: CanvasRenderingContext2D, stroke: Stroke) {
  if (stroke.points.length === 0) return;

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (stroke.tool === 'highlighter') {
    ctx.globalAlpha = 0.35;
    ctx.strokeStyle = stroke.color;
    ctx.fillStyle = stroke.color;
    ctx.lineWidth = stroke.width;
    // Highlight blends naturally with ink below
    ctx.globalCompositeOperation = 'multiply';
  } else if (stroke.tool === 'pencil') {
    ctx.globalAlpha = 0.8;
    ctx.strokeStyle = stroke.color;
    ctx.fillStyle = stroke.color;
    ctx.lineWidth = stroke.width;
    ctx.globalCompositeOperation = 'source-over';
  } else if (stroke.tool === 'eraser') {
    ctx.globalCompositeOperation = 'destination-out';
    ctx.strokeStyle = 'rgba(0,0,0,1)';
    ctx.lineWidth = stroke.width;
  } else {
    // Standard pen
    ctx.globalAlpha = 1;
    ctx.strokeStyle = stroke.color;
    ctx.fillStyle = stroke.color;
    ctx.lineWidth = stroke.width;
    ctx.globalCompositeOperation = 'source-over';
  }

  const pts = stroke.points;

  // Single dot
  if (pts.length === 1) {
    const p = pts[0];
    const r = (stroke.width / 2) * (p.pressure ? 0.6 + p.pressure * 0.8 : 1);
    ctx.beginPath();
    ctx.arc(p.x, p.y, Math.max(1, r), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }

  // Two points
  if (pts.length === 2) {
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    ctx.lineTo(pts[1].x, pts[1].y);
    ctx.stroke();
    ctx.restore();
    return;
  }

  // Smooth quadratic curves through midpoints
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);

  for (let i = 1; i < pts.length - 1; i++) {
    const midX = (pts[i].x + pts[i + 1].x) / 2;
    const midY = (pts[i].y + pts[i + 1].y) / 2;
    ctx.quadraticCurveTo(pts[i].x, pts[i].y, midX, midY);
  }

  // Last segment
  const lastIndex = pts.length - 1;
  ctx.lineTo(pts[lastIndex].x, pts[lastIndex].y);
  ctx.stroke();

  ctx.restore();
}

// Distance from point to line segment
function distToSegmentSquared(p: Point, v: Point, w: Point): number {
  const l2 = (w.x - v.x) ** 2 + (w.y - v.y) ** 2;
  if (l2 === 0) return (p.x - v.x) ** 2 + (p.y - v.y) ** 2;
  let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
  t = Math.max(0, Math.min(1, t));
  return (p.x - (v.x + t * (w.x - v.x))) ** 2 + (p.y - (v.y + t * (w.y - v.y))) ** 2;
}

// Check if a point hits a stroke for the stroke eraser
export function hitTestStroke(stroke: Stroke, testPoint: Point, tolerance = 14): boolean {
  const pts = stroke.points;
  const tolSq = (tolerance + stroke.width / 2) ** 2;

  if (pts.length === 1) {
    const dx = pts[0].x - testPoint.x;
    const dy = pts[0].y - testPoint.y;
    return dx * dx + dy * dy <= tolSq;
  }

  for (let i = 0; i < pts.length - 1; i++) {
    const distSq = distToSegmentSquared(testPoint, pts[i], pts[i + 1]);
    if (distSq <= tolSq) {
      return true;
    }
  }

  return false;
}

// Render complete page to offscreen high-res canvas for export
export function renderPageToCanvas(
  background: BackgroundType,
  strokes: Stroke[],
  width = 1200,
  height = 1600
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  // Render background
  drawPaperBackground(ctx, width, height, background);

  // Render strokes
  for (const stroke of strokes) {
    renderStroke(ctx, stroke);
  }

  return canvas;
}
