
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
* @file Editor.js
* @author FL (Francois Lionet)
* @version 0.5
*
* @short Container component that manages the source code editor
* @description
* Base class for mode-specific editors
*/
import BaseComponent, { MESSAGES } from '../utils/BaseComponent.js'
import EditorSource from './EditorSource.js'
import { PROJECTMESSAGES } from './ProjectManager.js'
import { MENUCOMMANDS } from './MenuBar.js'
import { SOCKETMESSAGES } from './sidewindows/SocketSideWindow.js';

// Define message types for preference handling
export const EDITORMESSAGES = {
  GET_INFORMATION: 'EDITOR_GET_INFORMATION',
};

class Editor extends BaseComponent {
  constructor(parentId, containerId) {
    // Initialize the base component with component name
    super('Editor', parentId, containerId);
    
    // Editor instance
    this.editor = null;
    
    // Forward all relevant messages to the editor
    this.messageMap[PROJECTMESSAGES.FILE_RENAMED] = this.handleFileRenamed;
    this.messageMap[PROJECTMESSAGES.FILE_DELETED] = this.handleFileDeleted;
    this.messageMap[MESSAGES.MODE_CHANGE] = this.handleModeChange;
    this.messageMap[MESSAGES.CAN_MODE_CHANGE] = this.handleCanModeChange;
    this.messageMap[PROJECTMESSAGES.PROJECT_LOADED] = this.handleProjectLoaded;
    this.messageMap[PROJECTMESSAGES.PROJECT_CLOSED] = this.handleProjectClosed;
    this.messageMap[PROJECTMESSAGES.CAN_CLOSE_PROJECT] = this.handleCanCloseProject;
    this.messageMap[PROJECTMESSAGES.FILE_LOADED] = this.handleFileLoaded;
    this.messageMap[MENUCOMMANDS.SAVE_FILE] = this.handleSaveFile;
    this.messageMap[MENUCOMMANDS.SAVE_AS_FILE] = this.handleSaveAsFile;
    this.messageMap[MENUCOMMANDS.CLOSE_FILE] = this.handleCloseFile;
    this.messageMap[EDITORMESSAGES.GET_INFORMATION] = this.handleGetInformation;
    this.messageMap[PROJECTMESSAGES.FILE_RENAMED] = this.handleFileRenamed;
    this.messageMap[PROJECTMESSAGES.FILE_DELETED] = this.handleFileDeleted;
    this.messageMap[PROJECTMESSAGES.GET_DEFAULT_FILENAME] = this.handleGetDefaultFilename;
    this.messageMap[MENUCOMMANDS.UPDATE_MENU_ITEMS] = this.handleUpdateMenuItems;
  }
  
  async init(options) {
    if (await super.init(options))
      return;
    this.currentMode = options?.mode || 'javascript';
    
    // Create the editor instance but don't render it yet
    this.editor = new EditorSource(this.componentId);
    await this.editor.init({ mode: this.currentMode });
  }

  async destroy() {
    // Destroy the editor instance
    if (this.editor) {
      await this.editor.destroy();
    }
    
    super.destroy();
  }

  async render(containerId) {
    this.container = await super.render(containerId);
    this.container.innerHTML = '';
    
    // Create a container for the editor
    const editorContainer = document.createElement('div');
    editorContainer.id = 'editor-container';
    editorContainer.className = 'editor-container';
    editorContainer.style.width = '100%';
    editorContainer.style.height = '100%';
    editorContainer.style.minWidth = '0'; // Prevent flex item from overflowing
    editorContainer.style.flex = '1'; // Take up all available space
    editorContainer.style.display = 'flex'; // Use flexbox layout
    this.container.appendChild(editorContainer);
    
    // Prevent default context menu on the editor area
    this.container.addEventListener('contextmenu', (e) => {
      if (!e.defaultPrevented) e.preventDefault();
    });
    
    return this.container;
  }
  

  
  
  // Core editor methods that all modes can use
  
  getContent() {
    if (this.editor) {
      return this.editor.getContent();
    }
    return '';
  }
  
  setContent(content) {
    if (this.editor) {
      this.editor.setContent(content);
    }
  }
  
  // Message handlers - forward to editor
  
  async handleUpdateMenuItems(data, sender) {
    if (this.editor && this.editor.handleUpdateMenuItems) {
      return await this.editor.handleUpdateMenuItems(data, sender);
    }
    return false;
  }
  
