// STOS Basic Icon Bar component - Inspired by the original STOS Basic from 1987
import BaseIcons from '../../BaseIcons.js';

export const STOSCOMMANDS = {
  F1: 'STOS_F1',
  F2: 'STOS_F2',
  F3: 'STOS_F3',
  F4: 'STOS_F4',
  F5: 'STOS_F5',
  F6: 'STOS_F6',
  F7: 'STOS_F7',
  F8: 'STOS_F8',
  F9: 'STOS_F9',
  F10: 'STOS_F10',
  F11: 'STOS_F11',
  F12: 'STOS_F12',
  F13: 'STOS_F13',
  F14: 'STOS_F14',
  F15: 'STOS_F15',
  F16: 'STOS_F16',
  F17: 'STOS_F17',
  F18: 'STOS_F18',
  F19: 'STOS_F19',
};

class STOSIcons extends BaseIcons{
  constructor(parentId,containerId) {
    super('STOSIcons', parentId, containerId);
    this.shiftPressed = false;
    
    // Define function keys for both states
    this.functionKeys = {
      normal: [
        { key: 'F1', action: STOSCOMMANDS.F1, text: 'Last Key' },
        { key: 'F2', action: STOSCOMMANDS.F2, text: 'List' },
        { key: 'F3', action: STOSCOMMANDS.F3, text: 'Listbank' },
        { key: 'F4', action: STOSCOMMANDS.F4, text: 'Load' },
        { key: 'F5', action: STOSCOMMANDS.F5, text: 'Save' },
        { key: 'F6', action: STOSCOMMANDS.F6, text: 'Run' },
        { key: 'F7', action: STOSCOMMANDS.F7, text: 'Dir' },
        { key: 'F8', action: STOSCOMMANDS.F8, text: 'Dir$=Dir$+"\\\"' },
        { key: 'F9', action: STOSCOMMANDS.F9, text: 'Previous' },
        { key: 'F10', action: STOSCOMMANDS.F10, text: 'Help' }
      ],
      shift: [
        { key: 'F10', action: STOSCOMMANDS.F11, text: 'Off' },
        { key: 'F11', action: STOSCOMMANDS.F12, text: 'Full' },
        { key: 'F12', action: STOSCOMMANDS.F13, text: 'Multi2' },
        { key: 'F13', action: STOSCOMMANDS.F14, text: 'Multi3' },
        { key: 'F14', action: STOSCOMMANDS.F15, text: 'Multi4' },
        { key: 'F15', action: STOSCOMMANDS.F16, text: 'Mode 0' },
        { key: 'F16', action: STOSCOMMANDS.F17, text: 'Mode 1' },
        { key: 'F17', action: STOSCOMMANDS.F18, text: 'Default' },
        { key: 'F18', action: STOSCOMMANDS.F19, text: 'Env' },
        { key: 'F19', action: STOSCOMMANDS.F20, text: 'Key List' }
      ]
    };    
  }
  async init(options) {
    document.addEventListener('keydown', this.handleKeyDown.bind(this));
    document.addEventListener('keyup', this.handleKeyUp.bind(this));
  }
  async destroy() {
    if(this.stosIconsContainer)
    {
      document.removeEventListener('keydown', this.handleKeyDown.bind(this));
      document.removeEventListener('keyup', this.handleKeyUp.bind(this));
      this.parentContainer.removeChild(this.stosIconsContainer);
      this.stosIconsContainer=null;
      this.removeStyles();
      this.parentContainer.style.backgroundColor = 'var(--container-background)';
      this.buttons = [];
    }
  }
  async render(containerId) {
    this.parentContainer=await super.render(containerId, false);
    this.parentContainer.innerHTML = '';
    this.layoutContainer=this.parentContainer;
    this.addStyles();
    this.buttons = [];
    this.parentContainer.style.backgroundColor = 'var(--container-background)';

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
      this.addFunctionKey(currentKeys[i].key, currentKeys[i].action, currentKeys[i].text, firstRow);
    }
    
    // Add second row (next 5 keys)
    for (let i = 5; i < 10; i++) {
      this.addFunctionKey(currentKeys[i].key, currentKeys[i].action, currentKeys[i].text, secondRow);
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

  replaceFunctionKey(oldKey, newKey, action, text){
    let button = this.buttons.find(button => button.dataset.key === oldKey);
    if (!button)
      return;
    button.dataset.key = newKey;
    button.dataset.action = action;
    button.dataset.text = text;
    let textContent = button.querySelector('.stos-key-text');
    if (textContent)
      textContent.textContent = `${text}`;
  }

  addFunctionKey(key, action, text, parent) {
    const button = document.createElement('button');
    button.className = 'stos-function-key';
    if ( text.indexOf('stam:') == 0)
      text = this.root.messages.getMessage(text);
    button.dataset.text = text;
    button.dataset.action = action;
    button.dataset.key = key;
    
    // Create a single text element with the format "Fxx: action"
    const textContent = document.createElement('span');
    textContent.className = 'stos-key-text';
    textContent.textContent = `${text}`;
    button.appendChild(textContent);
    
    // Add click event    
    button.addEventListener('click', () => {
      this.broadcast( button.dataset.action, { text: button.dataset.text , key: button.dataset.key, fromIcon: true } );
    });
    parent.appendChild(button);
    this.buttons.push(button);
  }
  
  handleProjectRunned(data, sender) {
    this.replaceFunctionKey('F6', 'F6', MENUCOMMANDS.STOP_PROJECT, 'Stop');
  }
  handleProjectStopped(data, sender) {
    this.replaceFunctionKey('F6', 'F6', MENUCOMMANDS.RUN_PROJECT, 'Run');
  }  

}

export default STOSIcons;
