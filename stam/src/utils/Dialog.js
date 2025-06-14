/** --------------------------------------------------------------------------  
*   ______ _______ _______ _______   _ 
*  / _____|_______|_______|_______) | |   
* ( (____     _    _______ _  _  _  | |
*  \____ \   | |  |  ___  | ||_|| | |_|
*  _____) )  | |  | |   | | |   | |  _
* (______/   |_|  |_|   |_|_|   |_| |_|   The Multi-Editor
*
* This file is open-source under the conditions contained in the
* license file located at the root of this project.
*
* ----------------------------------------------------------------------------
* @file Dialog.js
* @author FL (Francois Lionet)
* @version 0.5
*
* @short This component manages the project
* @description
* This class manages all things related to preferences.
*/
export class Dialog {
  /**
   * Create a new Dialog
   * @param {Object} options - Dialog configuration
   * @param {string} options.title - Dialog title
   * @param {HTMLElement} options.content - Dialog content element
   * @param {Array} options.buttons - Array of button configurations
   * @param {Object} options.theme - Theme object with colors and fonts
   * @param {Function} options.onClose - Callback when dialog is closed
   */
  constructor(options = {}) {
    this.title = options.title || '';
    this.content = options.content || document.createElement('div');
    this.buttons = options.buttons || [];
    this.theme = options.theme || {};
    this.onClose = options.onClose || (() => {});
    this.onOpen = options.onOpen;
    this.style = options.style || {};
    this.className = options.className || '';
    
    this.dialog = null;
    this.overlay = null;
    this.isOpen = false;
    this.handleKeyDown = null;
    this.handleOverlayClick = null;
  }

  /**
   * Open the dialog
   */
  open() {
    if (this.isOpen) return;
    
    // Add styles if not already added
    if (!document.getElementById('dialog-styles')) {
      const style = document.createElement('style');
      style.id = 'dialog-styles';
      style.textContent = `
        .dialog-close {
          background: none !important;
          border: none !important;
          font-size: 24px;
          line-height: 1;
          padding: 0;
          margin: 0;
          cursor: pointer;
          color: var(--text-secondary, #b0b0b0);
          transition: color 0.2s;
          width: 30px;
          height: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 0 !important;
          box-shadow: none !important;
          appearance: none;
          -webkit-appearance: none;
          -moz-appearance: none;
        }
        .dialog-close:hover {
          color: var(--text-primary, #ffffff);
          background-color: transparent !important;
        }
        .dialog-close:focus {
          outline: none !important;
          box-shadow: none !important;
        }
        .dialog-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 24px;
          border-bottom: 1px solid var(--borders, #444);
          flex-shrink: 0;
        }
        .dialog-header h2 {
          margin: 0;
          font-size: 1.25rem;
          font-weight: 500;
          color: var(--text-primary, #ffffff);
        }
        .dialog-footer {
          flex-shrink: 0;
          padding: 16px 24px;
          display: flex;
          justify-content: flex-end;
          gap: 8px;
          border-top: 1px solid var(--borders, #444);
        }
        .dialog-content {
          padding: 8px 12px;
          overflow: auto;
          flex-grow: 1;
        }
      `;
      document.head.appendChild(style);
    }
    
    // Create overlay
    this.overlay = document.createElement('div');
    this.overlay.className = 'dialog-overlay';
    
    // Create dialog container
    this.dialog = document.createElement('div');
    this.dialog.className = 'dialog';
    this.dialog.setAttribute('role', 'dialog');
    this.dialog.setAttribute('aria-modal', 'true');
    this.dialog.setAttribute('aria-labelledby', 'dialog-title');
    this.dialogElement = this.dialog;
    
    // Apply theme
    this.applyTheme();
    
    // Apply custom styles and class
    if (this.style) {
      Object.assign(this.dialog.style, this.style);
    }
    if (this.className) {
      this.dialog.classList.add(this.className);
    }
    
    // Build dialog structure
    this.dialog.innerHTML = `
      <div class="dialog-header">
        <h2 id="dialog-title">${this.title}</h2>
        <button class="dialog-close" aria-label="Close">&times;</button>
      </div>
      <div class="dialog-content"></div>
      <div class="dialog-footer"></div>
    `;
    
    // Add content
    const contentEl = this.dialog.querySelector('.dialog-content');
    contentEl.appendChild(this.content);
    
    // Add buttons
    const footerEl = this.dialog.querySelector('.dialog-footer');
    this.buttons.forEach(button => {
      const btn = document.createElement('button');
      button.element = btn;
      btn.textContent = button.label;
      btn.className = `dialog-button ${button.className || ''}`.trim();
      btn.onclick = button.onClick;
      
      // Add keyboard accessibility
      btn.setAttribute('role', 'button');
      btn.setAttribute('tabindex', '0');

      footerEl.appendChild(btn);
    });
    
    // Add to DOM
    this.overlay.appendChild(this.dialog);
    document.body.appendChild(this.overlay);
    document.body.style.overflow = 'hidden';
    
    // Focus management
    this.setupFocusTrap();
    
    // Add event listeners
    this.addEventListeners();
    this.isOpen = true;
    
    // Trigger animation
    requestAnimationFrame(() => {
      this.overlay.classList.add('visible');
      this.dialog.classList.add('visible');
      
      // Call onOpen callback if provided
      if (typeof this.onOpen === 'function') {
        this.onOpen(this.dialog);
      }
    });
  }

