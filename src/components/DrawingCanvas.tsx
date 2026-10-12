import { useRef, useState, useEffect, useCallback } from 'react';
import {
  Pen,
  Highlighter,
  Eraser,
  Undo2,
  Redo2,
  Trash2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  ChevronLeft,
  ChevronRight,
  Plus,
  FileMinus,
} from 'lucide-react';
import type { CanvasPage, ToolType, BackgroundType, Stroke, Point } from '../types';
import {
  drawPaperBackground,
  renderStroke,
  hitTestStroke,
} from '../utils/canvasRenderer';
import { ConfirmModal } from './ConfirmModal';

interface DrawingCanvasProps {
  page: CanvasPage;
  pageIndex: number;
  totalPages: number;
  onUpdatePage: (updatedPage: CanvasPage) => void;
  onAddPage: () => void;
  onDeletePage: () => void;
  onSwitchPage: (newIndex: number) => void;
}

// Curated harmonious color palette
const PRESET_COLORS = [
  '#0f172a', // Deep Charcoal
  '#2563eb', // Royal Blue
  '#1d4ed8', // Dark Navy
  '#dc2626', // Crimson Red
  '#16a34a', // Forest Green
  '#7c3aed', // Violet
  '#ea580c', // Amber Orange
  '#f59e0b', // Golden
  '#fef08a', // Highlighter Yellow
  '#bbf7d0', // Highlighter Mint
  '#fbcfe8', // Highlighter Rose
];

const STROKE_WIDTHS = [
  { label: 'Fine', value: 2, size: 4 },
  { label: 'Medium', value: 4, size: 7 },
  { label: 'Bold', value: 8, size: 11 },
  { label: 'Marker', value: 16, size: 16 },
];

