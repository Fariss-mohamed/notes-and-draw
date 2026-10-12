import type { FC } from 'react';
import {
  Download,
  X,
  Smartphone,
  WifiOff,
  Sparkles,
  MoreVertical,
  PlusSquare,
  CheckCircle2,
} from 'lucide-react';

interface InstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  canInstallPrompt: boolean;
  isStandalone: boolean;
  onTriggerInstall: () => void;
}

export const InstallModal: FC<InstallModalProps> = ({
  isOpen,
  onClose,
  canInstallPrompt,
  isStandalone,
  onTriggerInstall,
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 480 }}
      >
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                boxShadow: '0 2px 8px rgba(37,99,235,0.3)',
              }}
            >
              <Smartphone size={20} />
            </div>
            <div>
              <h3 className="modal-title" style={{ fontSize: '1.08rem' }}>
                Install Notes & Draw
              </h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Progressive Web App for Android & Tablets
              </p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose} title="Close">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="modal-body" style={{ padding: '18px 22px' }}>
          {isStandalone ? (
            <div
              style={{
                textAlign: 'center',
                padding: '16px 8px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <CheckCircle2 size={44} color="#16a34a" />
              <h4 style={{ fontSize: '1.05rem', color: 'var(--text-main)' }}>
                Application Installed!
              </h4>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>
                You are currently running Notes & Draw in standalone mode. All notes and canvas drawings work offline and save automatically.
              </p>
            </div>
          ) : (
            <>
              {/* Feature Perks */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 10,
                  marginBottom: 18,
                }}
              >
                <div
                  style={{
                    background: 'var(--bg-app)',
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    fontSize: '0.82rem',
                    fontWeight: 500,
                  }}
                >
                  <WifiOff size={16} color="#2563eb" />
                  <span>100% Offline Ready</span>
                </div>
                <div
                  style={{
                    background: 'var(--bg-app)',
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    fontSize: '0.82rem',
                    fontWeight: 500,
                  }}
                >
                  <Sparkles size={16} color="#ea580c" />
                  <span>No Browser Bars</span>
                </div>
              </div>

              {/* One-Click Install Button if supported */}
              {canInstallPrompt && (
                <div style={{ marginBottom: 18 }}>
                  <button
                    className="btn-primary"
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      fontSize: '0.94rem',
                      fontWeight: 600,
                    }}
                    onClick={() => {
                      onTriggerInstall();
                      onClose();
                    }}
                  >
                    <Download size={18} />
                    <span>Install App on this Device</span>
                  </button>
                  <p
                    style={{
                      textAlign: 'center',
                      fontSize: '0.74rem',
                      color: 'var(--text-subtle)',
                      marginTop: 6,
                    }}
                  >
                    Installs instantly without using Google Play Store storage
                  </p>
                </div>
              )}

              {/* Step-by-Step Android Chrome Manual Guide */}
              <div>
                <h4
                  style={{
                    fontSize: '0.86rem',
                    fontWeight: 600,
                    color: 'var(--text-main)',
                    marginBottom: 10,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <Smartphone size={15} color="#2563eb" />
                  <span>How to install on Android Chrome:</span>
                </h4>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 12,
                      fontSize: '0.84rem',
                      color: 'var(--text-muted)',
                      lineHeight: 1.4,
                    }}
                  >
                    <div
                      style={{
                        minWidth: 22,
                        height: 22,
                        borderRadius: '50%',
                        background: 'var(--primary-light)',
                        color: 'var(--primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                      }}
                    >
                      1
                    </div>
                    <div>
                      Tap the three dots (
                      <MoreVertical size={13} style={{ verticalAlign: 'middle' }} />) menu icon in Chrome's top right corner.
                    </div>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 12,
                      fontSize: '0.84rem',
                      color: 'var(--text-muted)',
                      lineHeight: 1.4,
                    }}
                  >
                    <div
                      style={{
                        minWidth: 22,
                        height: 22,
                        borderRadius: '50%',
                        background: 'var(--primary-light)',
                        color: 'var(--primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                      }}
                    >
                      2
                    </div>
                    <div>
                      Select <strong>"Install app"</strong> or{' '}
                      <strong>"Add to Home screen"</strong> (
                      <PlusSquare size={13} style={{ verticalAlign: 'middle' }} />
                      ).
                    </div>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 12,
                      fontSize: '0.84rem',
                      color: 'var(--text-muted)',
                      lineHeight: 1.4,
                    }}
                  >
                    <div
                      style={{
                        minWidth: 22,
                        height: 22,
                        borderRadius: '50%',
                        background: 'var(--primary-light)',
                        color: 'var(--primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                      }}
                    >
                      3
                    </div>
                    <div>
                      Tap <strong>"Install"</strong> to confirm. Notes & Draw will appear on your home screen and app drawer!
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
