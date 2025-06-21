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
import { EDITORMESSAGES } from './Editor.js';
import { SOCKETMESSAGES } from './sidewindows/SocketSideWindow.js';
import { CLASSROOMCOMMANDS } from './ClassroomManager.js';
import { MESSAGESCOMMANDS } from './MessageManager.js';
import { SIDEBARCOMMANDS } from './SideBar.js';
import { RIGHTBARCOMMANDS } from './RightBar.js';
import { STATUSBARCOMMANDS } from './StatusBar.js';

// Define message types for preference handling
export const MENUCOMMANDS = {
  NEW_PROJECT: 'MENU_NEW_PROJECT',
  OPEN_PROJECT: 'MENU_OPEN_PROJECT',
  CLOSE_PROJECT: 'MENU_CLOSE_PROJECT',
  RENAME_PROJECT: 'MENU_RENAME_PROJECT',
  DELETE_PROJECT: 'MENU_DELETE_PROJECT',
  DOWNLOAD_PROJECT: 'MENU_DOWNLOAD_PROJECT',
  NEW_FILE: 'MENU_NEW_FILE',
  OPEN_FILE: 'MENU_OPEN_FILE',
  OPEN_WITH: 'MENU_OPEN_WITH',
  OPEN_FOLDER: 'MENU_OPEN_FOLDER',
  SAVE_FILE: 'MENU_SAVE_FILE',
  SAVE_AS_FILE: 'MENU_SAVEAS_FILE',
  SAVE_ALL_FILES: 'MENU_SAVEALL_FILES',
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
  THEME: 'MENU_THEME',
  LANGUAGE: 'MENU_LANGUAGE',
  PREFERENCES: 'MENU_PREFERENCES',
  ABOUT: 'MENU_ABOUT',
  HELP: 'MENU_HELP',
  DEBUG1: 'MENU_DEBUG1',
  DEBUG2: 'MENU_DEBUG2',
  LOGIN: 'MENU_LOGIN',
  LOGOUT: 'MENU_LOGOUT',
  CREATE_ACCOUNT: 'MENU_CREATE_ACCOUNT',
  EDIT_ACCOUNT: 'MENU_EDIT_ACCOUNT',
  CONNECT_AWI_DEVICE: 'MENU_CONNECT_AWI_DEVICE',
  DISPLAY_AWI_DEVICES: 'MENU_DISPLAY_AWI_DEVICES',
  REMOVE_AWI_DEVICE: 'MENU_REMOVE_AWI_DEVICE',
  ABOUT_AWI_SERVER: 'MENU_ABOUT_AWI_SERVER',
  VIEW_MENUBAR: 'MENU_VIEW_MENUBAR',
  VIEW_STATUSBAR: 'MENU_VIEW_STATUSBAR',
  UPDATE_MENU_ITEMS: 'MENU_UPDATE_MENU_ITEMS',
  TOGGLE_VISIBLE: 'MENUBAR_TOGGLE_VISIBLE'
};


class MenuBar extends BaseComponent {
  constructor(parentId, containerId) {
    // Initialize the base component with component name
    super('MenuBar', parentId, containerId);
    
    this.activeMenu = null;
    this.menuStructure = [];
    this.menuMap = {};
    this.menuItems = {}; 
    this.activePopupMenu = null; 
    this.handleInterval = null;
    this.visible = true;
    this.isAltShowing = false; // Tracks if menu is temporarily shown by ALT key
    
    // Bind event handlers to maintain 'this' context
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleKeyUp = this.handleKeyUp.bind(this);
    this.messageMap[MESSAGES.MODE_CHANGE] = this.handleModeChange;
    this.messageMap[MESSAGES.LAYOUT_READY] = this.handleLayoutReady;
    this.messageMap[SOCKETMESSAGES.CONNECTED] = this.handleConnected;
    this.messageMap[SOCKETMESSAGES.CONNECTEDAWI] = this.handleConnectedAwi;
    this.messageMap[SOCKETMESSAGES.DISCONNECTED] = this.handleDisconnected;
    this.messageMap[CLASSROOMCOMMANDS.CLASSROOM_JOINED] = this.handleClassroomJoined;
    this.messageMap[CLASSROOMCOMMANDS.CLASSROOM_LEFT] = this.handleClassroomLeft;
    this.messageMap[MENUCOMMANDS.TOGGLE_VISIBLE] = this.handleToggleVisible;
  }

