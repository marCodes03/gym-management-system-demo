import { useCallback, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import CollapsibleSidebar, {
  ALL_NAV_ITEMS,
  OWNER_ONLY_SCREENS,
} from './CollapsibleSidebar';
import Button from '../common/Button';
import Badge from '../common/Badge';

/**
 * Mad Max Gym — Main Backoffice Application Shell
 * Combines the persistent Obsidian Black CollapsibleSidebar, top terminal header
 * with prominent Log Out action, role-guard redirection, and Silver Canvas workspace.
 */
export default function AppShell({
  activeScreen: propActiveScreen,
  onNavigate: propOnNavigate,
  title,
  subtitle,
  headerActions,
  children,
}) {
  const { user, isAdmin, activeScreen: ctxScreen, setActiveScreen, logout } =
    useAuth();
  const { toast } = useToast();

  const currentScreen = propActiveScreen ?? ctxScreen;

  const handleNavigate = useCallback(
    (targetScreen) => {
      if (!isAdmin && OWNER_ONLY_SCREENS.has(targetScreen)) {
        toast.warning(
          'Access restricted: Only the Gym Owner can view that page.'
        );
        const fallback = 'check-in';
        if (typeof propOnNavigate === 'function') {
          propOnNavigate(fallback);
        } else {
          setActiveScreen(fallback);
        }
        return;
      }

      if (typeof propOnNavigate === 'function') {
        propOnNavigate(targetScreen);
      } else {
        setActiveScreen(targetScreen);
      }
    },
    [isAdmin, propOnNavigate, setActiveScreen, toast]
  );

  // Guard persisted or programmatic screen changes when FRONT_DESK tries to view owner screens
  useEffect(() => {
    if (
      user &&
      !isAdmin &&
      (OWNER_ONLY_SCREENS.has(currentScreen) || OWNER_ONLY_SCREENS.has(ctxScreen))
    ) {
      toast.warning(
        'Access restricted: Only the Gym Owner can view that page.'
      );
      if (typeof propOnNavigate === 'function') {
        propOnNavigate('check-in');
      } else {
        setActiveScreen('check-in');
      }
    }
  }, [user, isAdmin, currentScreen, ctxScreen, propOnNavigate, setActiveScreen, toast]);

  const currentNavItem = ALL_NAV_ITEMS.find(
    (item) => item.id === currentScreen
  );
  const resolvedTitle = title || currentNavItem?.label || 'Mad Max Gym';

  return (
    <div className="min-h-screen flex bg-silver-canvas text-obsidian-black">
      <CollapsibleSidebar
        activeScreen={currentScreen}
        onNavigate={handleNavigate}
        user={user}
        onLogout={logout}
      />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Bar */}
        <header className="no-print sticky top-0 z-20 h-16 shrink-0 bg-pure-white border-b border-silver-border px-6 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-obsidian-black truncate">
              {resolvedTitle}
            </h1>
            {subtitle ? (
              <p className="text-xs text-steel-gray truncate">{subtitle}</p>
            ) : null}
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {headerActions ? (
              <div className="flex items-center gap-2">{headerActions}</div>
            ) : null}

            {user ? (
              <div className="hidden md:flex items-center gap-2.5 pl-3 border-l border-silver-border">
                <div className="text-right leading-tight">
                  <p className="text-xs font-semibold text-obsidian-black">
                    {user.name || user.email}
                  </p>
                  <p className="text-[11px] text-steel-gray">{user.email}</p>
                </div>
                <Badge status={user.role_code} />
              </div>
            ) : null}

            <Button
              variant="secondary"
              size="sm"
              leftIcon="log-out"
              onClick={logout}
            >
              Log Out
            </Button>
          </div>
        </header>

        {/* Main Workspace Canvas */}
        <main className="flex-1 p-6 overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
}
