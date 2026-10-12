export type BackgroundType = 'plain' | 'lined' | 'graph' | 'dotted';

export type ToolType = 'pen' | 'pencil' | 'highlighter' | 'eraser';

export interface Point {
  x: number;
  y: number;
  pressure?: number;
}

export interface Stroke {
  id: string;
  tool: ToolType;
  color: string;
  width: number;
  opacity: number;
  points: Point[];
}

export interface CanvasPage {
  id: string;
  background: BackgroundType;
  strokes: Stroke[];
}

export interface Folder {
  id: string;
  name: string;
  color?: string;
  createdAt: number;
}

export type NoteViewMode = 'hybrid' | 'canvas' | 'text';

export interface Note {
  id: string;
  title: string;
  folderId: string; // 'all' is reserved for view filter, 'default' is uncategorized
  pinned: boolean;
  content: string; // typed text
  viewMode: NoteViewMode;
  pages: CanvasPage[];
  activePageIndex: number;
  createdAt: number;
  updatedAt: number;
}

export interface ExportOptions {
  format: 'png' | 'pdf' | 'txt';
  allPages?: boolean;
}
