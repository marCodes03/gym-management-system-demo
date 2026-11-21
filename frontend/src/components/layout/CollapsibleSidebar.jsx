import { useState } from 'react';
import SvgIcon from '../common/SvgIcon';
import madMaxLogo from '../../assets/mad-max-logo.svg';
import madMaxIcon from '../../assets/mad-max-icon.svg';

export const SIDEBAR_STORAGE_KEY = 'mm_sidebar_collapsed';

export const NAV_GROUPS = [
  {
    id: 'front-desk',
    label: 'Front Desk',
    items: [
      {
        id: 'check-in',
        label: 'Fast Check-In',
        icon: 'user-check',
        roles: ['ADMIN', 'FRONT_DESK'],
      },
      {
        id: 'members',
        label: 'Members',
        icon: 'users',
        roles: ['ADMIN', 'FRONT_DESK'],
      },
      {
        id: 'plans',
        label: 'Plans',
        icon: 'id-card',
        roles: ['ADMIN', 'FRONT_DESK'],
      },
      {
        id: 'payments',
        label: 'Payments',
        icon: 'receipt',
        roles: ['ADMIN', 'FRONT_DESK'],
      },
    ],
  },
  {
    id: 'administration',
    label: 'Owner & Admin',
    items: [
      {
        id: 'dashboard',
        label: 'Owner Dashboard',
        icon: 'chart-bar',
        roles: ['ADMIN'],
      },
      {
        id: 'staff',
        label: 'Staff Access',
        icon: 'staff',
        roles: ['ADMIN'],
      },
      {
        id: 'settings',
        label: 'Gym Settings',
        icon: 'settings',
        roles: ['ADMIN'],
      },
    ],
  },
];

export const ALL_NAV_ITEMS = NAV_GROUPS.flatMap((group) => group.items);

export const OWNER_ONLY_SCREENS = new Set(
  ALL_NAV_ITEMS.filter(
    (item) => item.roles.length === 1 && item.roles[0] === 'ADMIN'
  ).map((item) => item.id)
);