  async init(options={}) {
    if (await super.init(options))
      return;
    this.menuStructure = this.getDefaultMenuStructure();
    this.menuMap = this.makeMenuMap(this.menuStructure);
    if(options.mode) {
      this.setMode(options.mode);
    }
    document.addEventListener('click', this.handleDocumentClick.bind(this));
    
    // Add keyboard event listeners for ALT key handling
    document.addEventListener('keydown', this.handleKeyDown);
    document.addEventListener('keyup', this.handleKeyUp);
  }

  async handleLayoutReady() {
    this.handleInterval = setInterval(() => {
      this.updateMenuItems();
    }, 250);
  }

  async getInformation() {
    return {
      visible: this.visible
    };
  }
  
  async handleToggleVisible(data, sender) {
    // Toggle the main visibility flag
    this.visible = !this.visible;
    
    // Reset ALT key state when toggling visibility manually
    if (this.visible) {
      this.isAltShowing = false;
    }
    
    this.updateVisibility();
    return this.visible;
  }
  
  // Handle keydown events for ALT key
  handleKeyDown(event) {
    if (event.key === 'Alt' && !this.visible && !this.isAltShowing) {
      this.isAltShowing = true;
      this.updateVisibility();
      event.preventDefault();
    }
  }
  
  // Handle keyup events for ALT key
  handleKeyUp(event) {
    if (event.key === 'Alt' && this.isAltShowing) {
      this.isAltShowing = false;
      this.updateVisibility();
      event.preventDefault();
    }
  }
  
