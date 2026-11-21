import Modal from './Modal';
import Button from '../common/Button';
import Badge from '../common/Badge';
import QrCodeSvg from '../common/QrCodeSvg';
import madMaxLogo from '../../assets/mad-max-logo.svg';
import madMaxBadge from '../../assets/mad-max-badge.svg';
import { formatDate } from '../../utils/formatters';

/**
 * Mad Max Gym — Printable Member QR Pass Card Modal
 * Uses @media print isolation (printMode="qr-pass") so only the pass card prints.
 */
export default function MemberPassModal({ isOpen, onClose, member }) {
  if (!member) return null;

  const statusCode =
    member.computed_status ||
    member.subscription_status ||
    member.latest_subscription?.status_code ||
    'NO_PLAN';

  const planName =
    member.plan_name ||
    member.latest_subscription?.plan_name ||
    'No Active Plan';

  const endDate =
    member.end_date || member.latest_subscription?.end_date || null;

  const remainingSessions =
    member.remaining_sessions ??
    member.latest_subscription?.remaining_sessions ??
    null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Member QR Pass Card"
      subtitle="Scan this pass at the Mad Max Gym Self-Service Kiosk for 2-second sign-in."
      size="sm"
      printMode="qr-pass"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
          <Button variant="primary" leftIcon="printer" onClick={handlePrint}>
            Print QR Pass
          </Button>
        </>
      }
    >
      {/* Printable Official Member Pass Card */}
      <div className="mx-auto w-full max-w-[340px] rounded-2xl overflow-hidden border-2 border-obsidian-black bg-pure-white shadow-floating print:shadow-none">
        {/* Obsidian Black & Royal Blue Crest Header */}
        <div className="bg-obsidian-black px-5 py-4 border-b-4 border-royal-blue flex items-center justify-between gap-3">
          <img
            src={madMaxLogo}
            alt="Mad Max Gym"
            className="h-9 w-auto object-contain select-none"
          />
          <img
            src={madMaxBadge}
            alt="Verified Official Member Pass"
            className="h-12 w-12 shrink-0 object-contain select-none"
          />
        </div>

        {/* Member Identity + QR Matrix */}
        <div className="px-5 py-5 flex flex-col items-center text-center bg-gradient-to-b from-pure-white to-silver-canvas/40">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-royal-blue">
            Official Athlete Pass
          </p>
          <h3 className="mt-1 text-xl font-bold tracking-tight text-obsidian-black leading-tight">
            {member.name}
          </h3>
          <p className="mt-1 font-mono tabular-nums text-sm font-bold tracking-wider text-royal-blue-dark bg-royal-blue-light/70 border border-royal-blue/25 px-3 py-1 rounded-full">
            {member.member_code}
          </p>

          {/* Crisp Zero-Dependency Scannable SVG QR Code */}
          <div className="mt-4 p-3 rounded-xl bg-pure-white border-2 border-royal-blue/80 shadow-sm">
            <QrCodeSvg
              value={member.member_code}
              size={168}
              fgColor="#0B0D11"
              bgColor="#FFFFFF"
              label={`QR Pass for ${member.member_code}`}
            />
          </div>

          <p className="mt-2.5 text-[11px] font-medium text-steel-gray">
            Present QR code or enter{' '}
            <span className="font-mono font-semibold text-obsidian-black">
              {member.member_code}
            </span>{' '}
            at Kiosk
          </p>

          {/* Membership Summary Strip */}
          <div className="mt-4 w-full rounded-xl border border-silver-border bg-pure-white px-3.5 py-2.5 text-left space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] uppercase tracking-wider font-semibold text-steel-gray">
                Status
              </span>
              <Badge status={statusCode} dot />
            </div>
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="text-steel-gray">Plan</span>
              <span className="font-semibold text-obsidian-black truncate max-w-[190px]">
                {planName}
              </span>
            </div>
            {remainingSessions !== null ? (
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="text-steel-gray">Visits Left</span>
                <span className="font-mono tabular-nums font-bold text-royal-blue-dark">
                  {remainingSessions} visit(s)
                </span>
              </div>
            ) : null}
            {endDate ? (
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="text-steel-gray">Valid Until</span>
                <span className="font-mono tabular-nums font-semibold text-obsidian-black">
                  {formatDate(endDate)}
                </span>
              </div>
            ) : null}
            {member.phone ? (
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="text-steel-gray">Phone</span>
                <span className="font-mono tabular-nums text-gunmetal-gray">
                  {member.phone}
                </span>
              </div>
            ) : null}
          </div>
        </div>

        {/* Footer Tagline */}
        <div className="bg-obsidian-black px-4 py-2 text-center">
          <p className="text-[10px] font-mono uppercase tracking-widest text-silver-gray">
            Forged in Iron • Built for Speed
          </p>
        </div>
      </div>
    </Modal>
  );
}
