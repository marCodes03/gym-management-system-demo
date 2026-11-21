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
import PlanDrawer from '../components/drawers/PlanDrawer';
import { formatPHP } from '../utils/formatters';

const TYPE_FILTERS = [
  { id: 'ALL', label: 'All Plans' },
  { id: 'DAY_PASS', label: 'Day Pass' },
  { id: 'RECURRING', label: 'Recurring' },
  { id: 'SESSION_PACK', label: 'Visit Pack' },
];

/**
 * Mad Max Gym — Screen 2: Membership Plans & Visit Packs Catalog
 * ADMIN: Full CRUD + Duplicate + Activate/Deactivate via 540px PlanDrawer.
 * FRONT_DESK: Read-only reference view.
 */
export default function Plans() {
  const { isAdmin } = useAuth();
  const { toast } = useToast();

  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [isDuplicateMode, setIsDuplicateMode] = useState(false);

  const fetchPlans = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (typeFilter !== 'ALL') params.set('plan_type_code', typeFilter);
      if (search.trim()) params.set('search', search.trim());
      const query = params.toString() ? `?${params.toString()}` : '';
      const res = await api.get(`/plans${query}`);
      setPlans(Array.isArray(res?.data) ? res.data : []);
    } catch (err) {
      toast.error(err?.message || 'Unable to load membership plans.');
    } finally {
      setLoading(false);
    }
  }, [typeFilter, search, toast]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPlans();
    }, 180);
    return () => clearTimeout(timer);
  }, [fetchPlans]);

  const handleOpenCreate = () => {
    setEditingPlan(null);
    setIsDuplicateMode(false);
    setDrawerOpen(true);
  };

  const handleEdit = (plan) => {
    setEditingPlan(plan);
    setIsDuplicateMode(false);
    setDrawerOpen(true);
  };

  const handleDuplicate = (plan) => {
    setEditingPlan(plan);
    setIsDuplicateMode(true);
    setDrawerOpen(true);
  };

  const handleToggleStatus = async (plan) => {
    const nextActive = !plan.is_active;
    try {
      await api.patch(`/plans/${plan.id}/status`, { is_active: nextActive });
      toast.success(
        nextActive
          ? `Plan "${plan.name}" is now Active.`
          : `Plan "${plan.name}" has been deactivated.`
      );
      fetchPlans();
    } catch (err) {
      toast.error(err?.message || 'Unable to update plan status.');
    }
  };

  const formatValidity = (plan) => {
    if (plan.plan_type_code === 'DAY_PASS') return '1 Day (Single Visit)';
    if (plan.plan_type_code === 'SESSION_PACK') {
      return `${plan.included_sessions} Visits • Valid ${plan.duration_days} Days`;
    }
    return `${plan.duration_days} Days Unlimited`;
  };

  return (
    <div className="space-y-5">
      {/* Top Toolbar */}
      <div className="card-metallic rounded-xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          {TYPE_FILTERS.map((tab) => {
            const active = typeFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setTypeFilter(tab.id)}
                className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                  active
                    ? 'bg-obsidian-black text-pure-white shadow-sm'
                    : 'bg-silver-canvas text-gunmetal-gray hover:text-obsidian-black hover:bg-silver-border/50'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="w-full sm:w-64">
            <Input
              leftIcon="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search plan name or code..."
            />
          </div>

          {isAdmin ? (
            <Button
              variant="primary"
              leftIcon="plus"
              onClick={handleOpenCreate}
            >
              New Plan
            </Button>
          ) : (
            <Badge status="FRONT_DESK">Read-Only Catalog</Badge>
          )}
        </div>
      </div>

      {/* Plans Table */}
      {loading ? (
        <TableSkeleton rows={6} columns={6} />
      ) : plans.length === 0 ? (
        <div className="card-metallic rounded-xl p-12 text-center space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-silver-canvas text-gunmetal-gray">
            <SvgIcon name="id-card" size={24} />
          </div>
          <h3 className="text-base font-semibold text-obsidian-black">
            No membership plans found
          </h3>
          <p className="text-sm text-steel-gray max-w-md mx-auto">
            Try adjusting your plan type filter or search term.
          </p>
          {isAdmin ? (
            <Button variant="primary" leftIcon="plus" onClick={handleOpenCreate}>
              Create First Plan
            </Button>
          ) : null}
        </div>
      ) : (
        <div className="card-metallic rounded-xl overflow-visible">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-silver-border bg-silver-canvas/70 text-[11px] font-semibold uppercase tracking-wider text-gunmetal-gray">
                  <th className="py-3.5 px-5">Plan Code</th>
                  <th className="py-3.5 px-4">Plan Name</th>
                  <th className="py-3.5 px-4">Type</th>
                  <th className="py-3.5 px-4">Validity / Visits</th>
                  <th className="py-3.5 px-4 text-right">Price (12% VAT Incl.)</th>
                  <th className="py-3.5 px-5 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-silver-border/70 text-sm">
                {plans.map((plan, index) => {
                  const isNearBottom =
                    plans.length > 3 && index >= plans.length - 2;
                  return (
                    <tr
                      key={plan.id}
                      className="hover:bg-silver-canvas/50 transition-colors"
                    >
                      <td className="py-3.5 px-5 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <span
                            className="h-3 w-3 rounded-full shrink-0 border border-obsidian-black/10"
                            style={{
                              backgroundColor: plan.badge_color_hex || '#2563EB',
                            }}
                          />
                          <span className="font-mono tabular-nums text-xs font-bold text-obsidian-black">
                            {plan.code}
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <p className="font-semibold text-obsidian-black">
                          {plan.name}
                        </p>
                        {plan.description ? (
                          <p className="text-xs text-steel-gray line-clamp-1 max-w-xs">
                            {plan.description}
                          </p>
                        ) : null}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <Badge status={plan.plan_type_code} />
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap font-mono tabular-nums text-xs font-medium text-gunmetal-gray">
                        {formatValidity(plan)}
                      </td>

                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <p className="font-mono tabular-nums font-extrabold text-obsidian-black">
                          {formatPHP(plan.price)}
                        </p>
                        <p className="font-mono tabular-nums text-[11px] text-steel-gray">
                          Net {formatPHP(plan.net_amount)} • VAT{' '}
                          {formatPHP(plan.vat_amount)}
                        </p>
                      </td>

                      {/* Rightmost column: Status Badge + In-Column KebabMenu */}
                      <td className="py-3.5 px-5 whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <Badge
                            status={plan.is_active ? 'ACTIVE' : 'INACTIVE'}
                            dot
                          />
                          {isAdmin ? (
                            <KebabMenu
                              dropUp={isNearBottom}
                              ariaLabel={`Actions for ${plan.name}`}
                              items={[
                                {
                                  key: 'edit',
                                  label: 'Edit Plan',
                                  icon: 'edit',
                                  onClick: () => handleEdit(plan),
                                },
                                {
                                  key: 'duplicate',
                                  label: 'Duplicate Plan',
                                  icon: 'copy',
                                  onClick: () => handleDuplicate(plan),
                                },
                                { divider: true },
                                {
                                  key: 'toggle',
                                  label: plan.is_active
                                    ? 'Deactivate Plan'
                                    : 'Activate Plan',
                                  icon: plan.is_active ? 'lock' : 'unlock',
                                  variant: plan.is_active
                                    ? 'danger'
                                    : 'primary',
                                  onClick: () => handleToggleStatus(plan),
                                },
                              ]}
                            />
                          ) : null}
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

      {/* 540px Slide-In Plan CRUD Drawer */}
      <PlanDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        plan={editingPlan}
        isDuplicate={isDuplicateMode}
        onSaved={fetchPlans}
      />
    </div>
  );
}