function readCollapsedState() {
  try {
    return localStorage.getItem(SIDEBAR_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export default function CollapsibleSidebar({
  activeScreen,
  onNavigate,
  user,
  onLogout,
  collapsed: controlledCollapsed,
  onToggleCollapse,
}) {
  const [internalCollapsed, setInternalCollapsed] = useState(() =>
    readCollapsedState()
  );

  const isCollapsed =
    typeof controlledCollapsed === 'boolean'
      ? controlledCollapsed
      : internalCollapsed;

  const handleToggle = () => {
    const next = !isCollapsed;
    if (typeof onToggleCollapse === 'function') {
      onToggleCollapse(next);
    } else {
      setInternalCollapsed(next);
    }
    try {
      localStorage.setItem(SIDEBAR_STORAGE_KEY, String(next));
    } catch {
      // Ignore storage write errors
    }
  };

  const roleCode = user?.role_code || 'FRONT_DESK';

  const visibleGroups = NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => item.roles.includes(roleCode)),
  })).filter((group) => group.items.length > 0);

  return (
    <aside
      aria-label="Primary navigation"
      className={`no-print relative flex flex-col shrink-0 bg-obsidian-black text-pure-white border-r border-gunmetal-gray/60 select-none transition-[width] duration-200 ease-out ${
        isCollapsed ? 'w-16' : 'w-[230px]'
      }`}
    >
      {/* Brand Crest Header */}
      <div
        className={`flex items-center border-b border-gunmetal-gray/60 h-16 shrink-0 ${
          isCollapsed ? 'justify-center px-2' : 'justify-between px-4'
        }`}
      >
        {isCollapsed ? (
          <img
            src={madMaxIcon}
            alt="Mad Max Gym"
            className="h-9 w-9 object-contain"
          />
        ) : (
          <img
            src={madMaxLogo}
            alt="Mad Max Gym"
            className="h-10 w-auto max-w-[164px] object-contain"
          />
        )}

        {!isCollapsed ? (
          <button
            type="button"
            onClick={handleToggle}
            aria-label="Collapse sidebar"
            title="Collapse sidebar"
            className="rounded-lg p-1.5 text-silver-gray hover:text-pure-white hover:bg-carbon-black transition-colors"
          >
            <SvgIcon name="chevron-left" size={16} />
          </button>
        ) : null}
      </div>

      {/* Expand toggle when minimized */}
      {isCollapsed ? (
        <div className="flex justify-center py-2 border-b border-gunmetal-gray/40">
          <button
            type="button"
            onClick={handleToggle}
            aria-label="Expand sidebar"
            title="Expand sidebar"
            className="rounded-lg p-1.5 text-silver-gray hover:text-pure-white hover:bg-carbon-black transition-colors"
          >
            <SvgIcon name="chevron-right" size={16} />
          </button>
        </div>
      ) : null}

      {/* Navigation Groups */}
      <nav className="flex-1 overflow-y-auto overflow-x-visible py-4 px-2 space-y-5">
        {visibleGroups.map((group) => (
          <div key={group.id} className="space-y-1">
            {!isCollapsed ? (
              <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-silver-gray/75">
                {group.label}
              </p>
            ) : (
              <div
                className="mx-auto my-1.5 h-px w-6 bg-gunmetal-gray/50"
                aria-hidden="true"
              />
            )}

            {group.items.map((item) => {
              const isActive = activeScreen === item.id;
              return (
                <div key={item.id} className="relative group">
                  <button
                    type="button"
                    onClick={() => {
                      // Navigate directly WITHOUT auto-expanding when collapsed
                      if (typeof onNavigate === 'function') {
                        onNavigate(item.id);
                      }
                    }}
                    aria-current={isActive ? 'page' : undefined}
                    className={`relative flex w-full items-center rounded-xl transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-royal-blue ${
                      isCollapsed
                        ? 'justify-center h-11 px-0'
                        : 'gap-3 px-3 py-2.5'
                    } ${
                      isActive
                        ? 'bg-royal-blue text-pure-white font-semibold shadow-sm'
                        : 'text-silver-gray hover:bg-carbon-black hover:text-pure-white font-medium'
                    }`}
                  >
                    {isActive && !isCollapsed ? (
                      <span
                        className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-royal-blue-light"
                        aria-hidden="true"
                      />
                    ) : null}
                    <SvgIcon
                      name={item.icon}
                      size={18}
                      className={
                        isActive
                          ? 'text-pure-white'
                          : 'text-silver-gray group-hover:text-pure-white'
                      }
                    />
                    {!isCollapsed ? (
                      <span className="text-sm truncate">{item.label}</span>
                    ) : null}
                  </button>

                  {/* Instantaneous Hover Tooltip when collapsed to 64px rail */}
                  {isCollapsed ? (
                    <span
                      role="tooltip"
                      className="pointer-events-none fixed-tooltip absolute left-full top-1/2 -translate-y-1/2 ml-3 z-50 whitespace-nowrap rounded-lg bg-carbon-black border border-gunmetal-gray px-2.5 py-1.5 text-xs font-semibold text-pure-white shadow-floating opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity duration-75"
                    >
                      {item.label}
                    </span>
                  ) : null}
                </div>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer: Staff Identity & Prominent Log Out */}
      <div className="shrink-0 border-t border-gunmetal-gray/60 p-2.5 space-y-2 bg-obsidian-black">
        {!isCollapsed && user ? (
          <div className="rounded-xl bg-carbon-black/90 border border-gunmetal-gray/60 px-3 py-2">
            <p className="text-xs font-semibold text-pure-white truncate">
              {user.name || user.email}
            </p>
            <p className="text-[11px] font-mono uppercase tracking-wider text-royal-blue-light/90 truncate">
              {user.role_code === 'ADMIN' ? 'Owner / Admin' : 'Front Desk'}
            </p>
          </div>
        ) : null}

        <div className="relative group">
          <button
            type="button"
            onClick={onLogout}
            className={`flex w-full items-center rounded-xl border border-gunmetal-gray/70 bg-carbon-black/60 text-silver-gray hover:bg-rose-600/20 hover:border-rose-500/50 hover:text-rose-200 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-royal-blue ${
              isCollapsed
                ? 'justify-center h-10 px-0'
                : 'justify-center gap-2 px-3 py-2 text-sm font-semibold'
            }`}
          >
            <SvgIcon name="log-out" size={16} />
            {!isCollapsed ? <span>Log Out</span> : null}
          </button>

          {isCollapsed ? (
            <span
              role="tooltip"
              className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 z-50 whitespace-nowrap rounded-lg bg-carbon-black border border-gunmetal-gray px-2.5 py-1.5 text-xs font-semibold text-pure-white shadow-floating opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity duration-75"
            >
              Log Out
            </span>
          ) : null}
        </div>
      </div>
    </aside>
  );
}
