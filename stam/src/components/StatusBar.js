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
* @file StatusBar.js
* @author FL (Francois Lionet)
* @version 0.5
*
* @short Default component for the application status bar
* @description
* This class provides a default implementation of the StatusBar component.
* It extends the BaseComponent class and implements the necessary methods
* for handling status updates and temporary status messages.
*/
import BaseComponent, { MESSAGES } from '../utils/BaseComponent.js';

export const STATUSBARCOMMANDS = {
  TOGGLE_VISIBLE: 'STATUSBAR_TOGGLE_VISIBLE',
};

class StatusBar extends BaseComponent {
  constructor(parentId, containerId) {
    // Initialize the base component with component name
    super('StatusBar', parentId, containerId);    
    this.status = 'Ready';
    this.visible = true;
    this.messageMap[MESSAGES.UPDATE_STATUS] = this.handleUpdateStatus;
    this.messageMap[MESSAGES.SHOW_TEMPORARY_STATUS] = this.handleShowTemporaryStatus; 
    this.messageMap[STATUSBARCOMMANDS.TOGGLE_VISIBLE] = this.handleToggleVisible; 
  }

  async init() {
    await super.init();
  }
  async destroy() {
    if (this.statusText)
      this.statusText.remove();
    await super.destroy();
  }
  async render(containerId) {
    this.parentContainer=await super.render(containerId);
    this.parentContainer.innerHTML = '';
   
    // Create status text element
    this.statusText = document.createElement('div');
    this.statusText.className = 'status-text';
    this.statusText.textContent = this.status;
    
    // Append to parent container
    this.parentContainer.appendChild(this.statusText);

    // Prevent default context menu on the status bar
    this.parentContainer.addEventListener('contextmenu', (e) => {
      if (!e.defaultPrevented) e.preventDefault();
    });

    // Returns the current container
    return this.parentContainer;
  }
  
  setStatus(text) {
    this.status = text;
    if (this.statusText) {
      this.statusText.textContent = text;
    }
  }
  
  getStatus() {
    return this.status;
  }
  
  showTemporaryStatus(text, duration = 3000) {
    const previousStatus = this.status;
    this.setStatus(text);
    
    setTimeout(() => {
      this.setStatus(previousStatus);
    }, duration);
  }

  getInformation() {
    return {
      visible: this.visible,
      status: this.status
    };
  }
  
  handleToggleVisible(data, sender) {
    this.visible = !this.visible;
    if (this.visible) {
      this.parentContainer.style.display = 'block';
      return true;
    }
    this.parentContainer.style.display = 'none';
    return false;
  }
  
  /**
   * Handle update status message
   * @param {Object} data - Message data
   * @param {string} sender - Sender ID
   * @returns {boolean} - Whether the message was handled
   */
  handleUpdateStatus(data, sender) {
    if (data.text) {
      this.setStatus(data.text);
      return true;
    }
    return false;
  }
  
  /**
   * Handle show temporary status message
   * @param {Object} data - Message data
   * @param {string} sender - Sender ID
   * @returns {boolean} - Whether the message was handled
   */
  async handleShowTemporaryStatus(data, sender) {
    if (data.text) {
      const duration = data.duration || 3000;
      this.showTemporaryStatus(data.text, duration);
      return true;
    }
    return false;
  }
  
  
  /**
   * Apply layout information to restore the StatusBar state
   * @param {Object} layoutInfo - Layout information for this StatusBar
   */
  async applyLayout(layoutInfo) {
    // Set status if specified
    if (layoutInfo.status) {
      this.setStatus(layoutInfo.status);
    }
  }
  
  /**
   * Override getLayoutInfo to include StatusBar-specific information
   * @returns {Object} Layout information for this StatusBar
   */
  async getLayoutInfo() {
    // Get base layout information from parent class
    const layoutInfo = await super.getLayoutInfo();
    
    // Add StatusBar-specific information
    layoutInfo.status = this.status;
    
    // Get height information if available
    if (this.parentContainer) {
      const rect = this.parentContainer.getBoundingClientRect();
      layoutInfo.height = rect.height;
    }
    
    return layoutInfo;
  }
}

export default StatusBar;
