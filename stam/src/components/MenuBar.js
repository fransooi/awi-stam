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
* @file MenuBar.js
* @author FL (Francois Lionet)
* @version 0.5
*
* @short Reusable popup menu component for menus and context menus
* @description
* This class provides a default implementation of the StatusBar component.
* It extends the BaseComponent class and implements the necessary methods
* for handling status updates and temporary status messages.
*/
import BaseComponent, { MESSAGES } from '../utils/BaseComponent.js';
import PopupMenu from './PopupMenu.js';
import { SOCKETMESSAGES } from '../components/sidewindows/SocketSideWindow.js';
import { CLASSROOMCOMMANDS } from '../components/ClassroomManager.js';

// Define message types for preference handling
export const MENUCOMMANDS = {
  NEW_PROJECT: 'MENU_NEW_PROJECT',
  OPEN_PROJECT: 'MENU_OPEN_PROJECT',
  SAVE_PROJECT: 'MENU_SAVE_PROJECT',
  SAVE_AS_PROJECT: 'MENU_SAVEAS_PROJECT',
  CLOSE_PROJECT: 'MENU_CLOSE_PROJECT',
  NEW_FILE: 'MENU_NEW_FILE',
  OPEN_FILE: 'MENU_OPEN_FILE',
  OPEN_WITH: 'MENU_OPEN_WITH',
  OPEN_FOLDER: 'MENU_OPEN_FOLDER',
  SAVE_FILE: 'MENU_SAVE_FILE',
  SAVE_AS_FILE: 'MENU_SAVEAS_FILE',
  CLOSE_FILE: 'MENU_CLOSE_FILE',
  UNDO: 'MENU_UNDO',
  REDO: 'MENU_REDO',
  CUT: 'MENU_CUT',
  COPY: 'MENU_COPY',
  PASTE: 'MENU_PASTE',
  RENAME: 'MENU_RENAME',
  DELETE: 'MENU_DELETE',
  FIND: 'MENU_FIND',
  REPLACE: 'MENU_REPLACE',
  PREFERENCES: 'MENU_PREFERENCES',
  RUN: 'MENU_RUN',
  DEBUG: 'MENU_DEBUG',
  STOP: 'MENU_STOP',
  BUILD: 'MENU_BUILD',
  DOCUMENTATION: 'MENU_DOCUMENTATION',
  ABOUT: 'MENU_ABOUT',
  DEBUG1: 'MENU_DEBUG1',
  DEBUG2: 'MENU_DEBUG2',
  LOGIN: 'MENU_LOGIN',
  LOGOUT: 'MENU_LOGOUT',
  HELP: 'MENU_HELP'
};


class MenuBar extends BaseComponent {
  constructor(parentId, containerId) {
    // Initialize the base component with component name
    super('MenuBar', parentId, containerId);
    
    this.activeMenu = null;
    this.menuStructure = [];
    this.menuItems = {}; 
    this.activePopupMenu = null; 
    this.messageMap[MESSAGES.MODE_CHANGE] = this.handleModeChange;
    this.messageMap[SOCKETMESSAGES.CONNECTED] = this.handleConnected;
    this.messageMap[SOCKETMESSAGES.DISCONNECTED] = this.handleDisconnected;
    this.messageMap[CLASSROOMCOMMANDS.CLASSROOM_JOINED] = this.handleClassroomJoined;
    this.messageMap[CLASSROOMCOMMANDS.CLASSROOM_LEFT] = this.handleClassroomLeft;
  }

  async init(options={}) {
    if (await super.init(options))
      return;
    this.menuStructure = this.getDefaultMenuStructure();
    if(options.mode) {
      this.setMode(options.mode);
    }
    document.addEventListener('click', this.handleDocumentClick.bind(this));
  }

  async destroy() {
    document.removeEventListener('click', this.handleDocumentClick.bind(this));
    if (this.menuItemsContainer) {
      this.parentContainer.removeChild(this.menuItemsContainer);
      this.menuItemsContainer=null;
    }
    if (this.modeSelectorContainer) {
      this.parentContainer.removeChild(this.modeSelectorContainer);
      this.modeSelectorContainer=null;
    }
    if (this.loginButtonContainer) {
      this.parentContainer.removeChild(this.loginButtonContainer);
      this.loginButtonContainer=null;
    }
    if (this.classroomButtonContainer) {
      this.parentContainer.removeChild(this.classroomButtonContainer);
      this.classroomButtonContainer=null;
    }
    if (this.rightContainer) {
      this.parentContainer.removeChild(this.rightContainer);
      this.rightContainer=null;
    }
    super.destroy();
  }

