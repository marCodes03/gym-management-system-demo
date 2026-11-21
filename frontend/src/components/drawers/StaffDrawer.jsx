import { useEffect, useMemo, useState } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import Drawer from './Drawer';
import Button from '../common/Button';
import Input from '../common/Input';
import Select from '../common/Select';

const ROLE_OPTIONS = [
  { value: 'FRONT_DESK', label: 'Front Desk Staff' },
  { value: 'ADMIN', label: 'Owner / Admin' },
];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_POLICY_REGEX = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

function buildInitialStaff(staff) {
  if (!staff) {
    return {
      name: '',
      email: '',
      role_code: 'FRONT_DESK',
      password: '',
      is_active: true,
    };
  }
  return {
    name: staff.name || '',
    email: staff.email || '',
    role_code: staff.role_code || 'FRONT_DESK',
    password: '',
    is_active: Boolean(staff.is_active ?? true),
  };
}

/**
 * Mad Max Gym — 540px Slide-In Staff Account Create / Edit Drawer (ADMIN only)
 */
export default function StaffDrawer({ isOpen, onClose, staff = null, onSaved }) {
  const { user: currentUser, updateUser } = useAuth();
  const { toast } = useToast();

  const isEditing = Boolean(staff?.id);
  const isSelf = isEditing && staff.id === currentUser?.id;

  const [initialState, setInitialState] = useState(() =>
    buildInitialStaff(staff)
  );
  const [form, setForm] = useState(() => buildInitialStaff(staff));
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const next = buildInitialStaff(staff);
      setInitialState(next);
      setForm(next);
      setErrors({});
    }
  }, [isOpen, staff]);

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
    const email = form.email.trim().toLowerCase();

    if (name.length < 2 || name.length > 100) {
      nextErrors.name = 'Staff name must be between 2 and 100 characters.';
    }
    if (!EMAIL_REGEX.test(email)) {
      nextErrors.email = 'Please enter a valid email address.';
    }
    if (!isEditing && !PASSWORD_POLICY_REGEX.test(form.password)) {
      nextErrors.password =
        'Password must be at least 8 characters long and include both letters and numbers.';
    }
    if (isSelf && (!form.is_active || form.role_code !== 'ADMIN')) {
      nextErrors.role_code =
        'You cannot deactivate or demote your own active owner account.';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    try {
      if (isEditing) {
        const res = await api.put(`/staff/${staff.id}`, {
          name: form.name.trim(),
          email: form.email.trim().toLowerCase(),
          role_code: form.role_code,
          is_active: Boolean(form.is_active),
        });
        if (isSelf && res?.data) {
          updateUser({ name: res.data.name, email: res.data.email });
        }
        toast.success(`Updated staff account for ${form.name.trim()}.`);
      } else {
        await api.post('/staff', {
          name: form.name.trim(),
          email: form.email.trim().toLowerCase(),
          role_code: form.role_code,
          password: form.password,
          is_active: Boolean(form.is_active),
        });
        toast.success(`Created staff account for ${form.name.trim()}.`);
      }

      if (typeof onSaved === 'function') onSaved();
      if (typeof onClose === 'function') onClose();
    } catch (err) {
      toast.error(err?.message || 'Unable to save staff account.');
      if (err?.code === 'DUPLICATE_EMAIL') {
        setErrors((prev) => ({ ...prev, email: err.message }));
      } else if (err?.code === 'SELF_LOCKOUT_GUARD') {
        setErrors((prev) => ({ ...prev, role_code: err.message }));
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Staff Account' : 'Add Staff Account'}
      subtitle={
        isEditing
          ? 'Update staff details, role assignment, or active status.'
          : 'Provision a new Owner Admin or Front Desk terminal account.'
      }
      isDirty={isDirty}
      footer={({ requestClose }) => (
        <>
          <Button variant="secondary" onClick={requestClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            variant="primary"
            type="submit"
            form="mm-staff-drawer-form"
            loading={saving}
            leftIcon="check"
          >
            {isEditing ? 'Save Changes' : 'Create Staff Account'}
          </Button>
        </>
      )}
    >
      <form id="mm-staff-drawer-form" onSubmit={handleSubmit} className="space-y-5">
        <Input
          label="Full Name"
          required
          value={form.name}
          onChange={(e) => updateField('name', e.target.value)}
          placeholder="e.g., Carla Mendoza"
          error={errors.name}
        />

        <Input
          label="Staff Email"
          type="email"
          required
          value={form.email}
          onChange={(e) => updateField('email', e.target.value)}
          placeholder="staff@madmaxgym.com"
          error={errors.email}
        />

        <Select
          label="Role Assignment"
          required
          disabled={isSelf}
          options={ROLE_OPTIONS}
          value={form.role_code}
          onChange={(e) => updateField('role_code', e.target.value)}
          error={errors.role_code}
          helperText={
            isSelf
              ? 'Your own active owner role cannot be demoted.'
              : 'Front Desk has access to Check-In, Members, Plans (read-only), and Payments.'
          }
        />

        {!isEditing ? (
          <Input
            label="Initial Password"
            type="password"
            required
            value={form.password}
            onChange={(e) => updateField('password', e.target.value)}
            placeholder="Minimum 8 characters with letters & numbers"
            error={errors.password}
            helperText="At least 8 characters including both letters and numbers."
          />
        ) : null}

        <label
          className={`flex items-center justify-between rounded-xl border border-silver-border bg-silver-canvas/40 px-4 py-3 ${
            isSelf ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
          }`}
        >
          <div>
            <p className="text-sm font-semibold text-obsidian-black">
              Account Active
            </p>
            <p className="text-xs text-steel-gray">
              {isSelf
                ? 'You cannot deactivate your own active owner account.'
                : 'Deactivated staff accounts cannot sign in.'}
            </p>
          </div>
          <input
            type="checkbox"
            disabled={isSelf}
            checked={form.is_active}
            onChange={(e) => updateField('is_active', e.target.checked)}
            className="h-4 w-4 rounded border-silver-border text-royal-blue focus:ring-royal-blue"
          />
        </label>
      </form>
    </Drawer>
  );
}
