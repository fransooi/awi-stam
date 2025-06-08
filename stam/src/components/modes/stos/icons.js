// STOS Basic Icon Bar component - Inspired by the original STOS Basic from 1987
import BaseComponent from '../../../utils/BaseComponent.js';

class STOSIcons extends BaseComponent{
  constructor(parentId,containerId) {
    super('STOSIcons', parentId, containerId);
    this.shiftPressed = false;
    
    // Define function keys for both states
    this.functionKeys = {
      normal: [
        { key: 'F1', action: 'Last Key' },
        { key: 'F2', action: 'List' },
        { key: 'F3', action: 'Listbank' },
        { key: 'F4', action: 'Load' },
        { key: 'F5', action: 'Save' },
        { key: 'F6', action: 'Run' },
        { key: 'F7', action: 'Dir' },
        { key: 'F8', action: 'Dir$=Dir$+"\\\"' },
        { key: 'F9', action: 'Previous' },
        { key: 'F10', action: 'Help' }
      ],
      shift: [
        { key: 'F10', action: 'Off' },
        { key: 'F11', action: 'Full' },
        { key: 'F12', action: 'Multi2' },
        { key: 'F13', action: 'Multi3' },
        { key: 'F14', action: 'Multi4' },
        { key: 'F15', action: 'Mode 0' },
        { key: 'F16', action: 'Mode 1' },
        { key: 'F17', action: 'Default' },
        { key: 'F18', action: 'Env' },
        { key: 'F19', action: 'Key List' }
      ]
    };    
  }
  async init(options) {
    if (await super.init(options))
      return;
    document.addEventListener('keydown', this.handleKeyDown.bind(this));
    document.addEventListener('keyup', this.handleKeyUp.bind(this));
  }
  async destroy() {
    super.destroy();
    if(this.stosIconsContainer)
    {
      document.removeEventListener('keydown', this.handleKeyDown.bind(this));
      document.removeEventListener('keyup', this.handleKeyUp.bind(this));
      this.parentContainer.removeChild(this.stosIconsContainer);
      this.stosIconsContainer=null;
      this.removeStyles();
    }
  }
  async render(containerId) {
    this.parentContainer=await super.render(containerId);
    this.parentContainer.innerHTML = '';
    this.layoutContainer=this.parentContainer;
    this.addStyles();

    // Create main container for STOS function keys
    this.stosIconsContainer = document.createElement('div');
    this.stosIconsContainer.className = 'stos-icons-container';
    
    // Create first row of function keys (F1-F5 or F10-F14)
    const firstRow = document.createElement('div');
    firstRow.className = 'stos-function-row';
    
    // Create second row of function keys (F6-F10 or F15-F19)
    const secondRow = document.createElement('div');
    secondRow.className = 'stos-function-row';
    
    // Get the current set of keys based on shift state
    const currentKeys = this.shiftPressed ? this.functionKeys.shift : this.functionKeys.normal;
    
    // Add first row (first 5 keys)
    for (let i = 0; i < 5; i++) {
      this.addFunctionKey(currentKeys[i].key, currentKeys[i].action, firstRow);
    }
    
    // Add second row (next 5 keys)
    for (let i = 5; i < 10; i++) {
      this.addFunctionKey(currentKeys[i].key, currentKeys[i].action, secondRow);
    }
    
    // Add rows to container
    this.stosIconsContainer.appendChild(firstRow);
    this.stosIconsContainer.appendChild(secondRow);
    
    // Add container to main container
    this.parentContainer.appendChild(this.stosIconsContainer);
    return this.stosIconsContainer;
  }
  
// Add styles to document iof they do not exist
addStyles() {
  const styles = document.querySelectorAll('style[data-stos-style]');
  if (styles.length > 0) {
    return;
  }

  const style = document.createElement('style');
  style.setAttribute('data-stos-style', true);

  style.textContent = `
    .stos-icons-container {
      display: flex;
      flex-direction: column;
      width: 100%;
      gap: 8px;
      font-family: 'Courier New', monospace;
      background-color: #000000;
      padding: 12px;
      border: 4px solid #FFFFFF;
      border-radius: 8px;
    }

    .stos-function-row {
      display: flex;
      width: 100%;
      gap: 8px;
      justify-content: space-between;
    }

    .stos-function-key {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      background-color: #FFFFFF;
      color: #000000;
      border: none;
      padding: 6px 8px;
      cursor: pointer;
      text-align: center;
      min-height: 30px;
      border-radius: 4px;
    }

    .stos-function-key:hover {
      background-color: #000000;
      color: #FFFFFF;
    }

    .stos-function-key:active {
      background-color: #000000;
      color: #FFFFFF;
    }

    .stos-key-text {
      font-size: 12px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 100%;
    }

    /* Special styling for F6 (Run) key - still using inverse colors but with a different base */
    .stos-function-key[data-key="F6"] {
      background-color: #FFFFFF;
      color: #000000;
      font-weight: bold;
    }

    .stos-function-key[data-key="F6"]:hover {
      background-color: #000000;
      color: #FFFFFF;
    }

    /* Shift indicator styling */
    .stos-shift-indicator {
      margin-top: 8px;
      padding: 4px;
      text-align: center;
      background-color: #000000;
      color: #FFFFFF;
      font-size: 12px;
      border: 1px solid #FFFFFF;
      border-radius: 4px;
    }

    /* When in STOS mode, change the icon bar background */
    .stos-mode #icon-area {
      background-color: var(--background);
      border-bottom: 1px solid var(--borders);
    }

    /* Remove previous STOS styling that's no longer needed */
    .stos-button-group,
    .stos-button,
    .stos-icon,
    .stos-text,
    .stos-key,
    .stos-action,
    .stos-button.run-button,
    .stos-button.run-button:hover,
    .stos-button.stop-button,
    .stos-button.stop-button:hover {
      /* Reset styles */
      background-color: initial;
      border-color: initial;
    }
  `;
    document.head.appendChild(style);
  }

  // Remove styles from document if not present
  removeStyles() {
    const styles = document.querySelectorAll('style[data-stos-style]');
    styles.forEach(style => style.remove());
  }

  handleKeyDown(event) {
    if (event.key === 'Shift' && !this.shiftPressed && this.stosIconsContainer)  {
      this.shiftPressed = true;
      this.render();
    }
  }
  
  handleKeyUp(event) {
    if (event.key === 'Shift' && this.shiftPressed && this.stosIconsContainer) {
      this.shiftPressed = false;
      this.render();
    }
  }

  addFunctionKey(key, action, parent) {
    const button = document.createElement('button');
    button.className = 'stos-function-key';
    button.dataset.key = key;
    button.dataset.action = action;
    
    // Create a single text element with the format "Fxx: action"
    const textContent = document.createElement('span');
    textContent.className = 'stos-key-text';
    textContent.textContent = `${key}: ${action}`;
    button.appendChild(textContent);
    
    // Add click event
    button.addEventListener('click', () => this.handleFunctionKeyClick(key, action));    
    parent.appendChild(button);
  }
  
  handleFunctionKeyClick(key, action) {
    console.log(`STOS Function Key clicked: ${key} - ${action}`);
  }
}

export default STOSIcons;
