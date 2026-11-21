import { useCallback, useEffect, useState } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Badge from '../components/common/Badge';
import KebabMenu from '../components/common/KebabMenu';
import SvgIcon from '../components/common/SvgIcon';
import { TableSkeleton } from '../components/common/Skeleton';
import StaffDrawer from '../components/drawers/StaffDrawer';
import ResetPasswordModal from '../components/modals/ResetPasswordModal';

/**
 * Mad Max Gym — Screen 6B: Staff Access Control (ADMIN only)
 */
export default function Staff() {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();

  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Drawers & Modals
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [resetTarget, setResetTarget] = useState(null);

  const fetchStaff = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('limit', '50');
      if (search.trim()) params.set('search', search.trim());
      const res = await api.get(`/staff?${params.toString()}`);
      setStaffList(Array.isArray(res?.data) ? res.data : []);
    } catch (err) {
      toast.error(err?.message || 'Unable to load staff accounts.');
    } finally {
      setLoading(false);
    }
  }, [search, toast]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchStaff();
    }, 180);
    return () => clearTimeout(timer);
  }, [fetchStaff]);

  const handleToggleActive = async (staffRow) => {
    if (staffRow.id === currentUser?.id) {
      toast.warning(
        'You cannot deactivate or demote your own active owner account.'
      );
      return;
    }

    const nextActive = !staffRow.is_active;
    try {
      await api.put(`/staff/${staffRow.id}`, { is_active: nextActive });
      toast.success(
        nextActive
          ? `Reactivated staff account for ${staffRow.name}.`
          : `Deactivated staff account for ${staffRow.name}.`
      );
      fetchStaff();
    } catch (err) {
      toast.error(err?.message || 'Unable to update staff status.');
    }
  };

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="card-metallic rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-obsidian-black">
            Staff Directory &amp; Role-Based Access Control
          </h2>
          <p className="text-xs text-steel-gray">
            Manage Owner Admin and Front Desk staff credentials and terminal permissions.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="w-full sm:w-64">
            <Input
              leftIcon="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search staff name or email..."
            />
          </div>
          <Button
            variant="primary"
            leftIcon="user-plus"
            onClick={() => {
              setEditingStaff(null);
              setDrawerOpen(true);
            }}
          >
            Add Staff
          </Button>
        </div>
      </div>

      {/* Staff Table */}
      {loading ? (
        <TableSkeleton rows={5} columns={5} />
      ) : staffList.length === 0 ? (
        <div className="card-metallic rounded-xl p-12 text-center space-y-2">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-silver-canvas text-gunmetal-gray">
            <SvgIcon name="staff" size={24} />
          </div>
          <p className="text-sm font-semibold text-obsidian-black">
            No staff accounts matched your search
          </p>
        </div>
      ) : (
        <div className="card-metallic rounded-xl overflow-visible">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-silver-border bg-silver-canvas/70 text-[11px] font-semibold uppercase tracking-wider text-gunmetal-gray">
                  <th className="py-3.5 px-5">Staff Member</th>
                  <th className="py-3.5 px-4">Email</th>
                  <th className="py-3.5 px-4">Role</th>
                  <th className="py-3.5 px-4 text-right">Sign-Ins Processed</th>
                  <th className="py-3.5 px-5 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-silver-border/70 text-sm">
                {staffList.map((row, idx) => {
                  const isSelf = row.id === currentUser?.id;
                  const isNearBottom =
                    staffList.length > 3 && idx >= staffList.length - 2;

                  return (
                    <tr
                      key={row.id}
                      className="hover:bg-silver-canvas/40 transition-colors"
                    >
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-obsidian-black text-royal-blue-light">
                            <SvgIcon name="staff" size={17} />
                          </div>
                          <div>
                            <p className="font-semibold text-obsidian-black flex items-center gap-2">
                              <span>{row.name}</span>
                              {isSelf ? (
                                <span className="rounded bg-royal-blue-light px-1.5 py-0.5 text-[10px] font-bold uppercase text-royal-blue-dark">
                                  You
                                </span>
                              ) : null}
                            </p>
                            <p className="text-[11px] text-steel-gray font-mono">
                              {row.payments_processed ?? 0} payment(s) processed
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-mono text-xs text-gunmetal-gray">
                        {row.email}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <Badge status={row.role_code} />
                      </td>

                      <td className="py-3.5 px-4 text-right whitespace-nowrap font-mono tabular-nums font-bold text-obsidian-black">
                        {row.sign_ins_processed ?? 0}
                      </td>

                      <td className="py-3.5 px-5 whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <Badge
                            status={row.is_active ? 'ACTIVE' : 'INACTIVE'}
                            dot
                          />
                          <KebabMenu
                            dropUp={isNearBottom}
                            ariaLabel={`Actions for ${row.name}`}
                            items={[
                              {
                                key: 'edit',
                                label: 'Edit Details',
                                icon: 'edit',
                                onClick: () => {
                                  setEditingStaff(row);
                                  setDrawerOpen(true);
                                },
                              },
                              {
                                key: 'reset',
                                label: 'Reset Password',
                                icon: 'lock',
                                onClick: () => setResetTarget(row),
                              },
                              { divider: true },
                              {
                                key: 'toggle',
                                label: row.is_active
                                  ? 'Deactivate Account'
                                  : 'Activate Account',
                                icon: row.is_active ? 'trash' : 'unlock',
                                variant: row.is_active ? 'danger' : 'primary',
                                disabled: isSelf,
                                onClick: () => handleToggleActive(row),
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
        </div>
      )}

      {/* 540px Staff Drawer */}
      <StaffDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        staff={editingStaff}
        onSaved={fetchStaff}
      />

      {/* Reset Password Modal */}
      <ResetPasswordModal
        isOpen={Boolean(resetTarget)}
        onClose={() => setResetTarget(null)}
        staff={resetTarget}
      />
    </div>
  );
}
