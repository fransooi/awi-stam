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
* @short AMOS 1.3 Icon Bar component - Inspired by the original AMOS 1.3 from 1988 for Amiga
*/
import BaseComponent from '../../../utils/BaseComponent.js'

class AMOS13Icons extends BaseComponent{
  constructor(parentId,containerId) {
    super('AMOS13Icons', parentId, containerId);
    this.shiftPressed = false;
    
    // Define function keys for normal state (F1-F10)
    this.functionKeysRow1 = [
      { key: 'F1', action: 'Help' },
      { key: 'F2', action: 'Direct' },
      { key: 'F3', action: 'Run' },
      { key: 'F4', action: 'Step' },
      { key: 'F5', action: 'Edit' }
    ];
    
    this.functionKeysRow2 = [
      { key: 'F6', action: 'Proc' },
      { key: 'F7', action: 'Files' },
      { key: 'F8', action: 'Menu' },
      { key: 'F9', action: 'Set' },
      { key: 'F10', action: 'Exit' }
    ];
    
    // Define function keys for shift state (F10-F19)
    this.shiftFunctionKeysRow1 = [
      { key: 'F10', action: 'Key 10' },
      { key: 'F11', action: 'Key 11' },
      { key: 'F12', action: 'Key 12' },
      { key: 'F13', action: 'Key 13' },
      { key: 'F14', action: 'Key 14' }
    ];
    
    this.shiftFunctionKeysRow2 = [
      { key: 'F15', action: 'Key 15' },
      { key: 'F16', action: 'Key 16' },
      { key: 'F17', action: 'Key 17' },
      { key: 'F18', action: 'Key 18' },
      { key: 'F19', action: 'Key 19' }
    ];
    
  }
  
  async init(options) {
    if (await super.init(options))
      return;
    // Add event listeners for shift key
    document.addEventListener('keydown', this.handleKeyDown.bind(this));
    document.addEventListener('keyup', this.handleKeyUp.bind(this));
  }
  async destroy() {
    super.destroy();
    if(this.amosIconBar)
    {
      document.removeEventListener('keydown', this.handleKeyDown.bind(this));
      document.removeEventListener('keyup', this.handleKeyUp.bind(this));
      this.parentContainer.removeChild(this.amosIconBar);
      this.amosIconBar=null;
      this.removeStyles();
    }
  }
  async render(containerId) {
    this.parentContainer=await super.render(containerId);
    this.parentContainer.innerHTML = '';
    this.layoutContainer=this.parentContainer;
    this.addStyles();

    // Create main container for AMOS icon bar
    this.amosIconBar = document.createElement('div');
    this.amosIconBar.className = 'amos-icon-bar';
    
    // Create top section container (logo + function keys)
    const topSection = document.createElement('div');
    topSection.className = 'amos-top-section';
    
    // Create logo area
    const logoArea = document.createElement('div');
    logoArea.className = 'amos-logo-area';
    
    // Create and add logo image
    const logoImage = document.createElement('img');
    logoImage.src = '/amos1_3/amos-13-logo.png';
    logoImage.alt = 'AMOS 1.3 Logo';
    logoImage.className = 'amos-logo-image';
    logoArea.appendChild(logoImage);
    
    // Create function keys container
    const functionKeysContainer = document.createElement('div');
    functionKeysContainer.className = 'amos-function-keys-container';
    
    // Create first row of function keys (F1-F5 or F10-F14)
    const functionKeysRow1 = document.createElement('div');
    functionKeysRow1.className = 'amos-function-keys-row';
    
    // Create second row of function keys (F6-F10 or F15-F19)
    const functionKeysRow2 = document.createElement('div');
    functionKeysRow2.className = 'amos-function-keys-row';
    
    // Get the current set of keys based on shift state
    const keysRow1 = this.shiftPressed ? this.shiftFunctionKeysRow1 : this.functionKeysRow1;
    const keysRow2 = this.shiftPressed ? this.shiftFunctionKeysRow2 : this.functionKeysRow2;
    
    // Add function keys for first row
    keysRow1.forEach(keyInfo => {
      this.addFunctionKey(keyInfo.key, keyInfo.action, functionKeysRow1);
    });
    
    // Add function keys for second row
    keysRow2.forEach(keyInfo => {
      this.addFunctionKey(keyInfo.key, keyInfo.action, functionKeysRow2);
    });
    
    // Add rows to function keys container
    functionKeysContainer.appendChild(functionKeysRow1);
    functionKeysContainer.appendChild(functionKeysRow2);
    
    // Add logo and function keys to top section
    topSection.appendChild(logoArea);
    topSection.appendChild(functionKeysContainer);
    
    // Create information list area
    const infoArea = document.createElement('div');
    infoArea.className = 'amos-info-area';
    infoArea.textContent = this.root.messages.getMessage('stam:amos-1.3-ready');
    
    // Add all sections to the main container
    this.amosIconBar.appendChild(topSection);
    this.amosIconBar.appendChild(infoArea);
    
    // Add the main container to the DOM
    this.parentContainer.appendChild(this.amosIconBar);
    
    // Remove any inline styles that might have been added previously
    const oldStyles = document.querySelectorAll('style[data-amos-style]');
    oldStyles.forEach(style => style.remove());
  }
  
