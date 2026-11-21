import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import SvgIcon from '../components/common/SvgIcon';
import ForgotPasswordModal from '../components/modals/ForgotPasswordModal';
import madMaxLogo from '../assets/mad-max-logo.svg';
import madMaxBadge from '../assets/mad-max-badge.svg';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Mad Max Gym — Screen 6A: Branded Split-Screen Login & Password Recovery
 */
export default function Login() {
  const { login } = useAuth();
  const { toast } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const nextErrors = {};
    const trimmedEmail = email.trim();

    if (!EMAIL_REGEX.test(trimmedEmail)) {
      nextErrors.email = 'Please enter a valid email address (e.g., name@gym.com).';
    }
    if (!password.trim()) {
      nextErrors.password = 'Please enter your password.';
    }

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      return;
    }

    setSubmitting(true);
    setFieldErrors({});
    setServerError('');
    setIsRateLimited(false);

    try {
      const { user } = await login(trimmedEmail, password);
      toast.success(`Welcome back, ${user.name}!`);
    } catch (err) {
      const msg =
        err?.message || 'Invalid email or password. Please verify your credentials.';
      setServerError(msg);
      if (err?.status === 429) {
        setIsRateLimited(true);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleAutofill = (demoEmail, demoPassword) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setFieldErrors({});
    setServerError('');
    setIsRateLimited(false);
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-silver-canvas">
      {/* Left Brand Showcase Panel — Obsidian Black & Royal Blue */}
      <section className="relative lg:w-[48%] xl:w-[50%] bg-obsidian-black text-pure-white flex flex-col justify-between p-8 sm:p-12 overflow-hidden border-b-4 lg:border-b-0 lg:border-r-4 border-royal-blue">
        {/* Subtle industrial radial glow */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 -right-24 h-96 w-96 rounded-full bg-royal-blue/20 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-32 -left-24 h-80 w-80 rounded-full bg-royal-blue-dark/20 blur-3xl"
        />

        <div className="relative z-10 flex items-center justify-between gap-4">
          <img
            src={madMaxLogo}
            alt="Mad Max Gym"
            className="h-12 sm:h-14 w-auto select-none"
          />
          <img
            src={madMaxBadge}
            alt="Mad Max Gym Official Seal"
            className="h-14 w-14 select-none hidden sm:block"
          />
        </div>

        <div className="relative z-10 my-10 lg:my-0 space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full bg-royal-blue/20 border border-royal-blue/40 px-3.5 py-1 text-xs font-semibold uppercase tracking-widest text-royal-blue-light">
            <SvgIcon name="barbell" size={14} />
            <span>Forged in Iron. Built for Speed.</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight leading-tight">
            Zero-Friction Front Desk &amp; 2-Second Athlete Sign-In
          </h1>

          <p className="text-sm sm:text-base text-silver-gray max-w-md leading-relaxed">
            Manage memberships, atomic visit packs, 12% BIR VAT-inclusive receipts,
            and fullscreen self-service QR check-in from one unified terminal.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div className="rounded-xl bg-carbon-black/90 border border-gunmetal-gray/70 p-3.5">
              <SvgIcon name="qr" size={18} className="text-royal-blue-light" />
              <p className="mt-2 text-xs font-bold text-pure-white">
                QR Kiosk Mode
              </p>
              <p className="text-[11px] text-silver-gray mt-0.5">
                4s auto-reset &amp; cooldown guard
              </p>
            </div>
            <div className="rounded-xl bg-carbon-black/90 border border-gunmetal-gray/70 p-3.5">
              <SvgIcon name="receipt" size={18} className="text-royal-blue-light" />
              <p className="mt-2 text-xs font-bold text-pure-white">
                80mm Receipts
              </p>
              <p className="text-[11px] text-silver-gray mt-0.5">
                12% BIR VAT-inclusive math
              </p>
            </div>
            <div className="rounded-xl bg-carbon-black/90 border border-gunmetal-gray/70 p-3.5">
              <SvgIcon name="chart-bar" size={18} className="text-royal-blue-light" />
              <p className="mt-2 text-xs font-bold text-pure-white">
                Peak Traffic
              </p>
              <p className="text-[11px] text-silver-gray mt-0.5">
                Live owner usage insights
              </p>
            </div>
          </div>
        </div>

        <p className="relative z-10 text-xs font-mono text-silver-gray/80">
          MAD MAX GYM MANAGEMENT SYSTEM • STAFF TERMINAL
        </p>
      </section>

      {/* Right Login Form Panel */}
      <section className="flex-1 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md card-metallic rounded-2xl p-7 sm:p-9 space-y-6">
          <div className="space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-wider text-royal-blue">
              Staff Sign In
            </p>
            <h2 className="text-2xl font-bold tracking-tight text-obsidian-black">
              Sign in to your terminal
            </h2>
            <p className="text-sm text-steel-gray">
              Enter your Mad Max Gym staff credentials to continue.
            </p>
          </div>

          {/* Rate Limit (HTTP 429) or Auth Error Banner */}
          {serverError ? (
            <div
              role="alert"
              className={`rounded-xl border px-4 py-3 text-sm flex items-start gap-2.5 ${
                isRateLimited
                  ? 'border-amber-300 bg-amber-50 text-amber-900'
                  : 'border-rose-200 bg-rose-50 text-rose-800'
              }`}
            >
              <SvgIcon
                name={isRateLimited ? 'lock' : 'alert-triangle'}
                size={18}
                className="shrink-0 mt-0.5"
              />
              <div>
                {isRateLimited ? (
                  <p className="font-bold text-xs uppercase tracking-wider mb-0.5">
                    Too Many Login Attempts (Rate Limited)
                  </p>
                ) : null}
                <p>{serverError}</p>
              </div>
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <Input
              label="Email Address"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (fieldErrors.email)
                  setFieldErrors((prev) => ({ ...prev, email: undefined }));
              }}
              placeholder="owner@madmaxgym.com"
              error={fieldErrors.email}
            />

            <Input
              label="Password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (fieldErrors.password)
                  setFieldErrors((prev) => ({ ...prev, password: undefined }));
              }}
              placeholder="Enter your password"
              error={fieldErrors.password}
            />

            <div className="flex items-center justify-end">
              <button
                type="button"
                onClick={() => setForgotOpen(true)}
                className="text-xs font-semibold text-royal-blue hover:text-royal-blue-dark hover:underline"
              >
                Forgot Password?
              </button>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              loading={submitting}
              leftIcon="unlock"
            >
              Sign In to Mad Max Gym
            </Button>
          </form>

          <div className="pt-4 border-t border-silver-border/80 flex items-center justify-between text-xs text-steel-gray">
            <span>Need demo credentials?</span>
            <button
              type="button"
              onClick={() => setForgotOpen(true)}
              className="font-semibold text-obsidian-black hover:text-royal-blue transition-colors"
            >
              Quick Autofill &rarr;
            </button>
          </div>
        </div>
      </section>

      <ForgotPasswordModal
        isOpen={forgotOpen}
        onClose={() => setForgotOpen(false)}
        onAutofillCredentials={handleAutofill}
      />
    </div>
  );
}