export const DrawingCanvas: React.FC<DrawingCanvasProps> = ({
  page,
  pageIndex,
  totalPages,
  onUpdatePage,
  onAddPage,
  onDeletePage,
  onSwitchPage,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Drawing state
  const [activeTool, setActiveTool] = useState<ToolType>('pen');
  const [activeColor, setActiveColor] = useState<string>('#0f172a');
  const [strokeWidth, setStrokeWidth] = useState<number>(4);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const currentStrokeRef = useRef<Stroke | null>(null);
  const activePointerIdRef = useRef<number | null>(null);

  // Undo/Redo stacks
  const [redoStack, setRedoStack] = useState<Stroke[]>([]);

  // Zoom state
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Modal confirmations
  const [showClearConfirm, setShowClearConfirm] = useState<boolean>(false);
  const [showDeletePageConfirm, setShowDeletePageConfirm] = useState<boolean>(false);

  // Sheet dimensions (standard digital notebook paper aspect ratio ~3:4 or A4 ratio 850x1100)
  const SHEET_WIDTH = 900;
  const SHEET_HEIGHT = 1200;

  // Redraw canvas content
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw background paper
    drawPaperBackground(ctx, SHEET_WIDTH, SHEET_HEIGHT, page.background);

    // Render all saved strokes
    for (const stroke of page.strokes) {
      renderStroke(ctx, stroke);
    }

    // Render active stroke if currently drawing
    if (currentStrokeRef.current) {
      renderStroke(ctx, currentStrokeRef.current);
    }
  }, [page.background, page.strokes]);

  // Handle mobile screen width auto-scaling on mount and device rotation
  useEffect(() => {
    const handleScreenResize = () => {
      if (containerRef.current) {
        const availableW = containerRef.current.clientWidth;
        if (availableW < 940) {
          // On mobile screens, fit paper width smoothly with slight margin
          const optimalZoom = Math.min(1, Math.max(0.35, (availableW - 32) / SHEET_WIDTH));
          setZoomLevel(Number(optimalZoom.toFixed(2)));
        }
      }
    };

    handleScreenResize();
    window.addEventListener('resize', handleScreenResize);
    window.addEventListener('orientationchange', handleScreenResize);
    return () => {
      window.removeEventListener('resize', handleScreenResize);
      window.removeEventListener('orientationchange', handleScreenResize);
    };
  }, [SHEET_WIDTH]);

  // Fullscreen change listener
  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  // Initialize and resize canvas with DPI scaling
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = SHEET_WIDTH * dpr;
    canvas.height = SHEET_HEIGHT * dpr;
    canvas.style.width = `${SHEET_WIDTH}px`;
    canvas.style.height = `${SHEET_HEIGHT}px`;

    ctx.scale(dpr, dpr);
    redrawCanvas();
  }, [redrawCanvas]);

  // Keyboard shortcuts (Ctrl+Z, Ctrl+Y, Ctrl+Shift+Z)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in an input or textarea
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
        e.preventDefault();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        handleRedo();
        e.preventDefault();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  // Calculate coordinates relative to canvas sheet
  const getCanvasCoords = (e: React.PointerEvent<HTMLCanvasElement>): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = SHEET_WIDTH / rect.width;
    const scaleY = SHEET_HEIGHT / rect.height;

    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
      pressure: e.pressure > 0 ? e.pressure : 0.5,
    };
  };

  // Pointer Down
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return; // Left click only
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Palm rejection: if already drawing with a pointer, ignore new touches
    if (activePointerIdRef.current !== null && activePointerIdRef.current !== e.pointerId) {
      return;
    }

    activePointerIdRef.current = e.pointerId;

    // Capture pointer for continuous tracking outside canvas boundary
    try {
      canvas.setPointerCapture(e.pointerId);
    } catch {
      // Ignored if capture unsupported
    }

    const point = getCanvasCoords(e);
    setIsDrawing(true);

    if (activeTool === 'eraser') {
      // Stroke eraser: check if touched any existing stroke
      eraseAtPoint(point);
    } else {
      // Calculate tool specific properties
      let effWidth = strokeWidth;
      let effOpacity = 1;

      if (activeTool === 'highlighter') {
        effWidth = Math.max(strokeWidth * 3.5, 24);
        effOpacity = 0.35;
      } else if (activeTool === 'pencil') {
        effOpacity = 0.8;
      }

      const newStroke: Stroke = {
        id: 'stroke_' + Math.random().toString(36).substring(2, 9),
        tool: activeTool,
        color: activeColor,
        width: effWidth,
        opacity: effOpacity,
        points: [point],
      };

      currentStrokeRef.current = newStroke;
      redrawCanvas();
    }
  };

  // Pointer Move
  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    if (activePointerIdRef.current !== null && activePointerIdRef.current !== e.pointerId) return;

    const point = getCanvasCoords(e);

    if (activeTool === 'eraser') {
      eraseAtPoint(point);
    } else if (currentStrokeRef.current) {
      currentStrokeRef.current.points.push(point);
      redrawCanvas();
    }
  };

  // Pointer Up / Cancel
  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    if (activePointerIdRef.current !== null && activePointerIdRef.current !== e.pointerId) return;

    setIsDrawing(false);
    activePointerIdRef.current = null;

    try {
      canvasRef.current?.releasePointerCapture(e.pointerId);
    } catch {
      // Pointer capture might have already been released
    }

    if (currentStrokeRef.current && currentStrokeRef.current.points.length > 0) {
      const updatedStrokes = [...page.strokes, currentStrokeRef.current];
      currentStrokeRef.current = null;
      setRedoStack([]); // Clear redo on new action
      onUpdatePage({
        ...page,
        strokes: updatedStrokes,
      });
    }
  };

  // Erase stroke touched by pointer
  const eraseAtPoint = (point: Point) => {
    const hits = page.strokes.some((stroke) => hitTestStroke(stroke, point, 18));
    if (hits) {
      const remainingStrokes = page.strokes.filter((stroke) => !hitTestStroke(stroke, point, 18));
      onUpdatePage({
        ...page,
        strokes: remainingStrokes,
      });
    }
  };

  // Undo
  const handleUndo = () => {
    if (page.strokes.length === 0) return;
    const lastStroke = page.strokes[page.strokes.length - 1];
    const newStrokes = page.strokes.slice(0, -1);
    setRedoStack((prev) => [lastStroke, ...prev]);
    onUpdatePage({
      ...page,
      strokes: newStrokes,
    });
  };

  // Redo
  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const strokeToRestore = redoStack[0];
    setRedoStack((prev) => prev.slice(1));
    onUpdatePage({
      ...page,
      strokes: [...page.strokes, strokeToRestore],
    });
  };

  // Clear Canvas
  const handleConfirmClear = () => {
    setRedoStack([]);
    onUpdatePage({
      ...page,
      strokes: [],
    });
  };

  // Background Change
  const handleChangeBackground = (bg: BackgroundType) => {
    onUpdatePage({
      ...page,
      background: bg,
    });
  };

  return (
    <div className="canvas-wrapper" ref={containerRef}>
      {/* Floating Drawing Toolbar */}
      <div className="canvas-toolbar-container">
        {/* Tools: Pen, Pencil, Highlighter, Eraser */}
        <div className="tool-group">
          <button
            className={`btn-tool ${activeTool === 'pen' ? 'active' : ''}`}
            onClick={() => setActiveTool('pen')}
            title="Pen (Natural ink with pressure)"
          >
            <Pen size={18} />
          </button>
          <button
            className={`btn-tool ${activeTool === 'pencil' ? 'active' : ''}`}
            onClick={() => setActiveTool('pencil')}
            title="Pencil (Soft graphite touch)"
          >
            <span style={{ fontSize: '1.05rem', fontWeight: 700, fontFamily: 'serif' }}>✎</span>
          </button>
          <button
            className={`btn-tool ${activeTool === 'highlighter' ? 'active' : ''}`}
            onClick={() => {
              setActiveTool('highlighter');
              // Auto-switch to pastel yellow if current color is dark
              if (activeColor === '#0f172a') setActiveColor('#fef08a');
            }}
            title="Highlighter (Wide translucent glow)"
          >
            <Highlighter size={18} />
          </button>
          <button
            className={`btn-tool ${activeTool === 'eraser' ? 'active' : ''}`}
            onClick={() => setActiveTool('eraser')}
            title="Eraser (Tap or drag to remove strokes)"
          >
            <Eraser size={18} />
          </button>
        </div>

        <div className="toolbar-divider" />

        {/* Color Palette (disabled in eraser mode) */}
        {activeTool !== 'eraser' && (
          <div className="color-swatches">
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                className={`color-swatch-btn ${activeColor === c ? 'active' : ''}`}
                style={{ backgroundColor: c }}
                onClick={() => setActiveColor(c)}
                title={`Color: ${c}`}
              />
            ))}
            <input
              type="color"
              className="custom-color-input"
              value={activeColor}
              onChange={(e) => setActiveColor(e.target.value)}
              title="Custom Color"
            />
          </div>
        )}

        {activeTool !== 'eraser' && <div className="toolbar-divider" />}

        {/* Stroke Thickness Presets */}
        {activeTool !== 'eraser' && (
          <div className="stroke-sizes">
            {STROKE_WIDTHS.map((sw) => (
              <button
                key={sw.value}
                className={`btn-stroke-size ${strokeWidth === sw.value ? 'active' : ''}`}
                onClick={() => setStrokeWidth(sw.value)}
                title={`${sw.label} thickness (${sw.value}px)`}
              >
                <div
                  className="stroke-dot-preview"
                  style={{
                    width: sw.size,
                    height: sw.size,
                  }}
                />
              </button>
            ))}
          </div>
        )}

        <div className="toolbar-divider" />

        {/* Paper Background Style */}
        <div className="bg-selector">
          <button
            className={`btn-bg-type ${page.background === 'plain' ? 'active' : ''}`}
            onClick={() => handleChangeBackground('plain')}
            title="Plain White Paper"
          >
            Plain
          </button>
          <button
            className={`btn-bg-type ${page.background === 'lined' ? 'active' : ''}`}
            onClick={() => handleChangeBackground('lined')}
            title="Ruled / Lined Notebook Paper"
          >
            Lined
          </button>
          <button
            className={`btn-bg-type ${page.background === 'graph' ? 'active' : ''}`}
            onClick={() => handleChangeBackground('graph')}
            title="Grid / Graph Math Paper"
          >
            Graph
          </button>
          <button
            className={`btn-bg-type ${page.background === 'dotted' ? 'active' : ''}`}
            onClick={() => handleChangeBackground('dotted')}
            title="Dotted Bullet Journal Paper"
          >
            Dotted
          </button>
        </div>

        <div className="toolbar-divider" />

        {/* Undo / Redo / Clear */}
        <div className="tool-group">
          <button
            className="btn-tool"
            onClick={handleUndo}
            disabled={page.strokes.length === 0}
            title="Undo (Ctrl+Z)"
          >
            <Undo2 size={18} />
          </button>
          <button
            className="btn-tool"
            onClick={handleRedo}
            disabled={redoStack.length === 0}
            title="Redo (Ctrl+Y)"
          >
            <Redo2 size={18} />
          </button>
          <button
            className="btn-tool"
            onClick={() => setShowClearConfirm(true)}
            disabled={page.strokes.length === 0}
            title="Clear Page Canvas"
            style={{ color: page.strokes.length > 0 ? '#ef4444' : undefined }}
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>

      {/* Canvas Viewport */}
      <div className="canvas-viewport">
        <div
          className="canvas-sheet-container"
          style={{
            transform: `scale(${zoomLevel})`,
            transformOrigin: 'top center',
          }}
        >
          <canvas
            ref={canvasRef}
            className="drawing-canvas-element"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          />
        </div>
      </div>

      {/* Floating Bottom HUD: Multi-page management & Zoom */}
      <div className="canvas-bottom-bar">
        {/* Multi-Page Navigation */}
        <div className="canvas-floating-hud">
          <button
            className="hud-btn"
            onClick={() => onSwitchPage(pageIndex - 1)}
            disabled={pageIndex === 0}
            title="Previous Page"
          >
            <ChevronLeft size={18} />
          </button>

          <span className="page-indicator-text">
            Page {pageIndex + 1} of {totalPages}
          </span>

          <button
            className="hud-btn"
            onClick={() => onSwitchPage(pageIndex + 1)}
            disabled={pageIndex >= totalPages - 1}
            title="Next Page"
          >
            <ChevronRight size={18} />
          </button>

          <button className="hud-btn" onClick={onAddPage} title="Add New Drawing Page">
            <Plus size={18} />
          </button>

          {totalPages > 1 && (
            <button
              className="hud-btn"
              onClick={() => setShowDeletePageConfirm(true)}
              title="Delete Current Page"
              style={{ color: '#ef4444' }}
            >
              <FileMinus size={16} />
            </button>
          )}
        </div>

        {/* Zoom Controls */}
        <div className="canvas-floating-hud">
          <button
            className="hud-btn"
            onClick={() => setZoomLevel((z) => Math.max(0.5, Number((z - 0.15).toFixed(2))))}
            disabled={zoomLevel <= 0.5}
            title="Zoom Out"
          >
            <ZoomOut size={16} />
          </button>

          <span className="hud-text">{Math.round(zoomLevel * 100)}%</span>

          <button
            className="hud-btn"
            onClick={() => setZoomLevel((z) => Math.min(2.0, Number((z + 0.15).toFixed(2))))}
            disabled={zoomLevel >= 2.0}
            title="Zoom In"
          >
            <ZoomIn size={16} />
          </button>

          <button
            className="hud-btn"
            onClick={() => setZoomLevel(1)}
            title="Reset Zoom (100%)"
          >
            <Maximize2 size={15} />
          </button>

          <button
            className="hud-btn"
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Exit Full Screen' : 'Distraction-Free Full Screen'}
          >
            {isFullscreen ? <Minimize2 size={15} /> : <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>⛶</span>}
          </button>
        </div>
      </div>

      {/* Confirmation Modals */}
      <ConfirmModal
        isOpen={showClearConfirm}
        title="Clear Canvas"
        message="Are you sure you want to erase all handwriting and drawings on this page? This action cannot be undone."
        confirmText="Clear Canvas"
        isDanger={true}
        onConfirm={handleConfirmClear}
        onCancel={() => setShowClearConfirm(false)}
      />

      <ConfirmModal
        isOpen={showDeletePageConfirm}
        title="Delete Page"
        message={`Are you sure you want to delete Page ${pageIndex + 1}? Its strokes and notes will be permanently removed.`}
        confirmText="Delete Page"
        isDanger={true}
        onConfirm={onDeletePage}
        onCancel={() => setShowDeletePageConfirm(false)}
      />
    </div>
  );
};
