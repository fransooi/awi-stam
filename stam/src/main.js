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
* @file main.js
* @author FL (Francois Lionet)
* @version 0.5
*
* @short Main entry point for the STAM application
*
*/
import './style.css'

// Import components
import { MESSAGES } from './utils/BaseComponent.js';
import { SOCKETMESSAGES } from './components/sidewindows/SocketSideWindow.js';
import { MENUCOMMANDS } from './components/MenuBar.js';
import { SIDEBARCOMMANDS } from './components/SideBar.js';
import { RIGHTBARCOMMANDS } from './components/RightBar.js';
import messageBus from './utils/MessageBus.mjs';
import Utilities from './utils/Utilities.js';
import ResourceManager from './components/ResourceManager.js';
import PreferenceManager from './components/PreferenceManager.js';
import ServerManager from './components/ServerManager.js';
import ProjectManager from './components/ProjectManager.js';
import ClassroomManager from './components/ClassroomManager.js';
import MessageManager from './components/MessageManager.js';
import MenuBar from './components/MenuBar.js';
import StatusBar from './components/StatusBar.js';
import Editor from './components/Editor.js';
import IconBar from './components/IconBar.js';
import SideBar from './components/SideBar.js';  
import RightBar from './components/RightBar.js';
import BaseComponent from './utils/BaseComponent.js';
import Alerts from './components/Alerts.js';

// Main application class
class StamApp extends BaseComponent {
  constructor() {
    // Initialize the base component with component name
    super('StamApp');

    // Set as root
    messageBus.setRoot(this);    
    
    // Storage for layout information from components
    this.layoutInfo = {};
    this.sideBarRestoreInfo = {};
    
    // Initialize mode
    this.possibleModes = [
      { value: 'javascript', text: 'Javascript' },
      { value: 'phaser', text: 'Phaser' },
      { value: 'stos', text: 'STOS Basic' },
      { value: 'amos1_3', text: 'AMOS 1.3' },
      { value: 'amosPro', text: 'AMOS Pro' },
      { value: 'c64', text: 'Commodore 64' }
    ];
    this.currentMode = 'phaser'; 
    this.debugOptions = [
      { command: MENUCOMMANDS.DEBUG1, name: 'Clean message list', disabled: false },
      { command: MENUCOMMANDS.DEBUG2, name: 'Debug 2', disabled: false }
    ];
    
    // Initialize utilities
    this.utilities = new Utilities();
    this.debug = false;
    this.URLParameters = this.utilities.getURLParameters();     
    if (this.URLParameters.debug)
      this.debug = true;
    if ( this.debug ){
      this.webSocketUrl = 'ws://192.168.1.66:1033'; 
      this.httpUrl = 'http://192.168.1.66/stam';    
    }
    else {
      this.webSocketUrl = 'ws://francoislio.net:1033'; 
      this.httpUrl = '/stam'; 
    }

    // Initialize managers
    this.alert = new Alerts(this.componentId);
    this.server = new ServerManager(this.componentId);
    this.messages = new MessageManager(this.componentId);
    this.project = new ProjectManager(this.componentId);
    this.classroom = new ClassroomManager(this.componentId);
    this.preferences = new PreferenceManager(this.componentId);    
    this.resourceManager = new ResourceManager(this.componentId);    
    
    // Initialize all components with the correct mode from the start
    this.sideBar = new SideBar(this.componentId,'info-area');
    this.rightBar = new RightBar(this.componentId,'right-bar');
    this.menuBar = new MenuBar(this.componentId,'menu-bar');
    this.statusBar = new StatusBar(this.componentId,'status-line');
    this.iconBar = new IconBar(this.componentId,'icon-area');
    this.editor = new Editor(this.componentId,'editor-area');
    
    this.messageMap[MESSAGES.LAYOUT_INFO] = this.handleLayoutInfo;
    this.messageMap[MESSAGES.MODE_CHANGED] = this.handleModeChanged;    
    this.messageMap[MESSAGES.SAVE_LAYOUT] = this.handleSaveLayout;        
    this.messageMap[SOCKETMESSAGES.CONNECTED] = this.handleConnected;  
    this.messageMap[MENUCOMMANDS.DEBUG1] = this.debug1;  
    this.messageMap[MENUCOMMANDS.DEBUG2] = this.debug2;  
    this.messageMap[MESSAGES.REFRESH_DISPLAY] = this.handleRefreshDisplay;  
  }
  
