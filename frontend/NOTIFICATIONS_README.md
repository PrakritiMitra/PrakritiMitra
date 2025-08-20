# Notification System - Replacing Alert() and Confirm()

This document explains how to use the new notification system to replace basic browser `alert()` and `confirm()` calls with modern, styled notifications.

## 🚀 Quick Start

### 1. Import the notification utilities

```jsx
import { showAlert, showConfirm } from '../utils/notifications';
```

### 2. Replace alert() calls

**Before (Old way):**
```jsx
alert('Something went wrong!');
```

**After (New way):**
```jsx
// Simple info message
showAlert.info('Something went wrong!');

// Success message
showAlert.success('Event created successfully!');

// Warning message
showAlert.warning('Please check your input');

// Error message
showAlert.error('Failed to save changes');

// Generic message with type
showAlert.message('Operation completed', 'success');
```

### 3. Replace confirm() calls

**Before (Old way):**
```jsx
if (confirm('Are you sure you want to delete this event?')) {
  deleteEvent();
}
```

**After (New way):**
```jsx
showConfirm.action(
  'Are you sure you want to delete this event?',
  () => deleteEvent(),
  {
    title: 'Delete Event',
    confirmText: 'Delete',
    cancelText: 'Cancel',
    type: 'danger'
  }
);
```

## 📚 Available Functions

### Toast Notifications (showAlert)

| Function | Description | Auto-close | Use Case |
|----------|-------------|------------|----------|
| `showAlert.info(message)` | Blue info toast | 3s | General information |
| `showAlert.success(message)` | Green success toast | 3s | Success messages |
| `showAlert.warning(message)` | Yellow warning toast | 3.5s | Warnings |
| `showAlert.error(message)` | Red error toast | 4s | Error messages |
| `showAlert.message(message, type)` | Generic toast with type | 3-4s | Custom type |

### Confirmation Modals (showConfirm)

| Function | Description | Button Style | Use Case |
|----------|-------------|--------------|----------|
| `showConfirm.action(message, onConfirm, options)` | Default confirmation | Blue | General confirmations |
| `showConfirm.danger(message, onConfirm, options)` | Dangerous action | Red | Delete, remove actions |
| `showConfirm.warning(message, onConfirm, options)` | Warning action | Yellow | Risky operations |
| `showConfirm.info(message, onConfirm, options)` | Info confirmation | Blue | Information confirmations |

## 🎨 Customization Options

### Confirmation Modal Options

```jsx
showConfirm.action(
  'Are you sure?',
  () => console.log('Confirmed!'),
  {
    title: 'Custom Title',           // Modal title
    confirmText: 'Yes, Proceed',     // Confirm button text
    cancelText: 'No, Cancel',        // Cancel button text
    type: 'danger',                  // 'default', 'danger', 'warning', 'info'
    icon: <CustomIcon />             // Custom icon component
  }
);
```

### Toast Customization

```jsx
showAlert.success('Success!', {
  autoClose: 5000,           // Custom auto-close time
  position: 'top-center',     // Custom position
  hideProgressBar: true       // Hide progress bar
});
```

## 🔄 Migration Examples

### Example 1: Simple Alert

**Before:**
```jsx
alert('Please fill in all required fields');
```

**After:**
```jsx
showAlert.warning('Please fill in all required fields');
```

### Example 2: Success Message

**Before:**
```jsx
alert('Event saved successfully!');
```

**After:**
```jsx
showAlert.success('Event saved successfully!');
```

### Example 3: Confirmation Dialog

**Before:**
```jsx
if (confirm('Do you want to leave this page? Unsaved changes will be lost.')) {
  navigate('/dashboard');
}
```

**After:**
```jsx
showConfirm.warning(
  'Do you want to leave this page? Unsaved changes will be lost.',
  () => navigate('/dashboard'),
  {
    title: 'Leave Page',
    confirmText: 'Leave',
    cancelText: 'Stay',
    type: 'warning'
  }
);
```

### Example 4: Dangerous Action

**Before:**
```jsx
if (confirm('This action cannot be undone. Are you sure?')) {
  deleteAccount();
}
```

**After:**
```jsx
showConfirm.danger(
  'This action cannot be undone. Are you sure?',
  deleteAccount,
  {
    title: 'Delete Account',
    confirmText: 'Delete',
    cancelText: 'Cancel',
    type: 'danger'
  }
);
```

## 🎯 Best Practices

### 1. Choose the Right Type
- **Info**: General information, updates
- **Success**: Completed actions, achievements
- **Warning**: Potential issues, user attention needed
- **Error**: Something went wrong, user action required

### 2. Message Length
- Keep messages concise (under 100 characters)
- Use clear, action-oriented language
- Avoid technical jargon

### 3. Confirmation Modals
- Use for destructive actions (delete, remove, logout)
- Use for actions that can't be undone
- Use for actions that affect multiple items

### 4. Toast Notifications
- Use for immediate feedback
- Use for non-critical information
- Use for status updates

## 🚫 What NOT to Do

### ❌ Don't use alert() or confirm()
```jsx
// ❌ Bad - Old browser dialogs
alert('Error occurred');
if (confirm('Continue?')) { ... }

// ✅ Good - Modern notifications
showAlert.error('Error occurred');
showConfirm.action('Continue?', () => { ... });
```

### ❌ Don't show too many toasts
```jsx
// ❌ Bad - Spamming user with notifications
showAlert.info('Step 1 completed');
showAlert.info('Step 2 completed');
showAlert.info('Step 3 completed');

// ✅ Good - Batch or summarize
showAlert.success('All steps completed successfully!');
```

### ❌ Don't use confirm() for simple info
```jsx
// ❌ Bad - Confirmation for info
showConfirm.info('Your profile has been updated');

// ✅ Good - Toast for info
showAlert.success('Your profile has been updated');
```

## 🔧 Advanced Usage

### Custom Toast Styling
```jsx
showAlert.success('Custom styled toast', {
  style: {
    background: '#8B5CF6',
    color: 'white',
    fontWeight: 'bold'
  }
});
```

### Custom Modal Icons
```jsx
import { TrashIcon } from '@heroicons/react/24/outline';

showConfirm.danger(
  'Delete this item?',
  deleteItem,
  {
    icon: <TrashIcon className="w-6 h-6 text-red-600" />
  }
);
```

### Chaining Notifications
```jsx
const handleSave = async () => {
  try {
    await saveEvent();
    showAlert.success('Event saved successfully!');
  } catch (error) {
    showAlert.error('Failed to save event');
  }
};
```

## 📱 Responsive Behavior

- **Toast notifications**: Automatically adjust to screen size
- **Confirmation modals**: Responsive design with mobile-first approach
- **Touch-friendly**: Optimized for both desktop and mobile devices

## 🎨 Theme Integration

The notification system automatically integrates with your existing design:
- Uses your app's color scheme
- Follows Material-UI design principles
- Consistent with Tailwind CSS classes
- Responsive breakpoints for all screen sizes

## 🚀 Next Steps

1. **Start migrating** one page at a time
2. **Test thoroughly** on different devices
3. **Update user feedback** based on new notifications
4. **Customize** colors and styling as needed

## 📞 Support

If you need help migrating specific pages or have questions about the notification system, refer to the examples above or ask for assistance with specific use cases.
