import type { Note, Folder, CanvasPage } from '../types';

const DB_NAME = 'NotesAndDrawAppDB';
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

function getDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      console.warn('IndexedDB not supported, falling back to memory/local storage');
      reject(new Error('IndexedDB not supported'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('notes')) {
        const notesStore = db.createObjectStore('notes', { keyPath: 'id' });
        notesStore.createIndex('updatedAt', 'updatedAt', { unique: false });
        notesStore.createIndex('folderId', 'folderId', { unique: false });
      }
      if (!db.objectStoreNames.contains('folders')) {
        db.createObjectStore('folders', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      console.error('IndexedDB error:', request.error);
      reject(request.error);
    };
  });

  return dbPromise;
}

export function createDefaultPage(background: 'plain' | 'lined' | 'graph' | 'dotted' = 'lined'): CanvasPage {
  return {
    id: 'page_' + Math.random().toString(36).substring(2, 9),
    background,
    strokes: [],
  };
}

export function createDefaultNote(folderId = 'general'): Note {
  const now = Date.now();
  return {
    id: 'note_' + Math.random().toString(36).substring(2, 9),
    title: 'Untitled Note',
    folderId,
    pinned: false,
    content: '',
    viewMode: 'hybrid',
    pages: [createDefaultPage('lined')],
    activePageIndex: 0,
    createdAt: now,
    updatedAt: now,
  };
}

// Sample starter data for new users
function getStarterData(): { notes: Note[]; folders: Folder[] } {
  const now = Date.now();

  const folders: Folder[] = [
    { id: 'math', name: 'Math & Physics', color: '#2563eb', createdAt: now - 3600000 * 24 },
    { id: 'biology', name: 'Biology 101', color: '#16a34a', createdAt: now - 3600000 * 12 },
    { id: 'general', name: 'General & Ideas', color: '#7c3aed', createdAt: now - 3600000 * 6 },
  ];

  // Pre-drawn handwritten strokes for a student sample note (Calculus Derivatives)
  const mathNote: Note = {
    id: 'note_math_intro',
    title: 'Calculus: Derivatives & Tangent Vectors',
    folderId: 'math',
    pinned: true,
    viewMode: 'hybrid',
    content: `## Calculus I — Core Derivatives

Here are the fundamental rules to keep in mind for Friday's exam:

1. **Power Rule:** $\\frac{d}{dx} [x^n] = n x^{n-1}$
2. **Product Rule:** $(f \\cdot g)' = f'g + fg'$
3. **Chain Rule:** $\\frac{d}{dx}[f(g(x))] = f'(g(x)) \\cdot g'(x)$

> Remember: Check the boundary conditions before integrating!
- Practice Problem 4.2: Find tangent vector at $t = \\pi/3$.
- Hand-drawn diagram on the right shows slope $m = dy/dx$ at point $P(x_0, y_0)$.`,
    pages: [
      {
        id: 'p_math_1',
        background: 'graph',
        strokes: [
          // Blue axes
          {
            id: 's1',
            tool: 'pen',
            color: '#2563eb',
            width: 3,
            opacity: 1,
            points: [
              { x: 120, y: 100, pressure: 0.5 },
              { x: 120, y: 460, pressure: 0.6 },
            ],
          },
          {
            id: 's2',
            tool: 'pen',
            color: '#2563eb',
            width: 3,
            opacity: 1,
            points: [
              { x: 100, y: 440, pressure: 0.5 },
              { x: 560, y: 440, pressure: 0.6 },
            ],
          },
          // Parabola curve
          {
            id: 's3',
            tool: 'pen',
            color: '#1e293b',
            width: 3.5,
            opacity: 1,
            points: [
              { x: 140, y: 400, pressure: 0.5 },
              { x: 200, y: 340, pressure: 0.5 },
              { x: 280, y: 260, pressure: 0.6 },
              { x: 380, y: 190, pressure: 0.6 },
              { x: 480, y: 140, pressure: 0.6 },
            ],
          },
          // Tangent line (red)
          {
            id: 's4',
            tool: 'pen',
            color: '#dc2626',
            width: 2.5,
            opacity: 1,
            points: [
              { x: 180, y: 350, pressure: 0.5 },
              { x: 420, y: 160, pressure: 0.5 },
            ],
          },
          // Highlighter highlight under formula
          {
            id: 's5',
            tool: 'highlighter',
            color: '#fef08a',
            width: 24,
            opacity: 0.35,
            points: [
              { x: 140, y: 70, pressure: 0.5 },
              { x: 380, y: 70, pressure: 0.5 },
            ],
          },
          // Handwritten title on canvas: "f'(x) = dy/dx"
          {
            id: 's6',
            tool: 'pen',
            color: '#0f172a',
            width: 3,
            opacity: 1,
            points: [
              { x: 150, y: 65, pressure: 0.5 },
              { x: 155, y: 55, pressure: 0.5 },
              { x: 162, y: 65, pressure: 0.5 },
              { x: 166, y: 78, pressure: 0.5 },
            ],
          },
        ],
      },
      {
        id: 'p_math_2',
        background: 'lined',
        strokes: [],
      },
    ],
    activePageIndex: 0,
    createdAt: now - 3600000 * 20,
    updatedAt: now - 3600000 * 2,
  };

  const bioNote: Note = {
    id: 'note_bio_intro',
    title: 'Cell Organelles & Energy Synthesis',
    folderId: 'biology',
    pinned: false,
    viewMode: 'hybrid',
    content: `## Cellular Respiration Overview

Three core stages:
1. **Glycolysis** (Cytoplasm)
   - Glucose $\\rightarrow$ 2 Pyruvate + 2 ATP + 2 NADH
2. **Krebs Cycle / Citric Acid** (Mitochondrial Matrix)
   - Generates electron carriers: NADH & FADH2
3. **Oxidative Phosphorylation** (Inner Membrane)
   - ATP Synthase rotary motor drives synthesis of ~30-32 ATP!

*Tip:* Sketch the double membrane and cristae folding on the drawing sheet!`,
    pages: [
      {
        id: 'p_bio_1',
        background: 'dotted',
        strokes: [
          // Mitochondria outer membrane
          {
            id: 's_m1',
            tool: 'pen',
            color: '#16a34a',
            width: 3,
            opacity: 1,
            points: [
              { x: 200, y: 200, pressure: 0.5 },
              { x: 280, y: 160, pressure: 0.5 },
              { x: 380, y: 180, pressure: 0.5 },
              { x: 440, y: 240, pressure: 0.5 },
              { x: 400, y: 320, pressure: 0.5 },
              { x: 300, y: 340, pressure: 0.5 },
              { x: 220, y: 300, pressure: 0.5 },
              { x: 200, y: 200, pressure: 0.5 },
            ],
          },
          // Highlighter glow inside
          {
            id: 's_m2',
            tool: 'highlighter',
            color: '#bbf7d0',
            width: 30,
            opacity: 0.35,
            points: [
              { x: 260, y: 250, pressure: 0.5 },
              { x: 380, y: 250, pressure: 0.5 },
            ],
          },
        ],
      },
    ],
    activePageIndex: 0,
    createdAt: now - 3600000 * 10,
    updatedAt: now - 3600000 * 1,
  };

  return { notes: [mathNote, bioNote], folders };
}

