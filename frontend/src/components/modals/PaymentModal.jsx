import { useEffect, useMemo, useState } from 'react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import Modal from './Modal';
import Button from '../common/Button';
import Input from '../common/Input';
import Select from '../common/Select';
import Badge from '../common/Badge';
import SvgIcon from '../common/SvgIcon';
import { Skeleton } from '../common/Skeleton';
import {
  calculateBirVat,
  formatDate,
  formatPHP,
  round2,
} from '../../utils/formatters';

const GENDER_OPTIONS = [
  { value: 'MALE', label: 'Male' },
  { value: 'FEMALE', label: 'Female' },
  { value: 'NON_BINARY', label: 'Non-Binary' },
  { value: 'PREFER_NOT_TO_SAY', label: 'Prefer not to say' },
];

const QUICK_CASH_BILLS = [100, 200, 500, 1000];

function addDaysToIso(isoDateStr, days) {
  if (!isoDateStr) return null;
  const d = new Date(`${String(isoDateStr).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  d.setDate(d.getDate() + days);
  return d;
}

/**
 * Mad Max Gym — Membership Payment, Renewal & 1-Step Quick Walk-In Checkout Modal
 */
export default function PaymentModal({
  isOpen,
  onClose,
  preselectedMember = null,
  defaultWalkIn = false,
  onSuccess,
}) {
  const { toast } = useToast();

  // Reference data
  const [plans, setPlans] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loadingRef, setLoadingRef] = useState(false);

  // Mode: 'EXISTING' | 'WALK_IN'
  const [mode, setMode] = useState('EXISTING');

  // Existing member selector
  const [selectedMember, setSelectedMember] = useState(null);
  const [memberQuery, setMemberQuery] = useState('');
  const [memberResults, setMemberResults] = useState([]);
  const [searchingMembers, setSearchingMembers] = useState(false);

  // Walk-in inline guest fields
  const [walkIn, setWalkIn] = useState({
    name: '',
    phone: '',
    gender_code: 'MALE',
  });

  // Plan & discount
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [discountPct, setDiscountPct] = useState(0);

  // Payment method & tender
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [amountTendered, setAmountTendered] = useState('');
  const [selectedQrId, setSelectedQrId] = useState('');
  const [paymentRef, setPaymentRef] = useState('');
  const [zoomedQr, setZoomedQr] = useState(null);

  // Auto check-in option
  const [autoCheckIn, setAutoCheckIn] = useState(false);

  // Validation & submit
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Load active plans & gym settings when opened
  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;
    setErrors({});
    setPaymentMethod('CASH');
    setDiscountPct(0);
    setPaymentRef('');
    setAmountTendered('');
    setZoomedQr(null);
    setMemberQuery('');
    setMemberResults([]);
    setWalkIn({ name: '', phone: '', gender_code: 'MALE' });

    if (preselectedMember) {
      setMode('EXISTING');
      setSelectedMember(preselectedMember);
    } else if (defaultWalkIn) {
      setMode('WALK_IN');
      setSelectedMember(null);
    } else {
      setMode('EXISTING');
      setSelectedMember(null);
    }

    const fetchRefs = async () => {
      setLoadingRef(true);
      try {
        const [plansRes, settingsRes] = await Promise.all([
          api.get('/plans?is_active=true'),
          api.get('/settings'),
        ]);
        if (cancelled) return;
        const activePlans = Array.isArray(plansRes?.data) ? plansRes.data : [];
        const gymSettings = settingsRes?.data || {};
        setPlans(activePlans);
        setSettings(gymSettings);

        // Preselect default plan
        if (activePlans.length > 0) {
          const dayPass = activePlans.find((p) => p.plan_type_code === 'DAY_PASS');
          const monthly = activePlans.find((p) => p.code === 'PLAN-MONTHLY');
          const initialPlan =
            (defaultWalkIn && !preselectedMember && dayPass) ||
            monthly ||
            activePlans[0];
          setSelectedPlanId(initialPlan.id);
          setAutoCheckIn(initialPlan.plan_type_code === 'DAY_PASS');
        }

        const qrs = Array.isArray(gymSettings.payment_qr_codes)
          ? gymSettings.payment_qr_codes
          : [];
        if (qrs.length > 0) {
          setSelectedQrId(qrs[0].id);
        }
      } catch (err) {
        if (!cancelled) {
          toast.error(err?.message || 'Unable to load plans and checkout settings.');
        }
      } finally {
        if (!cancelled) setLoadingRef(false);
      }
    };

    fetchRefs();
    return () => {
      cancelled = true;
    };
  }, [isOpen, preselectedMember, defaultWalkIn, toast]);

  // Debounced existing member search
  useEffect(() => {
    if (!isOpen || mode !== 'EXISTING' || selectedMember) return;
    const trimmed = memberQuery.trim();
    if (!trimmed) {
      setMemberResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearchingMembers(true);
      try {
        const res = await api.get(
          `/members?search=${encodeURIComponent(trimmed)}&limit=6`
        );
        setMemberResults(Array.isArray(res?.data) ? res.data : []);
      } catch {
        setMemberResults([]);
      } finally {
        setSearchingMembers(false);
      }
    }, 240);

    return () => clearTimeout(timer);
  }, [isOpen, mode, selectedMember, memberQuery]);

  const selectedPlan = useMemo(
    () => plans.find((p) => p.id === selectedPlanId) || null,
    [plans, selectedPlanId]
  );

  // Automatically default autoCheckIn when user switches plans
  const handleSelectPlan = (plan) => {
    setSelectedPlanId(plan.id);
    setAutoCheckIn(plan.plan_type_code === 'DAY_PASS');
    setErrors((prev) => ({ ...prev, plan_id: undefined }));
  };

  // Switch mode helper
  const handleModeSwitch = (nextMode) => {
    setMode(nextMode);
    setErrors({});
    if (nextMode === 'WALK_IN') {
      const dayPass = plans.find((p) => p.plan_type_code === 'DAY_PASS');
      if (dayPass) {
        setSelectedPlanId(dayPass.id);
        setAutoCheckIn(true);
      }
    }
  };

  // 12% BIR VAT-Inclusive math
  const vat = useMemo(() => {
    return calculateBirVat(selectedPlan?.price ?? 0, discountPct);
  }, [selectedPlan?.price, discountPct]);

  // Date-stacked renewal preview
  const renewalPreview = useMemo(() => {
    if (!selectedPlan) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const hasActiveTimeBased =
      mode === 'EXISTING' &&
      selectedMember &&
      (selectedMember.subscription_status === 'ACTIVE' ||
        selectedMember.computed_status === 'ACTIVE' ||
        selectedMember.computed_status === 'EXPIRING_SOON') &&
      selectedMember.plan_type_code !== 'SESSION_PACK' &&
      selectedMember.end_date;

    const currentEnd = hasActiveTimeBased
      ? addDaysToIso(selectedMember.end_date, 0)
      : null;
    const isStacked =
      selectedPlan.plan_type_code !== 'SESSION_PACK' &&
      currentEnd &&
      currentEnd.getTime() >= today.getTime();

    const startDate = isStacked
      ? addDaysToIso(selectedMember.end_date, 1)
      : today;
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + Math.max(0, Number(selectedPlan.duration_days) - 1));

    return {
      isStacked,
      startDate,
      endDate,
    };
  }, [mode, selectedMember, selectedPlan]);

  // Active discount tiers & QR codes from settings
  const activeDiscountTiers = useMemo(() => {
    const list = Array.isArray(settings?.discount_tiers)
      ? settings.discount_tiers
      : [];
    return list.filter((t) => t && t.is_active !== false);
  }, [settings]);

  const paymentQrCodes = useMemo(() => {
    return Array.isArray(settings?.payment_qr_codes)
      ? settings.payment_qr_codes
      : [];
  }, [settings]);

  const activeQr = useMemo(
    () => paymentQrCodes.find((q) => q.id === selectedQrId) || paymentQrCodes[0] || null,
    [paymentQrCodes, selectedQrId]
  );

  const parsedTendered =
    amountTendered === '' ? null : round2(Number(amountTendered));
  const isInsufficientCash =
    paymentMethod === 'CASH' &&
    parsedTendered !== null &&
    Number.isFinite(parsedTendered) &&
    parsedTendered < vat.netTotal;
  const cashChange =
    paymentMethod === 'CASH' && parsedTendered !== null
      ? round2(parsedTendered - vat.netTotal)
      : 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const nextErrors = {};

    if (mode === 'EXISTING') {
      if (!selectedMember?.id) {
        nextErrors.member =
          'Please select a member or enter walk-in member details before completing payment.';
      }
    } else {
      const trimmedName = walkIn.name.trim();
      const digits = walkIn.phone.replace(/\D/g, '');
      if (trimmedName.length < 2 || trimmedName.length > 100) {
        nextErrors.walkInName = 'Member name must be between 2 and 100 characters.';
      }
      if (digits.length < 7 || digits.length > 15) {
        nextErrors.walkInPhone =
          'Please enter a valid phone number (7 to 15 digits, e.g., 09171234567).';
      }
    }

    if (!selectedPlan) {
      nextErrors.plan_id = 'Please select an active membership plan.';
    }

    if (paymentMethod === 'CASH') {
      if (
        parsedTendered === null ||
        !Number.isFinite(parsedTendered) ||
        parsedTendered < vat.netTotal
      ) {
        nextErrors.amount_tendered = `Amount tendered (${formatPHP(
          parsedTendered || 0
        )}) cannot be less than the total payable (${formatPHP(vat.netTotal)}).`;
      }
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setSubmitting(true);
    setErrors({});

    try {
      const payload = {
        plan_id: selectedPlan.id,
        payment_method_code: paymentMethod,
        discount_pct: discountPct,
        amount_tendered:
          paymentMethod === 'CASH' ? parsedTendered : vat.netTotal,
        payment_ref:
          paymentMethod === 'DIGITAL_WALLET' && paymentRef.trim()
            ? paymentRef.trim()
            : null,
        auto_check_in: autoCheckIn,
      };

      if (mode === 'EXISTING') {
        payload.member_id = selectedMember.id;
      } else {
        payload.walk_in_member = {
          name: walkIn.name.trim(),
          phone: walkIn.phone.trim(),
          gender_code: walkIn.gender_code,
        };
      }

      const res = await api.post('/payments', payload);
      toast.success(
        `Payment ${res?.data?.payment?.invoice_number || ''} completed successfully!`
      );
      if (typeof onSuccess === 'function') {
        onSuccess(res?.data);
      }
      if (typeof onClose === 'function') {
        onClose();
      }
    } catch (err) {
      toast.error(err?.message || 'Unable to process payment.');
      setErrors({ form: err?.message || 'Unable to process payment.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={() => !submitting && onClose?.()}
        title="Membership Payment & Walk-In Checkout"
        subtitle="Process new enrollments, date-stacked renewals, or 1-step walk-in day passes with 12% BIR VAT."
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              form="mm-payment-checkout-form"
              loading={submitting}
              disabled={loadingRef || !selectedPlan || isInsufficientCash}
              leftIcon="check"
            >
              Complete Payment &amp; Print ({formatPHP(vat.netTotal)})
            </Button>
          </>
        }
      >
        {loadingRef ? (
          <div className="space-y-4">
            <Skeleton className="h-11 w-full rounded-xl" />
            <div className="grid grid-cols-2 gap-3">
              <Skeleton className="h-20 rounded-xl" />
              <Skeleton className="h-20 rounded-xl" />
            </div>
            <Skeleton className="h-32 w-full rounded-xl" />
          </div>
        ) : (
          <form
            id="mm-payment-checkout-form"
            onSubmit={handleSubmit}
            className="space-y-5"
          >
            {errors.form ? (
              <div
                role="alert"
                className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
              >
                {errors.form}
              </div>
            ) : null}

            {/* 1. Member Mode Toggle */}
            <div className="flex rounded-xl bg-silver-canvas p-1 border border-silver-border">
              <button
                type="button"
                onClick={() => handleModeSwitch('EXISTING')}
                className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-semibold transition-all ${
                  mode === 'EXISTING'
                    ? 'bg-obsidian-black text-pure-white shadow-sm'
                    : 'text-gunmetal-gray hover:text-obsidian-black'
                }`}
              >
                <SvgIcon name="users" size={16} />
                <span>Existing Member</span>
              </button>
              <button
                type="button"
                onClick={() => handleModeSwitch('WALK_IN')}
                className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-semibold transition-all ${
                  mode === 'WALK_IN'
                    ? 'bg-royal-blue text-pure-white shadow-sm'
                    : 'text-gunmetal-gray hover:text-obsidian-black'
                }`}
              >
                <SvgIcon name="user-plus" size={16} />
                <span>Quick Walk-In Guest</span>
              </button>
            </div>

            {/* 2. Member Selection OR Walk-In Guest Form */}
            {mode === 'EXISTING' ? (
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gunmetal-gray">
                  Member <span className="text-red-600 ml-0.5">*</span>
                </label>

                {selectedMember ? (
                  <div className="rounded-xl border border-royal-blue/40 bg-royal-blue-light/30 px-4 py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-obsidian-black truncate">
                          {selectedMember.name}
                        </p>
                        <span className="font-mono tabular-nums text-xs font-semibold text-royal-blue-dark">
                          {selectedMember.member_code}
                        </span>
                        {selectedMember.computed_status ||
                        selectedMember.subscription_status ? (
                          <Badge
                            status={
                              selectedMember.computed_status ||
                              selectedMember.subscription_status
                            }
                          />
                        ) : null}
                      </div>
                      <p className="text-xs text-steel-gray mt-0.5">
                        {selectedMember.phone}
                        {selectedMember.plan_name
                          ? ` • Current: ${selectedMember.plan_name}`
                          : ''}
                        {selectedMember.end_date
                          ? ` (Ends ${formatDate(selectedMember.end_date)})`
                          : ''}
                      </p>
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setSelectedMember(null);
                        setMemberQuery('');
                      }}
                    >
                      Change
                    </Button>
                  </div>
                ) : (
                  <div className="relative">
                    <Input
                      leftIcon="search"
                      value={memberQuery}
                      onChange={(e) => {
                        setMemberQuery(e.target.value);
                        if (errors.member)
                          setErrors((prev) => ({ ...prev, member: undefined }));
                      }}
                      placeholder="Search member by name, phone, or MEM-YYYY-XXXX..."
                      error={errors.member}
                    />
                    {searchingMembers ? (
                      <div className="mt-1.5 rounded-xl border border-silver-border bg-pure-white p-3 space-y-2">
                        <Skeleton className="h-8 w-full rounded-lg" />
                        <Skeleton className="h-8 w-full rounded-lg" />
                      </div>
                    ) : memberResults.length > 0 ? (
                      <div className="mt-1.5 max-h-48 overflow-y-auto rounded-xl border border-silver-border bg-pure-white divide-y divide-silver-border/70 shadow-floating">
                        {memberResults.map((m) => (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => {
                              setSelectedMember(m);
                              setMemberResults([]);
                              setErrors((prev) => ({ ...prev, member: undefined }));
                            }}
                            className="w-full px-3.5 py-2.5 text-left hover:bg-royal-blue-light/40 flex items-center justify-between gap-2 transition-colors"
                          >
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-obsidian-black truncate">
                                {m.name}
                              </p>
                              <p className="text-xs text-steel-gray font-mono tabular-nums">
                                {m.member_code} • {m.phone}
                              </p>
                            </div>
                            <Badge status={m.computed_status || 'NO_PLAN'} />
                          </button>
                        ))}
                      </div>
                    ) : memberQuery.trim().length > 0 ? (
                      <p className="mt-1.5 text-xs text-steel-gray">
                        No members matched &ldquo;{memberQuery}&rdquo;. Switch to{' '}
                        <button
                          type="button"
                          onClick={() => handleModeSwitch('WALK_IN')}
                          className="font-semibold text-royal-blue hover:underline"
                        >
                          Quick Walk-In Guest
                        </button>{' '}
                        to register instantly.
                      </p>
                    ) : null}
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-xl border border-silver-border bg-silver-canvas/40 p-4 space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-royal-blue">
                  1-Step Walk-In Guest Registration
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Input
                    label="Full Name"
                    required
                    value={walkIn.name}
                    onChange={(e) => {
                      setWalkIn((prev) => ({ ...prev, name: e.target.value }));
                      if (errors.walkInName)
                        setErrors((prev) => ({ ...prev, walkInName: undefined }));
                    }}
                    placeholder="e.g., Juan Dela Cruz"
                    error={errors.walkInName}
                  />
                  <Input
                    label="Phone Number"
                    required
                    mono
                    value={walkIn.phone}
                    onChange={(e) => {
                      setWalkIn((prev) => ({ ...prev, phone: e.target.value }));
                      if (errors.walkInPhone)
                        setErrors((prev) => ({ ...prev, walkInPhone: undefined }));
                    }}
                    placeholder="09171234567"
                    error={errors.walkInPhone}
                  />
                  <Select
                    label="Gender"
                    required
                    options={GENDER_OPTIONS}
                    value={walkIn.gender_code}
                    onChange={(e) =>
                      setWalkIn((prev) => ({
                        ...prev,
                        gender_code: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>
            )}

            {/* 3. Active Membership Plan Selector */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-gunmetal-gray">
                  Select Membership Plan <span className="text-red-600 ml-0.5">*</span>
                </label>
                {renewalPreview ? (
                  <span
                    className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-0.5 rounded-full ${
                      renewalPreview.isStacked
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-silver-canvas text-steel-gray border border-silver-border'
                    }`}
                  >
                    <SvgIcon name="calendar" size={13} />
                    {renewalPreview.isStacked ? 'Date-Stacked: ' : 'Valid: '}
                    {formatDate(renewalPreview.startDate)} –{' '}
                    {formatDate(renewalPreview.endDate)}
                  </span>
                ) : null}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-48 overflow-y-auto pr-1">
                {plans.map((plan) => {
                  const isSelected = plan.id === selectedPlanId;
                  return (
                    <button
                      key={plan.id}
                      type="button"
                      onClick={() => handleSelectPlan(plan)}
                      className={`text-left rounded-xl border p-3 transition-all ${
                        isSelected
                          ? 'border-royal-blue bg-royal-blue-light/40 ring-2 ring-royal-blue/20'
                          : 'border-silver-border bg-pure-white hover:border-silver-gray'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-obsidian-black truncate">
                            {plan.name}
                          </p>
                          <p className="text-[11px] text-steel-gray mt-0.5">
                            {plan.plan_type_code === 'SESSION_PACK'
                              ? `${plan.included_sessions} Visits • Valid ${plan.duration_days} Days`
                              : plan.plan_type_code === 'DAY_PASS'
                              ? '1-Day Walk-In Access'
                              : `${plan.duration_days} Days Unlimited`}
                          </p>
                        </div>
                        <span className="font-mono tabular-nums text-sm font-extrabold text-royal-blue-dark shrink-0">
                          {formatPHP(plan.price)}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
              {errors.plan_id ? (
                <p role="alert" className="text-xs font-medium text-red-600">
                  {errors.plan_id}
                </p>
              ) : null}
            </div>

            {/* 4. 1-Tap Preset Discount Pills */}
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gunmetal-gray">
                Discount Tier
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setDiscountPct(0)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                    discountPct === 0
                      ? 'bg-obsidian-black text-pure-white border-obsidian-black'
                      : 'bg-pure-white text-gunmetal-gray border-silver-border hover:bg-silver-canvas'
                  }`}
                >
                  None (0%)
                </button>
                {activeDiscountTiers.map((tier) => {
                  const active = Number(discountPct) === Number(tier.pct);
                  return (
                    <button
                      key={tier.id}
                      type="button"
                      onClick={() => setDiscountPct(Number(tier.pct))}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                        active
                          ? 'bg-royal-blue text-pure-white border-royal-blue'
                          : 'bg-pure-white text-gunmetal-gray border-silver-border hover:bg-silver-canvas'
                      }`}
                    >
                      {tier.name} ({tier.pct}%)
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 5. Live 12% BIR VAT-Inclusive Summary */}
            <div className="rounded-xl bg-obsidian-black text-pure-white p-4 space-y-2">
              <div className="flex items-center justify-between text-xs text-silver-gray">
                <span>Vatable Sales (Net Subtotal)</span>
                <span className="font-mono tabular-nums">
                  {formatPHP(vat.vatableSales)}
                </span>
              </div>
              {vat.discountAmount > 0 ? (
                <div className="flex items-center justify-between text-xs text-emerald-400">
                  <span>Discount ({vat.discountPct}%)</span>
                  <span className="font-mono tabular-nums">
                    -{formatPHP(vat.discountAmount)}
                  </span>
                </div>
              ) : null}
              <div className="flex items-center justify-between text-xs text-silver-gray">
                <span>12% Inclusive BIR VAT</span>
                <span className="font-mono tabular-nums">
                  {formatPHP(vat.vatAmount)}
                </span>
              </div>
              <div className="pt-2 border-t border-gunmetal-gray flex items-center justify-between">
                <span className="text-sm font-semibold uppercase tracking-wider text-royal-blue-light">
                  Total Payable
                </span>
                <span className="font-mono tabular-nums text-2xl font-extrabold text-pure-white">
                  {formatPHP(vat.netTotal)}
                </span>
              </div>
            </div>

            {/* 6. Payment Method Tabs */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gunmetal-gray">
                Payment Method <span className="text-red-600 ml-0.5">*</span>
              </label>

              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setPaymentMethod('CASH');
                    setErrors((prev) => ({ ...prev, amount_tendered: undefined }));
                  }}
                  className={`flex items-center justify-center gap-2 rounded-xl border py-2.5 px-3 text-sm font-semibold transition-all ${
                    paymentMethod === 'CASH'
                      ? 'border-royal-blue bg-royal-blue-light/50 text-royal-blue-dark'
                      : 'border-silver-border bg-pure-white text-gunmetal-gray hover:bg-silver-canvas'
                  }`}
                >
                  <SvgIcon name="cash" size={16} />
                  <span>Cash</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setPaymentMethod('DIGITAL_WALLET');
                    setErrors((prev) => ({ ...prev, amount_tendered: undefined }));
                  }}
                  className={`flex items-center justify-center gap-2 rounded-xl border py-2.5 px-3 text-sm font-semibold transition-all ${
                    paymentMethod === 'DIGITAL_WALLET'
                      ? 'border-royal-blue bg-royal-blue-light/50 text-royal-blue-dark'
                      : 'border-silver-border bg-pure-white text-gunmetal-gray hover:bg-silver-canvas'
                  }`}
                >
                  <SvgIcon name="wallet" size={16} />
                  <span>QR Wallet</span>
                </button>

                <button
                  type="button"
                  disabled
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-silver-border bg-silver-canvas/70 py-2.5 px-3 text-xs font-semibold text-silver-gray cursor-not-allowed"
                >
                  <SvgIcon name="card" size={15} />
                  <span>Card</span>
                  <span className="rounded bg-silver-border/80 px-1.5 py-0.5 text-[10px] text-gunmetal-gray">
                    Coming Soon
                  </span>
                </button>
              </div>

              {/* Cash Tender Controls */}
              {paymentMethod === 'CASH' ? (
                <div className="rounded-xl border border-silver-border bg-silver-canvas/40 p-4 space-y-3">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setAmountTendered(String(vat.netTotal));
                        setErrors((prev) => ({
                          ...prev,
                          amount_tendered: undefined,
                        }));
                      }}
                      className="px-3 py-1.5 rounded-lg bg-royal-blue text-pure-white text-xs font-bold hover:bg-royal-blue-dark transition-colors"
                    >
                      Exact ({formatPHP(vat.netTotal)})
                    </button>
                    {QUICK_CASH_BILLS.map((bill) => (
                      <button
                        key={bill}
                        type="button"
                        onClick={() => {
                          setAmountTendered(String(bill));
                          setErrors((prev) => ({
                            ...prev,
                            amount_tendered: undefined,
                          }));
                        }}
                        className="px-3 py-1.5 rounded-lg bg-pure-white border border-silver-border text-obsidian-black font-mono tabular-nums text-xs font-semibold hover:border-royal-blue hover:text-royal-blue-dark transition-colors"
                      >
                        ₱{bill.toLocaleString()}
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
                    <Input
                      label="Amount Tendered (₱)"
                      type="number"
                      step="0.01"
                      min="0"
                      mono
                      required
                      value={amountTendered}
                      onChange={(e) => {
                        setAmountTendered(e.target.value);
                        if (errors.amount_tendered) {
                          setErrors((prev) => ({
                            ...prev,
                            amount_tendered: undefined,
                          }));
                        }
                      }}
                      placeholder="0.00"
                      error={
                        errors.amount_tendered ||
                        (isInsufficientCash
                          ? `Amount tendered (${formatPHP(parsedTendered)}) cannot be less than the total payable (${formatPHP(vat.netTotal)}).`
                          : undefined)
                      }
                    />
                    <div className="rounded-xl border border-silver-border bg-pure-white px-4 py-2.5 mt-0 sm:mt-6">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-steel-gray">
                        Change Due
                      </p>
                      <p
                        className={`font-mono tabular-nums text-xl font-extrabold ${
                          parsedTendered !== null && cashChange < 0
                            ? 'text-rose-600'
                            : 'text-emerald-700'
                        }`}
                      >
                        {parsedTendered !== null && cashChange >= 0
                          ? formatPHP(cashChange)
                          : '₱0.00'}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                /* QR Digital Wallet Panel */
                <div className="rounded-xl border border-silver-border bg-silver-canvas/40 p-4 space-y-3">
                  {paymentQrCodes.length > 0 ? (
                    <>
                      <div className="flex flex-wrap gap-2">
                        {paymentQrCodes.map((qr) => (
                          <button
                            key={qr.id}
                            type="button"
                            onClick={() => setSelectedQrId(qr.id)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                              activeQr?.id === qr.id
                                ? 'bg-royal-blue text-pure-white border-royal-blue'
                                : 'bg-pure-white text-gunmetal-gray border-silver-border hover:bg-silver-canvas'
                            }`}
                          >
                            {qr.provider_name}
                          </button>
                        ))}
                      </div>

                      {activeQr ? (
                        <div className="flex flex-col sm:flex-row items-center gap-4 rounded-xl bg-pure-white border border-silver-border p-3.5">
                          <img
                            src={activeQr.image_data}
                            alt={`${activeQr.provider_name} Payment QR`}
                            className="h-32 w-32 object-contain rounded-lg border border-silver-border bg-pure-white p-1 shrink-0"
                          />
                          <div className="flex-1 text-center sm:text-left space-y-1.5">
                            <p className="text-sm font-bold text-obsidian-black">
                              {activeQr.provider_name}
                            </p>
                            {activeQr.account_name ? (
                              <p className="text-xs text-steel-gray">
                                Account: {activeQr.account_name}
                              </p>
                            ) : null}
                            <p className="font-mono tabular-nums text-sm font-bold text-royal-blue-dark">
                              Amount: {formatPHP(vat.netTotal)}
                            </p>
                            <Button
                              variant="secondary"
                              size="sm"
                              leftIcon="maximize"
                              onClick={() => setZoomedQr(activeQr)}
                            >
                              Fullscreen Counter Zoom
                            </Button>
                          </div>
                        </div>
                      ) : null}
                    </>
                  ) : (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs text-amber-800">
                      No merchant QR codes uploaded yet. The Gym Owner can upload
                      GCash or Maya QR codes under <strong>Gym Settings</strong>.
                    </div>
                  )}

                  <Input
                    label="Reference Number (Optional)"
                    mono
                    maxLength={100}
                    value={paymentRef}
                    onChange={(e) => setPaymentRef(e.target.value)}
                    placeholder="e.g., GCASH-90123456"
                  />
                </div>
              )}
            </div>

            {/* 7. Auto Check-In Checkbox */}
            <label className="flex items-center gap-2.5 rounded-xl border border-silver-border bg-pure-white px-4 py-3 cursor-pointer select-none hover:bg-silver-canvas/50">
              <input
                type="checkbox"
                checked={autoCheckIn}
                onChange={(e) => setAutoCheckIn(e.target.checked)}
                className="h-4 w-4 rounded border-silver-border text-royal-blue focus:ring-royal-blue"
              />
              <span className="text-sm font-medium text-obsidian-black">
                Auto Check-In Member Now
              </span>
              <span className="text-xs text-steel-gray ml-auto">
                Logs today&rsquo;s gym visit immediately
              </span>
            </label>
          </form>
        )}
      </Modal>

      {/* Fullscreen Counter QR Zoom Modal */}
      <Modal
        isOpen={Boolean(zoomedQr)}
        onClose={() => setZoomedQr(null)}
        title={zoomedQr ? `${zoomedQr.provider_name} — Scan to Pay` : 'Scan to Pay'}
        subtitle={
          zoomedQr?.account_name
            ? `Account: ${zoomedQr.account_name} • Total: ${formatPHP(vat.netTotal)}`
            : `Total Payable: ${formatPHP(vat.netTotal)}`
        }
        size="sm"
        zIndexClass="z-[70]"
        footer={
          <Button variant="primary" onClick={() => setZoomedQr(null)}>
            Done Scanning
          </Button>
        }
      >
        {zoomedQr ? (
          <div className="flex flex-col items-center text-center space-y-3 py-2">
            <img
              src={zoomedQr.image_data}
              alt={`${zoomedQr.provider_name} QR Code`}
              className="w-72 h-72 object-contain rounded-2xl border-2 border-royal-blue p-2 bg-pure-white"
            />
            <p className="font-mono tabular-nums text-2xl font-extrabold text-obsidian-black">
              {formatPHP(vat.netTotal)}
            </p>
            <p className="text-xs text-steel-gray">
              Please show confirmation screen to the Front Desk staff.
            </p>
          </div>
        ) : null}
      </Modal>
    </>
  );
}
