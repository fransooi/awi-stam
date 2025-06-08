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
* @short JavaScript Icon Bar component
*/
import BaseComponent, { MESSAGES } from '../../../utils/BaseComponent.js';
import { ICONACTIONS } from '../../IconBar.js';

class JavascriptIcons extends BaseComponent {
  constructor(parentId,containerId) {
    super('JavascriptIcons', parentId, containerId);
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
    this.layoutContainer = null;
    this.removeStyles();
  }
  async render(containerId) {
    if (this.layoutContainer)
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
    
    // Create JavaScript mode buttons with Font Awesome icons
    this.addButton('New', ICONACTIONS.NEW_FILE, 'new', 'fa-file');
    this.addButton('Open', ICONACTIONS.OPEN_FILE, 'open', 'fa-folder-open');
    this.addButton('Save', ICONACTIONS.SAVE_FILE, 'save', 'fa-save');
    this.addButton('Run', ICONACTIONS.RUN_PROGRAM, 'run', 'fa-play');
    this.addButton('Debug', ICONACTIONS.DEBUG_PROGRAM, 'debug', 'fa-bug');
    this.addButton('Share', ICONACTIONS.SHARE_PROGRAM, 'share', 'fa-share-alt');
    this.addButton('Help', ICONACTIONS.HELP, 'help', 'fa-question-circle');
    
    return this.parentContainer;
  }
  
  addButton(text, action,className, iconClass) {
    const button = document.createElement('button');
    button.className = `javascript-button javascript-button-${className}`;
    button.title = text;    
    button.action=action;

    // Create icon element with black border effect
    const icon = document.createElement('i');
    icon.className = `fas ${iconClass} javascript-icon`;
    icon.style.fontSize = '24px'; // Double size icons
    button.appendChild(icon);
    
    // No text span anymore, just the icon    
    button.addEventListener('click', () => this.handleButtonClick(action));
    this.parentContainer.appendChild(button);
    this.buttons.push(button);
  }

  // add styles to document if not present
  addStyles() {
    const styles = document.querySelectorAll('style[data-javascript-style]');
    if (styles.length > 0) {
      return;
    }

    const style = document.createElement('style');
    style.setAttribute('data-javascript-style', true);

    style.textContent = `
      .javascript-button {
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
      .javascript-button:hover {
        background-color: var(--icon-button-background-hover);
      }
      .javascript-button-new {
        background-color: var(--icon-button-background);
        color: #90CAF9;
      }
      .javascript-button-new:hover {
        background-color: var(--icon-button-background-hover);
      }
      .javascript-button-open {
        background-color: var(--icon-button-background);
        color: #FFE082;
      }
      .javascript-button-open:hover {
        background-color: var(--icon-button-background-hover);
      }
      .javascript-button-save {
        background-color: var(--icon-button-background);
        color: #A5D6A7;
      }
      .javascript-button-save:hover {
        background-color: var(--icon-button-background-hover);
      }
      .javascript-button-run {
        background-color: var(--icon-button-background);
        color: #81C784;
      }
      .javascript-button-run:hover {
        background-color: var(--icon-button-background-hover);
      }
      .javascript-button-debug {
        background-color: var(--icon-button-background);
        color: #FFB74D;
      }
      .javascript-button-debug:hover {
        background-color: var(--icon-button-background-hover);
      }
      .javascript-button-share {
        background-color: var(--icon-button-background);
        color: #9FA8DA;
      }
      .javascript-button-share:hover {
        background-color: var(--icon-button-background-hover);
      }
      .javascript-button-help {
        background-color: var(--icon-button-background);
        color: #CE93D8;
      }
      .javascript-button-help:hover {
        background-color: var(--icon-button-background-hover);
      }
      .javascript-button-stop {
        background-color: var(--icon-button-background);
        color: #ef4444;
      }
      .javascript-button-stop:hover {
        background-color: var(--icon-button-background-hover);
      }
      
      /* Icon border effect */
      .javascript-icon {
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
    const styles = document.querySelectorAll('style[data-javascript-style]');
    styles.forEach(style => style.remove());
  }
  
  handleButtonClick(action) {
    console.log(`Javascript button clicked: ${action}`);
    
    this.sendMessageToRoot(MESSAGES.ICON_ACTION, {
      action: action
    });    
  }
  
  /**
   * Get information about the Javascript icon bar for layout saving
   * @returns {Object} Icon information
   */
  getIconInfo() {
    return {
      mode: 'javascript'
    };
  }
}

export default JavascriptIcons;