  async init(options = {}) {
    if (!super.init(options))
      return;

    // Initialize managers first
    await this.preferences.init({});
    await this.resourceManager.init({});
    await this.messages.init({});
    await this.alert.init({});
    await this.server.init({});
    await this.project.init({});
    await this.classroom.init({});

    const layoutData=this.utilities.loadStorage('stam-layout');  
    let layout;    
    if (layoutData) {
      // Parse the layout JSON
      layout = JSON.parse(layoutData);
      this.currentMode = layout.mode;        
    }
    else if (options.mode) {
      this.currentMode = options.mode;
    }
    options.mode=this.currentMode;

    // Send INIT messages to components-> they create the rest of the tree
    if (layout) {
      layout.componentTypes = {};
      Object.values(layout.components).forEach(
        component => {
          layout.componentTypes[component.componentName] = component;
        }
      );
      options.layout=layout;
    }
    await this.broadcastUp(MESSAGES.INIT, options);

    // If no layout, create default side windows
    if (!layout){
      await this.sendMessageTo('class:SideBar',SIDEBARCOMMANDS.ADD_SIDEWINDOW, { type: 'ProjectSideWindow' } );
      await this.sendMessageTo('class:SideBar',SIDEBARCOMMANDS.ADD_SIDEWINDOW, { type: 'OutputSideWindow', height: 200 } );
//      await this.sendMessageTo(this.sideBar.componentId,MESSAGES.ADD_SIDE_WINDOW, { type: 'TVSideWindow', height: 200 });
      await this.sendMessageTo('class:SideBar',SIDEBARCOMMANDS.ADD_SIDEWINDOW, { type: 'SocketSideWindow', height: 200, minimized: true } );
    }

    // Send RENDER messages to components-> they display themselves
    await this.broadcastUp(MESSAGES.RENDER, options);
    if ( layout ){
      await this.broadcastUp(MESSAGES.LOAD_LAYOUT, layout);
    }
    await this.utilities.sleep(1000);
    await this.broadcastUp(MESSAGES.LAYOUT_READY);

    // Send CONNECT message to socket
    if (this.debug)
      await this.sendMessageTo('class:SocketSideWindow',SOCKETMESSAGES.CONNECT, { accountInfo: {userName: 'francois', url: this.webSocketUrl, password: '123456789'}, force: true });
//    else
//      await this.sendMessageTo('class:SocketSideWindow',SOCKETMESSAGES.CONNECT_IF_CONNECTED);

    // Log initialization
    //console.log('STAM Application initialized in ' + this.currentMode + ' mode');
    
  }
  
  /**
   * Handle the CONNECTED command
  * @param {Object} data - Command data
  * @param {string} sender - Sender ID
  * @returns {Promise<boolean>} - Promise that resolves with success status
  */
  async handleConnected(data, sender) {
    var self = this;
    /*
    if (this.debug){
      setTimeout(() => {
        self.sendMessageTo('class:ProjectManager', MENUCOMMANDS.OPEN_PROJECT, { name: 'Breakout', mode: 'phaser' })
      }, 500);
    }
    */
    return true;
  }
  
  // Handle the MODE_CHANGED command 
  async changeMode(mode) {
    // Don't do anything if the mode hasn't changed
    if (this.currentMode === mode) {
      return true;
    }
    
    // Close current project
    await this.sendMessageTo('class:ProjectManager', MENUCOMMANDS.CLOSE_PROJECT, { force: true });
    
    // Send MODE_EXIT message with the old mode
    await this.broadcastUp(MESSAGES.MODE_EXIT, { oldMode: this.currentMode, newMode: mode });
    
    // Update current mode
    const oldMode = this.currentMode;
    this.currentMode = mode;
    
    // Update body class for mode-specific styling
    document.body.classList.remove('modern-mode', 'stos-mode', 'amos1_3-mode', 'amosPro-mode', 'c64-mode');
    document.body.classList.add(`${mode}-mode`);
    
    // Broadcast mode change messages to components
    await this.broadcastUp(MESSAGES.MODE_CHANGE, { mode: mode });

    // Send MODE_ENTER message with the new mode
    await this.broadcastUp(MESSAGES.MODE_ENTER, { oldMode: oldMode, newMode: mode });

    // Send LAYOUT_READY message with the new mode
    await this.utilities.sleep(1000);
    await this.broadcastUp(MESSAGES.LAYOUT_READY, { mode: this.currentMode });
    
    return true; // Command handled
  }
  
  async debug1(data, sender) {
    var answer = await this.messages.handleCleanMessageList( { 
      type: 'stam', 
      srcPath: 'w:/development/awi/stam/src', 
      language: 'en', 
      save: true,
      languageFilesPath: 'w:/development/awi/stam/public/messages',
    } );
    if ( answer.error )
      this.alert.showError(answer.error);
    else
      this.handleRefreshDisplay( { refreshType: 'all', message: 'Message list cleaned!' } );
    return true;
  }
  
  async debug2(data, sender) {
    console.log('Debug 2');
    return true;
  }
  
  async handleLayoutInfo(data, sender) {
    if (sender) {
      this.layoutInfo[sender] = data;
      console.log(`Received layout info from ${sender}`);
    }
    return true;  
  }
  async handleModeChanged(data, sender) {
    await this.changeMode(data.mode);
    return true;
  }
  
  /**
   * Save the current layout
   */
  async handleSaveLayout() {
    console.log('Saving interface layout...');
    var layoutJson = await this.getLayout();
    if (layoutJson) {
      this.utilities.saveStorage('stam-layout', layoutJson);
    }
  }

