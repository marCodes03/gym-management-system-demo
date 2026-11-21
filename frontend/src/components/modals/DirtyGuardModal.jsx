import Modal from './Modal';
import Button from '../common/Button';
import SvgIcon from '../common/SvgIcon';

/**
 * Unsaved Changes Guard Confirmation Modal.
 * Triggered automatically by Drawer when closing while `isDirty === true`.
 */
export default function DirtyGuardModal({
  isOpen,
  onKeepEditing,
  onDiscard,
}) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onKeepEditing}
      title="Unsaved Changes"
      subtitle="Your form contains modifications that have not been saved yet."
      size="sm"
      zIndexClass="z-[70]"
      closeOnBackdrop={false}
      footer={
        <>
          <Button variant="secondary" onClick={onKeepEditing}>
            Keep Editing
          </Button>
          <Button variant="danger" onClick={onDiscard}>
            Discard Changes
          </Button>
        </>
      }
    >
      <div className="flex items-start gap-3.5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 border border-amber-200 text-amber-700">
          <SvgIcon name="alert-triangle" size={20} />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium text-obsidian-black">
            You have unsaved changes. Are you sure you want to discard them?
          </p>
          <p className="text-xs text-steel-gray leading-relaxed">
            Any edits made inside this drawer will be permanently lost if you close without saving.
          </p>
        </div>
      </div>
    </Modal>
  );
}
