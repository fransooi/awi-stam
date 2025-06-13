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
* @file EditorSource.js
* @author FL (Francois Lionet)
* @version 0.5
*
* @short Component for single-file code editor
* @description
* Management of the source-editor space
*/
import { basicSetup } from 'codemirror'
import { EditorState } from '@codemirror/state'
import { EditorView, keymap } from '@codemirror/view'
import { defaultKeymap } from '@codemirror/commands'
import BaseComponent, { MESSAGES } from '../utils/BaseComponent.js'
import { PROJECTMESSAGES } from './ProjectManager.js'

class EditorSource extends BaseComponent {
  constructor(parentId, containerId) {
    // Initialize the base component with component name
    super('EditorSource', parentId, containerId);    
    
    // Tab management properties
    this.tabs = []; // Array to store tab data: {id, name, path, content, state, mode, modified}
    this.activeTabIndex = -1; // Index of the currently active tab
    this.tabsContainer = null; // DOM element for the tabs bar
    this.editorContainer = null; // DOM element containing the editor
    
    // Single editor instance that will be reused for all tabs
    this.editorInstance = null; // Mode-specific editor instance
    this.editorView = null; // CodeMirror editor view
    this.modeConfig = null; // Current mode configuration
    
    // Set up message handlers
    this.messageMap[MESSAGES.MODE_CHANGE] = this.handleModeChange;    
  }
  
  async init(options) {
    if (await super.init(options))
      return;
    this.currentMode = options?.mode || 'javascript';
  }

  async destroy() {
    // Clean up the editor instance if it exists
    if (this.editorView) {
      this.editorView.destroy();
    }
    super.destroy();
  }

  async render(containerId) {
    this.container = await super.render(containerId);
    this.container.innerHTML = '';
    
    // Create the main container with a simple flex column layout
    this.container.style.display = 'flex';
    this.container.style.flexDirection = 'column';
    this.container.style.height = '100%';
    this.container.style.width = '100%';
    
    // Create tabs container - simple row at the top
    this.tabsContainer = document.createElement('div');
    this.tabsContainer.className = 'editor-tabs';
    this.tabsContainer.style.display = 'flex';
    this.tabsContainer.style.flexDirection = 'row';
    this.tabsContainer.style.overflowX = 'auto';
    this.tabsContainer.style.backgroundColor = 'var(--container-background)';
    this.tabsContainer.style.borderBottom = '1px solid var(--borders)';
    this.tabsContainer.style.minHeight = '30px';
    this.container.appendChild(this.tabsContainer);
    
    // Create a single editor container that fills available space
    this.editorContainer = document.createElement('div');
    this.editorContainer.className = 'editor-content';
    this.editorContainer.style.flex = '1';
    this.editorContainer.style.display = 'flex';
    this.editorContainer.style.minHeight = '300px';
    this.editorContainer.style.width = '100%';
    this.editorContainer.style.minWidth = '0'; // Prevent flex item from overflowing
    this.editorContainer.style.backgroundColor = 'var(--container-background)';
    this.container.appendChild(this.editorContainer);
    
    // Check if the current mode supports multi-file editing
    const isMultiMode = this.modeConfig?.multi === true;
    
    // Show or hide tabs based on the mode
    this.tabsContainer.style.display = isMultiMode ? 'flex' : 'none';
        
    // Render all tabs and show the active one
    this.renderTabs();
    this.showActiveTab();
    
    return this.container;
  }
  
