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

  // Mobile responsiveness state
  const [isMobileScreen, setIsMobileScreen] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  );
  const [mobileView, setMobileView] = useState<'list' | 'editor'>('list');

  const { canInstall, isStandalone, isOnline, triggerInstall } = usePWA();

  const saveTimerRef = useRef<number | null>(null);

  // Screen size detection
  useEffect(() => {
    const handleResize = () => {
      const isMobile = window.innerWidth < 768;
      setIsMobileScreen(isMobile);
      if (!isMobile) {
        setIsSidebarOpen(true);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

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
      activeFolderId !== 'all' && activeFolderId !== 'pinned' && activeFolderId !== 'unfiled'
        ? activeFolderId
        : 'general';

    const newNote = createDefaultNote(targetFolder);

    setNotes((prev) => [newNote, ...prev]);
    setActiveNoteId(newNote.id);
    await storage.saveNote(newNote);

    // Switch view to editor on mobile
    setMobileView('editor');
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
      if (isMobileScreen) {
        setMobileView('list');
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
            width: 24,
            height: 24,
            border: '2.5px solid #2563eb',
            borderTopColor: 'transparent',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }}
        />
        <span>Loading Notebook...</span>
      </div>
    );
  }

  // Determine whether sidebar and editor should be visible
  const showSidebar = !isMobileScreen ? isSidebarOpen : mobileView === 'list';
  const showEditor = !isMobileScreen ? true : mobileView === 'editor';

  return (
    <div className={`app-container ${isMobileScreen ? 'mobile-mode' : 'desktop-mode'}`}>
      {/* Sidebar / Notes List */}
      {showSidebar && (
        <Sidebar
          isOpen={true}
          onClose={() => setIsSidebarOpen(false)}
          notes={notes}
          activeNoteId={activeNoteId}
          onSelectNote={(id) => {
            setActiveNoteId(id);
            setMobileView('editor');
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
          isMobileScreen={isMobileScreen}
        />
      )}

      {/* Main Workspace / Note Editor */}
      {showEditor && (
        activeNote ? (
          <NoteEditor
            note={activeNote}
            folders={folders}
            isSidebarOpen={isSidebarOpen}
            onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
            onUpdateNote={handleUpdateNote}
            onDeleteNote={() => handleDeleteNote(activeNote.id)}
            onBackToList={() => setMobileView('list')}
            isSaving={isSaving}
            isOnline={isOnline}
            isStandalone={isStandalone}
            canInstallPrompt={canInstall}
            onOpenInstallModal={() => setIsInstallModalOpen(true)}
            isMobileScreen={isMobileScreen}
          />
        ) : (
          <main className="main-workspace empty-workspace">
            <BookOpen size={48} color="var(--border-medium)" />
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-main)' }}>
              No Note Selected
            </h2>
            <button className="btn-primary" onClick={handleCreateNote}>
              <Plus size={18} style={{ marginRight: 6 }} />
              Create Note
            </button>
          </main>
        )
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
