import { useEffect, useRef, useState } from 'react';
import api from '../../services/api';
import Button from '../common/Button';
import Input from '../common/Input';
import SvgIcon from '../common/SvgIcon';
import Modal from '../modals/Modal';
import madMaxLogo from '../../assets/mad-max-logo.svg';

/**
 * Mad Max Gym — Fullscreen Self-Service Member Sign-In Kiosk Shell
 * Obsidian Black (#0B0D11) & Royal Blue (#2563EB) frame with live digital clock,
 * auto-focused check-in slot, and password-guarded "Exit Kiosk" modal.
 */
export default function KioskShell({
  children,
  onExit,
  onVerifyExit,
  gymName = 'Mad Max Gym',
  tagline = 'Forged in Iron. Built for Speed.',
}) {
  const [now, setNow] = useState(() => new Date());
  const [exitModalOpen, setExitModalOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [exitError, setExitError] = useState('');
  const passwordInputRef = useRef(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (exitModalOpen) {
      setPassword('');
      setExitError('');
      const timer = setTimeout(() => {
        passwordInputRef.current?.focus();
      }, 60);
      return () => clearTimeout(timer);
    }
  }, [exitModalOpen]);

  const handleExitSubmit = async (event) => {
    event.preventDefault();
    if (!password.trim()) {
      setExitError('Please enter your staff password to unlock Kiosk Mode.');
      return;
    }

    setVerifying(true);
    setExitError('');

    try {
      if (typeof onVerifyExit === 'function') {
        await onVerifyExit(password);
      } else {
        await api.post('/check-in/verify-exit', { staff_password: password });
      }
      setExitModalOpen(false);
      if (typeof onExit === 'function') {
        onExit();
      }
    } catch (err) {
      setExitError(
        err?.message || 'Incorrect staff password. Kiosk mode remains locked.'
      );
    } finally {
      setVerifying(false);
    }
  };

  const formattedTime = now.toLocaleTimeString('en-PH', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });

  const formattedDate = now.toLocaleDateString('en-PH', {
    weekday: 'long',
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  });

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-obsidian-black text-pure-white overflow-y-auto">
      {/* Subtle top Royal Blue voltage strip */}
      <div className="h-1 w-full bg-gradient-to-r from-royal-blue-dark via-royal-blue to-blue-400 shrink-0" />

      {/* Kiosk Crest Header */}
      <header className="shrink-0 border-b border-gunmetal-gray/60 bg-carbon-black/70 px-6 sm:px-10 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <img
            src={madMaxLogo}
            alt={gymName}
            className="h-11 sm:h-12 w-auto select-none"
          />
          <div className="hidden sm:block border-l border-gunmetal-gray/70 pl-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-royal-blue-light">
              Self-Service Check-In Kiosk
            </p>
            <p className="text-xs text-silver-gray">{tagline}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 sm:gap-6">
          {/* Live Digital Clock */}
          <div className="text-right">
            <p className="font-mono tabular-nums text-xl sm:text-2xl font-extrabold tracking-tight text-pure-white leading-none">
              {formattedTime}
            </p>
            <p className="mt-1 text-xs text-silver-gray font-medium">
              {formattedDate}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setExitModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-gunmetal-gray bg-obsidian-black/80 px-3.5 py-2.5 text-xs font-semibold text-silver-gray hover:border-royal-blue hover:text-pure-white transition-colors min-h-[42px]"
          >
            <SvgIcon name="lock" size={15} />
            <span>Exit Kiosk</span>
          </button>
        </div>
      </header>

      {/* Main Centered Check-In Slot */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 sm:px-8 py-8">
        <div className="w-full max-w-2xl rounded-2xl bg-carbon-black border border-gunmetal-gray/80 shadow-modal overflow-hidden">
          <div className="h-1.5 w-full bg-royal-blue" />
          <div className="p-6 sm:p-10">{children}</div>
        </div>
      </main>

      {/* Kiosk Footer */}
      <footer className="shrink-0 border-t border-gunmetal-gray/50 px-6 py-3 flex items-center justify-between text-xs text-silver-gray">
        <span className="inline-flex items-center gap-1.5">
          <SvgIcon name="shield" size={14} className="text-royal-blue" />
          <span>{gymName} • Fast Sign-In Terminal</span>
        </span>
        <span className="font-mono">Scan QR Pass • Enter Member Code or Phone</span>
      </footer>

      {/* Password-Guarded Exit Kiosk Modal */}
      <Modal
        isOpen={exitModalOpen}
        onClose={() => !verifying && setExitModalOpen(false)}
        title="Exit Self-Service Kiosk"
        subtitle="Staff password verification is required to return to the backoffice."
        size="sm"
        zIndexClass="z-[60]"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setExitModalOpen(false)}
              disabled={verifying}
            >
              Stay in Kiosk
            </Button>
            <Button
              variant="primary"
              type="submit"
              form="mm-exit-kiosk-form"
              loading={verifying}
              leftIcon="unlock"
            >
              Unlock &amp; Exit
            </Button>
          </>
        }
      >
        <form
          id="mm-exit-kiosk-form"
          onSubmit={handleExitSubmit}
          className="space-y-4"
        >
          <p className="text-sm text-steel-gray">
            Enter your logged-in staff account password to close Fullscreen Kiosk Mode.
          </p>
          <Input
            ref={passwordInputRef}
            label="Staff Password"
            type="password"
            required
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (exitError) setExitError('');
            }}
            placeholder="Enter staff password"
            error={exitError}
            autoComplete="current-password"
          />
        </form>
      </Modal>
    </div>
  );
}
