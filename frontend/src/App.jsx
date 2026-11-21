import { useAuth } from './context/AuthContext';
import AppShell from './components/layout/AppShell';
import Login from './pages/Login';
import CheckIn from './pages/CheckIn';
import Plans from './pages/Plans';
import Members from './pages/Members';
import Payments from './pages/Payments';
import Dashboard from './pages/Dashboard';
import Staff from './pages/Staff';
import Settings from './pages/Settings';

const SCREEN_META = {
  'check-in': {
    title: 'Fast Gym Sign-In Terminal',
    subtitle: '2-Second Athlete Check-In • Staff Lookup & Fullscreen Self-Service Kiosk',
  },
  members: {
    title: 'Member Directory & Subscriptions',
    subtitle: 'Manage athlete profiles, printable QR passes, and freeze/unfreeze extensions',
  },
  plans: {
    title: 'Membership Plans & Visit Packs',
    subtitle: '12% BIR VAT-inclusive Day Passes, Recurring Plans, and atomic Visit Packs',
  },
  payments: {
    title: 'Membership Payments & 80mm Receipts',
    subtitle: 'Enrollments, date-stacked renewals, 1-step walk-in day passes, and invoice ledger',
  },
  dashboard: {
    title: 'Owner Usage & Membership Dashboard',
    subtitle: 'Live sign-in traffic, peak hours (6 AM – 10 PM), expiring renewals & revenue',
  },
  staff: {
    title: 'Staff Access Control',
    subtitle: 'Manage Owner Admin and Front Desk accounts with self-lockout protection',
  },
  settings: {
    title: 'Gym Settings & Payment QRs',
    subtitle: 'Configure gym profile, 80mm receipt template, discount tiers, and merchant QRs',
  },
};

export default function App() {
  const { isAuthenticated, isAdmin, activeScreen, setActiveScreen } = useAuth();

  // Strict unauthenticated guard -> Branded Login Screen
  if (!isAuthenticated) {
    return <Login />;
  }

  // Enforce FRONT_DESK route protection
  const ownerOnlyScreens = new Set(['dashboard', 'staff', 'settings']);
  const safeScreen =
    !isAdmin && ownerOnlyScreens.has(activeScreen)
      ? 'check-in'
      : SCREEN_META[activeScreen]
      ? activeScreen
      : isAdmin
      ? 'dashboard'
      : 'check-in';

  const meta = SCREEN_META[safeScreen] || SCREEN_META['check-in'];

  const renderScreen = () => {
    switch (safeScreen) {
      case 'dashboard':
        return <Dashboard />;
      case 'check-in':
        return <CheckIn />;
      case 'members':
        return <Members />;
      case 'plans':
        return <Plans />;
      case 'payments':
        return <Payments />;
      case 'staff':
        return <Staff />;
      case 'settings':
        return <Settings />;
      default:
        return <CheckIn />;
    }
  };

  return (
    <AppShell
      activeScreen={safeScreen}
      onNavigate={setActiveScreen}
      title={meta.title}
      subtitle={meta.subtitle}
    >
      {renderScreen()}
    </AppShell>
  );
}
