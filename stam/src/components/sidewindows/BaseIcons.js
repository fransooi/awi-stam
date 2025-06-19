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
* @file BaseIcons.js
* @author FL (Francois Lionet)
* @version 0.5
*
* @short Root class for mode-dependante icons
*/
import BaseComponent, { MESSAGES } from '../../utils/BaseComponent.js';
import { MENUCOMMANDS } from '../MenuBar.js';
import { PROJECTMESSAGES } from '../ProjectManager.js';

export default class BaseIcons extends BaseComponent {
  constructor(componentName,parentId,containerId = null) {
    super(componentName, parentId, containerId);
    this.buttons = [];
    this.currentMode = this.root.currentMode;
    this.messageMap[MENUCOMMANDS.UPDATE_MENU_ITEMS] = this.handleUpdateMenuItems;
    this.messageMap[PROJECTMESSAGES.PROJECT_RUNNED] = this.handleProjectRunned;
    this.messageMap[PROJECTMESSAGES.PROJECT_STOPPED] = this.handleProjectStopped;
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
  async render(containerId, doRender=true) {
    if (this.layoutContainer)
      return this.layoutContainer;
    this.parentContainer=await super.render(containerId);
    if (!doRender)
      return this.parentContainer;

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
    
    // Create mode buttons with Font Awesome icons
    this.addButton('stam:new-text', MENUCOMMANDS.NEW_FILE, 'new', 'fa-file');
    this.addButton('stam:open-text', MENUCOMMANDS.OPEN_FILE, 'open', 'fa-folder-open');
    this.addButton('stam:save-text', MENUCOMMANDS.SAVE_FILE, 'save', 'fa-save');
    this.addButton('stam:run-text', MENUCOMMANDS.RUN_PROGRAM, 'run', 'fa-play');
    this.addButton('stam:debug-text', MENUCOMMANDS.DEBUG_PROGRAM, 'debug', 'fa-bug');
    this.addButton('stam:share-text', MENUCOMMANDS.SHARE_PROGRAM, 'share', 'fa-share-alt');
    this.addButton('stam:help-text', MENUCOMMANDS.HELP, 'help', 'fa-question-circle');
    
    return this.parentContainer;
  }
  
  replaceButton(oldClassName, newClassName, text, action, iconClass) {  
    let button = this.buttons.find(button => button.className.includes(oldClassName));
    if (!button)
      return;
    button.className = `${this.currentMode}-button ${this.currentMode}-button-${newClassName}`;
    button.title = this.root.messages.getMessage(text);
    button.dataset.action=action;
    button.dataset.key = newClassName;
    let icon = button.querySelector(`.${this.currentMode}-icon`);
    if (icon)
      icon.className = `fas ${iconClass} ${this.currentMode}-icon`;
  }
  addButton(text, action, className, iconClass) {
    const button = document.createElement('button');
    button.className = `${this.currentMode}-button ${this.currentMode}-button-${className}`;
    button.title = this.root.messages.getMessage(text); 
    button.dataset.action = action;
    button.dataset.key = className;

    // Create icon element with black border effect
    const icon = document.createElement('i');
    icon.className = `fas ${iconClass} ${this.currentMode}-icon`;
    icon.style.fontSize = '24px'; // Double size icons
    button.appendChild(icon);

    // No text span anymore, just the icon    
    button.addEventListener('click', () => {
      this.broadcast(button.dataset.action, { key: button.dataset.key });
    });
    this.layoutContainer.appendChild(button);
    this.buttons.push(button);
  }
  handleProjectRunned(data, sender) {
    if (this.buttons && this.buttons.length > 0)
      this.replaceButton('run', 'stop', 'stam:stop-text', PROJECTMESSAGES.STOP_PROJECT, 'fa-stop');
  }
  handleProjectStopped(data, sender) {
    if (this.buttons && this.buttons.length > 0)
      this.replaceButton('stop', 'run', 'stam:run-text', PROJECTMESSAGES.RUN_PROJECT, 'fa-play');
  }  
  // add styles to document if not present
  addStyles() {
    const styles = document.querySelectorAll('style[data-javascript-style]');
    if (styles.length > 0) {
      return;
    }

    const style = document.createElement('style');
    style.setAttribute(`data-${this.currentMode}-style`, true);

    style.textContent = `
      .${this.currentMode}-button {
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
      .${this.currentMode}-button:disabled {
        cursor: not-allowed;
        opacity: 0.5;
      }
      .${this.currentMode}-button:hover {
        background-color: var(--icon-button-background-hover);
      }
      .${this.currentMode}-button-new {
        background-color: var(--icon-button-background);
        color: #90CAF9;
      }
      .${this.currentMode}-button-new:hover {
        background-color: var(--icon-button-background-hover);
      }
      .${this.currentMode}-button-open {
        background-color: var(--icon-button-background);
        color: #FFE082;
      }
      .${this.currentMode}-button-open:hover {
        background-color: var(--icon-button-background-hover);
      }
      .${this.currentMode}-button-save {
        background-color: var(--icon-button-background);
        color: #A5D6A7;
      }
      .${this.currentMode}-button-save:hover {
        background-color: var(--icon-button-background-hover);
      }
      .${this.currentMode}-button-run {
        background-color: var(--icon-button-background);
        color: #81C784;
      }
      .${this.currentMode}-button-run:hover {
        background-color: var(--icon-button-background-hover);
      }
      .${this.currentMode}-button-debug {
        background-color: var(--icon-button-background);
        color: #FFB74D;
      }
      .${this.currentMode}-button-debug:hover {
        background-color: var(--icon-button-background-hover);
      }
      .${this.currentMode}-button-share {
        background-color: var(--icon-button-background);
        color: #9FA8DA;
      }
      .${this.currentMode}-button-share:hover {
        background-color: var(--icon-button-background-hover);
      }
      .${this.currentMode}-button-help {
        background-color: var(--icon-button-background);
        color: #CE93D8;
      }
      .${this.currentMode}-button-help:hover {
        background-color: var(--icon-button-background-hover);
      }
      .${this.currentMode}-button-stop {
        background-color: var(--icon-button-background);
        color: #ef4444;
      }
      .${this.currentMode}-button-stop:hover {
        background-color: var(--icon-button-background-hover);
      }
      
      /* Icon border effect */
      .${this.currentMode}-icon {
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
    const styles = document.querySelectorAll(`style[data-${this.componentName}-style]`);
    styles.forEach(style => style.remove());
  }
  
  findButton(key) {
    return this.buttons.find(button => button.dataset.key == key);
  }
  handleUpdateMenuItems(data, sender) {
    let { socketInfo, projectInfo, classroomInfo, editorInfo } = data;
    projectInfo = projectInfo || { projectLoaded: false };
    this.findButton('new').disabled = !projectInfo.projectLoaded;
    this.findButton('open').disabled = !projectInfo.projectLoaded;
    var stopButton = this.findButton('stop');
    if (stopButton)
      stopButton.disabled = !projectInfo.projectLoaded;
    var runButton = this.findButton('run')
    if (runButton)
      runButton.disabled = !projectInfo.projectLoaded;
    this.findButton('share').disabled = !projectInfo.projectLoaded;
    this.findButton('help').disabled = !projectInfo.projectLoaded;
    this.findButton('debug').disabled = true;
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
