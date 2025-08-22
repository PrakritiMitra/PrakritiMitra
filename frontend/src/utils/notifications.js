import toastNotification from './toastNotification';

// Create showAlert as both a function and an object with methods
export const showAlert = (message, type = 'info') => {
  // Handle function calls like showAlert(message)
  if (type === 'info') {
    toastNotification.show(message, 'info');
  } else {
    toastNotification.show(message, type);
  }
};

// Add methods to the showAlert function
showAlert.info = (message) => {
  toastNotification.show(message, 'info');
};

showAlert.success = (message) => {
  toastNotification.success(message);
};

showAlert.warning = (message) => {
  toastNotification.show(message, 'warning');
};

showAlert.error = (message) => {
  toastNotification.error(message);
};

showAlert.message = (message, type = 'info') => {
  switch (type) {
    case 'success':
      toastNotification.success(message);
      break;
    case 'warning':
      toastNotification.show(message, 'warning');
      break;
    case 'error':
      toastNotification.error(message);
      break;
    default:
      toastNotification.show(message, 'info');
  }
};

// Loading state support (simplified - just shows info message)
showAlert.loading = (message) => {
  toastNotification.show(message, 'info');
  // Return a simple ID for dismiss functionality
  return 'loading-' + Date.now();
};

// Dismiss functionality (simplified - just logs for now)
showAlert.dismiss = (toastId) => {
  console.log('Dismissing toast:', toastId);
  // In our simple system, we can't actually dismiss, but we can log it
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
    
    // Create a custom confirmation modal
    createConfirmationModal({
      message,
      onConfirm,
      title,
      confirmText,
      cancelText,
      type,
      icon
    });
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

// Function to create and show confirmation modal
function createConfirmationModal({
  message,
  onConfirm,
  title = "Confirm Action",
  confirmText = "Confirm",
  cancelText = "Cancel",
  type = "default",
  icon = null
}) {
  try {
    // Remove any existing modal first
    const existingModal = document.getElementById('confirmation-modal-container');
    if (existingModal) {
      existingModal.remove();
    }

    // Create new modal container
    const modalContainer = document.createElement('div');
    modalContainer.id = 'confirmation-modal-container';
    
    // Create modal HTML with unique IDs
    const uniqueId = Date.now();
    const modalHTML = `
      <div class="fixed inset-0 z-[9999] overflow-y-auto">
        <div class="flex min-h-screen items-center justify-center p-4 text-center sm:p-0">
          <!-- Backdrop -->
          <div class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" id="confirmation-backdrop-${uniqueId}"></div>
          
          <!-- Modal -->
          <div class="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
            <!-- Header -->
            <div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
              <div class="sm:flex sm:items-start">
                <div class="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-gray-100 sm:mx-0 sm:h-10 sm:w-10">
                  ${getIconHTML(type, icon)}
                </div>
                <div class="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
                  <h3 class="text-lg font-medium leading-6 text-gray-900">
                    ${title}
                  </h3>
                  <div class="mt-2">
                    <p class="text-sm text-gray-500">
                      ${message}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- Footer -->
            <div class="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
              <button
                type="button"
                class="inline-flex w-full justify-center rounded-md border border-transparent px-4 py-2 text-base font-medium text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 sm:ml-3 sm:w-auto sm:text-sm transition-colors duration-200 ${getConfirmButtonClass(type)}"
                id="confirmation-confirm-btn-${uniqueId}"
              >
                ${confirmText}
              </button>
              <button
                type="button"
                class="mt-3 inline-flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-base font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm transition-colors duration-200"
                id="confirmation-cancel-btn-${uniqueId}"
              >
                ${cancelText}
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    // Insert modal into body
    modalContainer.innerHTML = modalHTML;
    document.body.appendChild(modalContainer);

    // Wait for DOM to be ready, then add event listeners
    setTimeout(() => {
      const confirmBtn = document.getElementById(`confirmation-confirm-btn-${uniqueId}`);
      const cancelBtn = document.getElementById(`confirmation-cancel-btn-${uniqueId}`);
      const backdrop = document.getElementById(`confirmation-backdrop-${uniqueId}`);

      const closeModal = () => {
        if (modalContainer && modalContainer.parentNode) {
          modalContainer.parentNode.removeChild(modalContainer);
        }
      };

      const handleConfirm = () => {
        console.log('Confirm button clicked');
        try {
          onConfirm();
        } catch (error) {
          console.error('Error in confirmation callback:', error);
        }
        closeModal();
      };

      const handleCancel = () => {
        console.log('Cancel button clicked');
        closeModal();
      };

      // Handle escape key
      const handleEscape = (e) => {
        if (e.key === 'Escape') {
          handleCancel();
        }
      };
      document.addEventListener('keydown', handleEscape);

      // Clean up escape key listener when modal closes
      const cleanup = () => {
        document.removeEventListener('keydown', handleEscape);
      };
      
      // Create wrapped handlers with cleanup
      const wrappedHandleConfirm = () => {
        cleanup();
        handleConfirm();
      };
      
      const wrappedHandleCancel = () => {
        cleanup();
        handleCancel();
      };

      // Add event listeners with wrapped handlers
      if (confirmBtn) {
        confirmBtn.addEventListener('click', wrappedHandleConfirm, { once: true });
        console.log('Confirm button listener added');
      } else {
        console.error('Confirm button not found');
      }

      if (cancelBtn) {
        cancelBtn.addEventListener('click', wrappedHandleCancel, { once: true });
        console.log('Cancel button listener added');
      } else {
        console.error('Cancel button not found');
      }

      if (backdrop) {
        backdrop.addEventListener('click', wrappedHandleCancel, { once: true });
        console.log('Backdrop listener added');
      } else {
        console.error('Backdrop not found');
      }

    }, 50); // Small delay to ensure DOM is ready

  } catch (error) {
    console.error('Error creating confirmation modal:', error);
    // Fallback to window.confirm
    if (window.confirm(message)) {
      try {
        onConfirm();
      } catch (error) {
        console.error('Error in confirmation callback:', error);
      }
    }
  }
}

// Helper function to get icon HTML
function getIconHTML(type, customIcon) {
  if (customIcon) return customIcon;
  
  switch (type) {
    case 'danger':
      return `<svg class="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
      </svg>`;
    case 'warning':
      return `<svg class="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
      </svg>`;
    case 'info':
      return `<svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>`;
    default:
      return `<svg class="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>`;
  }
}

// Helper function to get confirm button class
function getConfirmButtonClass(type) {
  switch (type) {
    case 'danger':
      return 'bg-red-600 hover:bg-red-700 focus:ring-red-500';
    case 'warning':
      return 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500';
    case 'info':
      return 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500';
    default:
      return 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500';
  }
}

// Legacy support - direct replacements for alert() and confirm()
export const alert = showAlert.message;
export const confirm = showConfirm.action;

// Export toast functions for direct use
export { toastNotification as showToast };
