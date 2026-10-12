import { useRef, useState, useEffect, useCallback } from 'react';
import {
  Pen,
  Highlighter,
  Eraser,
  Undo2,
  Redo2,
  Trash2,
  Grid,
  FilePlus,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
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

// Curated color palette
const PRESET_COLORS = [
  '#0f172a', // Deep Charcoal
  '#2563eb', // Royal Blue
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

  // Popover menus state: 'none' | 'color' | 'size' | 'background' | 'pages'
  const [activePopover, setActivePopover] = useState<'none' | 'color' | 'size' | 'background' | 'pages'>('none');

  // Undo/Redo stacks
  const [redoStack, setRedoStack] = useState<Stroke[]>([]);

  // Zoom state
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Modal confirmations
  const [showClearConfirm, setShowClearConfirm] = useState<boolean>(false);
  const [showDeletePageConfirm, setShowDeletePageConfirm] = useState<boolean>(false);

  // Digital notebook sheet dimensions (standard 3:4 aspect ratio ~900x1200)
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

  // Handle mobile screen width auto-scaling on mount and resize
  useEffect(() => {
    const handleScreenResize = () => {
      if (containerRef.current) {
        const availableW = containerRef.current.clientWidth;
        if (availableW < 940) {
          // On mobile screens, fit paper width smoothly with comfortable margin
          const optimalZoom = Math.min(1, Math.max(0.32, (availableW - 24) / SHEET_WIDTH));
          setZoomLevel(Number(optimalZoom.toFixed(2)));
        } else {
          setZoomLevel(1);
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

  // Keyboard shortcuts (Ctrl+Z, Ctrl+Y)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        handleRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [page.strokes, redoStack]);

  // Extract pointer coordinates relative to sheet
  const getCanvasCoordinates = (e: React.PointerEvent<HTMLCanvasElement>): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = SHEET_WIDTH / rect.width;
    const scaleY = SHEET_HEIGHT / rect.height;

    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
      pressure: e.pressure && e.pressure > 0 ? e.pressure : 0.5,
    };
  };

  // Pointer Down (touch or stylus or mouse)
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    // Close any open popovers on drawing
    if (activePopover !== 'none') setActivePopover('none');

    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.setPointerCapture(e.pointerId);
    activePointerIdRef.current = e.pointerId;

    const point = getCanvasCoordinates(e);

    if (activeTool === 'eraser') {
      setIsDrawing(true);
      handleEraseAtPoint(point);
      return;
    }

    setIsDrawing(true);
    const newStroke: Stroke = {
      id: 'stroke_' + Math.random().toString(36).substring(2, 9),
      tool: activeTool,
      color: activeTool === 'highlighter' ? activeColor : activeColor,
      width: activeTool === 'highlighter' ? Math.max(strokeWidth * 3, 20) : strokeWidth,
      opacity: activeTool === 'highlighter' ? 0.35 : 1,
      points: [point],
    };

    currentStrokeRef.current = newStroke;
    redrawCanvas();
  };

  // Pointer Move
  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing || activePointerIdRef.current !== e.pointerId) return;

    const point = getCanvasCoordinates(e);

    if (activeTool === 'eraser') {
      handleEraseAtPoint(point);
      return;
    }

    if (currentStrokeRef.current) {
      currentStrokeRef.current.points.push(point);
      redrawCanvas();
    }
  };

  // Pointer Up / Cancel
  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (activePointerIdRef.current === e.pointerId) {
      const canvas = canvasRef.current;
      if (canvas && canvas.hasPointerCapture(e.pointerId)) {
        canvas.releasePointerCapture(e.pointerId);
      }
      activePointerIdRef.current = null;
    }

    if (!isDrawing) return;
    setIsDrawing(false);

    if (activeTool === 'eraser') {
      return;
    }

    if (currentStrokeRef.current && currentStrokeRef.current.points.length > 0) {
      const updatedStrokes = [...page.strokes, currentStrokeRef.current];
      currentStrokeRef.current = null;
      setRedoStack([]);
      onUpdatePage({
        ...page,
        strokes: updatedStrokes,
      });
    }
  };

  // Erase strokes intersecting target point
  const handleEraseAtPoint = (point: Point) => {
    const eraserRadius = strokeWidth * 3;
    const remainingStrokes = page.strokes.filter((stroke) => {
      return !hitTestStroke(stroke, point, eraserRadius);
    });

    if (remainingStrokes.length !== page.strokes.length) {
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
    setRedoStack((prev) => [...prev, lastStroke]);
    onUpdatePage({
      ...page,
      strokes: newStrokes,
    });
  };

  // Redo
  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const strokeToRestore = redoStack[redoStack.length - 1];
    const newRedoStack = redoStack.slice(0, -1);
    const newStrokes = [...page.strokes, strokeToRestore];
    setRedoStack(newRedoStack);
    onUpdatePage({
      ...page,
      strokes: newStrokes,
    });
  };

  // Clear Canvas
  const handleClearPage = () => {
    setRedoStack([]);
    onUpdatePage({
      ...page,
      strokes: [],
    });
  };

  // Change Background Paper
  const handleChangeBackground = (bg: BackgroundType) => {
    onUpdatePage({
      ...page,
      background: bg,
    });
    setActivePopover('none');
  };

  const togglePopover = (type: 'color' | 'size' | 'background' | 'pages') => {
    setActivePopover((prev) => (prev === type ? 'none' : type));
  };

  return (
    <div
      className="canvas-wrapper"
      ref={containerRef}
      onClick={() => {
        if (activePopover !== 'none') setActivePopover('none');
      }}
    >
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
            style={{ touchAction: 'none' }}
          />
        </div>
      </div>

      {/* Floating Bottom Pill Toolbar matching reference image */}
      <div
        className="canvas-floating-pill-container"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Floating Popovers (expand upwards from bottom toolbar) */}
        {activePopover === 'color' && (
          <div className="toolbar-popover color-popover">
            <div className="popover-arrow" />
            <div className="palette-grid">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  className={`color-bubble ${activeColor === c ? 'active' : ''}`}
                  style={{ backgroundColor: c }}
                  onClick={() => {
                    setActiveColor(c);
                    setActivePopover('none');
                  }}
                  title={c}
                />
              ))}
              <label className="custom-color-bubble" title="Custom color">
                <input
                  type="color"
                  value={activeColor}
                  onChange={(e) => setActiveColor(e.target.value)}
                />
              </label>
            </div>
          </div>
        )}

        {activePopover === 'size' && (
          <div className="toolbar-popover size-popover">
            <div className="popover-arrow" />
            <div className="size-options">
              {STROKE_WIDTHS.map((sw) => (
                <button
                  key={sw.value}
                  className={`size-option-btn ${strokeWidth === sw.value ? 'active' : ''}`}
                  onClick={() => {
                    setStrokeWidth(sw.value);
                    setActivePopover('none');
                  }}
                  title={sw.label}
                >
                  <div
                    className="size-dot-preview"
                    style={{ width: sw.size, height: sw.size }}
                  />
                  <span>{sw.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {activePopover === 'background' && (
          <div className="toolbar-popover bg-popover">
            <div className="popover-arrow" />
            <div className="bg-options">
              {(['plain', 'lined', 'graph', 'dotted'] as BackgroundType[]).map((bg) => (
                <button
                  key={bg}
                  className={`bg-option-btn ${page.background === bg ? 'active' : ''}`}
                  onClick={() => handleChangeBackground(bg)}
                >
                  {bg.charAt(0).toUpperCase() + bg.slice(1)}
                </button>
              ))}
            </div>
          </div>
        )}

        {activePopover === 'pages' && (
          <div className="toolbar-popover pages-popover">
            <div className="popover-arrow" />
            <div className="pages-controls">
              <span className="pages-label">
                Page {pageIndex + 1} of {totalPages}
              </span>
              <div className="pages-buttons-row">
                <button
                  className="btn-page-nav"
                  disabled={pageIndex === 0}
                  onClick={() => onSwitchPage(pageIndex - 1)}
                  title="Previous page"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  className="btn-page-nav"
                  disabled={pageIndex >= totalPages - 1}
                  onClick={() => onSwitchPage(pageIndex + 1)}
                  title="Next page"
                >
                  <ChevronRight size={16} />
                </button>
                <button
                  className="btn-page-add"
                  onClick={() => {
                    onAddPage();
                    setActivePopover('none');
                  }}
                  title="Add new sheet"
                >
                  <FilePlus size={15} style={{ marginRight: 4 }} />
                  <span>Add Page</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* The Clean Floating Rounded Pill Toolbar */}
        <div className="floating-pill-bar">
          {/* Pen Tool */}
          <button
            className={`pill-btn ${activeTool === 'pen' ? 'active' : ''}`}
            onClick={() => {
              setActiveTool('pen');
              setActivePopover('none');
            }}
            title="Pen"
          >
            <Pen size={17} />
          </button>

          {/* Highlighter Tool */}
          <button
            className={`pill-btn ${activeTool === 'highlighter' ? 'active' : ''}`}
            onClick={() => {
              setActiveTool('highlighter');
              if (activeColor === '#0f172a') setActiveColor('#fef08a');
              setActivePopover('none');
            }}
            title="Highlighter"
          >
            <Highlighter size={17} />
          </button>

          {/* Eraser Tool */}
          <button
            className={`pill-btn ${activeTool === 'eraser' ? 'active' : ''}`}
            onClick={() => {
              setActiveTool('eraser');
              setActivePopover('none');
            }}
            title="Eraser"
          >
            <Eraser size={17} />
          </button>

          <div className="pill-divider" />

          {/* Color Picker Swatch */}
          <button
            className={`pill-btn color-trigger ${activePopover === 'color' ? 'active' : ''}`}
            onClick={() => togglePopover('color')}
            title="Color Palette"
          >
            <span
              className="color-dot-indicator"
              style={{ backgroundColor: activeColor }}
            />
          </button>

          {/* Stroke Width Selector */}
          <button
            className={`pill-btn size-trigger ${activePopover === 'size' ? 'active' : ''}`}
            onClick={() => togglePopover('size')}
            title="Stroke Thickness"
          >
            <span
              className="stroke-dot-indicator"
              style={{
                width: Math.min(14, Math.max(4, strokeWidth * 2)),
                height: Math.min(14, Math.max(4, strokeWidth * 2)),
              }}
            />
          </button>

          {/* Paper Background Selector */}
          <button
            className={`pill-btn ${activePopover === 'background' ? 'active' : ''}`}
            onClick={() => togglePopover('background')}
            title="Paper Background"
          >
            <Grid size={17} />
          </button>

          <div className="pill-divider" />

          {/* Undo */}
          <button
            className="pill-btn"
            onClick={handleUndo}
            disabled={page.strokes.length === 0}
            title="Undo"
          >
            <Undo2 size={17} />
          </button>

          {/* Redo */}
          <button
            className="pill-btn"
            onClick={handleRedo}
            disabled={redoStack.length === 0}
            title="Redo"
          >
            <Redo2 size={17} />
          </button>

          <div className="pill-divider" />

          {/* Pages Pill Button */}
          <button
            className={`pill-btn ${activePopover === 'pages' ? 'active' : ''}`}
            onClick={() => togglePopover('pages')}
            title={`Pages (${pageIndex + 1}/${totalPages})`}
            style={{ fontSize: '0.74rem', fontWeight: 600, padding: '0 6px' }}
          >
            {pageIndex + 1}/{totalPages}
          </button>

          {/* Clear Page Canvas */}
          <button
            className="pill-btn danger-hover"
            onClick={() => setShowClearConfirm(true)}
            disabled={page.strokes.length === 0}
            title="Clear Page"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* Clear Canvas Confirmation Modal */}
      <ConfirmModal
        isOpen={showClearConfirm}
        title="Clear Drawing Page"
        message="Are you sure you want to clear all handwriting and drawings on this page?"
        confirmText="Clear Canvas"
        isDanger={true}
        onConfirm={handleClearPage}
        onCancel={() => setShowClearConfirm(false)}
      />
    </div>
  );
};
