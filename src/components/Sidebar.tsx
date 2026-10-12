import { useState } from 'react';
import {
  PenTool,
  Plus,
  Search,
  X,
  Pin,
  Trash2,
  BookOpen,
  Smartphone,
  WifiOff,
  CheckCircle2,
} from 'lucide-react';
import type { Note, Folder } from '../types';
import { ConfirmModal } from './ConfirmModal';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  notes: Note[];
  activeNoteId: string | null;
  onSelectNote: (noteId: string) => void;
  onCreateNote: () => void;
  onDeleteNote: (noteId: string) => void;
  onTogglePin: (noteId: string) => void;
  folders: Folder[];
  activeFolderId: string;
  onSelectFolder: (folderId: string) => void;
  onOpenFolderModal: () => void;
  isOnline?: boolean;
  isStandalone?: boolean;
  canInstallPrompt?: boolean;
  onOpenInstallModal?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  notes,
  activeNoteId,
  onSelectNote,
  onCreateNote,
  onDeleteNote,
  onTogglePin,
  folders,
  activeFolderId,
  onSelectFolder,
  onOpenFolderModal,
  isOnline = true,
  isStandalone = false,
  canInstallPrompt = false,
  onOpenInstallModal,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // Format relative timestamp
  const formatDate = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days}d ago`;
    return new Date(timestamp).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    });
  };

  // Filter notes by search query and active folder
  const filteredNotes = notes.filter((note) => {
    // Folder filter
    if (activeFolderId === 'pinned') {
      if (!note.pinned) return false;
    } else if (activeFolderId !== 'all') {
      if (note.folderId !== activeFolderId) return false;
    }

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const titleMatch = note.title.toLowerCase().includes(q);
      const contentMatch = note.content.toLowerCase().includes(q);
      return titleMatch || contentMatch;
    }

    return true;
  });

  const pinnedNotes = filteredNotes.filter((n) => n.pinned);
  const otherNotes = filteredNotes.filter((n) => !n.pinned);

  // Helper to get folder display details
  const getFolder = (folderId: string) => {
    return folders.find((f) => f.id === folderId);
  };

  return (
    <aside className={`sidebar ${isOpen ? '' : 'closed'}`}>
      {/* Brand Header */}
      <div className="sidebar-header">
        <div className="app-brand">
          <div className="app-brand-logo">
            <PenTool size={20} />
          </div>
          <div className="app-brand-title">
            <span>NoteCraft</span>
            <span className="app-brand-badge">Notebook</span>
          </div>
        </div>
        <button className="btn-sidebar-close" onClick={onClose} title="Close sidebar">
          <X size={18} />
        </button>
      </div>

      {/* Action Bar: New Note & Search */}
      <div className="sidebar-actions">
        <button className="btn-new-note" onClick={onCreateNote}>
          <Plus size={18} />
          <span>New Note</span>
        </button>

        <div className="search-box">
          <Search size={16} />
          <input
            type="text"
            className="search-input"
            placeholder="Search notes & handwriting..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button className="search-clear" onClick={() => setSearchQuery('')}>
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Folders Filter Chips */}
      <div className="folders-section">
        <div className="folders-header">
          <span>Categories</span>
          <button className="btn-add-folder" onClick={onOpenFolderModal} title="Add New Category">
            <Plus size={14} />
          </button>
        </div>
        <div className="folders-list">
          <button
            className={`folder-chip ${activeFolderId === 'all' ? 'active' : ''}`}
            onClick={() => onSelectFolder('all')}
          >
            <span>All</span>
            <span style={{ opacity: 0.6, fontSize: '0.72rem' }}>({notes.length})</span>
          </button>
          <button
            className={`folder-chip ${activeFolderId === 'pinned' ? 'active' : ''}`}
            onClick={() => onSelectFolder('pinned')}
          >
            <Pin size={12} />
            <span>Pinned</span>
            <span style={{ opacity: 0.6, fontSize: '0.72rem' }}>
              ({notes.filter((n) => n.pinned).length})
            </span>
          </button>
          {folders.map((folder) => {
            const count = notes.filter((n) => n.folderId === folder.id).length;
            return (
              <button
                key={folder.id}
                className={`folder-chip ${activeFolderId === folder.id ? 'active' : ''}`}
                onClick={() => onSelectFolder(folder.id)}
              >
                <span
                  className="folder-dot"
                  style={{ backgroundColor: folder.color || '#2563eb' }}
                />
                <span>{folder.name}</span>
                <span style={{ opacity: 0.6, fontSize: '0.72rem' }}>({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Notes List */}
      <div className="notes-list-container">
        {filteredNotes.length === 0 ? (
          <div className="empty-state">
            <BookOpen size={36} />
            <p>No notes found.</p>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-subtle)' }}>
              {searchQuery ? 'Try another search term' : 'Click "New Note" to create one!'}
            </span>
          </div>
        ) : (
          <>
            {/* Pinned Group */}
            {pinnedNotes.length > 0 && activeFolderId !== 'pinned' && (
              <>
                <div className="notes-group-label">Pinned Notes</div>
                {pinnedNotes.map((note) => (
                  <NoteItem
                    key={note.id}
                    note={note}
                    isActive={note.id === activeNoteId}
                    folder={getFolder(note.folderId)}
                    dateLabel={formatDate(note.updatedAt)}
                    onSelect={() => onSelectNote(note.id)}
                    onTogglePin={() => onTogglePin(note.id)}
                    onRequestDelete={() => setDeleteTargetId(note.id)}
                  />
                ))}
              </>
            )}

            {/* Recent Notes Group */}
            {otherNotes.length > 0 && (
              <>
                {pinnedNotes.length > 0 && activeFolderId !== 'pinned' && (
                  <div className="notes-group-label">Recent Notes</div>
                )}
                {otherNotes.map((note) => (
                  <NoteItem
                    key={note.id}
                    note={note}
                    isActive={note.id === activeNoteId}
                    folder={getFolder(note.folderId)}
                    dateLabel={formatDate(note.updatedAt)}
                    onSelect={() => onSelectNote(note.id)}
                    onTogglePin={() => onTogglePin(note.id)}
                    onRequestDelete={() => setDeleteTargetId(note.id)}
                  />
                ))}
              </>
            )}
          </>
        )}
      </div>

      {/* Sidebar PWA Footer */}
      <div className="sidebar-footer">
        {!isStandalone && onOpenInstallModal && (
          <button
            className="btn-sidebar-install"
            onClick={onOpenInstallModal}
            title="Install Notes & Draw on Android or Desktop"
            style={{
              background: canInstallPrompt ? 'var(--primary)' : undefined,
              color: canInstallPrompt ? '#ffffff' : undefined,
            }}
          >
            <Smartphone size={16} />
            <span>Install on Android</span>
          </button>
        )}

        <div className="sidebar-status-bar">
          {isOnline ? (
            <div className="status-item online">
              <CheckCircle2 size={13} color="#16a34a" />
              <span>Offline Ready • Auto-saved</span>
            </div>
          ) : (
            <div className="status-item offline">
              <WifiOff size={13} color="#ea580c" />
              <span>Offline Mode • Saved in DB</span>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(deleteTargetId)}
        title="Delete Note"
        message="Are you sure you want to delete this note and its handwritten drawings? This cannot be undone."
        confirmText="Delete"
        isDanger={true}
        onConfirm={() => {
          if (deleteTargetId) onDeleteNote(deleteTargetId);
        }}
        onCancel={() => setDeleteTargetId(null)}
      />
    </aside>
  );
};

// Sub-component for individual note cards
interface NoteItemProps {
  note: Note;
  isActive: boolean;
  folder?: Folder;
  dateLabel: string;
  onSelect: () => void;
  onTogglePin: () => void;
  onRequestDelete: () => void;
}

const NoteItem: React.FC<NoteItemProps> = ({
  note,
  isActive,
  folder,
  dateLabel,
  onSelect,
  onTogglePin,
  onRequestDelete,
}) => {
  const hasStrokes = note.pages.some((p) => p.strokes.length > 0);
  const totalStrokes = note.pages.reduce((acc, p) => acc + p.strokes.length, 0);

  return (
    <div
      className={`note-card ${isActive ? 'active' : ''}`}
      onClick={onSelect}
      role="button"
      tabIndex={0}
    >
      <div className="note-card-header">
        <h4 className="note-card-title">{note.title || 'Untitled Note'}</h4>
        <div className="note-card-actions">
          <button
            className={`btn-card-action ${note.pinned ? 'pinned' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              onTogglePin();
            }}
            title={note.pinned ? 'Unpin note' : 'Pin note to top'}
          >
            <Pin size={14} fill={note.pinned ? 'currentColor' : 'none'} />
          </button>
          <button
            className="btn-card-action delete"
            onClick={(e) => {
              e.stopPropagation();
              onRequestDelete();
            }}
            title="Delete note"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {note.content ? (
        <p className="note-card-snippet">
          {note.content.replace(/[#*`>_-]/g, '').trim()}
        </p>
      ) : hasStrokes ? (
        <p className="note-card-snippet" style={{ fontStyle: 'italic', color: 'var(--text-subtle)' }}>
          {note.pages.length} drawing {note.pages.length === 1 ? 'page' : 'pages'} with handwriting
        </p>
      ) : (
        <p className="note-card-snippet" style={{ fontStyle: 'italic', color: 'var(--text-subtle)' }}>
          Empty note
        </p>
      )}

      <div className="note-card-footer">
        <div className="note-card-badges">
          {folder && (
            <span
              className="badge-folder"
              style={{
                backgroundColor: `${folder.color || '#2563eb'}18`,
                color: folder.color || '#2563eb',
              }}
            >
              {folder.name}
            </span>
          )}
          {hasStrokes && (
            <span className="badge-drawing" title={`${totalStrokes} strokes recorded`}>
              <PenTool size={10} />
              <span>
                {note.pages.length} {note.pages.length === 1 ? 'page' : 'pages'}
              </span>
            </span>
          )}
        </div>
        <span>{dateLabel}</span>
      </div>
    </div>
  );
};
