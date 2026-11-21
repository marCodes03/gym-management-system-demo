import { useCallback, useEffect, useState } from 'react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Badge from '../components/common/Badge';
import KebabMenu from '../components/common/KebabMenu';
import SvgIcon from '../components/common/SvgIcon';
import { TableSkeleton } from '../components/common/Skeleton';
import MemberDrawer from '../components/drawers/MemberDrawer';
import MemberPassModal from '../components/modals/MemberPassModal';
import PaymentModal from '../components/modals/PaymentModal';
import ReceiptModal from '../components/modals/ReceiptModal';
import { formatDate } from '../utils/formatters';

const STATUS_PILLS = [
  { id: 'ALL', label: 'All' },
  { id: 'ACTIVE', label: 'Active' },
  { id: 'EXPIRING_SOON', label: 'Expiring Soon' },
  { id: 'FROZEN', label: 'Frozen' },
  { id: 'EXPIRED', label: 'Expired' },
  { id: 'NO_PLAN', label: 'No Plan' },
];

/**
 * Mad Max Gym — Screen 3: Member Directory & Subscriptions
 */
export default function Members() {
  const { toast } = useToast();

  const [members, setMembers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  // Drawers & Modals
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [passMember, setPassMember] = useState(null);
  const [paymentMember, setPaymentMember] = useState(null);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [receiptData, setReceiptData] = useState(null);

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', '15');
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      if (search.trim()) params.set('search', search.trim());

      const res = await api.get(`/members?${params.toString()}`);
      setMembers(Array.isArray(res?.data) ? res.data : []);
      if (res?.pagination) setPagination(res.pagination);
    } catch (err) {
      toast.error(err?.message || 'Unable to load member directory.');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, search, toast]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchMembers();
    }, 200);
    return () => clearTimeout(timer);
  }, [fetchMembers]);

  const handleFreeze = async (member) => {
    if (!member.subscription_id) return;
    try {
      const res = await api.post(
        `/subscriptions/${member.subscription_id}/freeze`
      );
      toast.success(
        res?.data?.message ||
          `Membership for ${member.name} has been frozen.`
      );
      fetchMembers();
    } catch (err) {
      toast.error(err?.message || 'Unable to freeze subscription.');
    }
  };

  const handleUnfreeze = async (member) => {
    if (!member.subscription_id) return;
    try {
      const res = await api.post(
        `/subscriptions/${member.subscription_id}/unfreeze`
      );
      toast.success(
        res?.data?.message ||
          `Membership unfrozen for ${member.name}.`
      );
      fetchMembers();
    } catch (err) {
      toast.error(err?.message || 'Unable to unfreeze subscription.');
    }
  };

  const handleOpenEnroll = (member) => {
    setPaymentMember(member);
    setPaymentOpen(true);
  };

  const renderValidityCell = (m) => {
    if (!m.subscription_id) return <span className="text-silver-gray">—</span>;

    if (m.plan_type_code === 'SESSION_PACK') {
      return (
        <div>
          <p className="font-mono tabular-nums text-xs font-bold text-royal-blue-dark">
            {m.remaining_sessions ?? 0} / {m.total_sessions ?? 0} visits
          </p>
          <p className="text-[11px] text-steel-gray">
            Exp {formatDate(m.end_date)}
          </p>
        </div>
      );
    }

    return (
      <div>
        <p className="font-mono tabular-nums text-xs font-semibold text-obsidian-black">
          {formatDate(m.end_date)}
        </p>
        <p className="font-mono tabular-nums text-[11px] text-steel-gray">
          {m.computed_status === 'FROZEN'
            ? `Frozen ${formatDate(m.frozen_at)}`
            : m.computed_status === 'EXPIRED'
            ? 'Expired'
            : `${m.remaining_days ?? 0} day(s) left`}
        </p>
      </div>
    );
  };

  return (
    <div className="space-y-5">
      {/* Top Filter & Search Bar */}
      <div className="card-metallic rounded-xl p-4 space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {STATUS_PILLS.map((pill) => {
              const active = statusFilter === pill.id;
              return (
                <button
                  key={pill.id}
                  type="button"
                  onClick={() => {
                    setStatusFilter(pill.id);
                    setPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    active
                      ? 'bg-obsidian-black text-pure-white shadow-sm'
                      : 'bg-silver-canvas text-gunmetal-gray hover:text-obsidian-black hover:bg-silver-border/50'
                  }`}
                >
                  {pill.label}
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="w-full sm:w-72">
              <Input
                leftIcon="search"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search Name, Phone, or MEM-YYYY-XXXX..."
              />
            </div>

            <Button
              variant="primary"
              leftIcon="user-plus"
              onClick={() => {
                setEditingMember(null);
                setDrawerOpen(true);
              }}
            >
              New Member
            </Button>
          </div>
        </div>
      </div>

      {/* Member Directory Table */}
      {loading ? (
        <TableSkeleton rows={7} columns={6} />
      ) : members.length === 0 ? (
        <div className="card-metallic rounded-xl p-12 text-center space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-silver-canvas text-gunmetal-gray">
            <SvgIcon name="users" size={24} />
          </div>
          <h3 className="text-base font-semibold text-obsidian-black">
            No gym members found
          </h3>
          <p className="text-sm text-steel-gray max-w-md mx-auto">
            Register a new member or clear your active status filter.
          </p>
          <Button
            variant="primary"
            leftIcon="user-plus"
            onClick={() => {
              setEditingMember(null);
              setDrawerOpen(true);
            }}
          >
            Register New Member
          </Button>
        </div>
      ) : (
        <div className="card-metallic rounded-xl overflow-visible">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-silver-border bg-silver-canvas/70 text-[11px] font-semibold uppercase tracking-wider text-gunmetal-gray">
                  <th className="py-3.5 px-5">Member</th>
                  <th className="py-3.5 px-4">Member Code</th>
                  <th className="py-3.5 px-4">Current Plan</th>
                  <th className="py-3.5 px-4">Validity / Visits</th>
                  <th className="py-3.5 px-4 text-right">Total Visits</th>
                  <th className="py-3.5 px-5 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-silver-border/70 text-sm">
                {members.map((member, idx) => {
                  const status = member.computed_status || 'NO_PLAN';
                  const isNearBottom =
                    members.length > 3 && idx >= members.length - 2;
                  const canFreeze =
                    (status === 'ACTIVE' || status === 'EXPIRING_SOON') &&
                    member.subscription_id &&
                    member.plan_type_code !== 'DAY_PASS';
                  const canUnfreeze =
                    status === 'FROZEN' && Boolean(member.subscription_id);

                  return (
                    <tr
                      key={member.id}
                      className="hover:bg-silver-canvas/40 transition-colors"
                    >
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-obsidian-black text-royal-blue-light">
                            <SvgIcon name="barbell" size={17} />
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-obsidian-black truncate">
                              {member.name}
                            </p>
                            <p className="font-mono tabular-nums text-xs text-steel-gray">
                              {member.phone}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="font-mono tabular-nums text-xs font-bold text-royal-blue-dark bg-royal-blue-light/50 border border-royal-blue/20 px-2.5 py-1 rounded-lg">
                          {member.member_code}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        {member.plan_name ? (
                          <div>
                            <p className="text-sm font-medium text-obsidian-black">
                              {member.plan_name}
                            </p>
                            <p className="text-[11px] font-mono text-steel-gray">
                              {member.plan_code}
                            </p>
                          </div>
                        ) : (
                          <span className="text-xs text-silver-gray">
                            No active plan
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {renderValidityCell(member)}
                      </td>

                      <td className="py-3.5 px-4 text-right whitespace-nowrap font-mono tabular-nums font-bold text-obsidian-black">
                        {member.total_visits ?? 0}
                      </td>

                      {/* Rightmost Column: Status Badge + In-Column KebabMenu */}
                      <td className="py-3.5 px-5 whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <Badge status={status} dot />
                          <KebabMenu
                            dropUp={isNearBottom}
                            ariaLabel={`Actions for ${member.name}`}
                            items={[
                              {
                                key: 'pass',
                                label: 'View Member Pass',
                                icon: 'qr',
                                variant: 'primary',
                                onClick: () => setPassMember(member),
                              },
                              {
                                key: 'enroll',
                                label: 'Enroll / Renew Plan',
                                icon: 'cash',
                                onClick: () => handleOpenEnroll(member),
                              },
                              {
                                key: 'freeze',
                                label: 'Freeze Plan',
                                icon: 'snowflake',
                                hidden: !canFreeze,
                                onClick: () => handleFreeze(member),
                              },
                              {
                                key: 'unfreeze',
                                label: 'Unfreeze Plan',
                                icon: 'unlock',
                                variant: 'primary',
                                hidden: !canUnfreeze,
                                onClick: () => handleUnfreeze(member),
                              },
                              { divider: true },
                              {
                                key: 'edit',
                                label: 'Edit Member',
                                icon: 'edit',
                                onClick: () => {
                                  setEditingMember(member);
                                  setDrawerOpen(true);
                                },
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
                {pagination.total} members)
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={pagination.page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* 540px Member Registration / Edit Drawer */}
      <MemberDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        member={editingMember}
        onSaved={fetchMembers}
        onSaveAndEnroll={(newMember) => handleOpenEnroll(newMember)}
      />

      {/* Printable Member QR Pass Modal */}
      <MemberPassModal
        isOpen={Boolean(passMember)}
        onClose={() => setPassMember(null)}
        member={passMember}
      />

      {/* Enroll / Renew Payment Modal + 80mm Receipt */}
      <PaymentModal
        isOpen={paymentOpen}
        onClose={() => setPaymentOpen(false)}
        preselectedMember={paymentMember}
        onSuccess={(data) => {
          setReceiptData(data);
          fetchMembers();
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
