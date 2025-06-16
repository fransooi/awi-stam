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
* @file Alerts.js
* @author FL (Francois Lionet)
* @version 0.5
*
* @short This component manages application alerts.
* @description
* This class provides a default implementation of the Alerts component.
* using the application UI and style.
*/
import BaseComponent from '../utils/BaseComponent.js';
import { Dialog } from '../utils/Dialog.js';
export const ALERTSCOMMANDS = {
  SHOW_INFORMATION: 'ALERT_INFORMATION',
  SHOW_WARNING: 'ALERT_WARNING',
  SHOW_ERROR: 'ALERT_ERROR',
  SHOW_SUCCESS: 'ALERT_SUCCESS',
  SHOW_QUESTION: 'ALERT_QUESTION',
  SHOW_CUSTOM: 'ALERT_CUSTOM',
};

class Alerts extends BaseComponent {
  /**
   * Constructor
   * @param {string} parentId - ID of the parent component
   */
  constructor(parentId = null, containerId) {
    super('Alerts', parentId, containerId);      
    this.messageMap[ALERTSCOMMANDS.SHOW_INFORMATION] = this.handleShowInformation;
    this.messageMap[ALERTSCOMMANDS.SHOW_WARNING] = this.handleShowWarning;
    this.messageMap[ALERTSCOMMANDS.SHOW_ERROR] = this.handleShowError;
    this.messageMap[ALERTSCOMMANDS.SHOW_SUCCESS] = this.handleShowSuccess;
    this.messageMap[ALERTSCOMMANDS.SHOW_QUESTION] = this.handleShowQuestion;
    this.messageMap[ALERTSCOMMANDS.SHOW_CONFIRM] = this.handleShowConfirm;
    this.messageMap[ALERTSCOMMANDS.SHOW_CUSTOM] = this.handleShowCustom;
  }

  async init(options = {}) {
    if (await super.init(options))
      return;
    return true;
  }
  async destroy() {
    await super.destroy();
    return true;
  }
  
