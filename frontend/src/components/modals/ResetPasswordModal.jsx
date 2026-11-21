import { useEffect, useState } from 'react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import Modal from './Modal';
import Button from '../common/Button';
import Input from '../common/Input';

const PASSWORD_POLICY_REGEX = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

/**
 * Mad Max Gym — Owner-Only Staff Password Reset Modal
 */
export default function ResetPasswordModal({ isOpen, onClose, staff }) {
  const { toast } = useToast();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPassword('');
      setConfirmPassword('');
      setError('');
    }
  }, [isOpen, staff?.id]);

  if (!staff) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!PASSWORD_POLICY_REGEX.test(password)) {
      setError(
        'Password must be at least 8 characters long and include both letters and numbers.'
      );
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match. Please re-enter both fields.');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const res = await api.post(`/staff/${staff.id}/reset-password`, {
        password,
      });
      toast.success(
        res?.data?.message || `Password updated successfully for ${staff.name}.`
      );
      if (typeof onClose === 'function') onClose();
    } catch (err) {
      setError(err?.message || 'Unable to reset staff password.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => !submitting && onClose?.()}
      title="Reset Staff Password"
      subtitle={`Set a new password for ${staff.name} (${staff.email}).`}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            variant="primary"
            type="submit"
            form="mm-reset-password-form"
            loading={submitting}
            leftIcon="lock"
          >
            Update Password
          </Button>
        </>
      }
    >
      <form
        id="mm-reset-password-form"
        onSubmit={handleSubmit}
        className="space-y-4"
      >
        <Input
          label="New Password"
          type="password"
          required
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            if (error) setError('');
          }}
          placeholder="Minimum 8 chars with letters & numbers"
        />

        <Input
          label="Confirm New Password"
          type="password"
          required
          value={confirmPassword}
          onChange={(e) => {
            setConfirmPassword(e.target.value);
            if (error) setError('');
          }}
          placeholder="Re-enter new password"
          error={error}
        />
      </form>
    </Modal>
  );
}