  // Update the menu bar visibility based on current state
  updateVisibility() {
    if (this.visible || this.isAltShowing) {
      this.parentContainer.style.display = 'flex';
    } else {
      this.parentContainer.style.display = 'none';
    }
  }
  getDefaultMenuStructure() {
    var menu = [
      { name: this.root.messages.getMessage('stam:menu-awi'), items: [
        { name: this.root.messages.getMessage('stam:menu-login'), command: MENUCOMMANDS.LOGIN, disabled: false },
        { name: this.root.messages.getMessage('stam:menu-logout'), command: MENUCOMMANDS.LOGOUT, disabled: true },
        { name: this.root.messages.getMessage('stam:menu-create-account'), command: MENUCOMMANDS.CREATE_ACCOUNT, disabled: false },
        { name: this.root.messages.getMessage('stam:menu-edit-account'), command: MENUCOMMANDS.EDIT_ACCOUNT, disabled: true },
        '-',
        { name: this.root.messages.getMessage('stam:menu-connect-awi-device'), command: MENUCOMMANDS.CONNECT_AWI_DEVICE, disabled: false },
        { name: this.root.messages.getMessage('stam:menu-display-awi-devices'), command: MENUCOMMANDS.DISPLAY_AWI_DEVICES, disabled: false },
        { name: this.root.messages.getMessage('stam:menu-remove-awi-device'), command: MENUCOMMANDS.REMOVE_AWI_DEVICE, disabled: false },
        { name: this.root.messages.getMessage('stam:menu-about-awi-server'), command: MENUCOMMANDS.ABOUT_AWI_SERVER, disabled: false }
      ] },
      { name: this.root.messages.getMessage('stam:menu-file'), items: [
        { name: this.root.messages.getMessage('stam:menu-new-project'), command: MENUCOMMANDS.NEW_PROJECT, disabled: false },
        { name: this.root.messages.getMessage('stam:menu-open-project'), command: MENUCOMMANDS.OPEN_PROJECT, disabled: false },
        { name: this.root.messages.getMessage('stam:menu-close-project'), command: MENUCOMMANDS.CLOSE_PROJECT, disabled: false },
        { name: this.root.messages.getMessage('stam:menu-rename-project'), command: MENUCOMMANDS.RENAME_PROJECT, disabled: false },
        { name: this.root.messages.getMessage('stam:menu-delete-project'), command: MENUCOMMANDS.DELETE_PROJECT, disabled: false },
        
        { name: this.root.messages.getMessage('stam:menu-download-project'), command: MENUCOMMANDS.DOWNLOAD_PROJECT, disabled: false },
        '-',
        { name: this.root.messages.getMessage('stam:menu-new-file'), command: MENUCOMMANDS.NEW_FILE, disabled: false },
        { name: this.root.messages.getMessage('stam:menu-open-file'), command: MENUCOMMANDS.OPEN_FILE, disabled: false },
        { name: this.root.messages.getMessage('stam:menu-save-file'), command: MENUCOMMANDS.SAVE_FILE, disabled: false },
        { name: this.root.messages.getMessage('stam:menu-save-file-as'), command: MENUCOMMANDS.SAVE_AS_FILE, disabled: false },
        { name: this.root.messages.getMessage('stam:menu-close-file'), command: MENUCOMMANDS.CLOSE_FILE, disabled: false },
        { name: this.root.messages.getMessage('stam:menu-save-all-files'), command: MENUCOMMANDS.SAVE_ALL_FILES, disabled: false }
      ] },
      { name: this.root.messages.getMessage('stam:menu-edit'), items: [
        { name: this.root.messages.getMessage('stam:menu-undo'), command: MENUCOMMANDS.UNDO, disabled: false },
        { name: this.root.messages.getMessage('stam:menu-redo'), command: MENUCOMMANDS.REDO, disabled: false },
        '-',
        { name: this.root.messages.getMessage('stam:menu-cut'), command: MENUCOMMANDS.CUT, disabled: false },
        { name: this.root.messages.getMessage('stam:menu-copy'), command: MENUCOMMANDS.COPY, disabled: false },
        { name: this.root.messages.getMessage('stam:menu-paste'), command: MENUCOMMANDS.PASTE, disabled: false },
        { name: this.root.messages.getMessage('stam:menu-find'), command: MENUCOMMANDS.FIND, disabled: false },
        { name: this.root.messages.getMessage('stam:menu-replace'), command: MENUCOMMANDS.REPLACE, disabled: false },
        '-',
        { name: this.root.messages.getMessage('stam:menu-theme'), command: MENUCOMMANDS.THEME, disabled: false },
        { name: this.root.messages.getMessage('stam:menu-language'), command: MESSAGESCOMMANDS.CHOOSE_LANGUAGE, disabled: false },
        { name: this.root.messages.getMessage('stam:menu-preferences'), command: MENUCOMMANDS.PREFERENCES, disabled: false }
      ] },
      { name: this.root.messages.getMessage('stam:menu-view'), items: [
        { name: this.root.messages.getMessage('stam:menuleft-sidebar'), items: [
          { name: this.root.messages.getMessage('stam:menu-view-project-window'), command: SIDEBARCOMMANDS.TOGGLE_SIDEWINDOW, disabled: false, data: { token: 'project' } },  
          { name: this.root.messages.getMessage('stam:menu-view-output-window'), command: SIDEBARCOMMANDS.TOGGLE_SIDEWINDOW, disabled: false, data: { token: 'output' } },
          { name: this.root.messages.getMessage('stam:menu-view-awi-window'), command: SIDEBARCOMMANDS.TOGGLE_SIDEWINDOW, disabled: false, data: { token: 'awi' } },
          { name: this.root.messages.getMessage('stam:menu-view-tv-window'), command: SIDEBARCOMMANDS.TOGGLE_SIDEWINDOW, disabled: false, data: { token: 'tv' } },
          '-',
          { name: this.root.messages.getMessage('stam:menu-view-sidebar'), command: SIDEBARCOMMANDS.TOGGLE_VISIBLE, disabled: false, data: { visible: true } },
        ] },
        { name: this.root.messages.getMessage('stam:menuright-sidebar'), items: [
          { name: this.root.messages.getMessage('stam:menu-view-project-window'), command: RIGHTBARCOMMANDS.TOGGLE_SIDEWINDOW, disabled: false, data: { token: 'project' } },
          { name: this.root.messages.getMessage('stam:menu-view-output-window'), command: RIGHTBARCOMMANDS.TOGGLE_SIDEWINDOW, disabled: false, data: { token: 'output' } },
          { name: this.root.messages.getMessage('stam:menu-view-awi-window'), command: RIGHTBARCOMMANDS.TOGGLE_SIDEWINDOW, disabled: false, data: { token: 'awi' } },
          { name: this.root.messages.getMessage('stam:menu-view-tv-window'), command: RIGHTBARCOMMANDS.TOGGLE_SIDEWINDOW, disabled: false, data: { token: 'tv' } },
          '-',
          { name: this.root.messages.getMessage('stam:menu-view-rightbar'), command: RIGHTBARCOMMANDS.TOGGLE_VISIBLE, disabled: false, data: { visible: true } },
        ] },
        { name: this.root.messages.getMessage('stam:menu-menubar'), command: MENUCOMMANDS.TOGGLE_VISIBLE, disabled: false },
        { name: this.root.messages.getMessage('stam:menu-statusbar'), command: STATUSBARCOMMANDS.TOGGLE_VISIBLE, disabled: false, data: { visible: true } },
        '-',
        { name: this.root.messages.getMessage('stam:menu-save-layout'), command: MENUCOMMANDS.SAVE_LAYOUT, disabled: false },
        { name: this.root.messages.getMessage('stam:menu-load-layout'), command: MENUCOMMANDS.LOAD_LAYOUT, disabled: false },
        { name: this.root.messages.getMessage('stam:menu-reset-layout'), command: MENUCOMMANDS.RESET_LAYOUT, disabled: false }
      ] }, 
      { name: this.root.messages.getMessage('stam:menu-classroom'), items: [
        { name: this.root.messages.getMessage('stam:menu-create-classroom'), command: CLASSROOMCOMMANDS.CREATE_CLASSROOM, disabled: false },
        { name: this.root.messages.getMessage('stam:menu-join-classroom'), command: CLASSROOMCOMMANDS.JOIN_CLASSROOM, disabled: false },
        { name: this.root.messages.getMessage('stam:menu-leave-classroom'), command: CLASSROOMCOMMANDS.LEAVE_CLASSROOM, disabled: false }
      ] },
      { name: this.root.messages.getMessage('stam:menu-help'), items: [
        { name: this.root.messages.getMessage('stam:menu-help-documentation'), command: MENUCOMMANDS.DOCUMENTATION, disabled: false },
        { name: this.root.messages.getMessage('stam:menu-help-about'), command: MENUCOMMANDS.ABOUT, disabled: false },
      ] }
    ];
    // Add debug menu if in debug mode
    if (this.root.debug != 0)
    {
      var debugMenu = { name: this.root.messages.getMessage('stam:menu-help-debug'), items: [] };
      var options = this.root.debugOptions; 
      for ( var o = 0; o < options.length; o++ )
        debugMenu.items.push(        
          { name: options[ o ].name, command: options[ o ].command, disabled: options[ o ] } );
      menu.push(debugMenu);
    }
    return menu;
  }

