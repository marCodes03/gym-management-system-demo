import { useCallback, useEffect, useState } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Select from '../components/common/Select';
import Badge from '../components/common/Badge';
import KebabMenu from '../components/common/KebabMenu';
import SvgIcon from '../components/common/SvgIcon';
import { TableSkeleton } from '../components/common/Skeleton';
import PaymentModal from '../components/modals/PaymentModal';
import ReceiptModal from '../components/modals/ReceiptModal';
import ConfirmVoidModal from '../components/modals/ConfirmVoidModal';
import { formatDate, formatPHP, formatTime } from '../utils/formatters';

const STATUS_OPTIONS = [
  { value: 'ALL', label: 'All Statuses' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'VOIDED', label: 'Voided' },
];

/**
 * Mad Max Gym — Screen 4: Membership Payments, Walk-In Checkout & 80mm Receipts Ledger
 */
export default function Payments() {
  const { isAdmin } = useAuth();
  const { toast } = useToast();

  const [payments, setPayments] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    start_date: '',
    end_date: '',
    status_code: 'ALL',
    search: '',
    page: 1,
  });

  // Modals
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [defaultWalkIn, setDefaultWalkIn] = useState(false);
  const [receiptData, setReceiptData] = useState(null);
  const [loadingReceiptId, setLoadingReceiptId] = useState(null);
  const [voidTarget, setVoidTarget] = useState(null);

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(filters.page));
      params.set('limit', '15');
      if (filters.start_date) params.set('start_date', filters.start_date);
      if (filters.end_date) params.set('end_date', filters.end_date);
      if (filters.status_code !== 'ALL') {
        params.set('status_code', filters.status_code);
      }
      if (filters.search.trim()) params.set('search', filters.search.trim());

      const res = await api.get(`/payments?${params.toString()}`);
      setPayments(Array.isArray(res?.data) ? res.data : []);
      if (res?.pagination) setPagination(res.pagination);
    } catch (err) {
      toast.error(err?.message || 'Unable to load payment records.');
    } finally {
      setLoading(false);
    }
  }, [filters, toast]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPayments();
    }, 180);
    return () => clearTimeout(timer);
  }, [fetchPayments]);

  const handleViewReceipt = async (paymentRow) => {
    setLoadingReceiptId(paymentRow.id);
    try {
      const res = await api.get(`/payments/${paymentRow.id}`);
      setReceiptData(res?.data || null);
    } catch (err) {
      toast.error(err?.message || 'Unable to load receipt details.');
    } finally {
      setLoadingReceiptId(null);
    }
  };

  return (
    <div className="space-y-5">
      {/* Top Toolbar */}
      <div className="card-metallic rounded-xl p-4 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-obsidian-black">
              Membership Invoices &amp; 80mm Receipts
            </h2>
            <p className="text-xs text-steel-gray">
              All amounts are 12% Philippine BIR VAT-inclusive ({pagination.total}{' '}
              record{pagination.total === 1 ? '' : 's'})
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              variant="secondary"
              leftIcon="user-plus"
              onClick={() => {
                setDefaultWalkIn(true);
                setPaymentModalOpen(true);
              }}
            >
              Quick Walk-In Pass
            </Button>
            <Button
              variant="primary"
              leftIcon="plus"
              onClick={() => {
                setDefaultWalkIn(false);
                setPaymentModalOpen(true);
              }}
            >
              New Payment / Renewal
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Input
            type="date"
            label="Start Date"
            value={filters.start_date}
            onChange={(e) =>
              setFilters((prev) => ({
                ...prev,
                start_date: e.target.value,
                page: 1,
              }))
            }
          />
          <Input
            type="date"
            label="End Date"
            value={filters.end_date}
            onChange={(e) =>
              setFilters((prev) => ({
                ...prev,
                end_date: e.target.value,
                page: 1,
              }))
            }
          />
          <Select
            label="Invoice Status"
            options={STATUS_OPTIONS}
            value={filters.status_code}
            onChange={(e) =>
              setFilters((prev) => ({
                ...prev,
                status_code: e.target.value,
                page: 1,
              }))
            }
          />
          <Input
            label="Search Invoices"
            leftIcon="search"
            value={filters.search}
            onChange={(e) =>
              setFilters((prev) => ({
                ...prev,
                search: e.target.value,
                page: 1,
              }))
            }
            placeholder="INV-..., member, or plan..."
          />
        </div>
      </div>

      {/* Invoices Table */}
      {loading ? (
        <TableSkeleton rows={7} columns={7} />
      ) : payments.length === 0 ? (
        <div className="card-metallic rounded-xl p-12 text-center space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-silver-canvas text-gunmetal-gray">
            <SvgIcon name="receipt" size={24} />
          </div>
          <h3 className="text-base font-semibold text-obsidian-black">
            No payment invoices found
          </h3>
          <p className="text-sm text-steel-gray max-w-md mx-auto">
            Process a new membership enrollment or quick walk-in day pass to generate an 80mm receipt.
          </p>
        </div>
      ) : (
        <div className="card-metallic rounded-xl overflow-visible">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-silver-border bg-silver-canvas/70 text-[11px] font-semibold uppercase tracking-wider text-gunmetal-gray">
                  <th className="py-3.5 px-5">Invoice #</th>
                  <th className="py-3.5 px-4">Date &amp; Time</th>
                  <th className="py-3.5 px-4">Member</th>
                  <th className="py-3.5 px-4">Plan</th>
                  <th className="py-3.5 px-4">Method</th>
                  <th className="py-3.5 px-4 text-right">Total (₱)</th>
                  <th className="py-3.5 px-5 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-silver-border/70 text-sm">
                {payments.map((row, idx) => {
                  const isNearBottom =
                    payments.length > 3 && idx >= payments.length - 2;
                  const isVoided = row.status_code === 'VOIDED';

                  return (
                    <tr
                      key={row.id}
                      className={`hover:bg-silver-canvas/40 transition-colors ${
                        isVoided ? 'opacity-75' : ''
                      }`}
                    >
                      <td className="py-3.5 px-5 whitespace-nowrap">
                        <span className="font-mono tabular-nums text-xs font-bold text-obsidian-black">
                          {row.invoice_number}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <p className="text-xs font-semibold text-obsidian-black">
                          {formatDate(row.created_at)}
                        </p>
                        <p className="font-mono tabular-nums text-[11px] text-steel-gray">
                          {formatTime(row.created_at)}
                        </p>
                      </td>

                      <td className="py-3.5 px-4">
                        <p className="font-semibold text-obsidian-black">
                          {row.member_name}
                        </p>
                        <p className="font-mono tabular-nums text-xs text-steel-gray">
                          {row.member_code}
                        </p>
                      </td>

                      <td className="py-3.5 px-4">
                        <p className="text-sm font-medium text-obsidian-black">
                          {row.plan_name_snapshot}
                        </p>
                        {row.discount_amount > 0 ? (
                          <p className="text-[11px] text-emerald-700 font-mono">
                            -{row.discount_pct}% discount
                          </p>
                        ) : null}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap text-xs text-gunmetal-gray">
                        <span className="font-medium">
                          {row.payment_method_name || row.payment_method_code}
                        </span>
                        {row.payment_ref ? (
                          <span className="block font-mono text-[11px] text-steel-gray">
                            Ref: {row.payment_ref}
                          </span>
                        ) : null}
                      </td>

                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <p
                          className={`font-mono tabular-nums font-extrabold ${
                            isVoided
                              ? 'line-through text-rose-600'
                              : 'text-obsidian-black'
                          }`}
                        >
                          {formatPHP(row.total_amount)}
                        </p>
                        <p className="font-mono tabular-nums text-[11px] text-steel-gray">
                          VAT {formatPHP(row.tax_amount)}
                        </p>
                      </td>

                      {/* Rightmost Column: Status Badge + In-Column KebabMenu */}
                      <td className="py-3.5 px-5 whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <Badge status={row.status_code} dot />
                          <KebabMenu
                            dropUp={isNearBottom}
                            ariaLabel={`Actions for ${row.invoice_number}`}
                            items={[
                              {
                                key: 'receipt',
                                label:
                                  loadingReceiptId === row.id
                                    ? 'Loading Receipt...'
                                    : 'View / Reprint 80mm Receipt',
                                icon: 'printer',
                                variant: 'primary',
                                disabled: loadingReceiptId === row.id,
                                onClick: () => handleViewReceipt(row),
                              },
                              {
                                divider: true,
                                hidden: !isAdmin || isVoided,
                              },
                              {
                                key: 'void',
                                label: 'Void Payment',
                                icon: 'trash',
                                variant: 'danger',
                                hidden: !isAdmin || isVoided,
                                onClick: () => setVoidTarget(row),
                              },
                            ]}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {pagination.totalPages > 1 ? (
            <div className="border-t border-silver-border bg-silver-canvas/50 px-5 py-3 flex items-center justify-between text-xs text-steel-gray">
              <span>
                Page <strong className="font-mono">{pagination.page}</strong> of{' '}
                <strong className="font-mono">{pagination.totalPages}</strong> (
                {pagination.total} invoices)
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={pagination.page <= 1}
                  onClick={() =>
                    setFilters((prev) => ({
                      ...prev,
                      page: Math.max(1, prev.page - 1),
                    }))
                  }
                >
                  Previous
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() =>
                    setFilters((prev) => ({ ...prev, page: prev.page + 1 }))
                  }
                >
                  Next
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* Payment Modal */}
      <PaymentModal
        isOpen={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        defaultWalkIn={defaultWalkIn}
        onSuccess={(data) => {
          setReceiptData(data);
          fetchPayments();
        }}
      />

      {/* 80mm Thermal Receipt Modal */}
      <ReceiptModal
        isOpen={Boolean(receiptData)}
        onClose={() => setReceiptData(null)}
        receiptData={receiptData}
      />

      {/* Owner-Only Void Payment Confirmation Modal */}
      <ConfirmVoidModal
        isOpen={Boolean(voidTarget)}
        onClose={() => setVoidTarget(null)}
        payment={voidTarget}
        onSuccess={fetchPayments}
      />
    </div>
  );
}
