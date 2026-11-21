import { useEffect, useMemo, useState } from 'react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import Drawer from './Drawer';
import Button from '../common/Button';
import Input from '../common/Input';
import Select from '../common/Select';
import { calculateBirVat, formatPHP } from '../../utils/formatters';

const PLAN_TYPE_OPTIONS = [
  { value: 'DAY_PASS', label: 'Day Pass (1-Day Walk-In)' },
  { value: 'RECURRING', label: 'Recurring Membership (Time-Based)' },
  { value: 'SESSION_PACK', label: 'Visit / Session Pack (Visit-Based)' },
];

const BADGE_COLORS = [
  '#2563EB', // Royal Blue
  '#0B0D11', // Obsidian Black
  '#059669', // Emerald
  '#D97706', // Amber
  '#DC2626', // Crimson
  '#4B5563', // Steel Gray
];

const PLAN_CODE_REGEX = /^[A-Z0-9-]{3,40}$/;
const HEX_COLOR_REGEX = /^#[0-9A-Fa-f]{6}$/;

function buildInitialForm(plan, isDuplicate) {
  if (!plan) {
    return {
      code: '',
      name: '',
      plan_type_code: 'RECURRING',
      duration_days: '30',
      included_sessions: '',
      price: '',
      badge_color_hex: '#2563EB',
      description: '',
      is_active: true,
    };
  }

  return {
    code: isDuplicate ? `${plan.code}-COPY`.slice(0, 40) : plan.code || '',
    name: isDuplicate ? `${plan.name} (Copy)`.slice(0, 100) : plan.name || '',
    plan_type_code: plan.plan_type_code || 'RECURRING',
    duration_days: String(
      plan.plan_type_code === 'DAY_PASS' ? 1 : plan.duration_days ?? 30
    ),
    included_sessions:
      plan.included_sessions !== null && plan.included_sessions !== undefined
        ? String(plan.included_sessions)
        : '',
    price: plan.price !== undefined && plan.price !== null ? String(plan.price) : '',
    badge_color_hex: plan.badge_color_hex || '#2563EB',
    description: plan.description || '',
    is_active: isDuplicate ? true : Boolean(plan.is_active ?? true),
  };
}

/**
 * Mad Max Gym — 540px Slide-In Membership Plan Drawer
 * Supports Create, Edit, and Duplicate with conditional fields & live 12% BIR VAT helper.
 */