  /**
   * Show an alert
   */
  async showInformation(message) {
    return await this.showCustom('stam:information', message, ['stam:ok|positive'], 'info');
  }
  async showWarning(message) {
    return await this.showCustom('stam:warning', message, ['stam:ok|positive'], 'warning');
  }
  async showError(message) {
    return await this.showCustom('stam:error', message, ['stam:ok|positive'], 'error');
  }
  async showQuestion(message) {
    return await this.showCustom('stam:question', message, ['stam:no|negative', 'stam:yes|positive'], 'question');
  }
  async showConfirm(message) {
    return await this.showCustom('stam:confirm', message, ['stam:no|negative', 'stam:yes|positive'], 'question');
  }
  async showSuccess(message) {
    return await this.showCustom('stam:success', message, ['stam:ok|positive'], 'success');
  }
  async handleShowSuccess(data, senderId) {
    return await this.showSuccess(data.message);
  }  
  async handleShowInformation(data, senderId) {
    return await this.showInformation(data.message);
  }
  async handleShowWarning(data, senderId) {
    return await this.showWarning(data.message);
  }
  async handleShowError(data, senderId) {
    return await this.showError(data.message);
  }
  async handleShowQuestion(data, senderId) {
    return await this.showQuestion(data.message);
  }
  async handleShowConfirm(data, senderId) {
    return await this.showConfirm(data.message);
  }
  async handleShowCustom(data, senderId) {
    return await this.showCustom(data.title, data.message, data.buttons, data.icon);
  }
  showCustom(title='stam:alert', message='stam:alert_message', buttons = ['OK|positive'], icon = 'info') {
    const theme = this.root.preferences.getCurrentTheme();
    let dialogResult = null;
    let dialogClosed = false;
    
    // Create content container
    const content = document.createElement('div');
    content.style.display = 'flex';
    content.style.gap = '16px';
    content.style.alignItems = 'center';
    content.style.padding = '16px';
    
    // Add icon
    const iconElement = document.createElement('div');
    iconElement.style.flexShrink = '0';
    iconElement.style.fontSize = '48px';
    iconElement.style.lineHeight = '1';
    iconElement.style.color = 'var(--text-primary)';
    iconElement.style.display = 'flex';
    iconElement.style.alignItems = 'center';
    iconElement.style.justifyContent = 'center';
    iconElement.style.width = '48px';
    iconElement.style.height = '48px';
    
    // Set icon based on type
    switch(icon.toLowerCase()) {
      case 'info':
        iconElement.textContent = 'ℹ️';
        break;
      case 'warning':
        iconElement.textContent = '⚠️';
        break;
      case 'error':
        iconElement.textContent = '❌';
        break;
      case 'success':
        iconElement.textContent = '✅';
        break;
      case 'question':
        iconElement.textContent = '❓';
        break;
      default:
        iconElement.textContent = icon;
    }
    
    // Add message
    if (message.startsWith('stam:') )
      message = this.root.messages.getMessage(message);
    const messageElement = document.createElement('div');
    messageElement.textContent = message;
    messageElement.style.flexGrow = '1';
    messageElement.style.color = 'var(--text-primary)';
    messageElement.style.wordBreak = 'break-word';
    messageElement.style.display = 'flex';
    messageElement.style.alignItems = 'center';
    messageElement.style.minHeight = '100%';
    
    content.appendChild(iconElement);
    content.appendChild(messageElement);
    
    // Process buttons
    const buttonConfigs = buttons.map((buttonDef, index) => {
      // Parse button definition
      let [buttonKey, buttonType = 'neutral'] = buttonDef.split('|').map(s => s.trim());
      
      // Get button text from translations if it's a key
      let buttonText = buttonKey;
      if (buttonKey.startsWith('stam:')) {
        buttonText = this.root.messages.getMessage(buttonKey) || buttonKey;
      }      
      
      // Map button types to theme colors
      const typeMap = {
        'positive': 'btn btn-positive',
        'negative': 'btn btn-negative',
        'neutral': 'btn btn-neutral'
      };
      
      const buttonClass = typeMap[buttonType.toLowerCase()] || 'btn btn-neutral';
      
      return {
        label: buttonText,
        className: buttonClass,
        onClick: () => {
          if (dialogContainer.parentNode) {
            document.body.removeChild(dialogContainer);
          }
          dialog.close();
          dialogResult = index;
          dialogClosed = true;
        }
      };  
    });
    
    // Create dialog
    if ( title.startsWith('stam:') )
      title = this.root.messages.getMessage(title);
    // Create a container for the dialog to ensure it's on top
    const dialogContainer = document.createElement('div');
    dialogContainer.style.position = 'fixed';
    dialogContainer.style.top = '0';
    dialogContainer.style.left = '0';
    dialogContainer.style.width = '100%';
    dialogContainer.style.height = '100%';
    dialogContainer.style.zIndex = '9999';
    dialogContainer.style.display = 'flex';
    dialogContainer.style.justifyContent = 'center';
    dialogContainer.style.alignItems = 'center';
    dialogContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    document.body.appendChild(dialogContainer);

    const dialog = new Dialog({
      title: title,
      content: content,
      buttons: buttonConfigs,
      theme: theme,
      onClose: () => {
        if (dialogContainer.parentNode) {
          document.body.removeChild(dialogContainer);
        }
        if (dialogResult === null) {
          // If dialog was closed without clicking a button, treat as cancel
          dialogResult = buttons.length > 0 ? buttons.length - 1 : 0;
        }
      },
      style: {
        maxWidth: '500px',
        maxHeight: '80vh',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'var(--dialog-background)'
      }
    });
    
    // Open dialog
    dialog.open();
    
    // Set focus to the first button for keyboard navigation
    if (buttonConfigs.length > 0) {
      const firstButton = dialog.dialog.querySelector('button');
      if (firstButton) {
        setTimeout(() => firstButton.focus(), 0);
      }
    }
    
    // Handle Enter key to trigger the default (first) button
    const handleKeyDown = (e) => {
      if (e.key === 'Enter' && buttonConfigs.length > 0) {
        e.preventDefault();
        const defaultButton = dialog.dialog.querySelector('button');
        if (defaultButton) {
          defaultButton.click();
        }
      }
    };
    
    dialog.dialog.addEventListener('keydown', handleKeyDown);
    
    // Wait for dialog to close
    return new Promise(async (resolve) => {
      while(true) {
        await this.root.utilities.sleep(10);
        if (dialogClosed)
          break;
      }
      resolve(dialogResult);
    });
  }
  showCustom(title='stam:alert', message='stam:alert_message', buttons = ['OK|positive'], icon = 'info') {
    const theme = this.root.preferences.getCurrentTheme();
    let dialogResult = null;
    let dialogClosed = false;
    
    // Create overlay container
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    overlay.style.zIndex = '2147483647'; // Maximum z-index
    overlay.style.display = 'flex';
    overlay.style.justifyContent = 'center';
    overlay.style.alignItems = 'center';
    
    // Create content container
    const content = document.createElement('div');
    content.style.display = 'flex';
    content.style.gap = '16px';
    content.style.alignItems = 'center';
    content.style.padding = '16px';
    content.style.backgroundColor = 'var(--dialog-background, #2d2d2d)';
    //content.style.borderRadius = '8px';
    //content.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
    content.style.maxWidth = '500px';
    content.style.width = '90%';
    content.style.maxHeight = '90vh';
    content.style.overflowY = 'auto';
    
    // Rest of the content creation (icon, message, buttons) remains the same
    const iconElement = document.createElement('div');
    iconElement.style.flexShrink = '0';
    iconElement.style.fontSize = '48px';
    iconElement.style.lineHeight = '1';
    iconElement.style.color = 'var(--text-primary)';
    iconElement.style.display = 'flex';
    iconElement.style.alignItems = 'center';
    iconElement.style.justifyContent = 'center';
    iconElement.style.width = '48px';
    iconElement.style.height = '48px';
    
    // Set icon based on type
    switch(icon.toLowerCase()) {
      case 'info':
        iconElement.textContent = 'ℹ️';
        break;
      case 'warning':
        iconElement.textContent = '⚠️';
        break;
      case 'error':
        iconElement.textContent = '❌';
        break;
      case 'success':
        iconElement.textContent = '✅';
        break;
      case 'question':
        iconElement.textContent = '❓';
        break;
      default:
        iconElement.textContent = icon;
    }
    
    // Add message
    if (message.startsWith('stam:') )
      message = this.root.messages.getMessage(message);
    const messageElement = document.createElement('div');
    messageElement.textContent = message;
    messageElement.style.flexGrow = '1';
    messageElement.style.color = 'var(--text-primary)';
    messageElement.style.wordBreak = 'break-word';
    messageElement.style.display = 'flex';
    messageElement.style.alignItems = 'center';
    messageElement.style.minHeight = '100%';
    
    content.appendChild(iconElement);
    content.appendChild(messageElement);
        
    // Process buttons
    const buttonConfigs = buttons.map((buttonDef, index) => {
        const [buttonKey, buttonType = 'neutral'] = buttonDef.split('|').map(s => s.trim());
        const buttonText = buttonKey.startsWith('stam:') 
            ? this.root.messages.getMessage(buttonKey) || buttonKey 
            : buttonKey;
            
        return {
            label: buttonText,
            className: `btn btn-${buttonType}`,
            onClick: () => {
                dialogResult = index;
                dialogClosed = true;
                document.body.removeChild(overlay);
            }
        };
    });

    // Create dialog content
    const dialogContent = document.createElement('div');
    dialogContent.style.position = 'relative';
    dialogContent.style.backgroundColor = 'var(--dialog-background, #2d2d2d)';
    dialogContent.style.borderRadius = '8px';
    dialogContent.style.overflow = 'hidden';
    dialogContent.style.width = '100%';
    dialogContent.style.maxWidth = '500px';
    dialogContent.style.maxHeight = '90vh';
    dialogContent.style.display = 'flex';
    dialogContent.style.flexDirection = 'column';

    // Add title
    const titleElement = document.createElement('div');
    titleElement.textContent = title.startsWith('stam:') 
        ? this.root.messages.getMessage(title) 
        : title;
    titleElement.style.padding = '16px';
    titleElement.style.fontSize = '18px';
    titleElement.style.fontWeight = 'bold';
    titleElement.style.borderBottom = '1px solid var(--borders, #444)';
    dialogContent.appendChild(titleElement);

    // Add content
    const contentWrapper = document.createElement('div');
    contentWrapper.style.padding = '16px';
    contentWrapper.style.overflowY = 'auto';
    contentWrapper.style.flexGrow = '1';
    contentWrapper.appendChild(content);
    dialogContent.appendChild(contentWrapper);

    // Add buttons
    const buttonContainer = document.createElement('div');
    buttonContainer.style.padding = '12px 16px';
    buttonContainer.style.display = 'flex';
    buttonContainer.style.justifyContent = 'flex-end';
    buttonContainer.style.gap = '8px';
    buttonContainer.style.borderTop = '1px solid var(--borders, #444)';
    
    buttonConfigs.forEach((btn, index) => {
        const button = document.createElement('button');
        button.textContent = btn.label;
        button.className = btn.className;
        button.onclick = (e) => {
            e.preventDefault();
            btn.onClick();
        };
        buttonContainer.appendChild(button);
    });
    
    dialogContent.appendChild(buttonContainer);
    overlay.appendChild(dialogContent);
    document.body.appendChild(overlay);

    // Focus the first button for better accessibility
    const firstButton = buttonContainer.querySelector('button');
    if (firstButton) {
        firstButton.focus();
    }

    // Return a promise that resolves when the dialog is closed
    return new Promise((resolve) => {
        const checkDialog = () => {
            if (dialogClosed) {
                resolve(dialogResult);
            } else {
                requestAnimationFrame(checkDialog);
            }
        };
        checkDialog();
    });
}
  // Show a simple rectangluar area at the location of the mouse, not a dialog!
  // Delete it when mouse moves out of 32x32 pixels area located at the position of apparition.
  showHint(message) {
    const theme = this.root.preferences.getCurrentTheme();
    const hint = document.createElement('div');
    hint.style.position = 'absolute';
    hint.style.backgroundColor = 'var(--dialog-background)';
    hint.style.color = 'var(--text-primary)';
    hint.style.padding = '8px';
    hint.style.borderRadius = '4px';
    hint.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.1)';
    hint.style.zIndex = '1000';
    hint.textContent = message;
    document.body.appendChild(hint);
    
