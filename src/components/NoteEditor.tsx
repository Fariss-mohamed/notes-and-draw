import { useState } from 'react';
import {
  FileText,
  PenTool,
  ChevronLeft,
  ChevronDown,
  Pin,
  Download,
  Trash2,
  FileDown,
  Share2,
  Printer,
} from 'lucide-react';
import type { Note, Folder, CanvasPage } from '../types';
import { createDefaultPage } from '../services/db';
import { exportService } from '../services/export';
import { DrawingCanvas } from './DrawingCanvas';
import { TextEditor } from './TextEditor';
import { ConfirmModal } from './ConfirmModal';

interface NoteEditorProps {
  note: Note;
  folders: Folder[];
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
  onUpdateNote: (updatedNote: Note) => void;
  onDeleteNote: () => void;
  onBackToList?: () => void;
  isSaving: boolean;
  isOnline?: boolean;
  isStandalone?: boolean;
  canInstallPrompt?: boolean;
  onOpenInstallModal?: () => void;
  isMobileScreen?: boolean;
}

export const NoteEditor: React.FC<NoteEditorProps> = ({
  note,
  folders,
  onUpdateNote,
  onDeleteNote,
  onBackToList,
  isSaving,
  isMobileScreen = false,
}) => {
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showFolderDropdown, setShowFolderDropdown] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Active drawing page
  const activePageIndex = Math.min(
    note.activePageIndex || 0,
    Math.max(0, note.pages.length - 1)
  );
  const activePage = note.pages[activePageIndex] || note.pages[0];

  // Format date matching reference image: "Oct 12, 2026"
  const formattedDate = new Date(note.updatedAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  // Current folder name
  const currentFolder = folders.find((f) => f.id === note.folderId);
  const folderDisplayName = currentFolder ? currentFolder.name : 'No folder';

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
    setShowFolderDropdown(false);
  };

  // Toggle pin
  const handleTogglePin = () => {
    onUpdateNote({
      ...note,
      pinned: !note.pinned,
      updatedAt: Date.now(),
    });
  };

  // Switch View Mode: 'text' or 'canvas' (handwriting)
  const isHandwriting = note.viewMode === 'canvas';
  const handleToggleViewMode = (mode: 'text' | 'canvas') => {
    onUpdateNote({
      ...note,
      viewMode: mode,
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
      {/* Top Bar matching reference image */}
      <header className="workspace-topbar">
        {/* Left Side: Back button on mobile, Segmented [Text | Handwriting] Switcher, and Saved indicator */}
        <div className="topbar-left">
          {isMobileScreen && onBackToList && (
            <button
              className="btn-back-nav"
              onClick={onBackToList}
              title="Back to notes list"
            >
              <ChevronLeft size={22} />
            </button>
          )}

          {/* Segmented Pill Switch: [ 📄 Text | ✎ Handwriting ] */}
          <div className="segmented-toggle">
            <button
              className={`segmented-tab ${!isHandwriting ? 'active' : ''}`}
              onClick={() => handleToggleViewMode('text')}
              title="Text Mode"
            >
              <FileText size={15} />
              <span>Text</span>
            </button>
            <button
              className={`segmented-tab ${isHandwriting ? 'active' : ''}`}
              onClick={() => handleToggleViewMode('canvas')}
              title="Handwriting Mode"
            >
              <PenTool size={15} />
              <span>Handwriting</span>
            </button>
          </div>

          {/* "Saved" Status Indicator */}
          <span className="saved-status-text">
            {isSaving ? 'Saving...' : 'Saved'}
          </span>
        </div>

        {/* Right Side: [ No folder ˅ ]  📌  📥  🗑️ */}
        <div className="topbar-right">
          {/* Folder dropdown pill */}
          <div className="folder-dropdown-wrapper">
            <button
              className="btn-folder-pill"
              onClick={() => setShowFolderDropdown(!showFolderDropdown)}
              title="Assign folder"
            >
              <span>{folderDisplayName}</span>
              <ChevronDown size={14} className="chevron-icon" />
            </button>

            {showFolderDropdown && (
              <div
                className="folder-dropdown-menu"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  className={`folder-menu-item ${!note.folderId || note.folderId === 'general' ? 'active' : ''}`}
                  onClick={() => handleFolderChange('general')}
                >
                  No folder
                </button>
                {folders.map((f) => (
                  <button
                    key={f.id}
                    className={`folder-menu-item ${note.folderId === f.id ? 'active' : ''}`}
                    onClick={() => handleFolderChange(f.id)}
                  >
                    <span
                      className="folder-color-dot"
                      style={{ backgroundColor: f.color || '#2563eb' }}
                    />
                    <span>{f.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Pin note button */}
          <button
            className={`btn-icon-action ${note.pinned ? 'active' : ''}`}
            onClick={handleTogglePin}
            title={note.pinned ? 'Unpin note' : 'Pin note'}
          >
            <Pin
              size={17}
              fill={note.pinned ? '#2563eb' : 'none'}
              color={note.pinned ? '#2563eb' : '#64748b'}
            />
          </button>

          {/* Export note dropdown */}
          <div className="export-dropdown-wrapper">
            <button
              className="btn-icon-action"
              onClick={() => setShowExportMenu(!showExportMenu)}
              title="Export note"
            >
              <Download size={17} color="#64748b" />
            </button>

            {showExportMenu && (
              <div
                className="export-dropdown-menu"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  className="export-menu-item"
                  onClick={() => {
                    exportService.exportNoteAsPDF(note);
                    setShowExportMenu(false);
                  }}
                >
                  <FileDown size={15} />
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
                  <Download size={15} />
                  <span>Download Page as PNG</span>
                </button>
                <button
                  className="export-menu-item"
                  onClick={() => {
                    exportService.exportNoteAsMarkdown(note);
                    setShowExportMenu(false);
                  }}
                >
                  <Share2 size={15} />
                  <span>Download Text (.md)</span>
                </button>
                <button
                  className="export-menu-item"
                  onClick={() => {
                    setShowExportMenu(false);
                    window.print();
                  }}
                >
                  <Printer size={15} />
                  <span>Print Note</span>
                </button>
              </div>
            )}
          </div>

          {/* Delete note button */}
          <button
            className="btn-icon-action btn-trash"
            onClick={() => setShowDeleteConfirm(true)}
            title="Delete note"
          >
            <Trash2 size={17} color="#64748b" />
          </button>
        </div>
      </header>

      {/* Workspace Content */}
      <div
        className="workspace-body"
        onClick={() => {
          if (showFolderDropdown) setShowFolderDropdown(false);
          if (showExportMenu) setShowExportMenu(false);
        }}
      >
        {!isHandwriting ? (
          /* Text Document View matching reference image */
          <div className="text-document-view">
            <div className="document-inner">
              {/* Note Title Input */}
              <input
                type="text"
                className="document-title-input"
                value={note.title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="Untitled"
              />

              {/* Note Date Subtitle */}
              <div className="document-date-subtitle">{formattedDate}</div>

              {/* Text Body Editor */}
              <TextEditor content={note.content} onChange={handleContentChange} />
            </div>
          </div>
        ) : (
          /* Handwriting Canvas View */
          <div className="canvas-view-container">
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

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        title="Delete Note"
        message="Are you sure you want to delete this note? This action cannot be undone."
        confirmText="Delete Note"
        isDanger={true}
        onConfirm={onDeleteNote}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </main>
  );
};
