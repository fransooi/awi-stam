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
        min-height: 80px;
        font-family: 'Topaz', monospace;
        background-color: #000000;
        color: #FFFFFF;
        box-sizing: border-box;
        border: 2px solid #FFFFFF;
        padding: 8px;
        gap: 8px;
        margin: 0;
      }

      .amos-top-section {
        display: flex;
        width: 100%;
        height: 60px;
        border-bottom: 1px solid #FFFFFF;
      }

      .amos-logo-area {
        display: flex;
        align-items: center;
        justify-content: center;
        background-color: #000000;
        border-right: 1px solid #FFFFFF;
        width: 240px;
        padding: 0px;
      }

      .amos-logo-image {
        max-width: 100%;
        max-height: 100%;
        object-fit: fill;
        image-rendering: pixelated;
      }

      .amos-function-keys-container {
        display: flex;
        flex-direction: column;
        background-color: #000000;
        flex: 1;
        height: 100%;
      }

      .amos-function-keys-row {
        display: flex;
        height: 50%;
        width: 100%;
        margin: 0;
        padding: 0;
      }

      .amos-function-keys-row:first-child {
        border-bottom: 1px solid #333333;
      }

      .amos-info-area {
        background-color: #000000;
        color: #FFFFFF;
        font-family: 'Topaz', monospace;
        font-size: 14px;
        text-align: center;
        padding: 4px 0;
        width: 100%;
        border-top: 1px solid #333333;
      }

      .amos-function-key {
        background-color: #FF6A00;
        color: white;
        border: none;
        border-right: 4px solid #000000;
        border-left: 4px solid #000000;
        border-top: 0px solid #000000;
        border-bottom: 4px solid #000000;
        padding: 2px 4px;
        text-align: center;
        cursor: pointer;
        font-family: 'Topaz', monospace;
        font-size: 14px;
        margin: 0;
        flex: 1;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        min-width: 0;
        white-space: nowrap;
        overflow: hidden;
      }

      .amos-function-key:last-child {
        border-right: none;
      }

      .amos-function-key:hover {
        opacity: 0.7;
      }

      .amos-key-text {
        display: block;
        text-align: center;
        width: 100%;
        pointer-events: none;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      /* When in AMOS mode, change the icon bar background */
      .amos1_3-mode #icon-area {
        background-color: #000000;
        padding: 0;
        min-height: 80px;
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
