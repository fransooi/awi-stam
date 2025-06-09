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
    content.style.alignItems = 'center';  // Changed from flex-start to center
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
          dialog.close();
          dialogResult = index;
          dialogClosed = true;
        }
      };  
    });
    
    // Create dialog
    if ( title.startsWith('stam:') )
      title = this.root.messages.getMessage(title);
    const dialog = new Dialog({
      title: title,
      content: content,
      buttons: buttonConfigs,
      theme: theme,
      onClose: () => {
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
}
export default Alerts;
