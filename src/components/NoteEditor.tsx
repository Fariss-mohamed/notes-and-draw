import { useState } from 'react';
import {
  Menu,
  Pin,
  Download,
  Share2,
  FileDown,
  Printer,
  Columns,
  PenTool,
  FileText,
  Smartphone,
  WifiOff,
} from 'lucide-react';
import type { Note, Folder, NoteViewMode, CanvasPage } from '../types';
import { createDefaultPage } from '../services/db';
import { exportService } from '../services/export';
import { DrawingCanvas } from './DrawingCanvas';
import { TextEditor } from './TextEditor';

interface NoteEditorProps {
  note: Note;
  folders: Folder[];
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
  onUpdateNote: (updatedNote: Note) => void;
  isSaving: boolean;
  isOnline?: boolean;
  isStandalone?: boolean;
  canInstallPrompt?: boolean;
  onOpenInstallModal?: () => void;
}

export const NoteEditor: React.FC<NoteEditorProps> = ({
  note,
  folders,
  isSidebarOpen,
  onToggleSidebar,
  onUpdateNote,
  isSaving,
  isOnline = true,
  isStandalone = false,
  canInstallPrompt = false,
  onOpenInstallModal,
}) => {
  const [showExportMenu, setShowExportMenu] = useState(false);

  // Active drawing page
  const activePageIndex = Math.min(
    note.activePageIndex || 0,
    Math.max(0, note.pages.length - 1)
  );
  const activePage = note.pages[activePageIndex] || note.pages[0];

  // Update title
  const handleTitleChange = (newTitle: string) => {
    onUpdateNote({
      ...note,
      title: newTitle,
      updatedAt: Date.now(),
    });
  };

  // Update folder
  const handleFolderChange = (folderId: string) => {
    onUpdateNote({
      ...note,
      folderId,
      updatedAt: Date.now(),
    });
  };

  // Toggle pin
  const handleTogglePin = () => {
    onUpdateNote({
      ...note,
      pinned: !note.pinned,
      updatedAt: Date.now(),
    });
  };

  // Switch View Mode
  const handleViewModeChange = (viewMode: NoteViewMode) => {
    onUpdateNote({
      ...note,
      viewMode,
      updatedAt: Date.now(),
    });
  };

  // Update Text Content
  const handleContentChange = (content: string) => {
    onUpdateNote({
      ...note,
      content,
      updatedAt: Date.now(),
    });
  };

  // Update active canvas page
  const handleUpdatePage = (updatedPage: CanvasPage) => {
    const newPages = [...note.pages];
    newPages[activePageIndex] = updatedPage;
    onUpdateNote({
      ...note,
      pages: newPages,
      updatedAt: Date.now(),
    });
  };

  // Add new canvas page
  const handleAddPage = () => {
    const newPage = createDefaultPage(activePage?.background || 'lined');
    const newPages = [...note.pages, newPage];
    onUpdateNote({
      ...note,
      pages: newPages,
      activePageIndex: newPages.length - 1,
      updatedAt: Date.now(),
    });
  };

  // Delete current canvas page
  const handleDeletePage = () => {
    if (note.pages.length <= 1) return;
    const newPages = note.pages.filter((_, idx) => idx !== activePageIndex);
    const newIndex = Math.max(0, activePageIndex - 1);
    onUpdateNote({
      ...note,
      pages: newPages,
      activePageIndex: newIndex,
      updatedAt: Date.now(),
    });
  };

  // Switch page index
  const handleSwitchPage = (newIndex: number) => {
    if (newIndex >= 0 && newIndex < note.pages.length) {
      onUpdateNote({
        ...note,
        activePageIndex: newIndex,
      });
    }
  };

  return (
    <main className="main-workspace">
      {/* Top Bar */}
      <header className="workspace-topbar">
        <div className="topbar-left">
          <button
            className="btn-sidebar-toggle"
            onClick={onToggleSidebar}
            title={isSidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
          >
            <Menu size={18} />
          </button>

          <input
            type="text"
            className="note-title-input"
            value={note.title}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder="Untitled Note"
          />

          <select
            className="folder-select"
            value={note.folderId}
            onChange={(e) => handleFolderChange(e.target.value)}
            title="Move to category"
          >
            <option value="general">Category: General</option>
            {folders.map((f) => (
              <option key={f.id} value={f.id}>
                Category: {f.name}
              </option>
            ))}
          </select>
        </div>

        {/* View Mode Switcher */}
        <div className="view-mode-pill">
          <button
            className={`mode-btn ${note.viewMode === 'hybrid' ? 'active' : ''}`}
            onClick={() => handleViewModeChange('hybrid')}
            title="Split View: Text on Left, Drawing Sheet on Right"
          >
            <Columns size={15} />
            <span>Split Note</span>
          </button>
          <button
            className={`mode-btn ${note.viewMode === 'canvas' ? 'active' : ''}`}
            onClick={() => handleViewModeChange('canvas')}
            title="Full Drawing Canvas: Distraction-free digital notebook paper"
          >
            <PenTool size={15} />
            <span>Canvas</span>
          </button>
          <button
            className={`mode-btn ${note.viewMode === 'text' ? 'active' : ''}`}
            onClick={() => handleViewModeChange('text')}
            title="Full Text Note: Standard distraction-free editor"
          >
            <FileText size={15} />
            <span>Text</span>
          </button>
        </div>

        {/* Right Actions: Offline badge, Auto-save status, Install, Pin, Export */}
        <div className="topbar-right">
          {!isOnline && (
            <div
              className="offline-pill"
              title="You are offline. Notes and handwriting are safely saved in IndexedDB."
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                padding: '3px 8px',
                borderRadius: 'var(--radius-full)',
                background: '#fef3c7',
                color: '#b45309',
                fontSize: '0.74rem',
                fontWeight: 600,
              }}
            >
              <WifiOff size={13} />
              <span>Offline</span>
            </div>
          )}

          <div className={`save-indicator ${isSaving ? 'saving' : 'saved'}`}>
            <span className="save-dot" />
            <span>{isSaving ? 'Saving...' : 'All changes saved'}</span>
          </div>

          {!isStandalone && onOpenInstallModal && (
            <button
              className="btn-topbar-action install-btn"
              onClick={onOpenInstallModal}
              title="Install Notes & Draw App on Android/Device"
              style={{
                borderColor: canInstallPrompt ? 'var(--primary)' : undefined,
                background: canInstallPrompt ? 'var(--primary-light)' : undefined,
                color: canInstallPrompt ? 'var(--primary)' : undefined,
              }}
            >
              <Smartphone size={15} />
              <span>Install App</span>
            </button>
          )}

          <button
            className={`btn-topbar-action ${note.pinned ? 'active' : ''}`}
            onClick={handleTogglePin}
            title={note.pinned ? 'Pinned note' : 'Pin note'}
          >
            <Pin size={16} fill={note.pinned ? 'currentColor' : 'none'} />
            <span>{note.pinned ? 'Pinned' : 'Pin'}</span>
          </button>

          <div style={{ position: 'relative' }}>
            <button
              className="btn-topbar-action"
              onClick={() => setShowExportMenu(!showExportMenu)}
              title="Export and download options"
            >
              <Download size={16} />
              <span>Export</span>
            </button>

            {showExportMenu && (
              <div className="export-menu-dropdown">
                <button
                  className="export-menu-item"
                  onClick={() => {
                    exportService.exportNoteAsPDF(note);
                    setShowExportMenu(false);
                  }}
                >
                  <FileDown size={16} />
                  <span>Download as PDF</span>
                </button>
                <button
                  className="export-menu-item"
                  onClick={() => {
                    exportService.exportPageAsPNG(
                      activePage,
                      note.title,
                      activePageIndex + 1
                    );
                    setShowExportMenu(false);
                  }}
                >
                  <Download size={16} />
                  <span>Download Page as PNG</span>
                </button>
                <button
                  className="export-menu-item"
                  onClick={() => {
                    exportService.exportNoteAsMarkdown(note);
                    setShowExportMenu(false);
                  }}
                >
                  <Share2 size={16} />
                  <span>Download Text (.md)</span>
                </button>
                <button
                  className="export-menu-item"
                  onClick={() => {
                    setShowExportMenu(false);
                    window.print();
                  }}
                >
                  <Printer size={16} />
                  <span>Print Note</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Editor Content Body */}
      <div
        className={`workspace-content ${
          note.viewMode === 'hybrid' ? 'split-mode' : ''
        }`}
        onClick={() => {
          if (showExportMenu) setShowExportMenu(false);
        }}
      >
        {/* Text Area (shown in Hybrid or Text mode) */}
        {(note.viewMode === 'hybrid' || note.viewMode === 'text') && (
          <div className="split-pane-text">
            <TextEditor
              content={note.content}
              onChange={handleContentChange}
            />
          </div>
        )}

        {/* Drawing Canvas Area (shown in Hybrid or Canvas mode) */}
        {(note.viewMode === 'hybrid' || note.viewMode === 'canvas') && (
          <div className="split-pane-canvas">
            <DrawingCanvas
              page={activePage}
              pageIndex={activePageIndex}
              totalPages={note.pages.length}
              onUpdatePage={handleUpdatePage}
              onAddPage={handleAddPage}
              onDeletePage={handleDeletePage}
              onSwitchPage={handleSwitchPage}
            />
          </div>
        )}
      </div>
    </main>
  );
};