  getButtonElement(index) {
    if (index < 0 || index >= this.buttons.length) return null;
    return this.buttons[index].element;
  }
  setButtonState(index, disabled) {
    if (index < 0 || index >= this.buttons.length) return;
    this.buttons[index].disabled = disabled;
    this.buttons[index].element.disabled = disabled;
    this.buttons[index].element.style.opacity = disabled ? '0.6' : '1';
    //disabled buttons should not react to the mouse
    this.buttons[index].element.style.pointerEvents = disabled ? 'none' : 'auto';
  }
  /**
   * Close the dialog
   */
  close() {
    if (!this.isOpen) return;
    
    // Trigger closing animation
    this.overlay.classList.remove('visible');
    this.dialog.classList.remove('visible');
    
    // Wait for animation to complete before removing from DOM
    setTimeout(() => {
      // Remove event listeners
      this.removeEventListeners();
      
      // Remove from DOM
      if (document.body.contains(this.overlay)) {
        document.body.removeChild(this.overlay);
      }
      
      // Reset body styles
      document.body.style.overflow = '';
      
      // Update state
      this.isOpen = false;
      
      // Trigger onClose callback
      this.onClose();
    }, 200); // Match this with the CSS transition duration
  }

  /**
   * Apply theme to the dialog
   */
  applyTheme() {
    if (!this.dialog) return;
    
    // Apply theme variables
    const style = document.documentElement.style;
    const theme = this.theme.colors || {};
    
    // Set CSS variables
    for (const [key, value] of Object.entries(theme)) {
      style.setProperty(`--${key}`, value);
    }
    
    // Apply font family if specified in theme
    if (this.theme.fonts) {
      style.setProperty('--font-family', this.theme.fonts.menu || 'sans-serif');
    }
  }

  /**
   * Set up focus trap for accessibility
   */
  setupFocusTrap() {
    const focusableElements = this.dialog.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    if (focusableElements.length === 0) return;
    
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    
    // Focus first element
    firstElement.focus();
    
    // Handle tab key to trap focus within dialog
    this.handleKeyDown = (e) => {
      if (e.key !== 'Tab') return;
      
      if (e.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };
    
    this.dialog.addEventListener('keydown', this.handleKeyDown);
  }

  /**
   * Add event listeners
   */
  addEventListeners() {
    // Close on escape key
    this.handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        this.close();
      }
    };
    
    // Close on overlay click
    this.handleOverlayClick = (e) => {
      if (e.target === this.overlay) {
        this.close();
      }
    };
    
    // Close button
    const closeBtn = this.dialog.querySelector('.dialog-close');
    if (closeBtn) {
      closeBtn.onclick = () => this.close();
    }
    
    // Add global event listeners
    document.addEventListener('keydown', this.handleKeyDown);
    this.overlay.addEventListener('click', this.handleOverlayClick);
  }

  /**
   * Remove event listeners
   */
  removeEventListeners() {
    if (this.handleKeyDown) {
      document.removeEventListener('keydown', this.handleKeyDown);
    }
    
    if (this.overlay && this.handleOverlayClick) {
      this.overlay.removeEventListener('click', this.handleOverlayClick);
    }
  }
}
