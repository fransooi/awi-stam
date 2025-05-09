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
* @file IconBar.js
* @author FL (Francois Lionet)
* @version 0.5
*
* @short Component for the icon area with buttons
* @description
* This class provides a default implementation of the IconBar component.
* It extends the BaseComponent class and implements the necessary methods
* for handling status updates and temporary status messages.
*/
import BaseComponent, { MESSAGES } from '../utils/BaseComponent.js';

// Define message types for preference handling
export const ICONACTIONS = {
  NEW_FILE: 'NEW_FILE',
  OPEN_FILE: 'OPEN_FILE',
  SAVE_FILE: 'SAVE_FILE',
  RUN_PROGRAM: 'RUN_PROGRAM',
  DEBUG_PROGRAM: 'DEBUG_PROGRAM',
  SHARE_PROGRAM: 'SHARE_PROGRAM',
  HELP: 'HELP'
};

// IconBar.js - Component for the icon area with buttons
class IconBar extends BaseComponent {
  constructor(parentId, containerId) {
    super('IconBar',parentId,containerId);
    this.modeSpecificIcons = null;    
    this.modeSpecificIconsCache = {};
    this.currentMode='';
    this.messageMap[MESSAGES.MODE_CHANGE] = this.handleModeChange;
  }

  async init(options) {
    super.init(options);   
    await this.setMode(options.mode);
  }

  async destroy() {
    if (this.modeSpecificIcons) {
      this.modeSpecificIcons.destroy();
      this.modeSpecificIcons=null;
    }
    super.destroy();
  }
  
  async render(containerId) {
    this.parentContainer=await super.render(containerId);
    this.parentContainer.innerHTML = '';

    // Create icon container
    this.iconContainer = document.createElement('div');
    this.iconContainer.className = 'icon-container';
    this.iconContainer.id = 'mode-specific-icons';
    this.parentContainer.appendChild(this.iconContainer);
    return this.iconContainer;
  }

  async setMode(mode) {    
    if (this.currentMode=='' || mode!=this.currentMode) {
      if (this.currentMode!=''){
        this.modeSpecificIconsCache[this.currentMode].destroy();
      }
      this.currentMode = mode;
      try {
        // Dynamically import the icons module for the current mode
        let IconsModule;
        try {
          IconsModule = await import(`./modes/${mode}/icons.js`);
        } catch (err) {
          // Fallback to javascript if mode-specific module not found
          try {
            IconsModule = await import('./modes/javascript/icons.js');
            console.warn(`Could not load icons for mode: ${mode}. Falling back to javascript.`, err);
          } catch (fallbackErr) {
            console.error('Could not load fallback javascript icons module.', fallbackErr);
            throw fallbackErr;
          }
        }
        // Create and render the mode-specific icons
        this.modeSpecificIconsCache[mode] = new IconsModule.default(this.componentId);
      } catch (error) {
        this.iconContainer.innerHTML = `<div class="error-message">Failed to load icons for ${this.currentMode} mode</div>`;
      }    
      await this.modeSpecificIconsCache[mode].init();  
      this.modeSpecificIcons=this.modeSpecificIconsCache[mode];
      
      // Render the mode-specific icons
      if (this.iconContainer) {
        await this.modeSpecificIcons.render(this.iconContainer.id);
      }
    }
  }
  
  /**
   * Handle mode change message
   * @param {Object} data - Message data
   * @param {string} sender - Sender ID
   * @returns {boolean} - Whether the message was handled
   */
  async handleModeChange(data, sender) {
    await this.setMode(data.mode);
    await this.sendMessageTo(this.modeSpecificIcons.componentId, MESSAGES.RENDER, {});
    return true;
  }

  /**
   * Override getLayoutInfo to include IconBar-specific information
   * @returns {Object} Layout information for this IconBar
   */
  async getLayoutInfo() {
    // Get base layout information from parent class
    const layoutInfo = await super.getLayoutInfo();
    
    // Add IconBar-specific information
    layoutInfo.currentMode = this.currentMode;
    
    // We don't need to save height as it's defined by the mode-specific IconBars
    
    // Add mode-specific icon information if available
    if (this.modeSpecificIcons && typeof this.modeSpecificIcons.getIconInfo === 'function') {
      layoutInfo.icons = this.modeSpecificIcons.getIconInfo();
    } else {
      // If no getIconInfo method is available, just store the mode
      layoutInfo.icons = { mode: this.currentMode };
    }
    
    return layoutInfo;
  }
}

export default IconBar;
