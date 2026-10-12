import { useState } from 'react';
import {
  Plus,
  Search,
  X,
  FileText,
  Inbox,
  FolderPlus,
  Download,
  Pin,
} from 'lucide-react';
import type { Note, Folder } from '../types';

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
  isMobileScreen?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  notes,
  activeNoteId,
  onSelectNote,
  onCreateNote,
  folders,
  activeFolderId,
  onSelectFolder,
  onOpenFolderModal,
  isStandalone = false,
  onOpenInstallModal,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  // Format date exactly like reference image: e.g. "Oct 12, 2026"
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Get note snippet preview
  const getSnippet = (note: Note) => {
    if (note.content && note.content.trim()) {
      const firstLine = note.content.trim().split('\n')[0].replace(/^[#*>\-\s]+/, '');
      return firstLine.substring(0, 48) || 'Empty note';
    }
    const hasDrawings = note.pages.some((p) => p.strokes && p.strokes.length > 0);
    if (hasDrawings) {
      return 'Handwriting note';
    }
    return 'Empty note';
  };

  // Filter notes by active folder and search query
  const filteredNotes = notes.filter((note) => {
    // Folder filtering
    if (activeFolderId === 'unfiled') {
      if (note.folderId && note.folderId !== 'general') return false;
    } else if (activeFolderId === 'pinned') {
      if (!note.pinned) return false;
    } else if (activeFolderId !== 'all') {
      if (note.folderId !== activeFolderId) return false;
    }

    // Search query filtering
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const titleMatch = note.title.toLowerCase().includes(q);
      const contentMatch = note.content.toLowerCase().includes(q);
      return titleMatch || contentMatch;
    }

    return true;
  });

  const unfiledCount = notes.filter(
    (n) => !n.folderId || n.folderId === 'general'
  ).length;

  return (
    <aside className="sidebar">
      {/* Header matching reference image: "Notebook" and "+ New" */}
      <div className="sidebar-header">
        <h1 className="sidebar-title">Notebook</h1>
        <button className="btn-new-note" onClick={onCreateNote} title="Create note">
          <Plus size={16} strokeWidth={2.5} />
          <span>New</span>
        </button>
      </div>

      {/* Search Input Box */}
      <div className="sidebar-search-container">
        <div className="search-box">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Search notes"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              className="search-clear-btn"
              onClick={() => setSearchQuery('')}
              title="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Folder Navigation matching reference image */}
      <div className="sidebar-nav">
        {/* All notes */}
        <button
          className={`sidebar-nav-item ${activeFolderId === 'all' ? 'active' : ''}`}
          onClick={() => onSelectFolder('all')}
        >
          <div className="nav-item-left">
            <Inbox size={18} className="nav-icon" />
            <span>All notes</span>
          </div>
          <span className="nav-badge">{notes.length}</span>
        </button>

        {/* Unfiled */}
        <button
          className={`sidebar-nav-item ${activeFolderId === 'unfiled' ? 'active' : ''}`}
          onClick={() => onSelectFolder('unfiled')}
        >
          <div className="nav-item-left">
            <FileText size={18} className="nav-icon" />
            <span>Unfiled</span>
          </div>
          <span className="nav-badge">{unfiledCount}</span>
        </button>

        {/* Folders Section Heading with [+] */}
        <div className="folders-header">
          <span className="folders-title">FOLDERS</span>
          <button
            className="btn-add-folder"
            onClick={onOpenFolderModal}
            title="Create new folder"
          >
            <FolderPlus size={15} />
          </button>
        </div>

        {/* Custom User Folders */}
        <div className="custom-folders-list">
          {folders.map((folder) => {
            const count = notes.filter((n) => n.folderId === folder.id).length;
            const isActive = activeFolderId === folder.id;
            return (
              <button
                key={folder.id}
                className={`sidebar-nav-item sub-folder ${isActive ? 'active' : ''}`}
                onClick={() => onSelectFolder(folder.id)}
              >
                <div className="nav-item-left">
                  <span
                    className="folder-color-dot"
                    style={{ backgroundColor: folder.color || '#2563eb' }}
                  />
                  <span className="folder-name-text">{folder.name}</span>
                </div>
                <span className="nav-badge">{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Notes Cards List */}
      <div className="notes-cards-container">
        {filteredNotes.length === 0 ? (
          <div className="notes-empty-state">
            <p>No notes found</p>
            <span>{searchQuery ? 'Try another search' : 'Tap "+ New" to begin'}</span>
          </div>
        ) : (
          filteredNotes.map((note) => {
            const isSelected = note.id === activeNoteId;
            return (
              <div
                key={note.id}
                className={`note-card ${isSelected ? 'selected' : ''}`}
                onClick={() => onSelectNote(note.id)}
              >
                <div className="note-card-header">
                  <h3 className="note-card-title">{note.title || 'Untitled'}</h3>
                  {note.pinned && (
                    <Pin size={13} className="note-card-pin" fill="#2563eb" color="#2563eb" />
                  )}
                </div>
                <p className="note-card-snippet">{getSnippet(note)}</p>
                <span className="note-card-date">{formatDate(note.updatedAt)}</span>
              </div>
            );
          })
        )}
      </div>

      {/* Sidebar Footer: Install App & Device Storage Notice */}
      <div className="sidebar-footer">
        {!isStandalone && onOpenInstallModal && (
          <button
            className="btn-install-card"
            onClick={onOpenInstallModal}
            title="Install app on this device"
          >
            <Download size={16} />
            <span>Install app</span>
          </button>
        )}
        <p className="storage-notice">Notes are stored only on this device.</p>
      </div>
    </aside>
  );
};
