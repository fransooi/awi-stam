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
* @short Phaser Icon Bar component
*/
import BaseComponent from '../../../utils/BaseComponent.js';
import { MENUCOMMANDS } from '../../MenuBar.js';

class PhaserIcons extends BaseComponent {
  constructor(parentId,containerId) {
    super('PhaserIcons', parentId, containerId);
    this.buttons = [];
  }

  async init(options) {
    super.init(options);
  }
  async destroy() {
    super.destroy();
    if (this.layoutContainer) {
      this.buttons.forEach(button => {
        this.layoutContainer.removeChild(button);
      });
    } 
    this.buttons = [];
    this.layoutContainer=null;
    this.removeStyles();
  }
  async render(containerId) {
    if ( this.layoutContainer)
      return this.layoutContainer;

    this.parentContainer=await super.render(containerId);
    this.parentContainer.innerHTML = '';
    this.layoutContainer=this.parentContainer;
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
  
    // Create phaser mode buttons with Font Awesome icons
    this.addButton('New', MENUCOMMANDS.NEW_FILE, 'new', 'fa-file');
    this.addButton('Open', MENUCOMMANDS.OPEN_FILE, 'open', 'fa-folder-open');
    this.addButton('Save', MENUCOMMANDS.SAVE_FILE, 'save', 'fa-save');
    this.addButton('Run', MENUCOMMANDS.RUN_PROGRAM, 'run', 'fa-play');
    this.addButton('Debug', MENUCOMMANDS.DEBUG_PROGRAM, 'debug', 'fa-bug');
    this.addButton('Share', MENUCOMMANDS.SHARE_PROGRAM, 'share', 'fa-share-alt');
    this.addButton('Help', MENUCOMMANDS.HELP, 'help', 'fa-question-circle');
  
    return this.parentContainer;
  }
  
  addButton(text, action,className, iconClass) {
    const button = document.createElement('button');
    button.className = `phaser-button phaser-button-${className}`;
    button.title = text;
    button.action=action;

    // Create icon element with black border effect
    const icon = document.createElement('i');
    icon.className = `fas ${iconClass} phaser-icon`;
    icon.style.fontSize = '24px'; // Double size icons
    button.appendChild(icon);
    
    // No text span anymore, just the icon    
    button.addEventListener('click', () => this.handleButtonClick(action));
    this.layoutContainer.appendChild(button);
    this.buttons.push(button);
  }

  // add styles to document if not present
  addStyles() {
    const styles = document.querySelectorAll('style[data-phaser-style]');
    if (styles.length > 0) {
      styles.forEach(style => style.remove());
    }

    const style = document.createElement('style');
    style.setAttribute('data-phaser-style', true);

    style.textContent = `
      .phaser-button {
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
      .phaser-button:hover {
        background-color: var(--icon-button-background-hover);
      }
      .phaser-button-new {
        background-color: var(--icon-button-background);
        color: #90CAF9;
      }
      .phaser-button-new:hover {
        background-color: var(--icon-button-background-hover);
      }
      .phaser-button-open {
        color: #FFE082;
      }
      .phaser-button-open:hover {
        background-color: var(--icon-button-background-hover);
      }
      .phaser-button-save {
        color: #A5D6A7;
      }
      .phaser-button-save:hover {
        background-color: var(--icon-button-background-hover);
      }
      .phaser-button-run {
        color: #81C784;
      }
      .phaser-button-run:hover {
        background-color: var(--icon-button-background-hover);
      }
      .phaser-button-debug {
        color: #FFB74D;
      }
      .phaser-button-debug:hover {
        background-color: var(--icon-button-background-hover);
      }
      .phaser-button-share {
        color: #9FA8DA;
      }
      .phaser-button-share:hover {
        background-color: var(--icon-button-background-hover);
      }
      .phaser-button-help {
        color: #CE93D8;
      }
      .phaser-button-help:hover {
        background-color: var(--icon-button-background-hover);
      }
      .phaser-button-stop {
        color: #ef4444;
      }
      .phaser-button-stop:hover {
        background-color: var(--icon-button-background-hover);
      }
      
      /* Icon border effect */
      .phaser-icon {
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
    const styles = document.querySelectorAll('style[data-phaser-style]');
    styles.forEach(style => style.remove());
  }
  handleButtonClick(action) {
    this.broadcast(action);    
  }
  
  /**
   * Get information about the Phaser icon bar for layout saving
   * @returns {Object} Icon information
   */
  getIconInfo() {
    return {
      mode: 'phaser'
    };
  }
}

export default PhaserIcons;