  async loadModeSpecificConfig(mode) {
    try {
      // Dynamically import the editor module for the current mode
      let ConfigModule;
      try {
        ConfigModule = await import(`./modes/${mode}/editor.js`);
      } catch (err) {
        // Fallback to javascript if mode-specific module not found
        try {
          ConfigModule = await import('./modes/javascript/editor.js');
        } catch (fallbackErr) {
          throw fallbackErr;
        }
      }
      
      // Always use the single editor container
      const targetContainer = this.editorContainer;
      
      // Create the mode-specific configuration
      const editorInstance = new ConfigModule.default(targetContainer);
      
      // Get configuration from the mode-specific instance  
      const modeConfig = editorInstance.getConfig ? 
                        editorInstance.getConfig() : 
                        { extensions: [], initialDoc: '', multi: true };
      
      // Ensure multi property exists (default to true if not specified)
      if (modeConfig.multi === undefined) {
        modeConfig.multi = true; // Default to multi-file mode for backward compatibility
      }
      
      // If we've changed from multi to single or vice versa, we may need to update the UI
      if (this.container && this.tabsContainer && this.modeConfig?.multi !== modeConfig.multi) {
        this.tabsContainer.style.display = modeConfig.multi ? 'flex' : 'none';
      }
                        
      // Get tab css from loaded mode
      let css;
      if (editorInstance.getTabCss)
        css = editorInstance.getTabCss();      
      else
        css = this.getDefaultTabCss();
      return { editorInstance, modeConfig, css };
    } catch (error) {
      if (this.editorContainer) {
        this.editorContainer.innerHTML = `<div class="error-message">Failed to load editor for ${mode} mode</div>`;
      }
      return { editorInstance: null, modeConfig: { multi: true } }; // Default to multi-file mode on error
    }
  }
  
  /**
   * Creates or updates the editor instance with the specified content and mode
   * @param {string} initialContent - Initial content for the editor
   * @param {string} mode - Editor mode to use
   * @returns {EditorView} The editor view instance
   */
  async createEditor(tab,content) {
    try {     
      // Clear the container first
      this.editorContainer.innerHTML = '';
      this.editorContainer.style.display = 'flex';
      
      // Load mode-specific configuration
      const configResult = await this.loadModeSpecificConfig(tab.mode);
      this.editorInstance = configResult.editorInstance;
      this.modeConfig = configResult.modeConfig;
      this.multi = configResult.modeConfig.multi;
      
      // Prepare container if mode requires it
      await this.editorInstance.prepareContainer();
      
      // Replace tab css styles to document
      this.replaceStyles(configResult.css);
      
      // Ensure all nested containers have proper width
      Array.from(this.editorContainer.children).forEach(child => {
        child.style.width = '100%';
        child.style.height = '100%';
        child.style.display = 'flex';
        child.style.flexDirection = 'column';
        
        // Also apply to any children of those elements
        Array.from(child.children).forEach(grandchild => {
            grandchild.style.width = '100%';
            grandchild.style.height = '100%';
            grandchild.style.flex = '1';
        });
      });

      // Get the parent element for the editor
      const parent = this.editorInstance.getEditorParent ? 
                     this.editorInstance.getEditorParent() : 
                     this.editorContainer;
      
      // Make sure the parent has proper styling
      parent.style.flex = '1';
      parent.style.width = '100%';
      parent.style.height = '100%';
      
      // Create base extensions that all editors need
      const baseExtensions = [
        basicSetup,
        keymap.of(defaultKeymap),
        EditorView.lineWrapping,
        // Add update listener to detect content modifications
        EditorView.updateListener.of(update => {
          if (update.docChanged) {
            this.markContentModified();
          }
        })
      ];
      
      // Combine base extensions with mode-specific extensions
      const allExtensions = [...baseExtensions, ...(this.modeConfig.extensions || [])];
      
      // If we already have an editor view, destroy it first
      if (this.editorView) {
        this.editorView.destroy();
        this.editorView = null;
      }
      
      // Create editor state with a cursor at the beginning
      const startState = EditorState.create({
        doc: content || '',
        extensions: allExtensions,
        selection: {anchor: 0, head: 0} // Set initial cursor position
      });
      
      // Create editor view
      this.editorView = new EditorView({
        state: startState,
        parent: parent
      });
      
      // Let the mode-specific instance know about the editor view
      this.editorInstance.setEditorView(this.editorView);
      
      // Update editor content
      this.setContent(content);
      
      // Focus the editor immediately
      this.editorView.focus();
      
      return this.editorView;
    } catch (error) {
      this.editorContainer.innerHTML = `<div class="error-message">Failed to create editor: ${error.message}</div>`;
      return null;
    }
  }
  
  // add styles to document if not present
  replaceStyles(css) {
    const styles = document.querySelectorAll('style[data-editorsource-style]');
    if (styles.length > 0) {
      styles.forEach(style => style.remove());  
    }

    const style = document.createElement('style');
    style.setAttribute('data-editorsource-style', true);

    style.textContent = css;
    document.head.appendChild(style);
  }