export default function PlanDrawer({
  isOpen,
  onClose,
  plan = null,
  isDuplicate = false,
  onSaved,
}) {
  const { toast } = useToast();
  const isEditing = Boolean(plan && !isDuplicate);

  const [initialState, setInitialState] = useState(() =>
    buildInitialForm(plan, isDuplicate)
  );
  const [form, setForm] = useState(() => buildInitialForm(plan, isDuplicate));
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const next = buildInitialForm(plan, isDuplicate);
      setInitialState(next);
      setForm(next);
      setErrors({});
    }
  }, [isOpen, plan, isDuplicate]);

  const isDirty = useMemo(
    () => JSON.stringify(form) !== JSON.stringify(initialState),
    [form, initialState]
  );

  const vatPreview = useMemo(() => {
    const parsed = Number(form.price);
    if (!Number.isFinite(parsed) || parsed < 0) return null;
    return calculateBirVat(parsed, 0);
  }, [form.price]);

  const updateField = (field, value) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === 'plan_type_code') {
        if (value === 'DAY_PASS') {
          next.duration_days = '1';
          next.included_sessions = '';
        } else if (value === 'RECURRING') {
          if (!next.duration_days || next.duration_days === '1') {
            next.duration_days = '30';
          }
          next.included_sessions = '';
        } else if (value === 'SESSION_PACK') {
          if (!next.duration_days || next.duration_days === '1') {
            next.duration_days = '90';
          }
          if (!next.included_sessions) {
            next.included_sessions = '10';
          }
        }
      }
      return next;
    });
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const validate = () => {
    const nextErrors = {};
    const name = form.name.trim();
    const code = form.code.trim().toUpperCase();

    if (name.length < 2 || name.length > 100) {
      nextErrors.name = 'Plan name must be between 2 and 100 characters.';
    }
    if (!PLAN_CODE_REGEX.test(code)) {
      nextErrors.code =
        'Plan code must be 3–40 uppercase letters, numbers, or hyphens (e.g., PLAN-MONTHLY).';
    }

    if (form.plan_type_code !== 'DAY_PASS') {
      const dur = Number(form.duration_days);
      if (
        form.duration_days === '' ||
        !Number.isInteger(dur) ||
        dur < 1 ||
        dur > 3650
      ) {
        nextErrors.duration_days =
          'Duration must be a whole number of days between 1 and 3,650.';
      }
    }

    if (form.plan_type_code === 'SESSION_PACK') {
      const sessions = Number(form.included_sessions);
      if (
        form.included_sessions === '' ||
        !Number.isInteger(sessions) ||
        sessions < 1 ||
        sessions > 1000
      ) {
        nextErrors.included_sessions =
          'Please enter the number of included visits (1 to 1,000) for a Visit/Session Pack.';
      }
    }

    const price = Number(form.price);
    if (
      form.price === '' ||
      !Number.isFinite(price) ||
      price < 0 ||
      price > 999999.99
    ) {
      nextErrors.price = 'Please enter a valid price of ₱0.00 or greater.';
    }

    if (!HEX_COLOR_REGEX.test(form.badge_color_hex.trim())) {
      nextErrors.badge_color_hex = 'Please select a valid badge color.';
    }

    if (form.description.trim().length > 500) {
      nextErrors.description = 'Description cannot exceed 500 characters.';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    try {
      const payload = {
        code: form.code.trim().toUpperCase(),
        name: form.name.trim(),
        plan_type_code: form.plan_type_code,
        duration_days:
          form.plan_type_code === 'DAY_PASS' ? 1 : Number(form.duration_days),
        included_sessions:
          form.plan_type_code === 'SESSION_PACK'
            ? Number(form.included_sessions)
            : null,
        price: Number(Number(form.price).toFixed(2)),
        badge_color_hex: form.badge_color_hex.trim(),
        description: form.description.trim() || null,
        is_active: Boolean(form.is_active),
      };

      const res = isEditing
        ? await api.put(`/plans/${plan.id}`, payload)
        : await api.post('/plans', payload);

      toast.success(
        isEditing
          ? `Updated plan "${payload.name}".`
          : `Created plan "${payload.name}".`
      );
      if (typeof onSaved === 'function') onSaved(res?.data);
      if (typeof onClose === 'function') onClose();
    } catch (err) {
      toast.error(err?.message || 'Unable to save membership plan.');
      if (err?.code === 'DUPLICATE_PLAN_CODE') {
        setErrors((prev) => ({ ...prev, code: err.message }));
      }
    } finally {
      setSaving(false);
    }
  };

  const title = isEditing
    ? 'Edit Membership Plan'
    : isDuplicate
    ? 'Duplicate Membership Plan'
    : 'Create Membership Plan';

  const subtitle = isEditing
    ? 'Update pricing, duration, or visit allowance. Existing member purchases keep their frozen price.'
    : isDuplicate
    ? 'Review and adjust the duplicated plan code and details before saving.'
    : 'Configure a new Day Pass, Recurring Membership, or Visit Pack with 12% BIR VAT-inclusive pricing.';

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      isDirty={isDirty}
      footer={({ requestClose }) => (
        <>
          <Button variant="secondary" onClick={requestClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            variant="primary"
            type="submit"
            form="mm-plan-drawer-form"
            loading={saving}
            leftIcon="check"
          >
            {isEditing ? 'Save Changes' : 'Create Plan'}
          </Button>
        </>
      )}
    >
      <form id="mm-plan-drawer-form" onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Plan Code"
            required
            mono
            value={form.code}
            onChange={(e) =>
              updateField('code', e.target.value.toUpperCase().replace(/\s+/g, '-'))
            }
            placeholder="PLAN-MONTHLY"
            error={errors.code}
            helperText="3–40 uppercase letters, numbers, or hyphens."
          />

          <Select
            label="Plan Type"
            required
            options={PLAN_TYPE_OPTIONS}
            value={form.plan_type_code}
            onChange={(e) => updateField('plan_type_code', e.target.value)}
            error={errors.plan_type_code}
          />
        </div>

        <Input
          label="Plan Name"
          required
          value={form.name}
          onChange={(e) => updateField('name', e.target.value)}
          placeholder="e.g., Monthly Unlimited Iron"
          error={errors.name}
        />

        {/* Conditional Duration & Included Visits */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label={
              form.plan_type_code === 'SESSION_PACK'
                ? 'Validity Window (Days)'
                : 'Duration (Days)'
            }
            type="number"
            min="1"
            max="3650"
            step="1"
            mono
            required
            disabled={form.plan_type_code === 'DAY_PASS'}
            value={form.plan_type_code === 'DAY_PASS' ? '1' : form.duration_days}
            onChange={(e) => updateField('duration_days', e.target.value)}
            error={errors.duration_days}
            helperText={
              form.plan_type_code === 'DAY_PASS'
                ? 'Locked to 1 day for Day Passes.'
                : '1 to 3,650 calendar days.'
            }
          />

          {form.plan_type_code === 'SESSION_PACK' ? (
            <Input
              label="Included Visits"
              type="number"
              min="1"
              max="1000"
              step="1"
              mono
              required
              value={form.included_sessions}
              onChange={(e) => updateField('included_sessions', e.target.value)}
              placeholder="e.g., 10"
              error={errors.included_sessions}
              helperText="Deducted atomically on each gym sign-in."
            />
          ) : null}
        </div>

        {/* Price with Live 12% BIR VAT-Inclusive Breakdown */}
        <div>
          <Input
            label="Price (₱ PHP • 12% VAT-Inclusive)"
            type="number"
            min="0"
            max="999999.99"
            step="0.01"
            mono
            required
            value={form.price}
            onChange={(e) => updateField('price', e.target.value)}
            placeholder="1500.00"
            error={errors.price}
          />
          {vatPreview && !errors.price ? (
            <p className="mt-1.5 text-xs font-mono tabular-nums text-royal-blue-dark bg-royal-blue-light/50 border border-royal-blue/20 rounded-lg px-3 py-1.5">
              Includes {formatPHP(vatPreview.vatAmount)} (12% VAT) • Net Base:{' '}
              {formatPHP(vatPreview.vatableSales)}
            </p>
          ) : null}
        </div>

        {/* Badge Color Picker */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gunmetal-gray">
            Badge Accent Color
          </label>
          <div className="flex items-center gap-2.5 flex-wrap">
            {BADGE_COLORS.map((hex) => (
              <button
                key={hex}
                type="button"
                onClick={() => updateField('badge_color_hex', hex)}
                aria-label={`Select color ${hex}`}
                className={`h-8 w-8 rounded-lg border-2 transition-transform ${
                  form.badge_color_hex.toUpperCase() === hex
                    ? 'border-obsidian-black scale-110 ring-2 ring-royal-blue/30'
                    : 'border-pure-white shadow-sm hover:scale-105'
                }`}
                style={{ backgroundColor: hex }}
              />
            ))}
            <input
              type="text"
              value={form.badge_color_hex}
              onChange={(e) => updateField('badge_color_hex', e.target.value)}
              maxLength={7}
              className="w-24 rounded-lg border border-silver-border bg-pure-white px-2.5 py-1.5 font-mono text-xs uppercase text-obsidian-black focus:border-royal-blue focus:outline-none"
            />
          </div>
          {errors.badge_color_hex ? (
            <p role="alert" className="text-xs font-medium text-red-600">
              {errors.badge_color_hex}
            </p>
          ) : null}
        </div>

        {/* Description */}
        <div>
          <label
            htmlFor="mm-plan-description"
            className="block text-sm font-medium text-gunmetal-gray mb-1.5"
          >
            Description (Optional)
          </label>
          <textarea
            id="mm-plan-description"
            rows={3}
            maxLength={500}
            value={form.description}
            onChange={(e) => updateField('description', e.target.value)}
            placeholder="Brief plan perks, access hours, or gym floor inclusions..."
            className="w-full rounded-lg border border-silver-border bg-pure-white px-3.5 py-2.5 text-sm text-obsidian-black placeholder:text-silver-gray focus:border-royal-blue focus:outline-none focus:ring-2 focus:ring-royal-blue/20"
          />
          {errors.description ? (
            <p role="alert" className="mt-1 text-xs font-medium text-red-600">
              {errors.description}
            </p>
          ) : null}
        </div>

        {/* Active Toggle */}
        <label className="flex items-center justify-between rounded-xl border border-silver-border bg-silver-canvas/40 px-4 py-3 cursor-pointer">
          <div>
            <p className="text-sm font-semibold text-obsidian-black">
              Active for Front-Desk Checkout
            </p>
            <p className="text-xs text-steel-gray">
              Inactive plans are hidden from new enrollments but preserved in history.
            </p>
          </div>
          <input
            type="checkbox"
            checked={form.is_active}
            onChange={(e) => updateField('is_active', e.target.checked)}
            className="h-4 w-4 rounded border-silver-border text-royal-blue focus:ring-royal-blue"
          />
        </label>
      </form>
    </Drawer>
  );
}
