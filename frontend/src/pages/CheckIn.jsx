import { useCallback, useEffect, useRef, useState } from 'react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import KioskShell from '../components/layout/KioskShell';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Select from '../components/common/Select';
import Badge from '../components/common/Badge';
import SvgIcon from '../components/common/SvgIcon';
import { Skeleton, TableSkeleton } from '../components/common/Skeleton';
import PaymentModal from '../components/modals/PaymentModal';
import ReceiptModal from '../components/modals/ReceiptModal';
import { formatDate, formatDateTime, formatTime } from '../utils/formatters';

const STATUS_FILTER_OPTIONS = [
  { value: 'ALL', label: 'All Statuses' },
  { value: 'GRANTED', label: 'Granted Only' },
  { value: 'DENIED_EXPIRED', label: 'Denied — Expired' },
  { value: 'DENIED_FROZEN', label: 'Denied — Frozen' },
  { value: 'DENIED_NO_PLAN', label: 'Denied — No Plan' },
];

const METHOD_LABELS = {
  KIOSK_CODE: 'Kiosk Code',
  KIOSK_PHONE: 'Kiosk Phone',
  KIOSK_QR: 'Kiosk QR',
  STAFF_LOOKUP: 'Front Desk',
};

const KIOSK_RESET_MS = 4000;

/**
 * Mad Max Gym — Screen 1: Fast Gym Sign-In Terminal
 * Dual-mode workspace: Front-Desk Staff Lookup Mode + Fullscreen Self-Service Kiosk Mode.
 */
