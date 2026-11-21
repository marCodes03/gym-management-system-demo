import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import SvgIcon from '../components/common/SvgIcon';
import {
  KpiSkeleton,
  Skeleton,
  TableSkeleton,
} from '../components/common/Skeleton';
import PaymentModal from '../components/modals/PaymentModal';
import ReceiptModal from '../components/modals/ReceiptModal';
import { formatDate, formatPHP } from '../utils/formatters';

const PERIODS = [
  { id: 'today', label: 'Today' },
  { id: '7d', label: 'Last 7 Days' },
  { id: 'month', label: 'This Month' },
];

/**
 * Mad Max Gym — Screen 5: Owner Usage & Membership Dashboard (ADMIN only)
 */
export default function Dashboard() {
  const { toast } = useToast();

  const [period, setPeriod] = useState('today');
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  // 1-Click Renew Modal Integration
  const [renewMember, setRenewMember] = useState(null);
  const [receiptData, setReceiptData] = useState(null);

  const fetchSummary = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/dashboard/summary?period=${period}`);
      setSummary(res?.data || null);
    } catch (err) {
      toast.error(err?.message || 'Unable to load owner dashboard metrics.');
    } finally {
      setLoading(false);
    }
  }, [period, toast]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  const peakMeta = useMemo(() => {
    const hours = summary?.peak_hours || [];
    const maxCount = hours.reduce((acc, h) => Math.max(acc, h.check_ins || 0), 0);
    const peakHour =
      maxCount > 0
        ? hours.find((h) => h.check_ins === maxCount)
        : null;
    return { maxCount: Math.max(1, maxCount), rawMax: maxCount, peakHour };
  }, [summary]);

  const usage = summary?.usage || {};
  const memberships = summary?.memberships || {};
  const expiring = summary?.expiring_soon || { count: 0, items: [] };
  const revenue = summary?.revenue || {};
  const cashTotal = revenue.by_method?.CASH?.total || 0;
  const qrTotal = revenue.by_method?.DIGITAL_WALLET?.total || 0;

  return (
    <div className="space-y-6">
      {/* Timeframe Filter Bar */}
      <div className="card-metallic rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-obsidian-black">
            Gym Usage, Active Memberships &amp; Revenue Overview
          </h2>
          <p className="text-xs text-steel-gray">
            Live operational analytics for Mad Max Gym
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-xl bg-silver-canvas p-1 border border-silver-border">
            {PERIODS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPeriod(p.id)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  period === p.id
                    ? 'bg-obsidian-black text-pure-white shadow-sm'
                    : 'text-gunmetal-gray hover:text-obsidian-black'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <Button
            variant="secondary"
            size="sm"
            leftIcon="refresh-cw"
            onClick={fetchSummary}
            disabled={loading}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* 4 Executive KPI Cards */}
      {loading ? (
        <KpiSkeleton count={4} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* KPI 1: Total Gym Sign-Ins */}
          <div className="card-metallic rounded-xl p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-steel-gray">
                Total Gym Sign-Ins
              </p>
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-royal-blue-light text-royal-blue-dark">
                <SvgIcon name="user-check" size={18} />
              </span>
            </div>
            <p className="mt-3 font-mono tabular-nums text-3xl font-extrabold text-obsidian-black">
              {(usage.granted_count ?? 0).toLocaleString()}
            </p>
            <p className="mt-1.5 text-xs text-steel-gray">
              <strong className="font-mono text-obsidian-black">
                {usage.unique_members_visited ?? 0}
              </strong>{' '}
              unique •{' '}
              <span className="text-rose-600 font-semibold font-mono">
                {usage.denied_count ?? 0} denied
              </span>
            </p>
          </div>

          {/* KPI 2: Active Memberships */}
          <div className="card-metallic rounded-xl p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-steel-gray">
                Active Memberships
              </p>
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                <SvgIcon name="users" size={18} />
              </span>
            </div>
            <p className="mt-3 font-mono tabular-nums text-3xl font-extrabold text-obsidian-black">
              {(memberships.total_active ?? 0).toLocaleString()}
            </p>
            <p className="mt-1.5 text-xs text-steel-gray font-mono">
              {memberships.recurring_count ?? 0} Recurring •{' '}
              {memberships.session_pack_count ?? 0} Packs
              {memberships.frozen_count ? ` • ${memberships.frozen_count} Frozen` : ''}
            </p>
          </div>

          {/* KPI 3: Expiring Soon */}
          <div className="card-metallic rounded-xl p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-steel-gray">
                Expiring Soon
              </p>
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
                <SvgIcon name="alert-triangle" size={18} />
              </span>
            </div>
            <p className="mt-3 font-mono tabular-nums text-3xl font-extrabold text-amber-700">
              {(expiring.count ?? 0).toLocaleString()}
            </p>
            <p className="mt-1.5 text-xs text-steel-gray">
              &le; 7 days or &le; 2 visits remaining
            </p>
          </div>

          {/* KPI 4: Membership Revenue (₱) */}
          <div className="card-metallic rounded-xl p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-steel-gray">
                Membership Revenue
              </p>
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-obsidian-black text-royal-blue-light">
                <SvgIcon name="cash" size={18} />
              </span>
            </div>
            <p className="mt-3 font-mono tabular-nums text-2xl sm:text-3xl font-extrabold text-royal-blue-dark">
              {formatPHP(revenue.gross_revenue ?? 0)}
            </p>
            <p className="mt-1.5 text-[11px] text-steel-gray font-mono tabular-nums">
              VAT {formatPHP(revenue.tax_amount ?? 0)} • Cash{' '}
              {formatPHP(cashTotal)} / QR {formatPHP(qrTotal)}
            </p>
          </div>
        </div>
      )}

      {/* Peak Gym Usage Hours Bar Chart (6 AM to 10 PM) */}
      <div className="card-metallic rounded-xl p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-obsidian-black">
              Peak Gym Usage Hours (6 AM – 10 PM)
            </h3>
            <p className="text-xs text-steel-gray">
              Hourly distribution of granted athlete check-ins
            </p>
          </div>
          {peakMeta.peakHour ? (
            <Badge variant="royal" mono>
              Peak: {peakMeta.peakHour.label} ({peakMeta.peakHour.check_ins} check-ins)
            </Badge>
          ) : (
            <Badge variant="gunmetal">No traffic in selected window</Badge>
          )}
        </div>

        {loading ? (
          <Skeleton className="h-52 w-full rounded-xl" />
        ) : (
          <div className="pt-2 overflow-x-auto">
            <div className="min-w-[600px] h-52 flex items-end gap-2 px-1">
              {(summary?.peak_hours || []).map((slot) => {
                const count = slot.check_ins || 0;
                const heightPct =
                  peakMeta.rawMax > 0
                    ? Math.max(count > 0 ? 10 : 3, (count / peakMeta.maxCount) * 100)
                    : 3;
                const isPeak =
                  peakMeta.rawMax > 0 && count === peakMeta.rawMax;

                return (
                  <div
                    key={slot.hour}
                    className="group flex-1 flex flex-col items-center justify-end h-full gap-1.5"
                    title={`${slot.label}: ${count} check-in(s)`}
                  >
                    <span
                      className={`font-mono tabular-nums text-[11px] font-bold transition-opacity ${
                        count > 0
                          ? isPeak
                            ? 'text-royal-blue-dark'
                            : 'text-gunmetal-gray'
                          : 'text-silver-gray/60'
                      }`}
                    >
                      {count}
                    </span>

                    <div className="w-full flex-1 flex items-end">
                      <div
                        className={`w-full rounded-t-lg transition-all duration-300 ${
                          isPeak
                            ? 'bg-gradient-to-t from-royal-blue-dark to-royal-blue shadow-sm'
                            : count > 0
                            ? 'bg-royal-blue/70 group-hover:bg-royal-blue'
                            : 'bg-silver-border/70'
                        }`}
                        style={{ height: `${heightPct}%` }}
                      />
                    </div>

                    <span className="text-[10px] font-mono text-steel-gray whitespace-nowrap">
                      {slot.label.replace(' AM', 'a').replace(' PM', 'p')}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Expiring Soon Action Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-obsidian-black">
              Expiring Soon — Renewal Action Queue
            </h3>
            <p className="text-xs text-steel-gray">
              Active members with &le; 7 days or &le; 2 visits left, sorted by soonest expiry
            </p>
          </div>
          <Badge status="EXPIRING_SOON" mono>
            {expiring.count ?? 0} Member{expiring.count === 1 ? '' : 's'}
          </Badge>
        </div>

        {loading ? (
          <TableSkeleton rows={4} columns={5} />
        ) : (expiring.items || []).length === 0 ? (
          <div className="card-metallic rounded-xl p-10 text-center space-y-2">
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
              <SvgIcon name="check" size={22} />
            </div>
            <p className="text-sm font-semibold text-obsidian-black">
              All active memberships are in good standing
            </p>
            <p className="text-xs text-steel-gray">
              No members are currently within 7 days or 2 visits of expiration.
            </p>
          </div>
        ) : (
          <div className="card-metallic rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-silver-border bg-silver-canvas/70 text-[11px] font-semibold uppercase tracking-wider text-gunmetal-gray">
                    <th className="py-3 px-5">Member</th>
                    <th className="py-3 px-4">Current Plan</th>
                    <th className="py-3 px-4">Remaining</th>
                    <th className="py-3 px-4">Expires On</th>
                    <th className="py-3 px-5 text-right">Quick Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-silver-border/70 text-sm">
                  {expiring.items.map((item) => (
                    <tr
                      key={item.subscription_id}
                      className="hover:bg-amber-50/40 transition-colors"
                    >
                      <td className="py-3.5 px-5">
                        <p className="font-semibold text-obsidian-black">
                          {item.member_name}
                        </p>
                        <p className="font-mono tabular-nums text-xs text-steel-gray">
                          {item.member_code} • {item.member_phone}
                        </p>
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="text-sm font-medium text-obsidian-black">
                          {item.plan_name}
                        </p>
                        <Badge status={item.plan_type_code} className="mt-1" />
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {item.plan_type_code === 'SESSION_PACK' ? (
                          <Badge status="EXPIRING_SOON" mono>
                            {item.remaining_sessions ?? 0} visit(s) left
                          </Badge>
                        ) : (
                          <Badge status="EXPIRING_SOON" mono>
                            {item.remaining_days ?? 0} day(s) left
                          </Badge>
                        )}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap font-mono tabular-nums text-xs font-semibold text-obsidian-black">
                        {formatDate(item.end_date)}
                      </td>
                      <td className="py-3.5 px-5 whitespace-nowrap text-right">
                        <Button
                          variant="primary"
                          size="sm"
                          leftIcon="cash"
                          onClick={() =>
                            setRenewMember({
                              id: item.member_id,
                              name: item.member_name,
                              member_code: item.member_code,
                              phone: item.member_phone,
                              plan_name: item.plan_name,
                              plan_type_code: item.plan_type_code,
                              end_date: item.end_date,
                              subscription_status: 'ACTIVE',
                              computed_status: 'EXPIRING_SOON',
                            })
                          }
                        >
                          Renew
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* 1-Click Renew PaymentModal & 80mm ReceiptModal */}
      <PaymentModal
        isOpen={Boolean(renewMember)}
        onClose={() => setRenewMember(null)}
        preselectedMember={renewMember}
        onSuccess={(data) => {
          setReceiptData(data);
          fetchSummary();
        }}
      />

      <ReceiptModal
        isOpen={Boolean(receiptData)}
        onClose={() => setReceiptData(null)}
        receiptData={receiptData}
      />
    </div>
  );
}
