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
   * @param {object} [options={}] - The options for the alert
   * @param {string} [options.type='circle'] - The type of the alert, 'icon', 'progress', or 'circle'
   * @param {string} [options.icons=[''] - Array of icon url or data
   * @param {number} [options.value=0] - The current value of the progressbar
   * @param {number} [options.max=100] - The maximum value of the progressbar
   * @param {number} [options.timeout=0] - Timeout in ms before closing (0 = no timeout)
   * @param {boolean} [options.animated=false] - Whether to animate the progressbar automatically
   * @returns {{update: function, close: function}} Object with update and close methods
   */
  async showAnimatedAlert(message, options = {}) {
    // Close any existing download alert first
    if (this._currentAnimatedAlert)
      return await this.updateAnimatedAlert(message, options);
    
    // Resolve message if it's a translation key
    if (message.startsWith('stam:')) {
      message = this.root.messages.getMessage(message);
    }

    const theme = this.root.preferences.getCurrentTheme();
    const {
      type = 'progressCircle',
      icons = [],
      images = [],
      value = 10,
      max = 100,
      timeout = 1000 * 1000,
      loop = 0,
      animationName = null,
      stepName = null,
    } = options;

    // Create dialog container
    const dialog = document.createElement('div');
    dialog.className = 'alert-dialog downloading-alert';
    dialog.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background-color: ${theme['dialog-background']};
      border: 1px solid ${theme['dialog-border']};
      border-radius: 8px;
      padding: 20px;
      z-index: 10000;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      min-width: 250px;
      text-align: center;
      transition: opacity 0.3s ease, transform 0.3s ease;
    `;

    // Add message
    const messageEl = document.createElement('div');
    messageEl.textContent = message;
    messageEl.style.cssText = `
      margin-bottom: 15px;
      color: ${theme['text-primary']};
      font-size: 14px;
      line-height: 1.4;
    `;
    dialog.appendChild(messageEl);

    // Create progress container
    const progressContainer = document.createElement('div');
    progressContainer.style.cssText = `
      position: relative;
      width: 100%;
      margin: 10px 0;
    `;

    // Drawing element
    var width, height;
    if (animationName && this.root.resourceManager.animations[animationName])
    {
      width = this.root.resourceManager.animations[animationName].width;
      height = this.root.resourceManager.animations[animationName].height;
    }
    if (typeof width == 'undefined')
      width = options.width || 128;
    if (typeof height == 'undefined')
      height = options.height || 64;
    
    var canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    var ctx = canvas.getContext('2d');
    var self = this;
    function redrawGraphic( type, value, max ) {      
      ctx.clearRect(0, 0, canvas.width, canvas.height);        
      switch (type) {
        case 'progressBar':
          ctx.beginPath();
          ctx.strokeStyle = theme.colors['text-primary'] || '#e0e0e0';
          ctx.lineWidth = options.strokeWidth;
          ctx.rect(0, 0, canvas.width, canvas.height);
          ctx.stroke();
          break;
        case 'animation':
          var image = self.root.resourceManager.getAnimationImage(animationName);
          ctx.drawImage(image.data, 0, 0, canvas.width, canvas.height);
          break;
        case 'images':
          var image = Math.floor(value / max * images.length);
          if ( !images[image] )
            image = 0;
          ctx.drawImage(images[image].data, 0, 0, canvas.width, canvas.height);
          break;
        case 'icon':
          var image = Math.floor(value / max * icons.length);
          if ( !icons[image] )
            image = 0;
          // If icon is fa- icon
          if (icons[image].startsWith('fa-')) {
            ctx.font = '24px FontAwesome';
            ctx.fillStyle = theme.colors['text-primary'] || '#e0e0e0';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(icons[image], canvas.width / 2, canvas.height / 2);
          }
          // Load the icon if it an url
          else if (icons[image].startsWith('http')) {
            const img = new Image();
            img.src = icons[image];
            img.onload = () => {
              ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            };
          }
          // Else if it is a string with png/jpg data
          else if (icons[image].startsWith('data:image/png;base64') || icons[image].startsWith('data:image/jpeg;base64')) {
            const img = new Image();
            img.src = icons[image];
            img.onload = () => {
              ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            };
          }
          break;
      }
    }     
    var self = this;
    let timeoutId = null;
    let hasClosed = false;
    function close() {
      if (timeoutId) clearTimeout(timeoutId);
      dialog.style.opacity = '0';
      dialog.style.transition = 'opacity 0.6s ease';
      dialog.addEventListener('transitionend', function handler() {
        this.removeEventListener('transitionend', handler);
        dialog.remove();
        self._currentAnimatedAlert = null;
        hasClosed = true;
      });
    }
    async function waitForClosing() {
      while (!hasClosed) 
        await self.root.utilities.sleep(1);
    }
    async function closeAndWait() {
      close();
      await waitForClosing();
    }    
    function setMessage(message) {
      if (message.startsWith('stam:'))
        message = self.root.messages.getMessage(message);
      messageEl.textContent = message;
    }
    function setTimer(timeout) {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        close();
      }, timeout);
    }
    async function setAnimation(animationName, stepName) {
      await self.root.resourceManager.stopAnimation(animationName);
      self.root.resourceManager.initAnimation(animationName, stepName, function( position, image ) {
        redrawGraphic(type, value, max);
      });
    }
    progressContainer.appendChild(canvas);
    dialog.appendChild(progressContainer);
    this._currentAnimatedAlert = dialog;

    if (animationName)
      setAnimation(animationName, stepName, timeout);
    else
      redrawGraphic(type, value, max);
    document.body.appendChild(dialog);  

    // Set up timeout if specified
    if (timeout > 0) {
      setTimer(timeout);
    }

    // Return API for updating and closing
    this._currentAnimatedAlert =  {
      close: close,
      closeAndWait: closeAndWait,
      waitForClosing: waitForClosing,
      setTimeout: setTimer,
      setMessage: setMessage,
      setAnimation: setAnimation,
    };
    return this._currentAnimatedAlert;
  }
  async updateAnimatedAlert(message, options) {
    if (this._currentAnimatedAlert) {
      if (typeof options.timeout != 'undefined')
        this._currentAnimatedAlert.setTimeout(options.timeout);
      if (message)
        this._currentAnimatedAlert.setMessage(message); 
      if (options.animationName)
        this._currentAnimatedAlert.setAnimation(options.animationName, options.stepName);
    }
    return true;
  }
    
  async closeAnimatedAlert() {
    if (this._currentAnimatedAlert) {
      await this._currentAnimatedAlert.closeAndWait();
    }
  }
  async closeAnimatedAlertError(message, options) {
    if (this._currentAnimatedAlert) {
      await this._currentAnimatedAlert.closeAndWait();
      options = options || {type: 'animation', animationName: 'connection', stepName: 'error', timeout: 2500};
      this.showAnimatedAlert(message, options);
    }
  }
  async closeAnimatedAlertSuccess(message, options) {
    if (this._currentAnimatedAlert) {
      await this._currentAnimatedAlert.closeAndWait();
      options = options || {type: 'animation', animationName: 'connection', stepName: 'success', timeout: 2500 };
      this.showAnimatedAlert(message, options);
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