  async handleModeChange(data, sender) {
    this.currentMode = data.mode;
    if (this.editor && this.editor.handleModeChange) {
      return await this.editor.handleModeChange(data, sender);
    }
    return false;
  }
  async handleCanModeChange(data, sender) {
    if (this.editor && this.editor.handleCanModeChange) {
      return await this.editor.handleCanModeChange(data, sender);
    }
    return true;
  }
  async handleFileLoaded(data, sender) {
    if (this.editor && this.editor.handleFileLoaded) {
      return await this.editor.handleFileLoaded(data, sender);
    }
    return false;
  }
  async handleSaveFile(data, sender) {
    if (this.editor && this.editor.handleSaveFile) {
      return await this.editor.handleSaveFile(data, sender);
    }
    return false;
  }
  async handleCloseFile(data, sender) {
    if (this.editor && this.editor.handleCloseFile) {
      return await this.editor.handleCloseFile(data, sender);
    }
    return false;
  }
  async handleConnected(data, sender) {
    if (this.editor && this.editor.handleConnected) {
      return await this.editor.handleConnected(data, sender);
    }
    return false;
  }
  async handleProjectLoaded(data, sender) {
    if (this.editor && this.editor.handleProjectLoaded) {
      return await this.editor.handleProjectLoaded(data, sender);
    }
    return false;
  }
  async handleProjectClosed(data, sender) {
    if (this.editor && this.editor.handleProjectClosed) {
      return await this.editor.handleProjectClosed(data, sender);
    }
    return false;
  }
  async handleCanCloseProject(data, sender) {
    if (this.editor && this.editor.handleCanCloseProject) {
      return await this.editor.handleCanCloseProject(data, sender);
    }
    return false;
  }
  async handleSaveAsFile(data, sender) {
    if (this.editor && this.editor.handleSaveAsFile) {
      return await this.editor.handleSaveAsFile(data, sender);
    }
    return false;
  }
  async handleFileDeleted(data, sender) {
    if (this.editor && this.editor.handleFileDeleted) {
      return await this.editor.handleFileDeleted(data, sender);
    }
    return false;
  }
  async handleFileRenamed(data, sender) {
    if (this.editor && this.editor.handleFileRenamed) {
      return await this.editor.handleFileRenamed(data, sender);
    }
    return false;
  }
  async handleGetInformation(data, sender) {
    if (this.editor && this.editor.handleGetInformation) {
      return await this.editor.handleGetInformation(data, sender);
    }
    return false;
  }
  async handleGetDefaultFilename(data, sender) {
    if (this.editor && this.editor.handleGetDefaultFilename) {
      return await this.editor.handleGetDefaultFilename(data, sender);
    }
    return false;
  }
  
  /**
   * Apply layout information to restore the Editor state
   * @param {Object} layoutInfo - Layout information for this Editor
   */
  async applyLayout(layoutInfo) {
    await super.applyLayout(layoutInfo);
    
    // Set the mode first
    if (layoutInfo.currentMode) {
      this.currentMode = layoutInfo.currentMode;
    }
    
    // Apply layout to the editor
    if (this.editor && this.editor.applyLayout) {
      await this.editor.applyLayout(layoutInfo);
    }
  }
  
  /**
   * Override getLayoutInfo to include Editor-specific information
   * @returns {Object} Layout information for this Editor
   */
  async getLayoutInfo() {
    // Get base layout information from parent class
    const layoutInfo = await super.getLayoutInfo();
    
    // Add Editor-specific information
    layoutInfo.currentMode = this.currentMode;
    
    // Get layout info from the editor
    if (this.editor && this.editor.getLayoutInfo) {
      const editorLayout = await this.editor.getLayoutInfo();
      
      // Merge the editor layout with our layout
      Object.assign(layoutInfo, {
        content: editorLayout.content,
        tabs: editorLayout.tabs,
        activeTabIndex: editorLayout.activeTabIndex,
        modeSpecific: editorLayout.modeSpecific
      });
    }
    
    // Get dimensions if available
    if (this.container) {
      const rect = this.container.getBoundingClientRect();
      layoutInfo.dimensions = {
        width: rect.width,
        height: rect.height
      };
    }
    
    return layoutInfo;
  }
  
  /**
   * Sets the editor mode
   * @param {string} mode - The mode to set
   */
  async setMode(mode) {
    if (mode === this.currentMode) return;
    
    this.currentMode = mode;
    if (this.editor && this.editor.handleModeChange) {
      await this.editor.handleModeChange({ mode }, this.id);
    }
  }
  async getInformation() {
    return {
      currentMode: this.currentMode,
      numberOfTabs: this.editor.getNumberOfTabs(),
      activeTabIndex: this.editor.getActiveTabIndex(),
      modeSpecific: this.editor.getModeSpecific()
    };
  }
}

export default Editor;