  // Add AMOS1.3 style to document if not present
  addStyles() {
    const styles = document.querySelectorAll('style[data-amos-style]');
    if (styles.length > 0) {
      return;
    }

    const style = document.createElement('style');
    style.setAttribute('data-amos-style', true);

    /* AMOS 1.3 specific styling */
    style.textContent = `
      .amos-icon-bar {
        display: flex;
        flex-direction: column;
        width: 100%;
        font-family: 'Topaz', var(--font-status-bar);
        background-color: var(--background);
        color: var(--text-primary);
        box-sizing: border-box;
        padding: 10px;
        gap: 10px;
      }

      .amos-top-section {
        display: flex;
        width: 100%;
      }

      .amos-logo-area {
        display: flex;
        align-items: center;
        justify-content: center;
        background-color: #000000;
        border: 3px solid white;
        font-weight: bold;
        font-size: 16px;
        padding: 5px;
        width: 20%;
        height: 100%;
      }

      .amos-logo-image {
        max-width: 100%;
        max-height: 100%;
      }

      .amos-function-keys-container {
        display: flex;
        flex-direction: column;
        background-color: #000000;
        border: 3px solid white;
        border-left: none;
        padding: 5px;
        width: 80%;
        justify-content: center;
        gap: 8px;
      }

      .amos-function-keys-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        width: 100%;
        margin-bottom: 0;
      }

      .amos-function-keys-row:last-child {
        margin-bottom: 0;
      }

      .amos-info-area {
        background-color: #000000;
        border: 3px solid white;
        border-top: none;
        padding: 5px;
        font-size: 14px;
        text-align: center;
        width: 100%;
        margin-top: -10px;
      }

      .amos-function-key {
        background-color: #FF4500;
        color: white;
        border: none;
        padding: 2px 4px;
        text-align: center;
        cursor: pointer;
        font-family: inherit;
        font-size: 12px;
        margin: 0 2px;
        flex: 1;
        width: 20%;
      }

      .amos-function-key:hover {
        filter: brightness(1.2);
      }

      .amos-key-text {
        white-space: nowrap;
      }

      /* Special styling for specific function keys */
      .amos-function-key[data-key="F3"] {
        /* Run key */
        background-color: #FF0000;
      }

      .amos-function-key[data-key="F10"] {
        /* Exit key */
        background-color: #FF0000;
      }

      /* When in AMOS mode, change the icon bar background */
      .amos1_3-mode #icon-area {
        background-color: var(--background);
      }
    `;
    document.head.appendChild(style);
  }
  // Remove AMOS1.3 style from document if present
  removeStyles() {
    const styles = document.querySelectorAll('style[data-amos-style]');
    if (styles.length > 0) {
      styles.forEach(style => style.remove());
    }
  }
  handleKeyDown(event) {
    if (event.key === 'Shift' && !this.shiftPressed) {
      this.shiftPressed = true;
      this.updateFunctionKeys();
    }
  }
  
  handleKeyUp(event) {
    if (event.key === 'Shift' && this.shiftPressed) {
      this.shiftPressed = false;
      this.updateFunctionKeys();
    }
  }
  
  updateFunctionKeys() {
    const functionKeysRows = document.querySelectorAll('.amos-function-keys-row');
    if (functionKeysRows.length !== 2) return;
    
    const row1 = functionKeysRows[0];
    const row2 = functionKeysRows[1];
    
    // Clear existing keys
    row1.innerHTML = '';
    row2.innerHTML = '';
    
    // Add the appropriate keys based on shift state
    const keysRow1 = this.shiftPressed ? this.shiftFunctionKeysRow1 : this.functionKeysRow1;
    const keysRow2 = this.shiftPressed ? this.shiftFunctionKeysRow2 : this.functionKeysRow2;
    
    keysRow1.forEach(keyInfo => {
      this.addFunctionKey(keyInfo.key, keyInfo.action, row1);
    });
    
    keysRow2.forEach(keyInfo => {
      this.addFunctionKey(keyInfo.key, keyInfo.action, row2);
    });
  }

  
  addFunctionKey(key, action, parent) {
    const button = document.createElement('button');
    button.className = 'amos-function-key';
    button.dataset.key = key;
    button.dataset.action = action;
    
    // Create key+action text
    const buttonText = document.createElement('span');
    buttonText.className = 'amos-key-text';
    buttonText.textContent = `${key}:${action}`;
    button.appendChild(buttonText);
    
    // Add click event
    button.addEventListener('click', () => this.handleFunctionKeyClick(key, action));
    
    parent.appendChild(button);
  }
  
  handleFunctionKeyClick(key, action) {
    console.log(`AMOS Function Key clicked: ${key} - ${action}`);
  }
  
}

export default AMOS13Icons;
