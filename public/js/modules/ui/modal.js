/**
 * Modal Module
 * Handles modal dialogs for the team stats application
 */

(function (global) {
  'use strict';

  const ModalManager = {
    initialized: false,
    activeModal: null,
    modals: new Map(),

    init() {
      if (this.initialized) return;

      this.setupModals();
      this.bindEvents();

      this.initialized = true;
      console.log('[ModalManager] Initialized');
    },

    setupModals() {
      const modals = document.querySelectorAll('.modal');
      modals.forEach(modal => {
        const modalId = modal.id || modal.dataset.modal;
        if (modalId) {
          this.modals.set(modalId, {
            element: modal,
            isOpen: false,
          });
        }
      });
    },

    bindEvents() {
      // Handle modal trigger clicks
      document.addEventListener('click', e => {
        const trigger = e.target.closest('[data-modal-target]');
        if (trigger) {
          e.preventDefault();
          const modalId = trigger.dataset.modalTarget;
          this.openModal(modalId);
        }

        // Handle close button clicks
        const closeBtn = e.target.closest('.modal-close');
        if (closeBtn) {
          e.preventDefault();
          this.closeActiveModal();
        }

        // Handle overlay clicks
        if (e.target.classList.contains('modal-overlay')) {
          this.closeActiveModal();
        }
      });

      // Handle escape key
      document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && this.activeModal) {
          this.closeActiveModal();
        }
      });
    },

    openModal(modalId, data = {}) {
      if (!this.modals.has(modalId)) {
        console.warn('[ModalManager] Modal not found:', modalId);
        return;
      }

      // Close any existing modal
      if (this.activeModal) {
        this.closeModal(this.activeModal);
      }

      const modal = this.modals.get(modalId);
      modal.isOpen = true;
      this.activeModal = modalId;

      // Show modal
      modal.element.classList.add('active');
      modal.element.style.display = 'flex';
      document.body.classList.add('modal-open');

      // Focus management
      const firstFocusable = modal.element.querySelector('button, input, textarea, select');
      if (firstFocusable) {
        firstFocusable.focus();
      }

      console.log('[ModalManager] Opened modal:', modalId);

      // Emit modal open event
      if (global.TeamStatsEventBus) {
        global.TeamStatsEventBus.emit('modal:open', { modalId, data });
      }
    },

    closeModal(modalId) {
      if (!this.modals.has(modalId)) {
        console.warn('[ModalManager] Modal not found:', modalId);
        return;
      }

      const modal = this.modals.get(modalId);
      modal.isOpen = false;

      // Hide modal
      modal.element.classList.remove('active');
      modal.element.style.display = 'none';

      if (this.activeModal === modalId) {
        this.activeModal = null;
        document.body.classList.remove('modal-open');
      }

      console.log('[ModalManager] Closed modal:', modalId);

      // Emit modal close event
      if (global.TeamStatsEventBus) {
        global.TeamStatsEventBus.emit('modal:close', { modalId });
      }
    },

    closeActiveModal() {
      if (this.activeModal) {
        this.closeModal(this.activeModal);
      }
    },

    isModalOpen(modalId) {
      const modal = this.modals.get(modalId);
      return modal ? modal.isOpen : false;
    },

    getActiveModal() {
      return this.activeModal;
    },

    createModal(modalId, content, options = {}) {
      const modal = document.createElement('div');
      modal.className = 'modal';
      modal.id = modalId;
      modal.innerHTML = `
        <div class="modal-overlay">
          <div class="modal-container">
            <div class="modal-header">
              <h3 class="modal-title">${options.title || ''}</h3>
              <button class="modal-close" aria-label="Close modal">&times;</button>
            </div>
            <div class="modal-body">
              ${content}
            </div>
            ${options.showFooter ? '<div class="modal-footer"></div>' : ''}
          </div>
        </div>
      `;

      document.body.appendChild(modal);

      this.modals.set(modalId, {
        element: modal,
        isOpen: false,
      });

      return modal;
    },

    destroyModal(modalId) {
      if (!this.modals.has(modalId)) return;

      const modal = this.modals.get(modalId);
      if (modal.isOpen) {
        this.closeModal(modalId);
      }

      modal.element.remove();
      this.modals.delete(modalId);
    },
  };

  // Global registration
  global.TeamStatsModalManager = ModalManager;

  // Auto-initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => ModalManager.init());
  } else {
    ModalManager.init();
  }
})(window);
