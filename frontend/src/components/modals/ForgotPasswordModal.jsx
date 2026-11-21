import { useEffect, useState } from 'react';
import api from '../../services/api';
import Modal from './Modal';
import Button from '../common/Button';
import Input from '../common/Input';
import SvgIcon from '../common/SvgIcon';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Mad Max Gym — Forgot Password & Demo Credentials Recovery Modal
 * Verifies staff email via POST /api/v1/auth/forgot-password, displays owner contact instructions,
 * and offers 1-click demo credential autofill buttons.
 */
export default function ForgotPasswordModal({
  isOpen,
  onClose,
  onAutofillCredentials,
}) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [recoveryInfo, setRecoveryInfo] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setEmail('');
      setError('');
      setRecoveryInfo(null);
    }
  }, [isOpen]);

  const handleVerify = async (e) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!EMAIL_REGEX.test(trimmed)) {
      setError('Please enter a valid email address (e.g., name@gym.com).');
      return;
    }

    setLoading(true);
    setError('');
    setRecoveryInfo(null);
    try {
      const res = await api.post(
        '/auth/forgot-password',
        { email: trimmed },
        { skipAuth: true }
      );
      setRecoveryInfo(res?.data || null);
    } catch (err) {
      setError(
        err?.message ||
          `No staff account found for '${trimmed}'. Please check the spelling or contact the gym owner.`
      );
    } finally {
      setLoading(false);
    }
  };

  const handleUseDemo = (demoEmail, demoPassword) => {
    if (typeof onAutofillCredentials === 'function') {
      onAutofillCredentials(demoEmail, demoPassword);
    }
    if (typeof onClose === 'function') onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Staff Password Recovery"
      subtitle="Verify your registered staff email to view owner reset instructions."
      size="sm"
      footer={
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
      }
    >
      <div className="space-y-5">
        <form onSubmit={handleVerify} className="space-y-3">
          <Input
            label="Registered Staff Email"
            type="email"
            required
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (error) setError('');
            }}
            placeholder="frontdesk@madmaxgym.com"
            error={error}
          />
          <Button
            type="submit"
            variant="primary"
            fullWidth
            loading={loading}
            leftIcon="search"
          >
            Verify Staff Account
          </Button>
        </form>

        {recoveryInfo ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 space-y-2 text-xs text-emerald-950">
            <div className="flex items-center gap-2 font-bold text-emerald-800">
              <SvgIcon name="check" size={15} />
              <span>Account Verified: {recoveryInfo.staffName}</span>
            </div>
            <p className="leading-relaxed">
              {recoveryInfo.recovery?.instructions}
            </p>
            <div className="pt-1.5 border-t border-emerald-200/80 space-y-1 font-mono text-[11px]">
              <p>
                <strong>Owner:</strong> {recoveryInfo.recovery?.ownerName} (
                {recoveryInfo.recovery?.ownerEmail})
              </p>
              <p>
                <strong>Gym Contact:</strong> {recoveryInfo.recovery?.gymPhone}
              </p>
            </div>
          </div>
        ) : null}

        {/* 1-Click Demo Credentials Autofill */}
        <div className="rounded-xl border border-silver-border bg-silver-canvas/60 p-4 space-y-2.5">
          <p className="text-xs font-bold uppercase tracking-wider text-gunmetal-gray">
            Demo Credentials Quick Autofill
          </p>
          <p className="text-xs text-steel-gray">
            Click a role below to pre-fill the login form for testing:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Button
              variant="secondary"
              size="sm"
              leftIcon="shield"
              onClick={() => handleUseDemo('owner@madmaxgym.com', 'Admin123!')}
            >
              Owner Admin
            </Button>
            <Button
              variant="secondary"
              size="sm"
              leftIcon="user-check"
              onClick={() =>
                handleUseDemo('frontdesk@madmaxgym.com', 'Staff123!')
              }
            >
              Front Desk Staff
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
