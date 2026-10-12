import { useState, useEffect, useRef, useCallback } from 'react';
import type { Note, Folder } from './types';
import { storage, createDefaultNote } from './services/db';
import { Sidebar } from './components/Sidebar';
import { NoteEditor } from './components/NoteEditor';
import { FolderModal } from './components/FolderModal';
import { InstallModal } from './components/InstallModal';
import { usePWA } from './hooks/usePWA';
import { Plus, BookOpen } from 'lucide-react';

export function App() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [activeFolderId, setActiveFolderId] = useState<string>('all');
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);
  const [isFolderModalOpen, setIsFolderModalOpen] = useState<boolean>(false);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const { canInstall, isStandalone, isOnline, triggerInstall } = usePWA();

  const saveTimerRef = useRef<number | null>(null);

  // Load notes and folders from IndexedDB on startup
  useEffect(() => {
    async function initData() {
      try {
        const [loadedNotes, loadedFolders] = await Promise.all([
          storage.getAllNotes(),
          storage.getAllFolders(),
        ]);

        setNotes(loadedNotes);
        setFolders(loadedFolders);

        if (loadedNotes.length > 0) {
          setActiveNoteId(loadedNotes[0].id);
        }
      } catch (err) {
        console.error('Failed to load initial data:', err);
      } finally {
        setIsLoading(false);
      }
    }

    initData();

    // Auto-close sidebar on small screens
    if (window.innerWidth < 800) {
      setIsSidebarOpen(false);
    }
  }, []);

  // Active note instance
  const activeNote = notes.find((n) => n.id === activeNoteId) || null;

  // Debounced auto-save function
  const triggerAutoSave = useCallback((noteToSave: Note) => {
    setIsSaving(true);
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = setTimeout(async () => {
      try {
        await storage.saveNote(noteToSave);
      } catch (err) {
        console.error('Failed to persist note:', err);
      } finally {
        setIsSaving(false);
      }
    }, 350);
  }, []);

  // Update Note handler
  const handleUpdateNote = (updatedNote: Note) => {
    setNotes((prevNotes) => {
      const updatedList = prevNotes.map((n) =>
        n.id === updatedNote.id ? updatedNote : n
      );
      // Sort pinned first, then updated recently
      return updatedList.sort((a, b) => {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        return b.updatedAt - a.updatedAt;
      });
    });

    triggerAutoSave(updatedNote);
  };

  // Create New Note
  const handleCreateNote = async () => {
    const targetFolder =
      activeFolderId !== 'all' && activeFolderId !== 'pinned'
        ? activeFolderId
        : 'general';

    const newNote = createDefaultNote(targetFolder);

    setNotes((prev) => [newNote, ...prev]);
    setActiveNoteId(newNote.id);
    await storage.saveNote(newNote);

    // On mobile, collapse sidebar on note creation
    if (window.innerWidth < 800) {
      setIsSidebarOpen(false);
    }
  };

  // Delete Note
  const handleDeleteNote = async (noteId: string) => {
    await storage.deleteNote(noteId);
    const updatedNotes = notes.filter((n) => n.id !== noteId);
    setNotes(updatedNotes);

    if (activeNoteId === noteId) {
      if (updatedNotes.length > 0) {
        setActiveNoteId(updatedNotes[0].id);
      } else {
        // If all notes are deleted, create a fresh one
        const freshNote = createDefaultNote();
        setNotes([freshNote]);
        setActiveNoteId(freshNote.id);
        await storage.saveNote(freshNote);
      }
    }
  };

  // Toggle Note Pin
  const handleTogglePin = (noteId: string) => {
    const targetNote = notes.find((n) => n.id === noteId);
    if (!targetNote) return;

    const updatedNote: Note = {
      ...targetNote,
      pinned: !targetNote.pinned,
      updatedAt: Date.now(),
    };

    handleUpdateNote(updatedNote);
  };

  // Create Folder
  const handleCreateFolder = async (name: string, color: string) => {
    const newFolder: Folder = {
      id: 'f_' + Math.random().toString(36).substring(2, 9),
      name,
      color,
      createdAt: Date.now(),
    };

    const updatedFolders = [...folders, newFolder];
    setFolders(updatedFolders);
    await storage.saveFolder(newFolder);
    setActiveFolderId(newFolder.id);
  };

  if (isLoading) {
    return (
      <div
        style={{
          width: '100vw',
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg-app)',
          color: 'var(--text-muted)',
          fontSize: '1rem',
          fontWeight: 500,
          gap: 12,
        }}
      >
        <div
          style={{
            width: 20,
            height: 20,
            border: '2px solid #2563eb',
            borderTopColor: 'transparent',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }}
        />
        <span>Loading NoteCraft...</span>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Sidebar */}
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        notes={notes}
        activeNoteId={activeNoteId}
        onSelectNote={(id) => {
          setActiveNoteId(id);
          if (window.innerWidth < 800) setIsSidebarOpen(false);
        }}
        onCreateNote={handleCreateNote}
        onDeleteNote={handleDeleteNote}
        onTogglePin={handleTogglePin}
        folders={folders}
        activeFolderId={activeFolderId}
        onSelectFolder={setActiveFolderId}
        onOpenFolderModal={() => setIsFolderModalOpen(true)}
        isOnline={isOnline}
        isStandalone={isStandalone}
        canInstallPrompt={canInstall}
        onOpenInstallModal={() => setIsInstallModalOpen(true)}
      />

      {/* Main Workspace */}
      {activeNote ? (
        <NoteEditor
          note={activeNote}
          folders={folders}
          isSidebarOpen={isSidebarOpen}
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          onUpdateNote={handleUpdateNote}
          isSaving={isSaving}
          isOnline={isOnline}
          isStandalone={isStandalone}
          canInstallPrompt={canInstall}
          onOpenInstallModal={() => setIsInstallModalOpen(true)}
        />
      ) : (
        <main
          className="main-workspace"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            gap: 16,
          }}
        >
          <BookOpen size={48} color="var(--border-medium)" />
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-main)' }}>
            No Note Selected
          </h2>
          <button className="btn-primary" onClick={handleCreateNote}>
            <Plus size={18} style={{ marginRight: 6 }} />
            Create Your First Note
          </button>
        </main>
      )}

      {/* New Folder Modal */}
      <FolderModal
        isOpen={isFolderModalOpen}
        onClose={() => setIsFolderModalOpen(false)}
        onCreateFolder={handleCreateFolder}
      />

      {/* PWA Install Modal */}
      <InstallModal
        isOpen={isInstallModalOpen}
        onClose={() => setIsInstallModalOpen(false)}
        canInstallPrompt={canInstall}
        isStandalone={isStandalone}
        onTriggerInstall={triggerInstall}
      />
    </div>
  );
}

export default App;
