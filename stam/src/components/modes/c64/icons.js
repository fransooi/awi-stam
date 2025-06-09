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
* @file icons.js
* @author FL (Francois Lionet)
* @version 0.5
*
* @short Commodore 64 Icon Bar component
*/
import messageBus from '../../../utils/MessageBus.mjs';
import BaseComponent from '../../../utils/BaseComponent.js';
import { MENUCOMMANDS } from '../../MenuBar.js';

class C64Icons extends BaseComponent  {
  constructor(parentId,containerId) {
    super('C64Icons', parentId, containerId);
    this.buttons = [];
  }

  async init(options) {
    await super.init(options);
  }
  async destroy() {
    if (this.layoutContainer) {
      this.buttons.forEach(button => this.layoutContainer.removeChild(button));
    }
    this.layoutContainer = null;
    this.buttons = [];
    this.removeStyles();
    await super.destroy();
  }
  async render(containerId) {   
    if ( this.layoutContainer )
      return this.layoutContainer;

    this.layoutContainer = await super.render(containerId);
    this.layoutContainer.innerHTML = '';
    this.parentContainer=this.layoutContainer;
    this.addStyles();

    // Apply styles directly to the parent container
    this.parentContainer.style.display = 'flex';
    this.parentContainer.style.flexDirection = 'row';
    this.parentContainer.style.alignItems = 'center';
    this.parentContainer.style.padding = '5px';
    this.parentContainer.style.backgroundColor = 'var(--background-color)';
    this.parentContainer.style.width = '100%';
    this.parentContainer.style.boxSizing = 'border-box';
    this.parentContainer.style.overflowX = 'auto';
    this.parentContainer.style.minHeight = '60px';
  
    // Create c64 mode buttons with Font Awesome icons
    this.addButton('stam:new-text', MENUCOMMANDS.NEW_FILE, 'new', 'fa-file');
    this.addButton('stam:open-text', MENUCOMMANDS.OPEN_FILE, 'open', 'fa-folder-open');
    this.addButton('stam:save-text', MENUCOMMANDS.SAVE_FILE, 'save', 'fa-save');
    this.addButton('stam:run-text', MENUCOMMANDS.RUN_PROGRAM, 'run', 'fa-play');
    this.addButton('stam:debug-text', MENUCOMMANDS.DEBUG_PROGRAM, 'debug', 'fa-bug');
    this.addButton('stam:share-text', MENUCOMMANDS.SHARE_PROGRAM, 'share', 'fa-share-alt');
    this.addButton('stam:help-text', MENUCOMMANDS.HELP, 'help', 'fa-question-circle');
  
    return this.parentContainer;
  }

  addButton(text, action,className, iconClass) {
    const button = document.createElement('button');
    button.className = `c64-button c64-button-${className}`;
    button.title = this.root.messages.getMessage(text);
    button.action=action;

    // Create icon element with black border effect
    const icon = document.createElement('i');
    icon.className = `fas ${iconClass} c64-icon`;
    icon.style.fontSize = '24px'; // Double size icons
    button.appendChild(icon);
    
    // No text span anymore, just the icon    
    button.addEventListener('click', () => this.handleButtonClick(action));
    this.layoutContainer.appendChild(button);
    this.buttons.push(button);
  }

  // add styles to document if not present
  addStyles() {
    const styles = document.querySelectorAll('style[data-c64-style]');
    if (styles.length > 0) {
      styles.forEach(style => style.remove());
    }

    const style = document.createElement('style');
    style.setAttribute('data-c64-style', true);

    style.textContent = `
      .c64-button {
        border: 1px solid var(--borders, #555);
        border-style: solid !important;
        border-width: 1px !important;
        border-radius: 4px;
        padding: 10px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 24px;
        transition: all 0.2s ease;
        background-color: transparent;
        margin: 0 4px;
        width: 64px;
        height: 45px;
        flex-shrink: 0;
        box-sizing: border-box;
      }
      .c64-button:hover {
        background-color: var(--icon-button-background-hover);
      }
      .c64-button-new {
        background-color: var(--icon-button-background);
        color: #90CAF9;
      }
      .c64-button-new:hover {
        background-color: var(--icon-button-background-hover);
      }
      .c64-button-open {
        color: #FFE082;
      }
      .c64-button-open:hover {
        background-color: var(--icon-button-background-hover);
      }
      .c64-button-save {
        color: #A5D6A7;
      }
      .c64-button-save:hover {
        background-color: var(--icon-button-background-hover);
      }
      .c64-button-run {
        color: #81C784;
      }
      .c64-button-run:hover {
        background-color: var(--icon-button-background-hover);
      }
      .c64-button-debug {
        color: #FFB74D;
      }
      .c64-button-debug:hover {
        background-color: var(--icon-button-background-hover);
      }
      .c64-button-share {
        color: #9FA8DA;
      }
      .c64-button-share:hover {
        background-color: var(--icon-button-background-hover);
      }
      .c64-button-help {
        color: #CE93D8;
      }
      .c64-button-help:hover {
        background-color: var(--icon-button-background-hover);
      }
      .c64-button-stop {
        color: #ef4444;
      }
      .c64-button-stop:hover {
        background-color: var(--icon-button-background-hover);
      }
      
      /* Icon border effect */
      .c64-icon {
        text-shadow: 
          -1px -1px 0 #000,
          1px -1px 0 #000,
          -1px 1px 0 #000,
          1px 1px 0 #000;
        /* Fallback for browsers that don't support text-stroke */
        -webkit-text-stroke: 0.5px #000;
        text-stroke: 0.5px #000;
        paint-order: stroke fill;
      }
    `;
    document.head.appendChild(style);
  }
  removeStyles() {
    const styles = document.querySelectorAll('style[data-c64-style]');
    styles.forEach(style => style.remove());
  }

  handleButtonClick(action) {
  }
  
  /**
   * Send a command to the C64 emulator via MessageBus
   * @param {string} command - The command to send
   * @param {Object} params - Additional parameters for the command
   */
  sendCommandToEmulator(command, params = {}) {
    // Use the forward method to send the message to all C64OutputSideWindow instances
    messageBus.forward(command, 'C64OutputSideWindow', params);
  }
  
  /**
   * Get information about the C64 icon bar for layout saving
   * @returns {Object} Icon information
   */
  getIconInfo() {
    return {
      mode: 'c64'
    };
  }
}

export default C64Icons;
