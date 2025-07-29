// Simple toast notification system
class ToastNotification {
  constructor() {
    this.createToastContainer();
  }

  createToastContainer() {
    // Check if container already exists
    if (document.getElementById('toast-container')) {
      return;
    }

    const container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'fixed top-4 right-4 z-[9999] flex flex-col gap-2';
    document.body.appendChild(container);
  }

  show(message, type = 'success', duration = 3000) {
    const toast = document.createElement('div');
    const bgColor = type === 'success' ? 'bg-green-500' : 'bg-red-500';
    const icon = type === 'success' ? '✓' : '✕';
    
    toast.className = `${bgColor} text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 transform translate-x-full transition-transform duration-300`;
    toast.innerHTML = `
      <span class="font-bold">${icon}</span>
      <span>${message}</span>
    `;

    const container = document.getElementById('toast-container');
    container.appendChild(toast);

    // Animate in
    setTimeout(() => {
      toast.classList.remove('translate-x-full');
    }, 100);

    // Animate out and remove
    setTimeout(() => {
      toast.classList.add('translate-x-full');
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 300);
    }, duration);
  }

  success(message, duration = 3000) {
    this.show(message, 'success', duration);
  }

  error(message, duration = 3000) {
    this.show(message, 'error', duration);
  }
}

// Create singleton instance
const toastNotification = new ToastNotification();

export default toastNotification; 