  async updateMenuItems() {
    var socketInfo = await this.sendRequestTo('class:SocketSideWindow',SOCKETMESSAGES.GET_CONNECTION_INFO);
    this.menuMap[MENUCOMMANDS.LOGIN].disabled = socketInfo.loggedIn;
    this.menuMap[MENUCOMMANDS.LOGOUT].disabled = !socketInfo.loggedIn;
    this.menuMap[MENUCOMMANDS.CREATE_ACCOUNT].disabled = !socketInfo.loggedInAWI;
    this.menuMap[MENUCOMMANDS.EDIT_ACCOUNT].disabled = !socketInfo.loggedInAWI;
    this.menuMap[MENUCOMMANDS.DISPLAY_AWI_DEVICES].disabled = !socketInfo.loggedInAWI;
    this.menuMap[MENUCOMMANDS.REMOVE_AWI_DEVICE].disabled = !socketInfo.loggedInAWI;
    this.menuMap[MENUCOMMANDS.CONNECT_AWI_DEVICE].disabled = !socketInfo.loggedInAWI;
    this.menuMap[MENUCOMMANDS.ABOUT_AWI_SERVER].disabled = !socketInfo.loggedInAWI;

    this.menuMap[MENUCOMMANDS.NEW_PROJECT].disabled = !socketInfo.loggedIn;
    this.menuMap[MENUCOMMANDS.OPEN_PROJECT].disabled = !socketInfo.loggedIn;
    this.menuMap[MENUCOMMANDS.CLOSE_PROJECT].disabled = !socketInfo.loggedIn;
    this.menuMap[MENUCOMMANDS.RENAME_PROJECT].disabled = !socketInfo.loggedIn;
    this.menuMap[MENUCOMMANDS.DELETE_PROJECT].disabled = !socketInfo.loggedIn;
    this.menuMap[MENUCOMMANDS.DOWNLOAD_PROJECT].disabled = !socketInfo.loggedIn;
    this.menuMap[MENUCOMMANDS.NEW_FILE].disabled = !socketInfo.loggedIn;
    this.menuMap[MENUCOMMANDS.OPEN_FILE].disabled = !socketInfo.loggedIn;
    this.menuMap[MENUCOMMANDS.SAVE_FILE].disabled = !socketInfo.loggedIn;
    this.menuMap[MENUCOMMANDS.SAVE_AS_FILE].disabled = !socketInfo.loggedIn;
    this.menuMap[MENUCOMMANDS.CLOSE_FILE].disabled = !socketInfo.loggedIn;
    this.menuMap[MENUCOMMANDS.SAVE_ALL_FILES].disabled = !socketInfo.loggedIn;

    this.menuMap[MENUCOMMANDS.UNDO].disabled = !socketInfo.loggedIn;
    this.menuMap[MENUCOMMANDS.REDO].disabled = !socketInfo.loggedIn;
    this.menuMap[MENUCOMMANDS.CUT].disabled = !socketInfo.loggedIn;
    this.menuMap[MENUCOMMANDS.COPY].disabled = !socketInfo.loggedIn;
    this.menuMap[MENUCOMMANDS.PASTE].disabled = !socketInfo.loggedIn;
    this.menuMap[MENUCOMMANDS.FIND].disabled = !socketInfo.loggedIn;
    this.menuMap[MENUCOMMANDS.REPLACE].disabled = !socketInfo.loggedIn;

    this.menuMap[CLASSROOMCOMMANDS.CREATE_CLASSROOM].disabled = !socketInfo.loggedIn;
    this.menuMap[CLASSROOMCOMMANDS.JOIN_CLASSROOM].disabled = !socketInfo.loggedIn;
    this.menuMap[CLASSROOMCOMMANDS.LEAVE_CLASSROOM].disabled = !socketInfo.loggedIn;
    this.updateButtonDisable(this.classroomButton, !socketInfo.loggedIn);
    if (this.root.debug != 0)
    {
      this.menuMap[MENUCOMMANDS.DEBUG1].disabled = !socketInfo.loggedIn;
      this.menuMap[MENUCOMMANDS.DEBUG2].disabled = !socketInfo.loggedIn;
    }

    var sideBarInfo = await this.root.sideBar.getInformation();
    this.setItemProperty( SIDEBARCOMMANDS.TOGGLE_SIDEWINDOW, 'project', 'checked', sideBarInfo['project'].visible );
    this.setItemProperty( SIDEBARCOMMANDS.TOGGLE_SIDEWINDOW, 'output', 'checked', sideBarInfo['output'].visible );
    this.setItemProperty( SIDEBARCOMMANDS.TOGGLE_SIDEWINDOW, 'awi', 'checked', sideBarInfo['awi'].visible );
    this.setItemProperty( SIDEBARCOMMANDS.TOGGLE_SIDEWINDOW, 'tv', 'checked', sideBarInfo['tv'].visible );
    this.setItemProperty( SIDEBARCOMMANDS.TOGGLE_SIDEWINDOW, 'teacher', 'checked', sideBarInfo['teacher'].visible );
    this.setItemProperty( SIDEBARCOMMANDS.TOGGLE_SIDEWINDOW, 'teacherView', 'checked', sideBarInfo['teacherView'].visible );

    var rightBarInfo = await this.root.rightBar.getInformation();
    this.setItemProperty( SIDEBARCOMMANDS.TOGGLE_SIDEWINDOW, 'socket', 'checked', rightBarInfo['socket'].visible );
    this.setItemProperty( SIDEBARCOMMANDS.TOGGLE_SIDEWINDOW, 'output', 'checked', sideBarInfo['output'].visible );
    this.setItemProperty( SIDEBARCOMMANDS.TOGGLE_SIDEWINDOW, 'awi', 'checked', rightBarInfo['awi'].visible );
    this.setItemProperty( SIDEBARCOMMANDS.TOGGLE_SIDEWINDOW, 'tv', 'checked', rightBarInfo['tv'].visible );
    this.setItemProperty( SIDEBARCOMMANDS.TOGGLE_SIDEWINDOW, 'teacher', 'checked', rightBarInfo['teacher'].visible );
    this.setItemProperty( SIDEBARCOMMANDS.TOGGLE_SIDEWINDOW, 'teacherView', 'checked', rightBarInfo['teacherView'].visible );

    var statusBarInfo = await this.root.statusBar.getInformation();
    this.setItemProperty( STATUSBARCOMMANDS.TOGGLE_VISIBLE, '', 'checked', statusBarInfo.visible );

    var menubarInfo = await this.root.menuBar.getInformation();
    this.setItemProperty( MENUCOMMANDS.TOGGLE_VISIBLE, '', 'checked', menubarInfo.visible );

    var leftBarInfo = await this.root.sideBar.getInformation();
    this.setItemProperty( SIDEBARCOMMANDS.TOGGLE_VISIBLE, '', 'checked', leftBarInfo.visible );

    var rightBarInfo = await this.root.rightBar.getInformation();
    this.setItemProperty( RIGHTBARCOMMANDS.TOGGLE_VISIBLE, '', 'checked', rightBarInfo.visible );
    
    var projectInfo, classroomInfo, editorInfo;
    if (socketInfo.loggedIn)
    {
      projectInfo = this.root.project.getProjectInformation();
      this.menuMap[MENUCOMMANDS.CLOSE_PROJECT].disabled = !projectInfo.projectLoaded;
      this.menuMap[MENUCOMMANDS.OPEN_PROJECT].disabled = projectInfo.projectLoaded;
      this.menuMap[MENUCOMMANDS.NEW_PROJECT].disabled = projectInfo.projectLoaded;
      this.menuMap[MENUCOMMANDS.RENAME_PROJECT].disabled = !projectInfo.projectLoaded;
      this.menuMap[MENUCOMMANDS.DELETE_PROJECT].disabled = !projectInfo.projectLoaded;
      this.menuMap[MENUCOMMANDS.DOWNLOAD_PROJECT].disabled = !projectInfo.projectLoaded;
      this.menuMap[MENUCOMMANDS.NEW_FILE].disabled = !projectInfo.projectLoaded;
      this.menuMap[MENUCOMMANDS.OPEN_FILE].disabled = !projectInfo.projectLoaded;
      
      classroomInfo = this.root.classroom.getInformation();
      this.menuMap[CLASSROOMCOMMANDS.CREATE_CLASSROOM].disabled = classroomInfo.classroomOpen;
      this.menuMap[CLASSROOMCOMMANDS.JOIN_CLASSROOM].disabled = classroomInfo.classroomOpen;
      this.menuMap[CLASSROOMCOMMANDS.LEAVE_CLASSROOM].disabled = !classroomInfo.classroomOpen;

      editorInfo = await this.sendRequestTo('class:Editor',EDITORMESSAGES.GET_INFORMATION);
      this.menuMap[MENUCOMMANDS.SAVE_FILE].disabled = editorInfo.numberOfTabs==0;
      this.menuMap[MENUCOMMANDS.SAVE_AS_FILE].disabled = editorInfo.numberOfTabs==0;
      this.menuMap[MENUCOMMANDS.SAVE_ALL_FILES].disabled = editorInfo.numberOfTabs==0;
      this.menuMap[MENUCOMMANDS.CLOSE_FILE].disabled = editorInfo.numberOfTabs==0;
      this.menuMap[MENUCOMMANDS.UNDO].disabled = editorInfo.numberOfTabs==0;
      this.menuMap[MENUCOMMANDS.REDO].disabled = editorInfo.numberOfTabs==0;
      this.menuMap[MENUCOMMANDS.CUT].disabled = editorInfo.numberOfTabs==0;
      this.menuMap[MENUCOMMANDS.COPY].disabled = editorInfo.numberOfTabs==0;
      this.menuMap[MENUCOMMANDS.PASTE].disabled = editorInfo.numberOfTabs==0;
      this.menuMap[MENUCOMMANDS.FIND].disabled = editorInfo.numberOfTabs==0;
      this.menuMap[MENUCOMMANDS.REPLACE].disabled = editorInfo.numberOfTabs==0;
    }    
    this.sendMessageTo('class:Editor', MENUCOMMANDS.UPDATE_MENU_ITEMS, { socketInfo, projectInfo, classroomInfo, editorInfo })
    this.sendMessageTo('class:IconBar', MENUCOMMANDS.UPDATE_MENU_ITEMS, { socketInfo, projectInfo, classroomInfo, editorInfo })
    this.root.socketInfo = socketInfo;
    this.root.projectInfo = projectInfo;
    this.root.classroomInfo = classroomInfo;
    this.root.editorInfo = editorInfo;
    this.root.statusBarInfo = statusBarInfo;
    this.root.menubarInfo = menubarInfo;
    this.root.leftBarInfo = leftBarInfo;
    this.root.rightBarInfo = rightBarInfo;
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
    if (this.handleInterval) {
      clearInterval(this.handleInterval);
      this.handleInterval=null;
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
    this.classroomButton = this.createClassroomButton(this.classroomButtonContainer);
    this.rightContainer.appendChild(this.classroomButtonContainer);
    
    // Create login button container
    this.loginButtonContainer = document.createElement('div');
    this.loginButtonContainer.className = 'login-button-container';
    this.loginButton = this.createLoginButton(this.loginButtonContainer);
    this.rightContainer.appendChild(this.loginButtonContainer);

    // Create mode selector container
    this.modeSelectorContainer = document.createElement('div');
    this.modeSelectorContainer.className = 'mode-selector-container';
    this.modeSelector = this.createModeSelector(this.modeSelectorContainer);
    this.rightContainer.appendChild(this.modeSelectorContainer);
    
    // Add the right container to the main container
    this.parentContainer.appendChild(this.rightContainer);

    // Prevent default context menu on the menu bar
    this.parentContainer.addEventListener('contextmenu', (e) => {
      if (!e.defaultPrevented) e.preventDefault();
    });

    return this.parentContainer;
  }
  

  setItemProperty(command, token, property, value, tree) {
    if (!tree)
      tree = this.menuStructure;
    for (var m = 0; m < tree.length; m++) {
      var item = tree[m];
      if (item.items) {
        if (this.setItemProperty(command, token, property, value, item.items))
          return true;
      }
      if (item.command == command) 
      {
        if (token && item.data.token != token)
          continue;
        item[property] = value;
        return true;
      }
    }
    return false;
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
    
    modeSelector.addEventListener('change', async (e) => {
      const newMode = e.target.value;
      if (newMode==this.currentMode)
        return;

      // Can we change the mode?
      var canChange = true;
      var response = await this.broadcast(MESSAGES.CAN_MODE_CHANGE, { mode: newMode });
      if (response){  
        for ( var componentId in response)
        {
          if (!response[componentId]){
            canChange=false;
            break;
          }
        }
      }
      if ( !canChange ){
        e.target.value=this.currentMode;
        return;
      }

      // Send mode change message DOWN toward the root (StamApp)
      this.sendMessageToRoot('MODE_CHANGED', { mode: newMode });
    });
    
    container.appendChild(modeSelector);
    return modeSelector;
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
    return classroomButton;
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
    return loginButton;
  }
  

  makeMenuMap(menuBase) {
    var menuMap = {};
    function makeMap(menu) {
      for (var m = 0; m < menu.length; m++) {
        var item = menu[m];
        if (item.items) {
          makeMap(item.items);
        } else if (item.command) {
          menuMap[item.command] = item;
        }
      }
    }
    makeMap(menuBase);
    return menuMap;
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
  
  disableMenuItem(command, onOff) {
    if (this.menuMap[command])
      this.menuMap[command].disabled = onOff;
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
  updateButtonDisable(button, isDisabled)
  {
    button.dataset.disabled = isDisabled;
    if (isDisabled) {
      button.style.cursor = 'not-allowed';
      button.style.opacity = '0.5';
    } else {
      button.style.cursor = 'pointer';
      button.style.opacity = '1';
    }
  }
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
      if (button.dataset.disabled)
        return;
      button.style.opacity = '0.9';
      button.style.transform = 'translateY(-1px)';
    });
  
    button.addEventListener('mouseout', () => {
      if (button.dataset.disabled)
        return;
      button.style.opacity = '1';
      button.style.transform = 'translateY(0)';
    });
  
    button.addEventListener('mousedown', () => {
      if (button.dataset.disabled)
        return;
      button.style.opacity = '0.8';
      button.style.transform = 'translateY(1px)';
    });
  
    button.addEventListener('mouseup', () => {
      if (button.dataset.disabled)
        return;
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