  async render(containerId) {
    this.parentContainer=await super.render(containerId);
    this.parentContainer.innerHTML = '';
    
    // Set parent container to use flexbox for better layout control
    this.parentContainer.style.display = 'flex';
    this.parentContainer.style.flexDirection = 'row';
    this.parentContainer.style.justifyContent = 'space-between';
    this.parentContainer.style.alignItems = 'center';
  
    // Create menu items container (left side)
    this.menuItemsContainer = document.createElement('div');
    this.menuItemsContainer.className = 'menu-items-container';
    this.menuItemsContainer.style.display = 'flex';
    this.menuItemsContainer.style.flexDirection = 'row';
    
    // Clear existing menu items references before re-rendering
    this.menuItems = {};
    
    // Create top-level menu items based on the updated menu structure
    this.menuStructure.forEach(menuItem => {
      const menuElement = document.createElement('div');
      menuElement.className = 'menu-item';
      
      const menuTitle = document.createElement('div');
      menuTitle.className = 'menu-title';
      menuTitle.textContent = menuItem.name;
      menuTitle.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleMenu(menuItem, menuElement);
      });
      
      menuElement.appendChild(menuTitle);
      this.menuItemsContainer.appendChild(menuElement);
      
      // Store reference to the menu title element
      this.menuItems[menuItem.name] = menuElement;
    });
    
    // Add menu items container to the main container
    this.parentContainer.appendChild(this.menuItemsContainer);

    // Create a container for the right-side elements
    this.rightContainer = document.createElement('div');
    this.rightContainer.className = 'right-container';
    this.rightContainer.style.display = 'flex';
    this.rightContainer.style.flexDirection = 'row';
    this.rightContainer.style.alignItems = 'center';

    // Create classroom button container
    this.classroomButtonContainer = document.createElement('div');
    this.classroomButtonContainer.className = 'classroom-button-container';
    this.createClassroomButton(this.classroomButtonContainer);
    this.rightContainer.appendChild(this.classroomButtonContainer);
    
    // Create login button container
    this.loginButtonContainer = document.createElement('div');
    this.loginButtonContainer.className = 'login-button-container';
    this.createLoginButton(this.loginButtonContainer);
    this.rightContainer.appendChild(this.loginButtonContainer);

    // Create mode selector container
    this.modeSelectorContainer = document.createElement('div');
    this.modeSelectorContainer.className = 'mode-selector-container';
    this.createModeSelector(this.modeSelectorContainer);
    this.rightContainer.appendChild(this.modeSelectorContainer);
    
    // Add the right container to the main container
    this.parentContainer.appendChild(this.rightContainer);

    // Prevent default context menu on the menu bar
    this.parentContainer.addEventListener('contextmenu', (e) => {
      if (!e.defaultPrevented) e.preventDefault();
    });

    return this.parentContainer;
  }
  
  createModeSelector(container) {
    const modeSelector = document.createElement('select');
    modeSelector.id = 'mode-selector';
    modeSelector.className = 'mode-selector';
    
    const modes = this.root.possibleModes;    
    modes.forEach(mode => {
      const option = document.createElement('option');
      option.value = mode.value;
      option.textContent = mode.text;
      if (mode.value === this.currentMode) {
        option.selected = true;
      }
      modeSelector.appendChild(option);
    });
    
    modeSelector.addEventListener('change', (e) => {
      const newMode = e.target.value;
      
      // Send mode change message DOWN toward the root (StamApp)
      this.sendMessageToRoot('MODE_CHANGED', {
        mode: newMode
      });
    });
    
    container.appendChild(modeSelector);
  }
  
  /**
   * Create the classroom button in the menu bar
   * @param {HTMLElement} container - The container to add the button to
   */
  createClassroomButton(container) {
    const classroomButton = document.createElement('button');
    classroomButton.id = 'classroom-button';
    classroomButton.className = 'classroom-button';
    classroomButton.title = this.root.messages.getMessage('stam:join-classroom');
    
    // Apply styles to match the menu bar height and appearance using theme variables
    classroomButton.style.backgroundColor = 'var(--button-positive, #1a73e8)';
    classroomButton.style.color = 'var(--text-positive, #ffffff)';
    classroomButton.style.border = '1px solid var(--button-positive, #1a73e8)';
    classroomButton.style.borderRadius = '4px';
    classroomButton.style.padding = '4px 12px';
    classroomButton.style.margin = '0 4px';
    classroomButton.style.fontSize = '12px';
    classroomButton.style.fontWeight = '500';
    classroomButton.style.cursor = 'pointer';
    classroomButton.style.transition = 'all 0.2s ease';
    classroomButton.style.display = 'flex';
    classroomButton.style.alignItems = 'center';
    classroomButton.style.height = '24px';
    classroomButton.style.justifyContent = 'center';
    classroomButton.style.transition = 'all 0.2s ease';
    classroomButton.style.height = 'calc(100% - 10px)';
    
    // Create icon element
    const icon = document.createElement('i');
    icon.className = 'fas fa-sign-in-alt';
    icon.style.marginRight = '5px';
    classroomButton.appendChild(icon);
    
    // Add text
    const text = document.createElement('span');
    text.textContent = this.root.messages.getMessage('stam:join-classroom');
    classroomButton.appendChild(text);

    // Add hover and active effects using the shared method
    this.addButtonEffects(classroomButton,true);
    
    // Add click event listener to send button action to root
    classroomButton.addEventListener('click', () => {
      this.broadcast(CLASSROOMCOMMANDS.JOIN_CLASSROOM);
    });
    
    container.appendChild(classroomButton);
  }
  
  /**
   * Create the login button in the menu bar
   * @param {HTMLElement} container - The container to add the button to
   */
  createLoginButton(container) {
    const loginButton = document.createElement('button');
    loginButton.id = 'login-button';
    loginButton.className = 'login-button';
    loginButton.title = this.root.messages.getMessage('stam:menu-log-in');
    
    // Apply styles to match the menu bar height and appearance using theme variables
    loginButton.style.backgroundColor = 'var(--button-positive, #1a73e8)';
    loginButton.style.color = 'var(--text-positive, #ffffff)';
    loginButton.style.border = '1px solid var(--button-positive, #1a73e8)';
    loginButton.style.borderRadius = '4px';
    loginButton.style.padding = '4px 12px';
    loginButton.style.margin = '0 4px';
    loginButton.style.fontSize = '12px';
    loginButton.style.fontWeight = '500';
    loginButton.style.cursor = 'pointer';
    loginButton.style.transition = 'all 0.2s ease';
    loginButton.style.display = 'flex';
    loginButton.style.alignItems = 'center';
    loginButton.style.height = '24px';
    loginButton.style.justifyContent = 'center';
    loginButton.style.transition = 'all 0.2s ease';
    loginButton.style.height = 'calc(100% - 10px)';
    
    // Create icon element
    const icon = document.createElement('i');
    icon.className = 'fas fa-sign-in-alt';
    icon.style.marginRight = '5px';
    loginButton.appendChild(icon);
    
    // Add text
    const text = document.createElement('span');
    text.textContent = this.root.messages.getMessage('stam:menu-log-in');
    loginButton.appendChild(text);
    
    // Add hover and active effects using the shared method
    this.addButtonEffects(loginButton,true);
    
    // Add click event listener to send button action to root
    loginButton.addEventListener('click', () => {
      this.broadcast(MENUCOMMANDS.LOGIN);
    });
    
    container.appendChild(loginButton);
  }
  
  getDefaultMenuStructure() {
    return [
      { name: this.root.messages.getMessage('stam:menu-file'), items: [
        { name: this.root.messages.getMessage('stam:menu-new-project'), command: MENUCOMMANDS.NEW_PROJECT },
        { name: this.root.messages.getMessage('stam:menu-open-project'), command: MENUCOMMANDS.OPEN_PROJECT },
        { name: this.root.messages.getMessage('stam:menu-save-project'), command: MENUCOMMANDS.SAVE_PROJECT },
        { name: this.root.messages.getMessage('stam:menu-save-project-as'), command: MENUCOMMANDS.SAVE_AS_PROJECT },
        { name: this.root.messages.getMessage('stam:menu-close-project'), command: MENUCOMMANDS.CLOSE_PROJECT },
        '-',
        { name: this.root.messages.getMessage('stam:menu-new-file'), command: MENUCOMMANDS.NEW_FILE },
        { name: this.root.messages.getMessage('stam:menu-open-file'), command: MENUCOMMANDS.OPEN_FILE },
        { name: this.root.messages.getMessage('stam:menu-save-file'), command: MENUCOMMANDS.SAVE_FILE },
        { name: this.root.messages.getMessage('stam:menu-save-file-as'), command: MENUCOMMANDS.SAVE_AS_FILE },
        { name: this.root.messages.getMessage('stam:menu-close-file'), command: MENUCOMMANDS.CLOSE_FILE }
      ] },
      { name: this.root.messages.getMessage('stam:menu-edit'), items: [
        { name: this.root.messages.getMessage('stam:menu-undo'), command: MENUCOMMANDS.UNDO },
        { name: this.root.messages.getMessage('stam:menu-redo'), command: MENUCOMMANDS.REDO },
        '-',
        { name: this.root.messages.getMessage('stam:menu-cut'), command: MENUCOMMANDS.CUT },
        { name: this.root.messages.getMessage('stam:menu-copy'), command: MENUCOMMANDS.COPY },
        { name: this.root.messages.getMessage('stam:menu-paste'), command: MENUCOMMANDS.PASTE },
        { name: this.root.messages.getMessage('stam:menu-find'), command: MENUCOMMANDS.FIND },
        { name: this.root.messages.getMessage('stam:menu-replace'), command: MENUCOMMANDS.REPLACE },
        '-',
        { name: this.root.messages.getMessage('stam:menu-preferences'), command: MENUCOMMANDS.PREFERENCES }
      ] },
      { name: this.root.messages.getMessage('stam:menu-classroom'), items: [
        { name: this.root.messages.getMessage('stam:menu-create-classroom'), command: CLASSROOMCOMMANDS.CREATE_CLASSROOM },
        { name: this.root.messages.getMessage('stam:menu-join-classroom'), command: CLASSROOMCOMMANDS.JOIN_CLASSROOM },
        { name: this.root.messages.getMessage('stam:menu-leave-classroom'), command: CLASSROOMCOMMANDS.LEAVE_CLASSROOM }
      ] },
      { name: this.root.messages.getMessage('stam:menu-run'), items: [
        { name: this.root.messages.getMessage('stam:menu-run-run'), command: MENUCOMMANDS.RUN },
        { name: this.root.messages.getMessage('stam:menu-run-debug'), command: MENUCOMMANDS.DEBUG },
        { name: this.root.messages.getMessage('stam:menu-run-stop'), command: MENUCOMMANDS.STOP },
        { name: this.root.messages.getMessage('stam:menu-run-build'), command: MENUCOMMANDS.BUILD }
      ] },
      { name: this.root.messages.getMessage('stam:menu-help'), items: [
        { name: this.root.messages.getMessage('stam:menu-help-documentation'), command: MENUCOMMANDS.DOCUMENTATION },
        { name: this.root.messages.getMessage('stam:menu-help-about'), command: MENUCOMMANDS.ABOUT },
        { name: this.root.messages.getMessage('stam:menu-help-debug'), items: [
          { name: this.root.messages.getMessage('stam:menu-help-debug-debug1'), command: MENUCOMMANDS.DEBUG1 },
          { name: this.root.messages.getMessage('stam:menu-help-debug-debug2'), command: MENUCOMMANDS.DEBUG2 }
        ] }
      ] }
    ];
  }
  
  toggleMenu(menuData, menuElement) {
    // Close the active popup menu if it exists
    if (this.activePopupMenu) {
      this.activePopupMenu.destroy();
      this.activePopupMenu = null;
      
      // If this was the active menu, it's now closed, so we're done
      if (this.activeMenu === menuData.name) {
        this.activeMenu = null;
        return;
      }
    }
    
    // Set this as the active menu
    this.activeMenu = menuData.name;
    
    // If no menu items found for this menu, log error and return
    if (!menuData.items || menuData.items.length === 0) {
      console.error(`No menu items found for menu: ${menuData.name}`);
      return;
    }
    
    // Get the position for the popup menu
    const rect = menuElement.getBoundingClientRect();
    const position = {
      x: rect.left,
      y: rect.bottom
    };
    
    // Create and show the popup menu with recursive structure
    this.activePopupMenu = new PopupMenu(this.getComponentID(), {
      items: menuData.items,
      position: position,
      menuContext: menuData.name
    });
    
    this.activePopupMenu.show();
  }
  
  closeAllMenus() {
    if (this.activePopupMenu) {
      this.activePopupMenu.hide();
      this.activePopupMenu = null;
    }
    this.activeMenu = null;
  }
  
  handleDocumentClick() {
    this.closeAllMenus();
  }
  
  setMenuStructure(structure) {
    // Update the menu structure with the new structure
    this.menuStructure = structure;
    // Re-render the menu to reflect the changes
    this.render();
  }
  
  addMenuItem(menuName, option) {
    if (!this.menuStructure[menuName]) {
      this.menuStructure[menuName] = [];
    }
    
    if (!this.menuStructure[menuName].includes(option)) {
      this.menuStructure[menuName].push(option);
      this.render();
    }
  }
  
  removeMenuItem(menuName, option) {
    if (this.menuStructure[menuName]) {
      const index = this.menuStructure[menuName].indexOf(option);
      if (index !== -1) {
        this.menuStructure[menuName].splice(index, 1);
        this.render();
      }
    }
  }
  
  setMode(mode) {
    this.currentMode = mode;
    const modeSelector = document.getElementById('mode-selector');
    if (modeSelector) {
      modeSelector.value = mode;
    }
  }
  
  /**
   * Handle mode change message
   * @param {Object} data - Message data
   * @param {string} sender - Sender ID
   * @returns {boolean} - Whether the message was handled
   */
  async handleModeChange(data, sender) {
    if (data.mode) {
      this.setMode(data.mode);
      return true;
    }
    return false;
  }

  async handleClassroomJoined(data, sender) {
    // Update classroom button to show "Leave Classroom" state
    const classroomButton = document.getElementById('classroom-button');
    if (classroomButton) {
      // Clone the button to remove all event listeners
      const newClassroomButton = classroomButton.cloneNode(true);
      classroomButton.parentNode.replaceChild(newClassroomButton, classroomButton);
      
      // Update button title and text
      newClassroomButton.title = this.root.messages.getMessage('stam:menu-leave-classroom');
      
      // Update icon
      const icon = newClassroomButton.querySelector('i');  
      if (icon) {
        icon.className = 'fas fa-sign-out-alt';
      }
      
      // Update text
      const text = newClassroomButton.querySelector('span');
      if (text) {
        text.textContent = this.root.messages.getMessage('stam:menu-leave-classroom');
      }
      
      // Update click handler
      newClassroomButton.addEventListener('click', () => {
        this.broadcast(CLASSROOMCOMMANDS.LEAVE_CLASSROOM);
      });
      
      // Update button colors for leave classroom state
      this.addButtonEffects(newClassroomButton,false);
    }
    return true;
  }

  async handleClassroomLeft(data, sender) {
    // Update classroom button to show "Join Classroom" state
    const classroomButton = document.getElementById('classroom-button');
    if (classroomButton) {
      // Clone the button to remove all event listeners
      const newClassroomButton = classroomButton.cloneNode(true);
      classroomButton.parentNode.replaceChild(newClassroomButton, classroomButton);
      
      // Update button title and text
      newClassroomButton.title = this.root.messages.getMessage('stam:menu-join-classroom');
      
      // Update icon
      const icon = newClassroomButton.querySelector('i');  
      if (icon) {
        icon.className = 'fas fa-sign-in-alt';
      }
      
      // Update text
      const text = newClassroomButton.querySelector('span');
      if (text) {
        text.textContent = this.root.messages.getMessage('stam:menu-join-classroom');
      }
      
      // Update click handler
      newClassroomButton.addEventListener('click', () => {
        this.broadcast(CLASSROOMCOMMANDS.JOIN_CLASSROOM);
      });
      
      // Update button colors for join classroom state
      this.addButtonEffects(newClassroomButton,true);
    }
    return true;
  }
  /**
   * Handle connected event from socket
   * @param {Object} data - Connection data
   * @param {string} sender - Sender ID
   * @returns {boolean} - Whether the message was handled
   */
  async handleConnected(data, sender) {
    // Update login button to show "Log Out" state
    const loginButton = document.getElementById('login-button');
    if (loginButton) {
      // Clone the button to remove all event listeners
      const newLoginButton = loginButton.cloneNode(true);
      loginButton.parentNode.replaceChild(newLoginButton, loginButton);
      
      // Update button title and text
      newLoginButton.title = this.root.messages.getMessage('stam:menu-log-out');
      
      // Update icon
      const icon = newLoginButton.querySelector('i');  
      if (icon) {
        icon.className = 'fas fa-sign-out-alt';
      }
      
      // Update text
      const text = newLoginButton.querySelector('span');
      if (text) {
        text.textContent = this.root.messages.getMessage('stam:menu-log-out');
      }
      
      // Update click handler
      newLoginButton.addEventListener('click', () => {
        this.broadcast(MENUCOMMANDS.LOGOUT);
      });
      
      // Update button colors for logout state
      this.addButtonEffects(newLoginButton, false);
    }
    return true;
  }
  
  /**
   * Handle disconnected event from socket
   * @param {Object} data - Disconnection data
   * @param {string} sender - Sender ID
   * @returns {boolean} - Whether the message was handled
   */
  async handleDisconnected(data, sender) {
    // Update login button to show "Log In" state
    const loginButton = document.getElementById('login-button');
    if (loginButton) {
      // Clone the button to remove all event listeners
      const newLoginButton = loginButton.cloneNode(true);
      loginButton.parentNode.replaceChild(newLoginButton, loginButton);
      
      // Update button title and text
      newLoginButton.title = this.root.messages.getMessage('stam:menu-log-in');
      
      // Update icon
      const icon = newLoginButton.querySelector('i');
      if (icon) {
        icon.className = 'fas fa-sign-in-alt';
      }
      
      // Update text
      const text = newLoginButton.querySelector('span');
      if (text) {
        text.textContent = this.root.messages.getMessage('stam:menu-log-in');
      }
      
      // Update click handler
      newLoginButton.addEventListener('click', () => {
        this.broadcast(MENUCOMMANDS.LOGIN);
      });
      
      // Update button colors for login state
      this.addButtonEffects(newLoginButton,true);
    }
    return true;
  }
  
  /**
   * Add hover and click effects to the login button
   * @param {HTMLElement} button - The login button element
   */
  addButtonEffects(button,isPositive) {
    // Set initial colors based on button state
    if (isPositive) {
      button.style.backgroundColor = 'var(--button-positive, #1a73e8)';
      button.style.borderColor = 'var(--button-positive, #1a73e8)';
      button.style.color = 'var(--text-positive, #ffffff)';
    } else {
      button.style.backgroundColor = 'var(--button-negative, #dc3545)';
      button.style.borderColor = 'var(--button-negative, #dc3545)';
      button.style.color = 'var(--text-negative, #ffffff)';
    }
  
    // Add hover and active effects
    button.addEventListener('mouseover', () => {
      button.style.opacity = '0.9';
      button.style.transform = 'translateY(-1px)';
    });
  
    button.addEventListener('mouseout', () => {
      button.style.opacity = '1';
      button.style.transform = 'translateY(0)';
    });
  
    button.addEventListener('mousedown', () => {
      button.style.opacity = '0.8';
      button.style.transform = 'translateY(1px)';
    });
  
    button.addEventListener('mouseup', () => {
      button.style.opacity = '0.9';
      button.style.transform = 'translateY(-1px)';
    });
  }
  
  /**
   * Apply layout information to restore the MenuBar state
   * @param {Object} layoutInfo - Layout information for this MenuBar
   */
  async applyLayout(layoutInfo) {
    await super.applyLayout(layoutInfo);
  }
  
  /**
   * Override getLayoutInfo to include MenuBar-specific information
   * @returns {Object} Layout information for this MenuBar
   */
  async getLayoutInfo() {
    // Get base layout information from parent class
    const layoutInfo = await super.getLayoutInfo();
    
    // Add MenuBar-specific information
    layoutInfo.currentMode = this.currentMode;
    layoutInfo.menuStructure = this.menuStructure;
    
    // Get height information if available
    if (this.parentContainer) {
      const rect = this.parentContainer.getBoundingClientRect();
      layoutInfo.height = rect.height;
    }
    
    return layoutInfo;
  }
}

export default MenuBar;