export default function CheckIn() {
  const { toast } = useToast();

  // Mode toggle
  const [kioskMode, setKioskMode] = useState(false);

  // Staff Lookup state
  const [lookupQuery, setLookupQuery] = useState('');
  const [lookupResults, setLookupResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [actingMemberId, setActingMemberId] = useState(null);

  // Usage History / Feed state
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [logFilters, setLogFilters] = useState({
    start_date: '',
    end_date: '',
    access_status: 'ALL',
    search: '',
    page: 1,
  });

  // Payment / Receipt modal integration
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentMember, setPaymentMember] = useState(null);
  const [paymentDefaultWalkIn, setPaymentDefaultWalkIn] = useState(false);
  const [receiptData, setReceiptData] = useState(null);

  // Kiosk Mode state
  const [kioskInput, setKioskInput] = useState('');
  const [kioskSubmitting, setKioskSubmitting] = useState(false);
  const [kioskFeedback, setKioskFeedback] = useState(null);
  const [kioskCountdownPct, setKioskCountdownPct] = useState(100);
  const kioskInputRef = useRef(null);
  const resetTimerRef = useRef(null);
  const countdownIntervalRef = useRef(null);

  // Fetch paginated attendance logs
  const fetchLogs = useCallback(async () => {
    setLoadingLogs(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(logFilters.page));
      params.set('limit', '15');
      if (logFilters.start_date) params.set('start_date', logFilters.start_date);
      if (logFilters.end_date) params.set('end_date', logFilters.end_date);
      if (logFilters.access_status && logFilters.access_status !== 'ALL') {
        params.set('access_status', logFilters.access_status);
      }
      if (logFilters.search.trim()) params.set('search', logFilters.search.trim());

      const res = await api.get(`/check-in/logs?${params.toString()}`);
      setLogs(Array.isArray(res?.data) ? res.data : []);
      if (res?.pagination) setPagination(res.pagination);
    } catch (err) {
      toast.error(err?.message || 'Unable to load sign-in logs.');
    } finally {
      setLoadingLogs(false);
    }
  }, [logFilters, toast]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Debounced instant member lookup
  const runMemberSearch = useCallback(async (queryText) => {
    const trimmed = queryText.trim();
    if (!trimmed) {
      setLookupResults([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    try {
      const res = await api.get(
        `/members?search=${encodeURIComponent(trimmed)}&limit=8`
      );
      setLookupResults(Array.isArray(res?.data) ? res.data : []);
    } catch {
      setLookupResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      runMemberSearch(lookupQuery);
    }, 220);
    return () => clearTimeout(timer);
  }, [lookupQuery, runMemberSearch]);

  // Staff 1-click Sign In
  const handleStaffSignIn = async (member) => {
    setActingMemberId(member.id);
    try {
      const res = await api.post('/check-in', {
        member_id: member.id,
        check_in_method: 'STAFF_LOOKUP',
      });
      const result = res?.data;
      if (result?.alreadySignedIn) {
        toast.info(result.message);
      } else if (result?.access_status === 'GRANTED') {
        toast.success(result.message);
      } else {
        toast.warning(result?.message || 'Access denied.');
      }
      fetchLogs();
      if (lookupQuery.trim()) runMemberSearch(lookupQuery);
    } catch (err) {
      toast.error(err?.message || 'Unable to process sign-in.');
    } finally {
      setActingMemberId(null);
    }
  };

  // Staff 1-click Unfreeze
  const handleStaffUnfreeze = async (member) => {
    if (!member.subscription_id) return;
    setActingMemberId(member.id);
    try {
      const res = await api.post(
        `/subscriptions/${member.subscription_id}/unfreeze`
      );
      toast.success(res?.data?.message || 'Membership unfrozen.');
      if (lookupQuery.trim()) runMemberSearch(lookupQuery);
    } catch (err) {
      toast.error(err?.message || 'Unable to unfreeze membership.');
    } finally {
      setActingMemberId(null);
    }
  };

  // Open PaymentModal for Renew / Buy Pass or Quick Walk-In
  const handleOpenRenew = (member) => {
    setPaymentMember(member);
    setPaymentDefaultWalkIn(false);
    setPaymentOpen(true);
  };

  const handleOpenWalkIn = () => {
    setPaymentMember(null);
    setPaymentDefaultWalkIn(true);
    setPaymentOpen(true);
  };

  // Kiosk auto-focus & 4-second auto-reset countdown
  const clearKioskTimers = useCallback(() => {
    if (resetTimerRef.current) {
      clearTimeout(resetTimerRef.current);
      resetTimerRef.current = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  }, []);

  const focusKioskInput = useCallback(() => {
    setTimeout(() => {
      kioskInputRef.current?.focus();
    }, 50);
  }, []);

  useEffect(() => {
    if (kioskMode) {
      setKioskInput('');
      setKioskFeedback(null);
      focusKioskInput();
    } else {
      clearKioskTimers();
      fetchLogs();
    }
    return () => clearKioskTimers();
  }, [kioskMode, clearKioskTimers, focusKioskInput, fetchLogs]);

  const triggerKioskFeedback = useCallback(
    (feedbackObj) => {
      clearKioskTimers();
      setKioskFeedback(feedbackObj);
      setKioskCountdownPct(100);
      setKioskInput('');

      const startedAt = Date.now();
      countdownIntervalRef.current = setInterval(() => {
        const elapsed = Date.now() - startedAt;
        const pct = Math.max(0, 100 - (elapsed / KIOSK_RESET_MS) * 100);
        setKioskCountdownPct(pct);
      }, 40);

      resetTimerRef.current = setTimeout(() => {
        clearKioskTimers();
        setKioskFeedback(null);
        setKioskCountdownPct(100);
        focusKioskInput();
      }, KIOSK_RESET_MS);
    },
    [clearKioskTimers, focusKioskInput]
  );

  const handleKioskSubmit = async (e) => {
    e.preventDefault();
    const raw = kioskInput.trim();
    if (!raw) {
      triggerKioskFeedback({
        tone: 'error',
        title: 'INPUT REQUIRED',
        message:
          'Please enter your Member Code, Phone Number, or scan your QR Pass.',
      });
      return;
    }

    // Detect method heuristically
    const digitsOnly = raw.replace(/\D/g, '');
    let method = 'KIOSK_CODE';
    if (/^MEM-\d{4}-\d{4}$/i.test(raw)) {
      method = 'KIOSK_QR';
    } else if (digitsOnly.length >= 7) {
      method = 'KIOSK_PHONE';
    }

    setKioskSubmitting(true);
    try {
      const res = await api.post('/check-in', {
        identifier: raw,
        check_in_method: method,
      });
      const data = res?.data;

      if (data?.alreadySignedIn) {
        triggerKioskFeedback({
          tone: 'cooldown',
          title: 'ALREADY SIGNED IN',
          message: data.message,
          member: data.member,
          subscription: data.subscription,
        });
      } else if (data?.access_status === 'GRANTED') {
        triggerKioskFeedback({
          tone: 'granted',
          title: 'ACCESS GRANTED',
          message: data.message,
          expiringSoon: data.expiring_soon,
          expiringReminder: data.expiring_reminder,
          member: data.member,
          subscription: data.subscription,
        });
      } else {
        triggerKioskFeedback({
          tone: data?.access_status === 'DENIED_FROZEN' ? 'frozen' : 'denied',
          title: 'ACCESS DENIED',
          message: data?.message || 'Access denied. Please see the Front Desk.',
          member: data?.member,
          subscription: data?.subscription,
        });
      }
    } catch (err) {
      triggerKioskFeedback({
        tone: 'denied',
        title: 'MEMBER NOT FOUND',
        message:
          err?.message ||
          'Member not found. Please check your Member Code or Phone Number, or ask the Front Desk for assistance.',
      });
    } finally {
      setKioskSubmitting(false);
    }
  };

  // Render Fullscreen Self-Service Kiosk Mode
  if (kioskMode) {
    return (
      <KioskShell
        onExit={() => setKioskMode(false)}
        gymName="Mad Max Gym"
        tagline="Forged in Iron. Built for Speed."
      >
        <div className="space-y-6">
          <div className="text-center space-y-2">
            <div className="mx-auto inline-flex items-center gap-2 rounded-full bg-royal-blue/20 border border-royal-blue/40 px-3.5 py-1 text-xs font-semibold uppercase tracking-widest text-royal-blue-light">
              <SvgIcon name="qr" size={14} />
              <span>2-Second Athlete Sign-In</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-pure-white">
              Scan QR Pass or Enter Member ID
            </h2>
            <p className="text-sm text-silver-gray">
              Accepts <span className="font-mono text-pure-white">MEM-2026-0001</span>,
              4-digit suffix (<span className="font-mono text-pure-white">0001</span>), or
              Phone Number (<span className="font-mono text-pure-white">0917...</span>)
            </p>
          </div>

          {/* Auto-focused High-Contrast Input */}
          <form onSubmit={handleKioskSubmit} className="space-y-4">
            <div className="relative">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-royal-blue-light">
                <SvgIcon name="user-check" size={24} />
              </span>
              <input
                ref={kioskInputRef}
                type="text"
                autoFocus
                autoComplete="off"
                value={kioskInput}
                onChange={(e) => setKioskInput(e.target.value)}
                placeholder="Scan QR, type MEM-2026-0001, 0001, or Phone..."
                className="w-full min-h-[64px] rounded-2xl border-2 border-royal-blue/70 bg-obsidian-black pl-14 pr-5 py-4 font-mono text-xl sm:text-2xl font-bold text-pure-white placeholder:text-silver-gray/50 focus:border-royal-blue focus:outline-none focus:ring-4 focus:ring-royal-blue/30"
              />
            </div>

            <Button
              type="submit"
              variant="kiosk"
              fullWidth
              loading={kioskSubmitting}
              leftIcon="check"
            >
              Sign In Now
            </Button>
          </form>

          {/* High-Impact Feedback Banner with 4-Second Countdown Bar */}
          {kioskFeedback ? (
            <div
              role="status"
              aria-live="assertive"
              className={`rounded-2xl border-2 overflow-hidden shadow-floating transition-all ${
                kioskFeedback.tone === 'granted'
                  ? 'border-emerald-500 bg-emerald-950/90 text-emerald-50'
                  : kioskFeedback.tone === 'cooldown'
                  ? 'border-emerald-400 bg-emerald-950/75 text-emerald-50'
                  : kioskFeedback.tone === 'frozen'
                  ? 'border-amber-500 bg-amber-950/90 text-amber-50'
                  : 'border-rose-500 bg-rose-950/90 text-rose-50'
              }`}
            >
              <div className="p-5 sm:p-6 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                        kioskFeedback.tone === 'granted' ||
                        kioskFeedback.tone === 'cooldown'
                          ? 'bg-emerald-500 text-obsidian-black'
                          : kioskFeedback.tone === 'frozen'
                          ? 'bg-amber-500 text-obsidian-black'
                          : 'bg-rose-500 text-pure-white'
                      }`}
                    >
                      <SvgIcon
                        name={
                          kioskFeedback.tone === 'granted' ||
                          kioskFeedback.tone === 'cooldown'
                            ? 'check'
                            : kioskFeedback.tone === 'frozen'
                            ? 'snowflake'
                            : 'alert-triangle'
                        }
                        size={24}
                      />
                    </span>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.2em] opacity-85">
                        {kioskFeedback.title}
                      </p>
                      {kioskFeedback.member ? (
                        <p className="text-xl sm:text-2xl font-extrabold tracking-tight">
                          {kioskFeedback.member.name}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  {kioskFeedback.member?.member_code ? (
                    <span className="font-mono tabular-nums text-xs font-bold px-2.5 py-1 rounded-lg bg-obsidian-black/50 border border-white/15">
                      {kioskFeedback.member.member_code}
                    </span>
                  ) : null}
                </div>

                <p className="text-base sm:text-lg font-semibold leading-snug">
                  {kioskFeedback.message}
                </p>

                {kioskFeedback.subscription ? (
                  <div className="flex flex-wrap items-center gap-2 pt-1 text-xs font-mono tabular-nums">
                    <span className="rounded-lg bg-obsidian-black/50 border border-white/15 px-2.5 py-1">
                      Plan: {kioskFeedback.subscription.plan_name}
                    </span>
                    {kioskFeedback.subscription.plan_type_code === 'SESSION_PACK' ? (
                      <span className="rounded-lg bg-obsidian-black/50 border border-white/15 px-2.5 py-1">
                        Remaining Visits:{' '}
                        {kioskFeedback.subscription.remaining_sessions ?? 0}
                      </span>
                    ) : kioskFeedback.subscription.remaining_days !== undefined ? (
                      <span className="rounded-lg bg-obsidian-black/50 border border-white/15 px-2.5 py-1">
                        Days Left: {kioskFeedback.subscription.remaining_days}
                      </span>
                    ) : null}
                  </div>
                ) : null}

                {kioskFeedback.expiringSoon && kioskFeedback.expiringReminder ? (
                  <div className="rounded-xl bg-amber-500/20 border border-amber-400/60 px-3.5 py-2 text-sm font-semibold text-amber-200 flex items-center gap-2">
                    <SvgIcon name="alert-triangle" size={16} />
                    <span>{kioskFeedback.expiringReminder}</span>
                  </div>
                ) : null}
              </div>

              {/* 4-Second Auto-Reset Countdown Bar */}
              <div className="h-2 w-full bg-obsidian-black/60">
                <div
                  className={`h-full transition-[width] duration-75 ease-linear ${
                    kioskFeedback.tone === 'granted' ||
                    kioskFeedback.tone === 'cooldown'
                      ? 'bg-emerald-400'
                      : kioskFeedback.tone === 'frozen'
                      ? 'bg-amber-400'
                      : 'bg-rose-400'
                  }`}
                  style={{ width: `${kioskCountdownPct}%` }}
                />
              </div>
            </div>
          ) : null}
        </div>
      </KioskShell>
    );
  }

  // Front-Desk Staff Lookup Mode
  return (
    <div className="space-y-6">
      {/* Top Action Strip: Instant Member Lookup + Launch Fullscreen Kiosk */}
      <div className="card-metallic rounded-xl p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-obsidian-black">
              Front-Desk Fast Lookup &amp; Sign-In
            </h2>
            <p className="text-xs text-steel-gray mt-0.5">
              Search any athlete by Name, Phone Number, or Member Code for 1-click sign-in, unfreeze, or instant renewal.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              variant="secondary"
              leftIcon="user-plus"
              onClick={handleOpenWalkIn}
            >
              Quick Walk-In Pass
            </Button>
            <Button
              variant="primary"
              leftIcon="maximize"
              onClick={() => setKioskMode(true)}
            >
              Launch Fullscreen Kiosk
            </Button>
          </div>
        </div>

        <Input
          leftIcon="search"
          value={lookupQuery}
          onChange={(e) => setLookupQuery(e.target.value)}
          placeholder="Type member name, phone (0917...), or code (MEM-2026-0001)..."
          inputClassName="min-h-[48px] text-base"
        />

        {/* Instant Matching Member Cards */}
        {searching ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            <Skeleton className="h-24 rounded-xl" />
            <Skeleton className="h-24 rounded-xl" />
          </div>
        ) : lookupResults.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            {lookupResults.map((member) => {
              const status = member.computed_status || 'NO_PLAN';
              const isBusy = actingMemberId === member.id;
              const canSignIn = status === 'ACTIVE' || status === 'EXPIRING_SOON';
              const isFrozen = status === 'FROZEN';

              return (
                <div
                  key={member.id}
                  className="rounded-xl border border-silver-border bg-pure-white p-4 flex items-center justify-between gap-3 hover:border-royal-blue/50 transition-colors shadow-sm"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-obsidian-black text-royal-blue-light">
                      <SvgIcon name="barbell" size={20} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-obsidian-black truncate">
                          {member.name}
                        </p>
                        <Badge status={status} dot />
                      </div>
                      <p className="font-mono tabular-nums text-xs text-royal-blue-dark font-semibold mt-0.5">
                        {member.member_code} • {member.phone}
                      </p>
                      <p className="text-xs text-steel-gray truncate mt-0.5">
                        {member.plan_name ? (
                          <>
                            {member.plan_name}
                            {member.plan_type_code === 'SESSION_PACK'
                              ? ` • ${member.remaining_sessions ?? 0} visit(s) left`
                              : member.end_date
                              ? ` • Valid until ${formatDate(member.end_date)}`
                              : ''}
                          </>
                        ) : (
                          'No active membership plan'
                        )}
                      </p>
                    </div>
                  </div>

                  {/* 1-Click Contextual Action Button */}
                  <div className="shrink-0">
                    {canSignIn ? (
                      <Button
                        variant="primary"
                        size="sm"
                        leftIcon="user-check"
                        loading={isBusy}
                        onClick={() => handleStaffSignIn(member)}
                      >
                        Sign In
                      </Button>
                    ) : isFrozen ? (
                      <Button
                        variant="secondary"
                        size="sm"
                        leftIcon="snowflake"
                        loading={isBusy}
                        onClick={() => handleStaffUnfreeze(member)}
                      >
                        Unfreeze
                      </Button>
                    ) : (
                      <Button
                        variant="primary"
                        size="sm"
                        leftIcon="cash"
                        onClick={() => handleOpenRenew(member)}
                      >
                        Renew / Buy Pass
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : lookupQuery.trim() ? (
          <div className="rounded-xl border border-silver-border bg-silver-canvas/50 px-4 py-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-steel-gray">
              No member found matching{' '}
              <strong className="text-obsidian-black">&ldquo;{lookupQuery}&rdquo;</strong>.
            </p>
            <Button
              variant="primary"
              size="sm"
              leftIcon="user-plus"
              onClick={handleOpenWalkIn}
            >
              Register Quick Walk-In Day Pass
            </Button>
          </div>
        ) : null}
      </div>

      {/* Live Today's Sign-In Feed & Paginated Usage History */}
      <div className="space-y-3">
        <div className="card-metallic rounded-xl p-4 flex flex-col lg:flex-row lg:items-end justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-obsidian-black">
              Live Sign-In Feed &amp; Gym Usage History
            </h3>
            <p className="text-xs text-steel-gray">
              Showing {pagination.total} recorded sign-in attempt(s)
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 w-full lg:w-auto">
            <Input
              type="date"
              label="Start Date"
              value={logFilters.start_date}
              onChange={(e) =>
                setLogFilters((prev) => ({
                  ...prev,
                  start_date: e.target.value,
                  page: 1,
                }))
              }
            />
            <Input
              type="date"
              label="End Date"
              value={logFilters.end_date}
              onChange={(e) =>
                setLogFilters((prev) => ({
                  ...prev,
                  end_date: e.target.value,
                  page: 1,
                }))
              }
            />
            <Select
              label="Access Status"
              options={STATUS_FILTER_OPTIONS}
              value={logFilters.access_status}
              onChange={(e) =>
                setLogFilters((prev) => ({
                  ...prev,
                  access_status: e.target.value,
                  page: 1,
                }))
              }
            />
            <Input
              label="Search Log"
              leftIcon="search"
              value={logFilters.search}
              onChange={(e) =>
                setLogFilters((prev) => ({
                  ...prev,
                  search: e.target.value,
                  page: 1,
                }))
              }
              placeholder="Name or code..."
            />
          </div>
        </div>

        {loadingLogs ? (
          <TableSkeleton rows={6} columns={6} />
        ) : logs.length === 0 ? (
          <div className="card-metallic rounded-xl p-10 text-center space-y-2">
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-silver-canvas text-gunmetal-gray">
              <SvgIcon name="clock" size={22} />
            </div>
            <p className="text-sm font-semibold text-obsidian-black">
              No sign-in logs match your filters
            </p>
            <p className="text-xs text-steel-gray">
              Check-ins from both Staff Lookup and Fullscreen Kiosk Mode appear here in real time.
            </p>
          </div>
        ) : (
          <div className="card-metallic rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-silver-border bg-silver-canvas/70 text-[11px] font-semibold uppercase tracking-wider text-gunmetal-gray">
                    <th className="py-3 px-5">Time</th>
                    <th className="py-3 px-4">Member</th>
                    <th className="py-3 px-4">Plan</th>
                    <th className="py-3 px-4">Remaining Balance</th>
                    <th className="py-3 px-4">Method</th>
                    <th className="py-3 px-5 text-right">Access Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-silver-border/70 text-sm">
                  {logs.map((log) => (
                    <tr
                      key={log.id}
                      className="hover:bg-silver-canvas/40 transition-colors"
                    >
                      <td className="py-3 px-5 whitespace-nowrap">
                        <p className="font-mono tabular-nums text-xs font-bold text-obsidian-black">
                          {formatTime(log.check_in_at)}
                        </p>
                        <p className="text-[11px] text-steel-gray">
                          {formatDate(log.check_in_at)}
                        </p>
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-semibold text-obsidian-black">
                          {log.member_name}
                        </p>
                        <p className="font-mono tabular-nums text-xs text-steel-gray">
                          {log.member_code}
                        </p>
                      </td>
                      <td className="py-3 px-4 text-xs font-medium text-gunmetal-gray">
                        {log.plan_name || '—'}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap font-mono tabular-nums text-xs text-gunmetal-gray">
                        {log.remaining_sessions_at_checkin !== null &&
                        log.remaining_sessions_at_checkin !== undefined
                          ? `${log.remaining_sessions_at_checkin} visit(s) left`
                          : log.remaining_days_at_checkin !== null &&
                            log.remaining_days_at_checkin !== undefined
                          ? `${log.remaining_days_at_checkin} day(s) left`
                          : '—'}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap text-xs text-steel-gray">
                        <span>
                          {METHOD_LABELS[log.check_in_method] || log.check_in_method}
                        </span>
                        {log.checked_in_by_name ? (
                          <span className="block text-[11px] text-silver-gray">
                            by {log.checked_in_by_name}
                          </span>
                        ) : null}
                      </td>
                      <td className="py-3 px-5 whitespace-nowrap text-right">
                        <Badge status={log.access_status} dot />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            {pagination.totalPages > 1 ? (
              <div className="border-t border-silver-border bg-silver-canvas/50 px-5 py-3 flex items-center justify-between text-xs text-steel-gray">
                <span>
                  Page <strong className="font-mono">{pagination.page}</strong> of{' '}
                  <strong className="font-mono">{pagination.totalPages}</strong> (
                  {pagination.total} logs)
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={pagination.page <= 1}
                    onClick={() =>
                      setLogFilters((prev) => ({
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
                      setLogFilters((prev) => ({ ...prev, page: prev.page + 1 }))
                    }
                  >
                    Next
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* Payment & 80mm Receipt Modals */}
      <PaymentModal
        isOpen={paymentOpen}
        onClose={() => setPaymentOpen(false)}
        preselectedMember={paymentMember}
        defaultWalkIn={paymentDefaultWalkIn}
        onSuccess={(data) => {
          setReceiptData(data);
          fetchLogs();
          if (lookupQuery.trim()) runMemberSearch(lookupQuery);
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
