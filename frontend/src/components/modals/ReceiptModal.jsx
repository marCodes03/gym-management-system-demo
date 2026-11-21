import Modal from './Modal';
import Button from '../common/Button';
import QrCodeSvg from '../common/QrCodeSvg';
import madMaxBadge from '../../assets/mad-max-badge.svg';
import { formatDate, formatDateTime, formatPHP } from '../../utils/formatters';

const PAYMENT_METHOD_LABELS = {
  CASH: 'Cash',
  DIGITAL_WALLET: 'QR Digital Wallet',
  CARD: 'Card',
};

/**
 * Mad Max Gym — 80mm ESC/POS Thermal Receipt Modal
 * Renders 12% Philippine BIR VAT-inclusive breakdown + embedded Member QR Pass.
 */
export default function ReceiptModal({ isOpen, onClose, receiptData }) {
  if (!receiptData || !receiptData.payment) return null;

  const {
    payment,
    member = {},
    subscription = {},
    cashier = {},
    store_settings: settings = {},
  } = receiptData;

  const isVoided = payment.status_code === 'VOIDED';
  const taxRate = Number(settings.tax_rate_pct ?? 12);
  const planGross = Number(payment.total_amount) + Number(payment.discount_amount || 0);
  const methodLabel =
    payment.payment_method_name ||
    PAYMENT_METHOD_LABELS[payment.payment_method_code] ||
    payment.payment_method_code;

  const handlePrint = () => {
    window.print();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="80mm Thermal Receipt"
      subtitle={`Invoice ${payment.invoice_number} • BIR ${taxRate}% VAT-Inclusive Official Receipt`}
      size="sm"
      printMode="receipt-80mm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
          <Button variant="primary" leftIcon="printer" onClick={handlePrint}>
            Print Thermal Receipt
          </Button>
        </>
      }
    >
      {/* Authentic 80mm Thermal Paper Container */}
      <div className="mx-auto w-full max-w-[310px] rounded-xl border border-silver-border bg-pure-white p-4 font-mono text-[12px] leading-snug text-obsidian-black shadow-sm print:max-w-none print:border-0 print:rounded-none print:shadow-none print:p-0">
        {/* Gym Header */}
        <div className="text-center space-y-1">
          <img
            src={madMaxBadge}
            alt={settings.gym_name || 'Mad Max Gym'}
            className="mx-auto h-11 w-11 object-contain mb-1"
          />
          <p className="text-sm font-extrabold uppercase tracking-wide">
            {settings.gym_name || 'Mad Max Gym'}
          </p>
          {settings.address ? (
            <p className="text-[11px] text-gunmetal-gray print:text-black">
              {settings.address}
            </p>
          ) : null}
          {settings.phone ? (
            <p className="text-[11px] text-gunmetal-gray print:text-black">
              Tel: {settings.phone}
            </p>
          ) : null}
          {settings.tin_number ? (
            <p className="text-[11px] font-semibold">
              VAT Reg TIN: {settings.tin_number}
            </p>
          ) : null}
          {settings.receipt_header ? (
            <p className="text-[10px] italic text-steel-gray print:text-black pt-0.5">
              {settings.receipt_header}
            </p>
          ) : null}
        </div>

        {/* Voided Stamp */}
        {isVoided ? (
          <div className="my-2.5 border-2 border-rose-600 bg-rose-50 px-2 py-1.5 text-center print:border-black print:bg-white">
            <p className="text-xs font-extrabold uppercase tracking-widest text-rose-700 print:text-black">
              *** VOIDED RECEIPT ***
            </p>
            {payment.void_reason ? (
              <p className="text-[10px] text-rose-700 print:text-black mt-0.5">
                Reason: {payment.void_reason}
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="my-2.5 border-t border-dashed border-gunmetal-gray/60" />

        {/* Invoice Metadata */}
        <div className="space-y-1 text-[11px]">
          <div className="flex justify-between gap-2">
            <span className="text-steel-gray print:text-black">Invoice #:</span>
            <span className="font-bold tabular-nums">{payment.invoice_number}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-steel-gray print:text-black">Date/Time:</span>
            <span className="tabular-nums">{formatDateTime(payment.created_at)}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-steel-gray print:text-black">Cashier:</span>
            <span className="truncate max-w-[170px]">{cashier.name || 'Staff'}</span>
          </div>
        </div>

        <div className="my-2.5 border-t border-dashed border-gunmetal-gray/60" />

        {/* Member Details */}
        <div className="space-y-1 text-[11px]">
          <div className="flex justify-between gap-2">
            <span className="text-steel-gray print:text-black">Member:</span>
            <span className="font-bold truncate max-w-[180px]">{member.name || '—'}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-steel-gray print:text-black">Member ID:</span>
            <span className="font-bold tabular-nums">{member.member_code || '—'}</span>
          </div>
          {member.phone ? (
            <div className="flex justify-between gap-2">
              <span className="text-steel-gray print:text-black">Phone:</span>
              <span className="tabular-nums">{member.phone}</span>
            </div>
          ) : null}
        </div>

        <div className="my-2.5 border-t border-dashed border-gunmetal-gray/60" />

        {/* Purchased Plan & Validity */}
        <div className="space-y-1 text-[11px]">
          <div className="flex justify-between gap-2 font-bold">
            <span className="truncate max-w-[185px]">
              {payment.plan_name_snapshot || subscription.plan_name || 'Membership Plan'}
            </span>
            <span className="tabular-nums">{formatPHP(planGross)}</span>
          </div>
          {subscription.start_date || subscription.end_date ? (
            <p className="text-[10px] text-steel-gray print:text-black">
              Valid: {formatDate(subscription.start_date)} – {formatDate(subscription.end_date)}
            </p>
          ) : null}
          {subscription.total_sessions ? (
            <p className="text-[10px] text-steel-gray print:text-black">
              Visit Pack: {subscription.remaining_sessions ?? subscription.total_sessions} /{' '}
              {subscription.total_sessions} visit(s) remaining
            </p>
          ) : null}
        </div>

        <div className="my-2.5 border-t border-dashed border-gunmetal-gray/60" />

        {/* 12% BIR VAT-Inclusive Breakdown */}
        <div className="space-y-1 text-[11px] tabular-nums">
          {Number(payment.discount_amount) > 0 ? (
            <div className="flex justify-between gap-2">
              <span>Discount ({Number(payment.discount_pct || 0)}%):</span>
              <span>-{formatPHP(payment.discount_amount)}</span>
            </div>
          ) : null}
          <div className="flex justify-between gap-2">
            <span>Vatable Sales (Net):</span>
            <span>{formatPHP(payment.subtotal_amount)}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span>VAT ({taxRate}% Incl.):</span>
            <span>{formatPHP(payment.tax_amount)}</span>
          </div>
          <div className="pt-1.5 mt-1 border-t border-obsidian-black flex justify-between gap-2 text-sm font-extrabold">
            <span>TOTAL PAYABLE:</span>
            <span>{formatPHP(payment.total_amount)}</span>
          </div>
        </div>

        <div className="my-2.5 border-t border-dashed border-gunmetal-gray/60" />

        {/* Tender & Change */}
        <div className="space-y-1 text-[11px] tabular-nums">
          <div className="flex justify-between gap-2">
            <span>Payment Method:</span>
            <span className="font-semibold">{methodLabel}</span>
          </div>
          {payment.payment_ref ? (
            <div className="flex justify-between gap-2">
              <span>Reference #:</span>
              <span className="truncate max-w-[165px]">{payment.payment_ref}</span>
            </div>
          ) : null}
          <div className="flex justify-between gap-2">
            <span>Amount Tendered:</span>
            <span>{formatPHP(payment.amount_tendered)}</span>
          </div>
          <div className="flex justify-between gap-2 font-bold">
            <span>Change:</span>
            <span>{formatPHP(payment.change_amount)}</span>
          </div>
        </div>

        <div className="my-2.5 border-t border-dashed border-gunmetal-gray/60" />

        {/* Scannable Member QR Pass Embedded on Receipt */}
        {member.member_code ? (
          <div className="flex flex-col items-center text-center py-1">
            <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5">
              Fast Kiosk Sign-In QR Pass
            </p>
            <div className="p-1.5 bg-pure-white border border-silver-border rounded-lg print:border-black">
              <QrCodeSvg
                value={member.member_code}
                size={112}
                fgColor="#000000"
                bgColor="#FFFFFF"
                label={`Kiosk QR Pass for ${member.member_code}`}
              />
            </div>
            <p className="mt-1 text-[11px] font-bold tracking-wider">
              {member.member_code}
            </p>
          </div>
        ) : null}

        {/* Receipt Footer */}
        <div className="mt-2.5 pt-2 border-t border-dashed border-gunmetal-gray/60 text-center space-y-1">
          <p className="text-[10px] leading-relaxed">
            {settings.receipt_footer ||
              'MAD MAX GYM • Keep your receipt or QR pass to sign in at the front desk kiosk!'}
          </p>
          <p className="text-[9px] text-steel-gray print:text-black">
            THIS SERVES AS YOUR OFFICIAL RECEIPT
          </p>
        </div>
      </div>
    </Modal>
  );
}