  /**
   * Saves the current state of the editor to the specified tab
   * @param {number} tabIndex - Index of the tab to save state for
   */
  getTab(indexOrTab)
  { 
    indexOrTab = indexOrTab || this.activeTabIndex;
    if (typeof indexOrTab === 'number') {
      if (indexOrTab < 0 || indexOrTab >= this.tabs.length || !this.editorView) {
        return null;
      }  
      return this.tabs[indexOrTab];
    }
    if (typeof indexOrTab === 'string') {
      for (let i = 0; i < this.tabs.length; i++) {
        if (this.tabs[i].name === indexOrTab) {
          return this.tabs[i];
        }
      }
    }
    return null;
  }
  getTabFromPath(path)
  {
    for (let i = 0; i < this.tabs.length; i++) {
      if (this.tabs[i].path === path) {
        return this.tabs[i];
      }
    }
    return null;
  }
  handleFileRenamed(data, sender) {
    if (data.oldPath)
    {
      const tab = this.getTabFromPath(data.oldPath);
      if (!tab)
        return;
      tab.path = data.newPath;
      tab.name = data.newPath.split('/').pop();
    }
    else if (data.tabIndex)
    { 
      const tab = this.getTab(data.tabIndex);
      if (!tab)
        return;
      tab.path = data.path;
      tab.name = data.path.split('/').pop();
    }
    this.renderTabs();
  }
  saveTabState(tabIndex) {
    const tab = this.getTab(tabIndex);
    if (!tab)
      return;
    
    tab.state = this.editorView.state; //EditorState.fromJSON(this.editorView.state.toJSON());
    tab.scrollTop = this.editorView.scrollDOM.scrollTop;
    tab.scrollLeft = this.editorView.scrollDOM.scrollLeft;
  }
  loadTabState(tabIndex,content)
  {
    const tab = this.getTab(tabIndex);
    if (!tab)
      return;

    this.editorView.scrollDOM.scrollTop = tab.scrollTop;
    this.editorView.scrollDOM.scrollLeft = tab.scrollLeft;
    if (tab.state)
      this.editorView.setState(tab.state);
    else
    {
      const extensions = this.modeConfig?.extensions || [];
      const freshState = EditorState.create({
        doc: content || '',
        extensions
      });
      this.editorView.setState(freshState);
    }
  }  

  /**
   * Updates the content of the existing editor without recreating it
   * @param {string} content - The new content to display
   * @returns {EditorView} The updated editor view
   */
  updateEditorContent(content) {
    if (!this.editorView) {
      return null;
    }

    try {
      // Create a transaction to replace the entire document
      const transaction = this.editorView.state.update({
        changes: {
          from: 0,
          to: this.editorView.state.doc.length,
          insert: content || ''
        }
      });

      // Apply the transaction to update the editor
      this.editorView.dispatch(transaction);
      
      // Focus the editor
      this.editorView.focus();
      
      return this.editorView;
    } catch (error) {
      console.error('Error updating editor content:', error);
      return null;
    }
  }