// Storage operations
export const storage = {
  async getAllNotes(): Promise<Note[]> {
    try {
      const db = await getDB();
      return new Promise((resolve) => {
        const tx = db.transaction('notes', 'readonly');
        const store = tx.objectStore('notes');
        const request = store.getAll();

        request.onsuccess = () => {
          let notes: Note[] = request.result || [];
          if (notes.length === 0) {
            // First time initialization
            const starter = getStarterData();
            notes = starter.notes;
            const writeTx = db.transaction(['notes', 'folders'], 'readwrite');
            const nStore = writeTx.objectStore('notes');
            const fStore = writeTx.objectStore('folders');
            starter.notes.forEach((n) => nStore.put(n));
            starter.folders.forEach((f) => fStore.put(f));
          }
          // Sort by pinned first, then updatedAt descending
          notes.sort((a, b) => {
            if (a.pinned && !b.pinned) return -1;
            if (!a.pinned && b.pinned) return 1;
            return b.updatedAt - a.updatedAt;
          });
          resolve(notes);
        };

        request.onerror = () => {
          resolve(getStarterData().notes);
        };
      });
    } catch {
      // Fallback to local starter data
      return getStarterData().notes;
    }
  },

  async saveNote(note: Note): Promise<void> {
    try {
      const db = await getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction('notes', 'readwrite');
        const store = tx.objectStore('notes');
        const request = store.put(note);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (e) {
      console.warn('Could not save note to IndexedDB:', e);
    }
  },

  async deleteNote(id: string): Promise<void> {
    try {
      const db = await getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction('notes', 'readwrite');
        const store = tx.objectStore('notes');
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (e) {
      console.warn('Could not delete note from IndexedDB:', e);
    }
  },

  async getAllFolders(): Promise<Folder[]> {
    try {
      const db = await getDB();
      return new Promise((resolve) => {
        const tx = db.transaction('folders', 'readonly');
        const store = tx.objectStore('folders');
        const request = store.getAll();

        request.onsuccess = () => {
          const folders: Folder[] = request.result || [];
          if (folders.length === 0) {
            resolve(getStarterData().folders);
          } else {
            resolve(folders);
          }
        };

        request.onerror = () => {
          resolve(getStarterData().folders);
        };
      });
    } catch {
      return getStarterData().folders;
    }
  },

  async saveFolder(folder: Folder): Promise<void> {
    try {
      const db = await getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction('folders', 'readwrite');
        const store = tx.objectStore('folders');
        const request = store.put(folder);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (e) {
      console.warn('Could not save folder to IndexedDB:', e);
    }
  },

  async deleteFolder(id: string): Promise<void> {
    try {
      const db = await getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction('folders', 'readwrite');
        const store = tx.objectStore('folders');
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (e) {
      console.warn('Could not delete folder from IndexedDB:', e);
    }
  },
};
