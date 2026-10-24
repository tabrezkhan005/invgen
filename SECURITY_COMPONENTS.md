# Security Components Documentation

This document describes the security-related UI components designed to prevent accidental data loss while maintaining a simple, user-friendly interface.

## Components Overview

### 1. AdminPinModal
Enhanced PIN entry modal with numeric keypad and clear feedback.

**Features:**
- Numeric keypad for touch-friendly input
- Visual PIN entry dots (● ● ● ● ● ●)
- Keyboard support (numbers, backspace, enter, escape)
- Attempt tracking and rate limiting
- Clear error feedback
- Session duration information

**Usage:**
```tsx
import AdminPinModal from './components/AdminPinModal';

const [showPinModal, setShowPinModal] = useState(false);

const handleVerify = async (pin: string) => {
  const result = await window.electronAPI.verifyAdminPin(pin);
  return result;
};

<AdminPinModal
  isOpen={showPinModal}
  onClose={() => setShowPinModal(false)}
  onVerify={handleVerify}
  title="Verify Admin PIN"
  description="Enter your PIN to continue"
  action="delete"
/>
```

### 2. DeleteInvoiceDialog
Context-aware confirmation dialog for invoice deletion.

**Features:**
- Displays complete invoice information
- Clear data loss warnings
- Shows customer name, date, items, and total
- Requires admin PIN verification
- Prevents accidental deletions

**Usage:**
```tsx
import DeleteInvoiceDialog from './components/DeleteInvoiceDialog';

const invoice = {
  id: 123,
  invoice_number: 'INV-2024-001',
  customer_name: 'John Doe',
  total: 299.99,
  date: '2024-01-15',
  item_count: 3
};

<DeleteInvoiceDialog
  isOpen={showDeleteDialog}
  invoice={invoice}
  onConfirm={handleDelete}
  onCancel={() => setShowDeleteDialog(false)}
/>
```

### 3. RestoreBackupDialog
Detailed confirmation dialog for database restoration.

**Features:**
- Shows backup file information
- Displays data statistics (invoices, customers)
- Clear warnings about data loss
- Shows restoration date and file size
- Explains app restart requirement
- Requires admin PIN verification

**Usage:**
```tsx
import RestoreBackupDialog from './components/RestoreBackupDialog';

const backup = {
  filename: 'backup_2024_01_15_143022.db',
  date: '2024-01-15T14:30:22Z',
  size: '2.4 MB',
  invoice_count: 145,
  customer_count: 67
};

<RestoreBackupDialog
  isOpen={showRestoreDialog}
  backup={backup}
  onConfirm={handleRestore}
  onCancel={() => setShowRestoreDialog(false)}
/>
```

### 4. ToastManager & NotificationToast
Non-blocking notification system.

**Features:**
- Auto-dismissing notifications
- Progress bar showing time remaining
- Optional action buttons
- Multiple notification types (success, warning, error, info)
- Stacked notifications with proper z-indexing
- Context provider for easy access throughout the app

**Usage:**
```tsx
import ToastManager, { useToast } from './components/ToastManager';

function App() {
  return (
    <ToastManager>
      <YourAppContent />
    </ToastManager>
  );
}

function YourComponent() {
  const toast = useToast();

  const handleSuccess = () => {
    toast.success('Success!', 'Operation completed successfully');
  };

  const handleWarning = () => {
    toast.warning('Warning', 'Please review your changes', {
      action: {
        label: 'Review',
        onClick: () => console.log('Review clicked')
      }
    });
  };

  return (
    <div>
      <button onClick={handleSuccess}>Show Success</button>
      <button onClick={handleWarning}>Show Warning</button>
    </div>
  );
}
```

## Security Patterns

### PIN Verification Flow
1. User initiates sensitive action
2. PIN modal appears with context-specific messaging
3. User enters PIN using keypad or keyboard
4. PIN is verified against stored hash
5. On success: action proceeds, session starts
6. On failure: error shown, attempts tracked

### Confirmation Dialog Flow
1. User clicks destructive action button
2. Context-specific confirmation dialog appears
3. Dialog shows what will be affected
4. Clear warnings about data loss
5. User must explicitly confirm
6. Action proceeds only after confirmation

### Toast Notification Flow
1. Background operation completes
2. Appropriate toast notification appears
3. User can dismiss or interact with action button
4. Toast auto-dismisses after 5 seconds
5. Multiple toasts stack appropriately

## Accessibility Considerations

### Keyboard Navigation
- All modals support keyboard navigation
- Tab order is logical and complete
- Escape key closes modals
- Enter key submits forms
- Focus management for screen readers

### Screen Reader Support
- ARIA labels and descriptions
- Semantic HTML structure
- Clear visual and textual feedback
- Progress indication for loading states

### Visual Design
- High contrast colors for text and icons
- Clear visual hierarchy
- Consistent spacing and typography
- Touch-friendly button sizes (44px minimum)

## Implementation Examples

### Invoice Deletion Flow
```tsx
// 1. User clicks delete button
const handleDeleteClick = () => {
  setSelectedInvoice(invoice);
  setShowDeleteDialog(true);
};

// 2. Dialog opens with PIN requirement
const handleDeleteConfirm = () => {
  setShowDeleteDialog(false);
  setShowPinModal(true);
  setPendingAction('delete-invoice');
};

// 3. PIN verified, action completes
const handlePinVerified = async () => {
  if (pendingAction === 'delete-invoice') {
    await deleteInvoice(selectedInvoice.id);
    toast.success('Invoice Deleted', 'Invoice has been permanently removed');
  }
};
```

### Backup Restoration Flow
```tsx
// 1. User selects backup
const handleBackupSelect = (backup) => {
  setSelectedBackup(backup);
  setShowRestoreDialog(true);
};

// 2. User confirms restoration
const handleRestoreConfirm = () => {
  setShowRestoreDialog(false);
  setShowPinModal(true);
  setPendingAction('restore-backup');
};

// 3. PIN verified, restoration begins
const handlePinVerified = async () => {
  if (pendingAction === 'restore-backup') {
    setLoading(true);
    await restoreFromBackup(selectedBackup.filename);
    toast.info('Restoring Backup', 'Application will restart automatically');
  }
};
```

## Error Handling

### PIN Verification Errors
- Invalid PIN: Clear error message, attempt counter
- Too many attempts: Temporary lockout, guidance to try later
- Network/server errors: Generic error with retry option

### Dialog Errors
- Missing required data: Validation messages
- Permission errors: Clear explanation of requirements
- System errors: User-friendly error messages

### Toast Errors
- Operation failures: Error toast with retry option
- System notifications: Info toasts for background events
- User guidance: Warning toasts with action buttons

## Testing Checklist

- [ ] PIN modal accepts numeric input only
- [ ] PIN modal shows correct number of dots
- [ ] PIN modal handles keyboard input
- [ ] Delete dialog shows correct invoice data
- [ ] Restore dialog displays backup information
- [ ] Confirmation dialogs require explicit user action
- [ ] Toast notifications auto-dismiss
- [ ] Toast notifications support actions
- [ ] All components work on mobile devices
- [ ] Keyboard navigation works throughout
- [ ] Screen readers can access all content
- [ ] High contrast mode supported
- [ ] Loading states are properly indicated

## Performance Considerations

- Modal components use React.lazy for code splitting
- Toast notifications are lightweight and auto-cleanup
- PIN verification includes rate limiting
- Dialog content is only rendered when visible
- Animations use CSS transforms for smooth performance













