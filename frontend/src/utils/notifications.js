import { showToast } from '../components/common/ToastContainer';

// Replace alert() calls with toast notifications
export const showAlert = {
  // Simple info message
  info: (message) => {
    showToast.info(message);
  },
  
  // Success message
  success: (message) => {
    showToast.success(message);
  },
  
  // Warning message
  warning: (message) => {
    showToast.warning(message);
  },
  
  // Error message
  error: (message) => {
    showToast.error(message);
  },
  
  // Generic alert (defaults to info)
  message: (message, type = 'info') => {
    switch (type) {
      case 'success':
        showToast.success(message);
        break;
      case 'warning':
        showToast.warning(message);
        break;
      case 'error':
        showToast.error(message);
        break;
      default:
        showToast.info(message);
    }
  }
};

// Replace confirm() calls with confirmation modals
export const showConfirm = {
  // Default confirmation
  action: (message, onConfirm, options = {}) => {
    const {
      title = "Confirm Action",
      confirmText = "Confirm",
      cancelText = "Cancel",
      type = "default",
      icon = null
    } = options;
    
    // For now, we'll use a simple confirm() but this will be replaced
    // with the ConfirmationModal component when we implement it in pages
    if (window.confirm(message)) {
      onConfirm();
    }
  },
  
  // Dangerous action confirmation
  danger: (message, onConfirm, options = {}) => {
    showConfirm.action(message, onConfirm, {
      ...options,
      title: options.title || "Confirm Dangerous Action",
      type: "danger"
    });
  },
  
  // Warning confirmation
  warning: (message, onConfirm, options = {}) => {
    showConfirm.action(message, onConfirm, {
      ...options,
      title: options.title || "Confirm Action",
      type: "warning"
    });
  },
  
  // Info confirmation
  info: (message, onConfirm, options = {}) => {
    showConfirm.action(message, onConfirm, {
      ...options,
      title: options.title || "Confirm Action",
      type: "info"
    });
  }
};

// Legacy support - direct replacements for alert() and confirm()
export const alert = showAlert.message;
export const confirm = showConfirm.action;

// Export toast functions for direct use
export { showToast };