  // Tab management methods
  async addNewTab(oldTab = {},content='') {
    var state = null;
    if (oldTab.state){
      state=oldTab.state;
    }
    const tab = {
      id: `tab-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      name: oldTab.name || 'Untitled',
      path: oldTab.path || null,
      mode: oldTab.mode || this.currentMode,
      modified: false,
      justLoaded: true,
      state: state,
      scrollTop: 0,
      scrollLeft: 0,
    };
    
    // Add to tabs array
    this.tabs.push(tab);    
    if (this.activeTabIndex !== -1 && this.editorView) 
      this.saveTabState(this.activeTabIndex);      
    this.activeTabIndex = this.tabs.length - 1;      
    await this.createEditor(tab,content);
    this.saveTabState(this.activeTabIndex);

    // Update the tabs UI
    this.renderTabs();    
    setTimeout(() => {
      this.editorView.focus();
    }, 100);
    return tab;
  }
  copyTab(tabIndex) {
    const tab = this.getTab(tabIndex);
    if (!tab)
      return;

    const tabObj = {
      id: tab.id,
      name: tab.name,
      path: tab.path,
      mode: tab.mode,
      modified: tab.modified,
      justLoaded: tab.justLoaded,
      state: tab.state,
      scrollTop: tab.scrollTop,
      scrollLeft: tab.scrollLeft,
    };
    return tabObj;    
  }
  getTabData(tabIndex) {
    const tab = this.getTab(tabIndex);
    if (!tab)
      return null;
    return {
      name: tab.name,
      path: tab.path,
      mode: tab.mode,
      state: tab.state,
      content: tab.state.doc.toString(),
      scrollTop: tab.scrollTop,
      scrollLeft: tab.scrollLeft,
    };
  }
  
  /**
   * Removes a tab
   * @param {number} index - Index of the tab to remove
   */
  async removeTab(index) {
    const tab = this.getTab(index);
    if (!tab)
      return;
    
    if (!tab.justLoaded && tab.modified) {
      var answer = await this.root.alerts.showCustom('stam:save-changes', 'stam:file-modified', ['stam:no|negative', 'stam:yes|positive'], 'question');
      if (answer === 1)
      {
        this.saveTabState(index);
        var data = this.getTabData(index);
        var response = await this.sendRequestTo('class:ProjectManager', PROJECTMESSAGES.SAVE_FILE, data);
        if (response && !response.error)
          this.closeTab(index);
      }
    } else {
      this.closeTab(index);
    }
  }
  
  /**
   * Closes the tab and removes it from the tabs array
   * @param {number} index - Index of the tab to close
   */
  closeTab(index) {
    // Remove from the tabs array
    this.tabs.splice(index, 1);
    
    // Update active tab index if needed
    if (this.tabs.length === 0) {
      this.activeTabIndex = -1;
      if (this.editorView) {
        this.updateEditorContent('');
      }
    } else if (index === this.activeTabIndex) {
      this.activeTabIndex = Math.min(index, this.tabs.length - 1);
      this.showActiveTab();
    } else if (index < this.activeTabIndex) {
      this.activeTabIndex--;
    }
    
    // Update the tabs UI
    this.renderTabs();
  }
     
  /**
   * Switches to a specific tab
   * @param {number} index - Index of the tab to switch to
   */
  async switchToTab(index) {
    const tab = this.getTab(index);
    if (!tab)
      return;
    
    // Save the state of the current tab before switching
    if (this.activeTabIndex >= 0) 
      this.saveTabState(this.activeTabIndex);
    
    // Update the active tab index
    this.activeTabIndex = index;
    this.tabs[this.activeTabIndex].justLoaded = true;
    
    // Update the tabs UI
    this.renderTabs();
    
    // Show the newly active tab
    await this.showActiveTab();
  }
  
  /**
   * Shows the currently active tab by updating the editor content and state
   */
  async showActiveTab() {   
    // Check if we have a valid active tab
    const tab = this.getTab(this.activeTabIndex);
    if (!tab)
      return;
    
    if (this.editorView)
    {
      tab.justLoaded = true; 
      this.loadTabState(tab);
      this.renderTabs();
      setTimeout(() => {
        try {
          this.editorView.focus();
        } catch (error) {
          console.error('Error focusing editor:', error);
        }
      }, 50);
    }
  }
  
  /**
   * Renders the tab bar with all open tabs
   */
  renderTabs() {
    if (!this.tabsContainer) return;
    
    // Clear existing tabs
    this.tabsContainer.innerHTML = '';

    // Create tabs for each open tab
    this.tabs.forEach((tab, index) => {
      const tabElement = document.createElement('div');
      if (index != this.activeTabIndex) 
        tabElement.className = 'editor-tab editor-tab-inactive';
      else
        tabElement.className = 'editor-tab editor-tab-active';      
      tabElement.dataset.index = index;
      tabElement.title = tab.path;
      const nameSpan = document.createElement('span');
      if (tab.name.length > 20)
        nameSpan.textContent = '...'+tab.name.slice(tab.name.length-20) + ((!tab.justLoaded && tab.modified) ? ' *' : '');
      else
        nameSpan.textContent = tab.name + ((!tab.justLoaded && tab.modified) ? ' *' : '');
      tabElement.appendChild(nameSpan);
      
      // Close button
      const closeBtn = document.createElement('span');
      closeBtn.className = 'editor-tab-close';
      closeBtn.textContent = '×';
      tabElement.appendChild(closeBtn);
      
      // Event listeners
      tabElement.addEventListener('click', (e) => {
        // If the click was on the close button, remove the tab
        if (e.target === closeBtn) {
          this.removeTab(index);
        } else {
          // Otherwise switch to this tab
          this.switchToTab(index);
        }
      });
      
      this.tabsContainer.appendChild(tabElement);
    });
    
    // Add a "new tab" button
    const newTabBtn = document.createElement('div');
    newTabBtn.className = 'editor-new-tab';
    newTabBtn.textContent = '+';
    newTabBtn.addEventListener('click', () => this.addNewTab({ setActive:true }));
   this.tabsContainer.appendChild(newTabBtn);
  }

  getDefaultTabCss() {
    return `
      .editor-new-tab {
        padding: 2px 12px;
        cursor: pointer;
        border-right: 1px solid var(--borders);
      }
      .editor-tab {
        padding: 2px 12px;
        cursor: pointer;
        background-color: var(--container-background);
        display: flex;
        align-items: center;
        gap: 8px;
        border-top-right-radius: 4px;
        border-top-left-radius: 4px;
        font-size: 12px;
      }
      .editor-tab-active {
        background-color: color-mix(in srgb, var(--dialog-background), white 20%);
        border-top: 1px solid var(--borders);
        border-left: 1px solid var(--borders);
        border-right: 1px solid var(--borders);
      }
      .editor-tab-inactive {
        background-color: var(--container-background);
        border-top: 0px;
        border-left: 0px;  
        border-right: 0px;
      }
      .editor-tab-active:hover {
        background-color: color-mix(in srgb, var(--dialog-background), white 20%);
      }
      .editor-tab-inactive:hover {
        background-color: color-mix(in srgb, var(--container-background), white 20%);
      }
      .editor-tab-close {
        font-size: 16px;
        width: 16px;
        height: 16px;
        line-height: 16px;
        text-align: center;
        border: 50%;
        background-color: transparent;
        color: var(--text-primary);
        display: inline-block;
      }
      .editor-tab-close:hover {
        background-color: color-mix(in srgb, var(--dialog-background), white 40%);
      }
      .editor-new-tab {
        font-size: 16px;
        width: 36px;
        text-align: center;
        border-top-right-radius: 4px;
        border-top-left-radius: 4px;
        border-top: 0px solid var(--borders);
        border-left: 0px solid var(--borders);
        border-right: 0px solid var(--borders);
        background-color: var(--container-background);
        color: var(--text-primary);
        display: inline-block;
      }
      .editor-new-tab:hover {
        background-color: color-mix(in srgb, var(--dialog-background), white 20%);
      }
    `;
  }
  
  /**
   * Gets the currently active tab object
   * @returns {Object|null} The active tab object or null if none
   */
  getActiveTab() {
    return this.getTab(this.activeTabIndex);
  }
  
  // Core editor methods that all modes can use
  getContent() {
    const activeTab = this.getActiveTab();
    if (activeTab)
        return this.editorView.state.doc.toString();
    return '';
  }
  setContent(content) {
    const activeTab = this.getActiveTab();
    if (activeTab) {
      const transaction = this.editorView.state.update({
        changes: {
          from: 0,
          to: this.editorView.state.doc.length,
          insert: content
        }
      });
      this.editorView.dispatch(transaction);
      return;
    }
  }
  
  // Message handlers  
  /**
   * Handle mode change by preserving tab state per mode and switching between them
   * @param {Object} data - Mode change data
   * @param {string} data.mode - The new mode to switch to
   * @param {Object} sender - The sender of the message
   * @returns {boolean} True if the mode was changed, false otherwise
   */
  async handleGetInformation(data, sender) {
    return {
      currentMode: this.currentMode,
      numberOfTabs: this.tabs.length,
      activeTabIndex: this.activeTabIndex,
      activeTab: this.getActiveTab()
    };
  }
  async handleModeChange(data, sender) {
    if (!data.mode) return false;
    
    const newMode = data.mode;
    if (this.currentMode === newMode) return true; // Already in this mode
    
    // Store the current mode's state before switching
    if (!this.modeStates) {
      this.modeStates = {};
    }
    
    // Save current mode state including all tabs and their content
    this.modeStates[this.currentMode] = {
      tabs: this.tabs.map(tab => {
        // For the active tab, get the latest content from the editor
        let content = tab.content;
        if (this.activeTabIndex !== -1 && this.tabs[this.activeTabIndex] === tab && this.editorView) {
          content = this.editorView.state.doc.toString();
          // Update the tab's content to ensure it's saved correctly
          tab.content = content;
        }
        
        // Create a deep copy of the tab object
        return { ...tab };
      }),
      activeTabIndex: this.activeTabIndex
    };
    
    // Destroy current interface
    if (this.editorView) {
      this.editorView.destroy();
      this.editorView = null;
    }
    
    // Clear the editor container
    if (this.editorContainer) {
      this.editorContainer.innerHTML = '';
    }
    
    // Update the current mode
    this.currentMode = newMode;
    
    // Load the mode-specific editor configuration
    const { editorInstance, modeConfig } = await this.loadModeSpecificConfig(newMode);
    this.editorInstance = editorInstance;
    this.modeConfig = modeConfig;
    
    // Show or hide tabs based on the mode's multi property
    if (this.tabsContainer) {
      this.tabsContainer.style.display = modeConfig?.multi ? 'flex' : 'none';
    }
    
    // Check if we have previously saved state for this mode
    if (this.modeStates[newMode]) {
      // Restore the saved state
      const savedState = this.modeStates[newMode];
      this.tabs = savedState.tabs.map(tab => ({ ...tab })); // Deep copy
      this.activeTabIndex = savedState.activeTabIndex;
      
      // Render the tabs
      this.renderTabs();
      
      // Show the active tab
      this.showActiveTab();
    } else {
      // Create a new display with one tab for this mode
      this.tabs = [];
      this.activeTabIndex = -1;
      
      await this.addNewTab({
        name: 'Untitled',
        mode: newMode,
        setActive: true
      });
    }
    
    return true;
  }
  
  async handleFileLoaded(file, sender) {
    if (file.content) {
      // Check if the current mode supports multi-file editing
      const isMultiMode = this.modeConfig?.multi !== false;
      
      if (isMultiMode) {

        // If already open-> activate
        for (let index = 0; index < this.tabs.length; index++) {
          if (this.tabs[index].path === file.path) {
            this.switchToTab(index);
            return true;
          }
        }
        
        // Create a new tab with the file content in multi-file mode
        var data = {
          name: file.name,
          path: file.path,
          state: file.state,
          mode: this.currentMode,
          setActive: true
        }
        await this.addNewTab(data, file.content);
        return true;
      } else {
        // In single-file mode, replace the content of the current tab
        const activeTab = this.getActiveTab();
        if (activeTab) {
          // Update the editor content
          this.updateEditorContent(file.content);
          
          // Update the tab info
          activeTab.name = file.name || 'Untitled';
          activeTab.path = file.path || null;
          activeTab.mode = this.currentMode;
          activeTab.modified = false;
          
          // Render the tabs (even though they might be hidden)
          this.renderTabs();
        }
      }
      return true;
    }
    return false;
  }
  
  async handleSaveAsFile(data, sender) {
    var tab = this.getActiveTab();
    if (tab) {
      this.saveTabState(tab);
      var response = await this.sendMessageTo('class:ProjectManager', PROJECTMESSAGES.SAVE_FILE, { fileInfo: tab, forceDialog: true });
      if (response && !response.error)
      {
        // Mark the file as saved
        tab.name=response.name;
        tab.path=response.path;
        tab.modified = false;
        this.renderTabs();
        return true;
      }       
      return false;
    }
    return false;
  }
  
  async handleSaveFile(data, sender) {    
    var tab = this.getActiveTab();
    if (tab) {
      this.saveTabState(tab);
      var response = await this.sendRequestTo('class:ProjectManager', PROJECTMESSAGES.SAVE_FILE, { fileInfo: data, forceDialog: false });
      if (response && !response.error)
      {
        // Mark the file as saved
        tab.modified = false;
        this.renderTabs();
        return true;
      }       
      return false;
    }
    return false;
  }
  
  async handleRunProgram(data, sender) {
    // Get the current content from the editor
    const content = this.getContent();
    
    // Get the active tab info
    const activeTab = this.getActiveTab();
    if (activeTab) {
      // Send a message to the parent component with the content to run
      this.sendMessage(MESSAGES.RUN_PROGRAM_CONTENT, { 
        content,
        name: activeTab.name,
        path: activeTab.path,
        mode: activeTab.mode
      });
      return true;
    }
    
    // Fallback if no active file
    this.sendMessage(MESSAGES.RUN_PROGRAM_CONTENT, { content });
    return true;
  }
  
  async handleDebugProgram(data, sender) {
    // Get the current content from the editor
    const content = this.getContent();
    
    // Get the active tab info
    const activeTab = this.getActiveTab();
    if (activeTab) {
      // Send a message to the parent component with the content to debug
      this.sendMessage(MESSAGES.DEBUG_PROGRAM_CONTENT, { 
        content,
        name: activeTab.name,
        path: activeTab.path,
        mode: activeTab.mode
      });
      return true;
    }
    
    // Fallback if no active file
    this.sendMessage(MESSAGES.DEBUG_PROGRAM_CONTENT, { content });
    return true;
  }

  async handleCloseFile(data, sender) {
    if (this.activeTabIndex >= 0 && this.activeTabIndex < this.tabs.length) 
      return this.removeTab(this.activeTabIndex);
    return false;
  }
  
  
  /**
   * Shows a dialog asking the user what to do with modified file
   * @param {Object} tab - The tab object with file information
   * @returns {Promise} - Resolves with 'save', 'discard', or 'cancel'
   */
  async showFileModifiedDialog(tab) {
    return new Promise((resolve) => {
      // Create the modal overlay
      const overlay = document.createElement('div');
      overlay.className = 'modal-overlay';
      overlay.style.position = 'fixed';
      overlay.style.top = '0';
      overlay.style.left = '0';
      overlay.style.width = '100%';
      overlay.style.height = '100%';
      overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
      overlay.style.display = 'flex';
      overlay.style.justifyContent = 'center';
      overlay.style.alignItems = 'center';
      overlay.style.zIndex = '9999';
      
      // Create the dialog box
      const dialog = document.createElement('div');
      dialog.className = 'file-modified-dialog';
      dialog.style.backgroundColor = '#2a2a2a';
      dialog.style.border = '1px solid #444';
      dialog.style.borderRadius = '4px';
      dialog.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.3)';
      dialog.style.padding = '20px';
      dialog.style.width = '400px';
      dialog.style.maxWidth = '90%';
      dialog.style.display = 'flex';
      dialog.style.flexDirection = 'column';
      dialog.style.gap = '15px';
      
      // Create dialog header
      const header = document.createElement('div');
      header.style.borderBottom = '1px solid #444';
      header.style.paddingBottom = '10px';
      
      const title = document.createElement('h2');
      title.textContent = 'Save Changes?';
      title.style.margin = '0';
      title.style.color = '#eee';
      title.style.fontSize = '18px';
      
      header.appendChild(title);
      dialog.appendChild(header);
      
      // Create dialog content
      const content = document.createElement('div');
      
      const message = document.createElement('p');
      message.textContent = `The file "${tab.name}" has unsaved changes. Do you want to save them?`;
      message.style.color = '#ddd';
      message.style.margin = '0 0 15px 0';
      
      content.appendChild(message);
      dialog.appendChild(content);
      
      // Create dialog buttons
      const buttonsContainer = document.createElement('div');
      buttonsContainer.style.display = 'flex';
      buttonsContainer.style.justifyContent = 'flex-end';
      buttonsContainer.style.gap = '10px';
      
      // Function to close the dialog and clean up
      const closeDialog = () => {
        document.body.removeChild(overlay);
      };
      
      // Save button
      const saveButton = document.createElement('button');
      saveButton.textContent = this.root.messages.getMessage('stam:yes');
      saveButton.style.padding = '8px 16px';
      saveButton.style.backgroundColor = '#4a6da7';
      saveButton.style.color = '#fff';
      saveButton.style.border = 'none';
      saveButton.style.borderRadius = '4px';
      saveButton.style.cursor = 'pointer';
      saveButton.addEventListener('click', () => {
        closeDialog();
        resolve('save');
      });
      
      // Discard button
      const discardButton = document.createElement('button');
      discardButton.textContent = this.root.messages.getMessage('stam:no');
      discardButton.style.padding = '8px 16px';
      discardButton.style.backgroundColor = '#a74a4a';
      discardButton.style.color = '#fff';
      discardButton.style.border = 'none';
      discardButton.style.borderRadius = '4px';
      discardButton.style.cursor = 'pointer';
      discardButton.addEventListener('click', () => {
        closeDialog();
        resolve('discard');
      });
      
      // Cancel button
      const cancelButton = document.createElement('button');
      cancelButton.textContent = this.root.messages.getMessage('stam:cancel');
      cancelButton.style.padding = '8px 16px';
      cancelButton.style.backgroundColor = '#3a3a3a';
      cancelButton.style.color = '#ddd';
      cancelButton.style.border = 'none';
      cancelButton.style.borderRadius = '4px';
      cancelButton.style.cursor = 'pointer';
      cancelButton.addEventListener('click', () => {
        closeDialog();
        resolve('cancel');
      });
      
      // Add buttons in order: Cancel, Discard, Save
      buttonsContainer.appendChild(cancelButton);
      buttonsContainer.appendChild(discardButton);
      buttonsContainer.appendChild(saveButton);
      dialog.appendChild(buttonsContainer);
      
      // Add keyboard navigation
      overlay.tabIndex = 0;
      overlay.focus();
      overlay.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          closeDialog();
          resolve('cancel');
        }
      });
      
      // Add the dialog to the document body
      document.body.appendChild(overlay);
      overlay.appendChild(dialog);
      
      // Focus the save button by default
      saveButton.focus();
    });
  }
  
  /**
   * Apply layout information to restore the Editor state
   * @param {Object} layoutInfo - Layout information for this Editor
   */
  async applyLayout(layoutInfo) {
    await super.applyLayout(layoutInfo);

    // Clear any existing tabs
    this.tabs = [];
    this.activeTabIndex = -1;
    
    // Restore tabs from layout info
    if (layoutInfo.tabs && Array.isArray(layoutInfo.tabs) && layoutInfo.tabs.length > 0) {
      // Create tabs for each saved tab
      for (let i = 0; i < layoutInfo.tabs.length; i++) {
        const tabInfo = layoutInfo.tabs[i];
        await this.addNewTab({
          name: tabInfo.name,
          path: tabInfo.path,
          mode: tabInfo.mode,
          setActive: false
        },'');
      }
      
      // Set the active tab
      const activeIndex = typeof layoutInfo.activeTabIndex === 'number' ? 
        Math.min(layoutInfo.activeTabIndex, this.tabs.length - 1) : 0;
      
      if (activeIndex >= 0 && activeIndex < this.tabs.length) {
        this.switchToTab(activeIndex);
      }
    } else if (layoutInfo.content) {
      await this.addNewTab({
        name: layoutInfo.name,
        path: layoutInfo.path,
        mode: layoutInfo.mode,
        setActive: false
      },'');
    }
    
    // Render the tabs
    this.renderTabs();
    this.layoutLoaded = true;
  }
  
  async handleProjectLoaded(data, sender) {
    if (this.layoutLoaded)
    {
      for (let i = 0; i < this.tabs.length; i++) {
        const tab = this.tabs[i];
        if (tab.path)
        {
          var file = await this.sendMessageTo('class:ProjectManager', PROJECTMESSAGES.RELOAD_FILE, { path: tab.path });          
          tab.state = file.state;
          tab.state.content = file.content;
          tab.justLoaded = true;
        }
      }
      this.layoutLoaded = false;
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
    
    // Save information about all tabs
    layoutInfo.tabs = this.tabs.map(tab => {
      return {
        name: tab.name,
        path: tab.path,
        mode: tab.mode,
        modified: false
      };
    });
    
    // Save current tab index
    layoutInfo.activeTabIndex = this.activeTabIndex;
    
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
   * Marks the active file as having modified changes
   */
  markContentModified() {
    const activeTab = this.getActiveTab();
    if (activeTab) {
      // Only proceed if the tab isn't already marked as modified
      if (!activeTab.modified) {
        if (activeTab.justLoaded) {
          activeTab.justLoaded = false;
          return;
        }
        activeTab.modified = true;
        
        // Find the active tab element and update just its text
        if (this.tabsContainer) {
          const activeTabElement = this.tabsContainer.querySelector(`.editor-tab[data-index="${this.activeTabIndex}"]`);
          if (activeTabElement) {
            // Find the name span (first span child)
            const nameSpan = activeTabElement.querySelector('span');
            if (nameSpan) {
              nameSpan.textContent = activeTab.name + ' *';
              return; // Exit early since we've updated the DOM directly
            }
          }
        }
        
        // Fallback to full render if direct DOM update fails
        this.renderTabs();
      }
    }
  }
}

export default EditorSource;
