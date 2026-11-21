import { useEffect, useMemo, useState } from 'react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import Drawer from './Drawer';
import Button from '../common/Button';
import Input from '../common/Input';
import Select from '../common/Select';

const GENDER_OPTIONS = [
  { value: 'MALE', label: 'Male' },
  { value: 'FEMALE', label: 'Female' },
  { value: 'NON_BINARY', label: 'Non-Binary' },
  { value: 'PREFER_NOT_TO_SAY', label: 'Prefer not to say' },
];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function buildInitialMember(member) {
  if (!member) {
    return {
      name: '',
      phone: '',
      email: '',
      gender_code: 'MALE',
      emergency_contact_name: '',
      emergency_contact_phone: '',
      notes: '',
    };
  }
  return {
    name: member.name || '',
    phone: member.phone || '',
    email: member.email || '',
    gender_code: member.gender_code || 'MALE',
    emergency_contact_name: member.emergency_contact_name || '',
    emergency_contact_phone: member.emergency_contact_phone || '',
    notes: member.notes || '',
  };
}

/**
 * Mad Max Gym — 540px Slide-In Member Registration / Edit Drawer
 * Supports "Save Member" and "Save & Enroll in Plan" (immediately opening PaymentModal).
 */
export default function MemberDrawer({
  isOpen,
  onClose,
  member = null,
  onSaved,
  onSaveAndEnroll,
}) {
  const { toast } = useToast();
  const isEditing = Boolean(member?.id);

  const [initialState, setInitialState] = useState(() =>
    buildInitialMember(member)
  );
  const [form, setForm] = useState(() => buildInitialMember(member));
  const [errors, setErrors] = useState({});
  const [savingAction, setSavingAction] = useState(null); // 'save' | 'enroll' | null

  useEffect(() => {
    if (isOpen) {
      const next = buildInitialMember(member);
      setInitialState(next);
      setForm(next);
      setErrors({});
      setSavingAction(null);
    }
  }, [isOpen, member]);

  const isDirty = useMemo(
    () => JSON.stringify(form) !== JSON.stringify(initialState),
    [form, initialState]
  );

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const validate = () => {
    const nextErrors = {};
    const name = form.name.trim();
    const phoneDigits = form.phone.replace(/\D/g, '');
    const email = form.email.trim();
    const emergencyPhoneDigits = form.emergency_contact_phone.replace(/\D/g, '');

    if (name.length < 2 || name.length > 100) {
      nextErrors.name = 'Member name must be between 2 and 100 characters.';
    }
    if (phoneDigits.length < 7 || phoneDigits.length > 15) {
      nextErrors.phone =
        'Please enter a valid phone number (7 to 15 digits, e.g., 09171234567).';
    }
    if (email && !EMAIL_REGEX.test(email)) {
      nextErrors.email = 'Please enter a valid email address or leave it blank.';
    }
    if (!form.gender_code) {
      nextErrors.gender_code = 'Please select a gender option.';
    }
    if (form.emergency_contact_name.trim().length > 100) {
      nextErrors.emergency_contact_name =
        'Emergency contact name cannot exceed 100 characters.';
    }
    if (
      form.emergency_contact_phone.trim() &&
      (emergencyPhoneDigits.length < 7 || emergencyPhoneDigits.length > 15)
    ) {
      nextErrors.emergency_contact_phone =
        'Please enter a valid emergency contact phone number.';
    }
    if (form.notes.trim().length > 500) {
      nextErrors.notes = 'Notes cannot exceed 500 characters.';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const persistMember = async (actionType) => {
    if (!validate()) return;

    setSavingAction(actionType);
    try {
      const payload = {
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim() || null,
        gender_code: form.gender_code,
        emergency_contact_name: form.emergency_contact_name.trim() || null,
        emergency_contact_phone: form.emergency_contact_phone.trim() || null,
        notes: form.notes.trim() || null,
      };

      const res = isEditing
        ? await api.put(`/members/${member.id}`, payload)
        : await api.post('/members', payload);

      const savedMember = res?.data;
      toast.success(
        isEditing
          ? `Updated member profile for ${savedMember?.name || payload.name}.`
          : `Member ${savedMember?.name || payload.name} (${savedMember?.member_code || 'Member'}) registered successfully.`
      );

      if (typeof onSaved === 'function') onSaved(savedMember);
      if (typeof onClose === 'function') onClose();

      if (actionType === 'enroll' && savedMember && typeof onSaveAndEnroll === 'function') {
        onSaveAndEnroll(savedMember);
      }
    } catch (err) {
      toast.error(err?.message || 'Unable to save member profile.');
      if (err?.code === 'DUPLICATE_PHONE') {
        setErrors((prev) => ({ ...prev, phone: err.message }));
      }
    } finally {
      setSavingAction(null);
    }
  };

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Member Profile' : 'Register New Member'}
      subtitle={
        isEditing
          ? `Updating ${member.member_code} • Phone number must remain unique across members.`
          : 'Creates a unique MEM-YYYY-XXXX ID and scannable QR Pass automatically.'
      }
      isDirty={isDirty}
      footer={({ requestClose }) => (
        <>
          <Button
            variant="secondary"
            onClick={requestClose}
            disabled={Boolean(savingAction)}
          >
            Cancel
          </Button>
          {!isEditing ? (
            <Button
              variant="secondary"
              leftIcon="cash"
              loading={savingAction === 'enroll'}
              disabled={savingAction === 'save'}
              onClick={() => persistMember('enroll')}
            >
              Save &amp; Enroll in Plan
            </Button>
          ) : null}
          <Button
            variant="primary"
            type="submit"
            form="mm-member-drawer-form"
            loading={savingAction === 'save'}
            disabled={savingAction === 'enroll'}
            leftIcon="check"
          >
            {isEditing ? 'Save Changes' : 'Save Member'}
          </Button>
        </>
      )}
    >
      <form
        id="mm-member-drawer-form"
        onSubmit={(e) => {
          e.preventDefault();
          persistMember('save');
        }}
        className="space-y-5"
      >
        <Input
          label="Full Name"
          required
          value={form.name}
          onChange={(e) => updateField('name', e.target.value)}
          placeholder="e.g., Marco Santos"
          error={errors.name}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Phone Number"
            required
            mono
            value={form.phone}
            onChange={(e) => updateField('phone', e.target.value)}
            placeholder="09171234567"
            error={errors.phone}
            helperText="Used for fast Kiosk sign-in & lookup."
          />

          <Select
            label="Gender"
            required
            options={GENDER_OPTIONS}
            value={form.gender_code}
            onChange={(e) => updateField('gender_code', e.target.value)}
            error={errors.gender_code}
          />
        </div>

        <Input
          label="Email Address (Optional)"
          type="email"
          value={form.email}
          onChange={(e) => updateField('email', e.target.value)}
          placeholder="member@email.com"
          error={errors.email}
        />

        <div className="rounded-xl border border-silver-border bg-silver-canvas/40 p-4 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-gunmetal-gray">
            Emergency Contact (Optional)
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Contact Name"
              value={form.emergency_contact_name}
              onChange={(e) =>
                updateField('emergency_contact_name', e.target.value)
              }
              placeholder="e.g., Maria Santos"
              error={errors.emergency_contact_name}
            />
            <Input
              label="Contact Phone"
              mono
              value={form.emergency_contact_phone}
              onChange={(e) =>
                updateField('emergency_contact_phone', e.target.value)
              }
              placeholder="09181234567"
              error={errors.emergency_contact_phone}
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="mm-member-notes"
            className="block text-sm font-medium text-gunmetal-gray mb-1.5"
          >
            Notes / Medical Remarks (Optional)
          </label>
          <textarea
            id="mm-member-notes"
            rows={3}
            maxLength={500}
            value={form.notes}
            onChange={(e) => updateField('notes', e.target.value)}
            placeholder="Training goals, injuries, locker preferences..."
            className="w-full rounded-lg border border-silver-border bg-pure-white px-3.5 py-2.5 text-sm text-obsidian-black placeholder:text-silver-gray focus:border-royal-blue focus:outline-none focus:ring-2 focus:ring-royal-blue/20"
          />
          {errors.notes ? (
            <p role="alert" className="mt-1 text-xs font-medium text-red-600">
              {errors.notes}
            </p>
          ) : null}
        </div>
      </form>
    </Drawer>
  );
}