    // Position the hint at the mouse position
    const handleMouseMove = (e) => {
      hint.style.left = e.clientX + 'px';
      hint.style.top = e.clientY + 'px';
    };
    document.addEventListener('mousemove', handleMouseMove);
    
    // Remove the hint when the mouse leaves the area
    const handleMouseLeave = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.body.removeChild(hint);
    };
    hint.addEventListener('mouseleave', handleMouseLeave);
  }
  /**
   * Show a downloading alert non blocking
   * @param {string} message - The message to display
   * @param {object} options - The options for the alert
   * @param {object} options.progressbar - The progressbar options
   * @param {number} options.progressbar.value - The current value of the progressbar
   * @param {number} options.progressbar.max - The maximum value of the progressbar
   * @param {string} options.progressbar.style - The style of the progressbar, 'circle' (rotating circle) or 'bar' (progress bar)
   * @param {function} options.progressbar.customFunc - The custom function to draw the progressbar
   */
  async showDownloading(message, options = {}) {
    // Close any existing download alert first
    await this.hideDownloading();
    
    const theme = this.root.preferences.getCurrentTheme();
    const progressbarOptions = options.progressbar || {};
    const progressStyle = progressbarOptions.style || 'circle';
    const maxValue = progressbarOptions.max || 100;
    const currentValue = progressbarOptions.value || 0;
    if (message.startsWith('stam:'))
      message = this.root.messages.getMessage(message);
    
    // Create dialog container
    const dialog = document.createElement('div');
    dialog.className = 'alert-dialog downloading-alert';
    dialog.style.position = 'fixed';
    dialog.style.top = '50%';
    dialog.style.left = '50%';
    dialog.style.transform = 'translate(-50%, -50%)';
    dialog.style.backgroundColor = theme['dialog-background'];
    dialog.style.border = `1px solid ${theme['dialog-border']}`;
    dialog.style.borderRadius = '8px';
    dialog.style.padding = '20px';
    dialog.style.zIndex = '10000';
    dialog.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
    dialog.style.minWidth = '250px';
    dialog.style.textAlign = 'center';
    
    // Add message
    const messageEl = document.createElement('div');
    messageEl.textContent = message;
    messageEl.style.marginBottom = '15px';
    messageEl.style.color = theme['text-primary'];
    dialog.appendChild(messageEl);
    
    // Add progress container
    const progressContainer = document.createElement('div');
    progressContainer.style.position = 'relative';
    progressContainer.style.width = '100%';
    
    if (progressStyle === 'circle') {
      // Circular progress indicator
      const size = 50;
      const strokeWidth = 4;
      const radius = (size - strokeWidth) / 2;
      const circumference = radius * 2 * Math.PI;
      
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('width', size);
      svg.setAttribute('height', size);
      svg.style.display = 'block';
      svg.style.margin = '0 auto';
      
      const circleBg = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circleBg.setAttribute('cx', size / 2);
      circleBg.setAttribute('cy', size / 2);
      circleBg.setAttribute('r', radius);
      circleBg.setAttribute('fill', 'none');
      circleBg.setAttribute('stroke', theme['progress-background'] || '#e0e0e0');
      circleBg.setAttribute('stroke-width', strokeWidth);
      
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', size / 2);
      circle.setAttribute('cy', size / 2);
      circle.setAttribute('r', radius);
      circle.setAttribute('fill', 'none');
      circle.setAttribute('stroke', theme['accent-color'] || '#0078d4');
      circle.setAttribute('stroke-width', strokeWidth);
      circle.setAttribute('stroke-linecap', 'round');
      circle.setAttribute('stroke-dasharray', circumference);
      circle.setAttribute('stroke-dashoffset', circumference - (currentValue / maxValue) * circumference);
      circle.style.transform = 'rotate(-90deg)';
      circle.style.transformOrigin = '50% 50%';
      circle.style.transition = 'stroke-dashoffset 0.3s ease';
      
      svg.appendChild(circleBg);
      svg.appendChild(circle);
      progressContainer.appendChild(svg);
      
      // Store references for updates
      this._progressCircle = circle;
      this._progressCircumference = circumference;
    } else {
      // Horizontal progress bar
      const progressBar = document.createElement('div');
      progressBar.style.height = '4px';
      progressBar.style.backgroundColor = theme['progress-background'] || '#e0e0e0';
      progressBar.style.borderRadius = '2px';
      progressBar.style.overflow = 'hidden';
      progressBar.style.width = '100%';
      
      const progressFill = document.createElement('div');
      progressFill.style.height = '100%';
      progressFill.style.width = `${(currentValue / maxValue) * 100}%`;
      progressFill.style.backgroundColor = theme['accent-color'] || '#0078d4';
      progressFill.style.transition = 'width 0.3s ease';
      progressFill.style.borderRadius = '2px';
      
      progressBar.appendChild(progressFill);
      progressContainer.appendChild(progressBar);
      
      // Store references for updates
      this._progressFill = progressFill;
      this._progressMax = maxValue;
    }
    
    dialog.appendChild(progressContainer);
    
    // Add to document
    document.body.appendChild(dialog);
    this._currentDownloadAlert = dialog;
    
    // Return update and close functions
    return {
      update: (newOptions) => {
        if (newOptions.progressbar) {
          const { value, max } = newOptions.progressbar;
          if (progressStyle === 'circle' && this._progressCircle) {
            const offset = this._progressCircumference - (value / (max || this._progressMax || 100)) * this._progressCircumference;
            this._progressCircle.setAttribute('stroke-dashoffset', offset);
          } else if (this._progressFill) {
            this._progressFill.style.width = `${(value / (max || this._progressMax || 100)) * 100}%`;
          }
        }
      },
      close: () => this.hideDownloadingAlert()
    };
  }
  
  async hideDownloading() {
    if (this._currentDownloadAlert) {
      this._currentDownloadAlert.style.opacity = '0';
      this._currentDownloadAlert.style.transition = 'opacity 0.3s ease';
      
      // Wait for the fade-out animation to complete before removing
      await new Promise(resolve => {
        this._currentDownloadAlert.addEventListener('transitionend', function handler() {
          this.removeEventListener('transitionend', handler);
          resolve();
        });
      });
      
      this._currentDownloadAlert.remove();
      this._currentDownloadAlert = null;
      this._progressCircle = null;
      this._progressFill = null;
    }
  }

  // Show a simple edit box dialog using the dialog class
  showEditBox(title, name, value) {
    return new Promise((resolve) => {
      const theme = this.root.preferences.getCurrentTheme();
      const content = document.createElement('div');
      content.className = 'form-group';
      content.style.padding = '16px';
      content.style.minWidth = '300px';      
      if (title.startsWith('stam:'))
        title = this.root.messages.getMessage(title);
      if (name.startsWith('stam:'))
        name = this.root.messages.getMessage(name);
      content.innerHTML = `
        <div class="form-group-row">
          <label for="edit-label">${name}</label>
          <input type="text" id="edit-box" class="form-control" value="${value}" placeholder="${value}">
        </div>`;
      
      // Create dialog
      const dialog = new Dialog({
        title,
        content,
        theme,
        buttons: [
          {
            label: this.root.messages.getMessage('stam:cancel'),
            className: 'button button-neutral',
            onClick: () => {
              dialog.close();
              resolve(null);
            }
          },
          {
            label: this.root.messages.getMessage('stam:ok'),
            className: 'button button-positive',
            disabled: true,
            onClick: () => {
              const newValue = input.value.trim();
              dialog.close();
              resolve(newValue);
            }
          }
        ],
        onOpen: () => {
          // Focus the input when dialog opens
          input.focus();
          input.select();
          
          // Enable/disable OK button based on input
          const okButton = dialog.getButtonElement(1);
          
          input.addEventListener('input', () => {
            const newValue = input.value.trim();
            const isSameValue = newValue === (value || '');
            const isEmpty = newValue === '';
            dialog.setButtonState(1, isEmpty || isSameValue);
          });
          
          // Handle Enter/Escape keys
          input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !okButton.disabled) {
              const newValue = input.value.trim();
              dialog.close();
              resolve(newValue);
            } else if (e.key === 'Escape') {
              dialog.close();
              resolve(null);
            }
          });
        }
      });
      
      // Open the dialog
      dialog.open();
      
      // Add hover/focus styles
      const input = document.getElementById('edit-box');
      input.addEventListener('focus', () => {
        input.style.borderColor = theme.colors['button-positive'];
      });
      
      input.addEventListener('blur', () => {
        input.style.borderColor = theme.borders;
      });
    });
  }
}
export default Alerts;
