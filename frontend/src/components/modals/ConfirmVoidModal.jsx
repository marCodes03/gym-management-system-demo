import { useEffect, useState } from 'react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import Modal from './Modal';
import Button from '../common/Button';
import SvgIcon from '../common/SvgIcon';
import { formatPHP } from '../../utils/formatters';

/**
 * Mad Max Gym — Owner-Only Void Payment Confirmation Modal
 * Requires void_reason >= 5 chars, marks payment VOIDED, and cancels linked subscription.
 */
export default function ConfirmVoidModal({ isOpen, onClose, payment, onSuccess }) {
  const { toast } = useToast();
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setReason('');
      setError('');
    }
  }, [isOpen, payment?.id]);

  if (!payment) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = reason.trim();
    if (trimmed.length < 5 || trimmed.length > 300) {
      setError(
        'Please provide a valid void reason of at least 5 characters for the audit log.'
      );
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const res = await api.post(`/payments/${payment.id}/void`, {
        void_reason: trimmed,
      });
      toast.success(
        res?.data?.message ||
          `Payment ${payment.invoice_number} has been voided and its linked membership cancelled.`
      );
      if (typeof onSuccess === 'function') onSuccess(res?.data);
      if (typeof onClose === 'function') onClose();
    } catch (err) {
      setError(err?.message || 'Unable to void payment.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => !submitting && onClose?.()}
      title="Void Membership Payment"
      subtitle="Owner audit action • This also cancels the linked membership subscription."
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            variant="danger"
            type="submit"
            form="mm-void-payment-form"
            loading={submitting}
            leftIcon="trash"
          >
            Confirm Void Payment
          </Button>
        </>
      }
    >
      <form id="mm-void-payment-form" onSubmit={handleSubmit} className="space-y-4">
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3.5 flex items-start gap-3">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-rose-100 text-rose-700">
            <SvgIcon name="alert-triangle" size={17} />
          </span>
          <div className="text-xs text-rose-900 space-y-1">
            <p className="font-semibold">
              You are about to void invoice{' '}
              <span className="font-mono">{payment.invoice_number}</span>
            </p>
            <p>
              Member: <strong>{payment.member_name}</strong> • Plan:{' '}
              <strong>{payment.plan_name_snapshot}</strong> • Amount:{' '}
              <strong className="font-mono tabular-nums">
                {formatPHP(payment.total_amount)}
              </strong>
            </p>
            <p className="text-rose-700">
              This action is permanent and will immediately cancel the associated
              membership subscription.
            </p>
          </div>
        </div>

        <div>
          <label
            htmlFor="mm-void-reason"
            className="block text-sm font-medium text-gunmetal-gray mb-1.5"
          >
            Void Reason <span className="text-red-600 ml-0.5">*</span>
          </label>
          <textarea
            id="mm-void-reason"
            rows={3}
            maxLength={300}
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              if (error) setError('');
            }}
            placeholder="e.g., Duplicate payment recorded or wrong membership plan selected"
            className={`w-full rounded-lg border bg-pure-white px-3.5 py-2.5 text-sm text-obsidian-black placeholder:text-silver-gray focus:outline-none focus:ring-2 ${
              error
                ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/20'
                : 'border-silver-border focus:border-royal-blue focus:ring-royal-blue/20'
            }`}
          />
          {error ? (
            <p role="alert" className="mt-1.5 text-xs font-medium text-red-600">
              {error}
            </p>
          ) : (
            <p className="mt-1 text-xs text-steel-gray">
              Minimum 5 characters required for the owner audit trail.
            </p>
          )}
        </div>
      </form>
    </Modal>
  );
}
