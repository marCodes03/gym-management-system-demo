import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Badge from '../components/common/Badge';
import SvgIcon from '../components/common/SvgIcon';
import { Skeleton } from '../components/common/Skeleton';
import madMaxBadge from '../assets/mad-max-badge.svg';
import { formatPHP, round2 } from '../utils/formatters';

const ALLOWED_QR_MIME = new Set(['image/png', 'image/jpeg', 'image/webp']);
const MAX_QR_FILE_BYTES = 2 * 1024 * 1024; // 2 MB

/**
 * Mad Max Gym — Screen 6C: Gym Settings, Discounts & Auto-Saved Payment QRs (ADMIN only)
 */
export default function Settings() {
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);

  // Gym Profile & Receipt settings
  const [profile, setProfile] = useState({
    gym_name: '',
    address: '',
    phone: '',
    tin_number: '',
    tax_rate_pct: '12',
    receipt_header: '',
    receipt_footer: '',
  });
  const [profileErrors, setProfileErrors] = useState({});

  // Discount Tiers
  const [discountTiers, setDiscountTiers] = useState([]);
  const [newTierName, setNewTierName] = useState('');
  const [newTierPct, setNewTierPct] = useState('');
  const [tierError, setTierError] = useState('');

  // Multi-Provider Merchant QR Codes (Auto-Saved via PUT /api/v1/settings/qr-codes)
  const [qrCodes, setQrCodes] = useState([]);
  const [qrProvider, setQrProvider] = useState('');
  const [qrAccount, setQrAccount] = useState('');
  const [qrImageData, setQrImageData] = useState('');
  const [qrError, setQrError] = useState('');
  const [savingQr, setSavingQr] = useState(false);
  const fileInputRef = useRef(null);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/settings');
      const data = res?.data || {};
      setProfile({
        gym_name: data.gym_name || '',
        address: data.address || '',
        phone: data.phone || '',
        tin_number: data.tin_number || '',
        tax_rate_pct: String(data.tax_rate_pct ?? 12),
        receipt_header: data.receipt_header || '',
        receipt_footer: data.receipt_footer || '',
      });
      setDiscountTiers(
        Array.isArray(data.discount_tiers) ? data.discount_tiers : []
      );
      setQrCodes(
        Array.isArray(data.payment_qr_codes) ? data.payment_qr_codes : []
      );
    } catch (err) {
      toast.error(err?.message || 'Unable to load gym settings.');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // Live 80mm 12% VAT-Inclusive sample breakdown (₱1,500.00 sample plan)
  const sampleReceipt = useMemo(() => {
    const rate = Math.min(50, Math.max(0, Number(profile.tax_rate_pct) || 0));
    const sampleTotal = 1500;
    const netBase = round2(sampleTotal / (1 + rate / 100));
    const vatAmount = round2(sampleTotal - netBase);
    return { rate, sampleTotal, netBase, vatAmount };
  }, [profile.tax_rate_pct]);

  const handleSaveProfileAndDiscounts = async (e) => {
    if (e) e.preventDefault();
    const errs = {};

    const gymName = profile.gym_name.trim();
    const address = profile.address.trim();
    const phoneDigits = profile.phone.replace(/\D/g, '');
    const taxRate = Number(profile.tax_rate_pct);

    if (gymName.length < 2 || gymName.length > 120) {
      errs.gym_name = 'Gym name must be between 2 and 120 characters.';
    }
    if (address.length < 5 || address.length > 250) {
      errs.address = 'Gym address must be between 5 and 250 characters.';
    }
    if (phoneDigits.length < 7 || phoneDigits.length > 15) {
      errs.phone = 'Please enter a valid gym contact phone number.';
    }
    if (profile.tin_number.trim().length > 40) {
      errs.tin_number = 'TIN number cannot exceed 40 characters.';
    }
    if (!Number.isFinite(taxRate) || taxRate < 0 || taxRate > 50) {
      errs.tax_rate_pct = 'Tax rate percentage must be between 0% and 50%.';
    }
    if (profile.receipt_header.trim().length > 200) {
      errs.receipt_header = 'Receipt header/footer cannot exceed 200 characters.';
    }
    if (profile.receipt_footer.trim().length > 200) {
      errs.receipt_footer = 'Receipt header/footer cannot exceed 200 characters.';
    }

    if (Object.keys(errs).length > 0) {
      setProfileErrors(errs);
      return;
    }

    setSavingProfile(true);
    setProfileErrors({});
    try {
      const res = await api.put('/settings', {
        gym_name: gymName,
        address,
        phone: profile.phone.trim(),
        tin_number: profile.tin_number.trim() || null,
        tax_rate_pct: Number(taxRate.toFixed(2)),
        receipt_header: profile.receipt_header.trim() || null,
        receipt_footer: profile.receipt_footer.trim() || null,
        discount_tiers: discountTiers,
      });
      if (res?.data?.discount_tiers) {
        setDiscountTiers(res.data.discount_tiers);
      }
      toast.success('Gym profile, receipt settings, and discount tiers saved.');
    } catch (err) {
      toast.error(err?.message || 'Unable to save gym settings.');
    } finally {
      setSavingProfile(false);
    }
  };

  // Discount Tier Handlers
  const handleAddDiscountTier = () => {
    const name = newTierName.trim();
    const pct = Number(newTierPct);

    if (name.length < 2 || name.length > 40) {
      setTierError(
        'Discount tier name must be between 2 and 40 characters (e.g., Student 10%).'
      );
      return;
    }
    if (!Number.isFinite(pct) || pct < 1 || pct > 100) {
      setTierError('Discount percentage must be between 1% and 100%.');
      return;
    }

    setTierError('');
    setDiscountTiers((prev) => [
      ...prev,
      {
        id: `disc-${Date.now()}`,
        name,
        pct: Number(pct.toFixed(2)),
        is_active: true,
      },
    ]);
    setNewTierName('');
    setNewTierPct('');
  };

  const handleToggleTier = (tierId) => {
    setDiscountTiers((prev) =>
      prev.map((t) => (t.id === tierId ? { ...t, is_active: !t.is_active } : t))
    );
  };

  const handleDeleteTier = (tierId) => {
    setDiscountTiers((prev) => prev.filter((t) => t.id !== tierId));
  };

  // Auto-save QR Codes via PUT /api/v1/settings/qr-codes
  const persistQrCodes = async (nextList, successMsg) => {
    setSavingQr(true);
    try {
      const res = await api.put('/settings/qr-codes', {
        payment_qr_codes: nextList,
      });
      const updated = Array.isArray(res?.data?.payment_qr_codes)
        ? res.data.payment_qr_codes
        : nextList;
      setQrCodes(updated);
      toast.success(
        successMsg ||
          res?.data?.message ||
          'Payment QR code saved automatically.'
      );
      return true;
    } catch (err) {
      toast.error(err?.message || 'Unable to auto-save payment QR code.');
      return false;
    } finally {
      setSavingQr(false);
    }
  };

  const handleQrFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_QR_MIME.has(file.type) || file.size > MAX_QR_FILE_BYTES) {
      setQrError(
        'Please upload a valid PNG, JPG, or WEBP QR image under 2 MB.'
      );
      setQrImageData('');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setQrImageData(String(reader.result || ''));
      setQrError('');
    };
    reader.readAsDataURL(file);
  };

  const handleAddAndAutoSaveQr = async (e) => {
    e.preventDefault();
    const provider = qrProvider.trim();
    const account = qrAccount.trim();

    if (provider.length < 2 || provider.length > 40) {
      setQrError(
        'Please enter a wallet/bank provider name (2 to 40 characters).'
      );
      return;
    }
    if (account.length > 80) {
      setQrError('Account name cannot exceed 80 characters.');
      return;
    }
    if (!qrImageData) {
      setQrError(
        'Please upload a valid PNG, JPG, or WEBP QR image under 2 MB.'
      );
      return;
    }

    setQrError('');
    const nextList = [
      ...qrCodes,
      {
        id: `qr-${Date.now()}`,
        provider_name: provider,
        account_name: account || null,
        image_data: qrImageData,
      },
    ];

    const ok = await persistQrCodes(
      nextList,
      'Payment QR code saved automatically.'
    );
    if (ok) {
      setQrProvider('');
      setQrAccount('');
      setQrImageData('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteQr = async (qrId, providerName) => {
    const nextList = qrCodes.filter((q) => q.id !== qrId);
    await persistQrCodes(
      nextList,
      `Removed ${providerName} QR code and saved automatically.`
    );
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-5">
          <Skeleton className="h-80 rounded-xl" />
          <Skeleton className="h-52 rounded-xl" />
        </div>
        <Skeleton className="h-[460px] rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        {/* Left 2 Columns: Gym Profile, Receipt Customizer & Discount Tiers */}
        <div className="xl:col-span-2 space-y-6">
          <form
            onSubmit={handleSaveProfileAndDiscounts}
            className="card-metallic rounded-xl p-6 space-y-5"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-silver-border pb-4">
              <div>
                <h2 className="text-base font-bold text-obsidian-black">
                  Gym Profile &amp; 80mm Receipt Customizer
                </h2>
                <p className="text-xs text-steel-gray">
                  Displayed on every 80mm BIR VAT-inclusive thermal receipt and recovery card.
                </p>
              </div>
              <Button
                type="submit"
                variant="primary"
                loading={savingProfile}
                leftIcon="check"
              >
                Save Settings
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Gym Name"
                required
                value={profile.gym_name}
                onChange={(e) =>
                  setProfile((prev) => ({ ...prev, gym_name: e.target.value }))
                }
                error={profileErrors.gym_name}
              />
              <Input
                label="Contact Phone"
                required
                mono
                value={profile.phone}
                onChange={(e) =>
                  setProfile((prev) => ({ ...prev, phone: e.target.value }))
                }
                error={profileErrors.phone}
              />
            </div>

            <Input
              label="Gym Street Address"
              required
              value={profile.address}
              onChange={(e) =>
                setProfile((prev) => ({ ...prev, address: e.target.value }))
              }
              error={profileErrors.address}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="BIR VAT Reg TIN (Optional)"
                mono
                value={profile.tin_number}
                onChange={(e) =>
                  setProfile((prev) => ({ ...prev, tin_number: e.target.value }))
                }
                placeholder="123-456-789-000"
                error={profileErrors.tin_number}
              />
              <Input
                label="Inclusive Tax / VAT Rate (%)"
                type="number"
                step="0.01"
                min="0"
                max="50"
                mono
                required
                value={profile.tax_rate_pct}
                onChange={(e) =>
                  setProfile((prev) => ({
                    ...prev,
                    tax_rate_pct: e.target.value,
                  }))
                }
                error={profileErrors.tax_rate_pct}
                helperText="Standard Philippine BIR VAT is 12%."
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Receipt Header Line (Optional)"
                maxLength={200}
                value={profile.receipt_header}
                onChange={(e) =>
                  setProfile((prev) => ({
                    ...prev,
                    receipt_header: e.target.value,
                  }))
                }
                placeholder="Forged in Iron. Built for Speed."
                error={profileErrors.receipt_header}
              />
              <Input
                label="Receipt Footer Message (Optional)"
                maxLength={200}
                value={profile.receipt_footer}
                onChange={(e) =>
                  setProfile((prev) => ({
                    ...prev,
                    receipt_footer: e.target.value,
                  }))
                }
                placeholder="Keep your receipt or QR pass to sign in!"
                error={profileErrors.receipt_footer}
              />
            </div>
          </form>

          {/* Configurable Discount Tiers Manager */}
          <section className="card-metallic rounded-xl p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-bold text-obsidian-black">
                  Preset Checkout Discount Tiers
                </h3>
                <p className="text-xs text-steel-gray">
                  Appear as 1-tap discount pills inside the Payment Modal. Click{' '}
                  <strong>Save Settings</strong> above after modifying tiers.
                </p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                loading={savingProfile}
                leftIcon="check"
                onClick={handleSaveProfileAndDiscounts}
              >
                Save Tiers
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end">
              <div className="sm:col-span-6">
                <Input
                  label="Tier Name"
                  value={newTierName}
                  onChange={(e) => setNewTierName(e.target.value)}
                  placeholder="e.g., Student 10%"
                />
              </div>
              <div className="sm:col-span-3">
                <Input
                  label="Discount (%)"
                  type="number"
                  min="1"
                  max="100"
                  step="1"
                  mono
                  value={newTierPct}
                  onChange={(e) => setNewTierPct(e.target.value)}
                  placeholder="10"
                />
              </div>
              <div className="sm:col-span-3">
                <Button
                  variant="primary"
                  fullWidth
                  leftIcon="plus"
                  onClick={handleAddDiscountTier}
                >
                  Add Tier
                </Button>
              </div>
            </div>

            {tierError ? (
              <p role="alert" className="text-xs font-medium text-red-600">
                {tierError}
              </p>
            ) : null}

            <div className="divide-y divide-silver-border/70 rounded-xl border border-silver-border overflow-hidden">
              {discountTiers.length === 0 ? (
                <p className="p-4 text-xs text-steel-gray text-center">
                  No preset discount tiers configured yet.
                </p>
              ) : (
                discountTiers.map((tier) => (
                  <div
                    key={tier.id}
                    className="px-4 py-3 bg-pure-white flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Badge
                        status={tier.is_active !== false ? 'ACTIVE' : 'INACTIVE'}
                        dot
                      />
                      <span className="text-sm font-semibold text-obsidian-black truncate">
                        {tier.name}
                      </span>
                      <span className="font-mono tabular-nums text-xs font-bold text-royal-blue-dark bg-royal-blue-light/60 px-2 py-0.5 rounded">
                        {tier.pct}% OFF
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleToggleTier(tier.id)}
                      >
                        {tier.is_active !== false ? 'Disable' : 'Enable'}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        leftIcon="trash"
                        onClick={() => handleDeleteTier(tier.id)}
                        className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Multi-Provider Merchant Payment QR Codes (Instant Auto-Save) */}
          <section className="card-metallic rounded-xl p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-bold text-obsidian-black">
                  Merchant Payment QR Codes (GCash / Maya)
                </h3>
                <p className="text-xs text-steel-gray">
                  Uploading or deleting a QR code <strong>auto-saves immediately</strong> and appears live in Front-Desk Checkout.
                </p>
              </div>
              <Badge variant="royal">Auto-Save Enabled</Badge>
            </div>

            <form
              onSubmit={handleAddAndAutoSaveQr}
              className="rounded-xl border border-silver-border bg-silver-canvas/40 p-4 space-y-3"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="Wallet / Bank Provider"
                  required
                  value={qrProvider}
                  onChange={(e) => setQrProvider(e.target.value)}
                  placeholder="e.g., GCash, Maya, BPI QR"
                />
                <Input
                  label="Account Name (Optional)"
                  value={qrAccount}
                  onChange={(e) => setQrAccount(e.target.value)}
                  placeholder="e.g., Mad Max Gym Inc."
                />
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gunmetal-gray mb-1">
                    QR Code Image (PNG, JPG, WEBP &le; 2 MB){' '}
                    <span className="text-red-600">*</span>
                  </label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={handleQrFileChange}
                    className="block w-full text-xs text-steel-gray file:mr-3 file:rounded-lg file:border-0 file:bg-obsidian-black file:px-3 file:py-2 file:text-xs file:font-semibold file:text-pure-white hover:file:bg-carbon-black"
                  />
                </div>
                <Button
                  type="submit"
                  variant="primary"
                  loading={savingQr}
                  leftIcon="qr"
                >
                  Upload &amp; Auto-Save QR
                </Button>
              </div>

              {qrImageData ? (
                <div className="flex items-center gap-3 pt-1">
                  <img
                    src={qrImageData}
                    alt="QR preview"
                    className="h-16 w-16 rounded-lg border border-silver-border bg-pure-white object-contain p-1"
                  />
                  <span className="text-xs text-emerald-700 font-medium">
                    Image ready — click &ldquo;Upload &amp; Auto-Save QR&rdquo; to publish.
                  </span>
                </div>
              ) : null}

              {qrError ? (
                <p role="alert" className="text-xs font-medium text-red-600">
                  {qrError}
                </p>
              ) : null}
            </form>

            {/* Existing Uploaded QR Codes */}
            {qrCodes.length === 0 ? (
              <p className="text-xs text-steel-gray text-center py-4">
                No merchant QR codes uploaded yet.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {qrCodes.map((qr) => (
                  <div
                    key={qr.id}
                    className="rounded-xl border border-silver-border bg-pure-white p-3.5 flex items-center gap-3"
                  >
                    <img
                      src={qr.image_data}
                      alt={qr.provider_name}
                      className="h-16 w-16 rounded-lg border border-silver-border object-contain bg-pure-white p-1 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-obsidian-black truncate">
                        {qr.provider_name}
                      </p>
                      {qr.account_name ? (
                        <p className="text-xs text-steel-gray truncate">
                          {qr.account_name}
                        </p>
                      ) : null}
                      <button
                        type="button"
                        disabled={savingQr}
                        onClick={() => handleDeleteQr(qr.id, qr.provider_name)}
                        className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-rose-600 hover:text-rose-700"
                      >
                        <SvgIcon name="trash" size={13} />
                        <span>Remove</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Right Column: Live 80mm 12% VAT-Inclusive Receipt Preview */}
        <aside className="card-metallic rounded-xl p-5 space-y-4 sticky top-20">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-obsidian-black">
                Live 80mm Receipt Preview
              </h3>
              <p className="text-xs text-steel-gray">
                Updates live as you edit gym profile &amp; VAT rate
              </p>
            </div>
            <Badge variant="gunmetal" mono>
              80mm
            </Badge>
          </div>

          <div className="mx-auto w-full max-w-[290px] rounded-xl border border-silver-border bg-pure-white p-4 font-mono text-[11px] leading-snug text-obsidian-black shadow-sm">
            <div className="text-center space-y-1">
              <img
                src={madMaxBadge}
                alt="Mad Max Gym Seal"
                className="mx-auto h-10 w-10 object-contain mb-1"
              />
              <p className="text-xs font-extrabold uppercase">
                {profile.gym_name || 'MAD MAX GYM'}
              </p>
              <p className="text-[10px] text-gunmetal-gray">
                {profile.address || 'Gym Street Address'}
              </p>
              <p className="text-[10px] text-gunmetal-gray">
                Tel: {profile.phone || '+63 917 555 0199'}
              </p>
              {profile.tin_number ? (
                <p className="text-[10px] font-semibold">
                  VAT Reg TIN: {profile.tin_number}
                </p>
              ) : null}
              {profile.receipt_header ? (
                <p className="text-[10px] italic text-steel-gray">
                  {profile.receipt_header}
                </p>
              ) : null}
            </div>

            <div className="my-2.5 border-t border-dashed border-gunmetal-gray/60" />

            <div className="space-y-1 text-[10px] tabular-nums">
              <div className="flex justify-between">
                <span>Invoice #:</span>
                <span className="font-bold">INV-20261121-0001</span>
              </div>
              <div className="flex justify-between">
                <span>Member:</span>
                <span className="font-bold">MEM-2026-0001</span>
              </div>
            </div>

            <div className="my-2.5 border-t border-dashed border-gunmetal-gray/60" />

            <div className="space-y-1 tabular-nums">
              <div className="flex justify-between font-bold">
                <span>Monthly Unlimited Iron</span>
                <span>{formatPHP(sampleReceipt.sampleTotal)}</span>
              </div>
              <div className="flex justify-between text-[10px] text-steel-gray">
                <span>Vatable Sales (Net):</span>
                <span>{formatPHP(sampleReceipt.netBase)}</span>
              </div>
              <div className="flex justify-between text-[10px] text-steel-gray">
                <span>{sampleReceipt.rate}% Inclusive VAT:</span>
                <span>{formatPHP(sampleReceipt.vatAmount)}</span>
              </div>
              <div className="pt-1.5 mt-1 border-t border-obsidian-black flex justify-between text-xs font-extrabold">
                <span>TOTAL:</span>
                <span>{formatPHP(sampleReceipt.sampleTotal)}</span>
              </div>
            </div>

            <div className="my-2.5 border-t border-dashed border-gunmetal-gray/60 text-center pt-2">
              <p className="text-[10px] leading-relaxed text-gunmetal-gray">
                {profile.receipt_footer ||
                  'MAD MAX GYM • Keep your receipt or QR pass to sign in at the front desk kiosk!'}
              </p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
