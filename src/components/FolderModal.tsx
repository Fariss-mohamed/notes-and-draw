import { useState } from 'react';
import type { FC, FormEvent } from 'react';
import { Folder, X } from 'lucide-react';

interface FolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateFolder: (name: string, color: string) => void;
}

const PRESET_COLORS = [
  '#2563eb', // Blue
  '#16a34a', // Emerald
  '#7c3aed', // Purple
  '#ea580c', // Orange
  '#e11d48', // Rose
  '#0891b2', // Cyan
  '#475569', // Slate
];

export const FolderModal: FC<FolderModalProps> = ({ isOpen, onClose, onCreateFolder }) => {
  const [folderName, setFolderName] = useState('');
  const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0]);

  if (!isOpen) return null;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!folderName.trim()) return;
    onCreateFolder(folderName.trim(), selectedColor);
    setFolderName('');
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Folder size={20} color={selectedColor} />
            <h3 className="modal-title">New Folder</h3>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  color: 'var(--text-muted)',
                  marginBottom: 6,
                }}
              >
                Folder Name
              </label>
              <input
                type="text"
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
                placeholder="e.g. Physics 201, Chemistry Lab, Ideas"
                autoFocus
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.92rem',
                  background: 'var(--bg-app)',
                }}
              />
            </div>
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  color: 'var(--text-muted)',
                  marginBottom: 8,
                }}
              >
                Folder Color Tag
              </label>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setSelectedColor(color)}
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      background: color,
                      border: '2px solid transparent',
                      transform: selectedColor === color ? 'scale(1.2)' : 'none',
                      boxShadow: selectedColor === color ? `0 0 0 2px #fff, 0 0 0 4px ${color}` : 'none',
                      transition: 'all 0.15s ease',
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={!folderName.trim()}>
              Create Folder
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