  /**
   * Show the preferences dialog
   */
  handleShowPreferences() {
    if (this.preferenceDialog) {
      this.sendMessageTo(this.preferenceDialog.getComponentID(), MESSAGES.SHOW_PREFERENCES);
    }
  }

  async handleRefreshDisplay(data, senderId) {
    const element = document.documentElement; // Default to whole document
    const rect = data.rect || { x: 0, y: 0, width: window.innerWidth, height: window.innerHeight };
  
    const refreshMethods = {
      style: () => {
        element.style.display = 'none';
        element.offsetHeight; // Force reflow
        element.style.display = '';
      },
      redraw: () => {
        const transform = window.getComputedStyle(element).transform;
        element.style.transform = 'translateZ(0)';
        requestAnimationFrame(() => {
            element.style.transform = transform || 'none';
        });
      },
      requestAnimation: () => {
        const transform = window.getComputedStyle(element).transform;
        element.style.transform = 'translateZ(0)';
        requestAnimationFrame(() => {
          element.style.transform = transform || 'none';
        });
      },
      /*
      canvas: () => {
        const canvas = document.querySelector('canvas');
        if (canvas && canvas.getContext) {
          const ctx = canvas.getContext('2d');
          ctx.clearRect(rect.x, rect.y, rect.width, rect.height);
        }
      },
      */
      modern: () => {
        if (element.invalidate) {
          const domRect = new DOMRect(rect.x, rect.y, rect.width, rect.height);
          element.invalidate(domRect);
        } else {
          console.warn('Element.invalidate() not supported in this browser');
        }
      }
    };

    const executeRefresh = (method) => {
      try {
        refreshMethods[method]();
        console.log(`Refresh method executed: ${method}`);
      } catch (error) {
        console.error(`Error executing refresh method ${method}:`, error);
      }
    };

    const refreshType = (data.refreshType || '').toLowerCase();  
    switch (refreshType) {
      case 'all':
        // Execute all methods with delay
        const methods = Object.keys(refreshMethods);
        methods.forEach((method, index) => {
          setTimeout(() => {
            executeRefresh(method);
          }, 250 + index * 100);
        });
        break;
      case 'style':
      case 'requestanimation':
      case 'canvas':
      case 'modern':
        // Execute specific method
        executeRefresh(refreshType);
        break;
      default:
        console.warn(`Unknown refresh type: ${refreshType}`);
        return false;
    }  
    await this.utilities.sleep(1000);
    var message = data.message || 'stam:preferences-saved';
    this.alert.showSuccess(message);
    return true;
  }

  /**
   * Returns the current layout JSON string
   * @returns {Promise<string>} - Promise that resolves with the layout JSON
   */
  async getLayout() {
    // Clear any existing layout information
    this.layoutInfo = {};
    
    // Request layout information from all components
    await this.broadcastUp(MESSAGES.GET_LAYOUT_INFO);
    
    // Return a promise that resolves with the layout JSON
    return new Promise((resolve) => {
      // Wait for components to respond with their layout information
      setTimeout(() => {
        // Create the final layout object
        const layout = {
          version: '1.0',
          timestamp: new Date().toISOString(),
          components: this.layoutInfo,
          mode: this.currentMode
        };
        
        // Convert layout information to JSON
        const layoutJson = JSON.stringify(layout, null, 2);
        resolve(layoutJson);
      }, 250); // Wait 500ms for components to respond
    });
  }
  
  /**
   * Recreate the interface from a saved layout
   * This function loads the layout from localStorage and recreates the interface
   * @returns {Promise<boolean>} - Promise that resolves with success status
   */
  async recreateInterface(layoutJson) {
    console.log('Recreating interface from saved layout...');
    
    try {
      // Parse the layout JSON
      const layout = JSON.parse(layoutJson);
      console.log('Loaded layout:', layout);
      
      // Validate the layout
      if (!layout || !layout.components) {
        console.error('Invalid layout format');
        return false;
      }
      
      // First, check if the IconBar component has a saved mode
      const iconBarInfo = Object.values(layout.components).find(
        component => component.componentName === 'IconBar'
      );
      
      // If we found the IconBar info and it has a currentMode, set it first
      if (iconBarInfo && iconBarInfo.currentMode) {
        console.log(`Setting application mode to ${iconBarInfo.currentMode} from saved layout`);
        this.handleModeChange(iconBarInfo.currentMode);
      }
      
      // Converts the layout to type oriented components.
      layout.componentTypes = {};
      Object.values(layout.components).forEach(
        component => {
          layout.componentTypes[component.componentName] = component;
        }
      );
      // Broadcast the layout info to all components
      this.broadcastUp(MESSAGES.LOAD_LAYOUT, layout);

      console.log('Interface recreated successfully');
      return true;
    } catch (error) {
      console.error('Error recreating interface:', error);
      return false;
    }
  }
}

function loadApplication() {
  // Create and initialize the application
  const stamApp = new StamApp();
  window.stamApp = stamApp;
  stamApp.init({mode:'phaser'});
}
// Wait for DOM to be fully loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => loadApplication());
}else {
  loadApplication();
}
