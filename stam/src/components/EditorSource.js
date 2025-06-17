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
    this.projectLoaded = false; // Project loaded flag
    
    // Single editor instance that will be reused for all tabs
    this.editor = null; // Mode-specific editor instance
    this.editorView = null; // CodeMirror editor view
    this.editorConfig = null; // Current mode configuration
    
    // Set up message handlers
    this.messageMap[MESSAGES.MODE_CHANGE] = this.handleModeChange;    
  }
  
  async init(options={}) {
    if (await super.init(options))
      return;
    if (typeof options.mode){
      this.currentMode = options.mode;
      await this.loadModeSpecificConfig(this.currentMode);
    }
    this.projectLoaded = false;
  }

  async destroy() {
    super.destroy();
    this.projectLoaded = false;
    if (this.editor && this.editor.destroy)
      this.editor.destroy();
    if (this.editorView)
      this.editorView.destroy();
    this.editorView = null;
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
    
    // Replace tab css styles to document
    this.replaceStyles(this.editorConfig.css);

    // Show or hide tabs based on the mode
    this.tabsContainer.style.display = this.editorConfig.multi ? 'flex' : 'none';        
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
      
      // Create the mode-specific configuration
      this.editor = new ConfigModule.default(this.root);
      this.editorConfig = this.editor.getConfig();
      
      // Ensure multi property exists (default to true if not specified)
      if (this.editorConfig.multi === undefined) {
        this.editorConfig.multi = true; // Default to multi-file mode for backward compatibility
      }
      
      // Get tab css from loaded mode
      if (!this.editorConfig.css)
        this.editorConfig.css = this.getDefaultCss();
      return true;
    } catch (error) {
      if (this.editorContainer) {
        this.editorContainer.innerHTML = `<div class="error-message">Failed to load editor for ${mode} mode</div>`;
      }
      return false;
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
      this.editorContainer.innerHTML = '';
      this.editorContainer.style.display = 'flex';
      if (this.editor.prepareContainer)
        this.editor.prepareContainer(this.editorContainer);
      
      // Replace tab css styles to document
      this.replaceStyles(this.editorConfig.css);
      
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

      // Make sure the parent has proper styling
      this.editorContainer.style.flex = '1';
      this.editorContainer.style.width = '100%';
      this.editorContainer.style.height = '100%';
      
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
      const allExtensions = [...baseExtensions, ...(this.editorConfig.extensions || [])];
      
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
        parent: this.editorContainer
      });      
      this.editor.setEditorView(this.editorView);      
      this.editorView.focus();

      tab.state = this.editorView.state;
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
  getTab(indexOrNameOrTab)
  { 
    indexOrNameOrTab = indexOrNameOrTab || this.activeTabIndex;
    if (typeof indexOrNameOrTab === 'number') {
      if (indexOrNameOrTab < 0 || indexOrNameOrTab >= this.tabs.length || !this.editorView) {
        return null;
      }  
      return this.tabs[indexOrNameOrTab];
    }
    if (typeof indexOrNameOrTab === 'string') {
      if (indexOrNameOrTab.indexOf('/') < 0)
      {
        for (let i = 0; i < this.tabs.length; i++) {
          if (this.tabs[i].name === indexOrNameOrTab) {
            return this.tabs[i];
          }
        }
      }
      else
      {
        for (let i = 0; i < this.tabs.length; i++) {
          if (this.tabs[i].path === indexOrNameOrTab) {
            return this.tabs[i];
          }
        }
      }
    }
    if ( typeof indexOrNameOrTab === 'object' && indexOrNameOrTab.id )
      return indexOrNameOrTab;
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
  getTabFileInfo(tabIndex)
  {
    const tab = this.getTab(tabIndex);
    if (!tab)
      return null;
    const fileInfo = {
      name: tab.name,
      path: tab.path,
      mode: tab.mode,
      modified: tab.modified,
      state: JSON.stringify(tab.state.toJSON()),
      scrollTop: tab.scrollTop,
      scrollLeft: tab.scrollLeft,
    };
    return fileInfo;
  }
  updateCurrentTabState() {
    if (this.activeTabIndex < 0)
      return;
    const tab = this.getTab(this.activeTabIndex);
    if (!tab)
      return;
    tab.state = this.editorView.state; 
    tab.scrollTop = this.editorView.scrollDOM.scrollTop;
    tab.scrollLeft = this.editorView.scrollDOM.scrollLeft;
  }
  loadTabState(tabIndex,state,content)
  {
    const tab = this.getTab(tabIndex);
    if (!tab)
      return;
    state = state || tab.state;

    this.editorView.scrollDOM.scrollTop = tab.scrollTop;
    this.editorView.scrollDOM.scrollLeft = tab.scrollLeft;
    if (state)
    {
      this.editorView.setState(tab.state);
      if (content)
        this.setContent(content);
    }
    else
    {
      const extensions = this.editorConfig?.extensions || [];
      const freshState = EditorState.create({
        doc: content || '',
        extensions
      });
      this.editorView.setState(freshState);
    }
  }  
  getActiveTab() {
    return this.getTab(this.activeTabIndex);
  }
  getContent() {
    this.updateCurrentTabState();
    const tab = this.getTab(this.activeTabIndex);
    if (tab)
        return tab.state.doc.toString();
    return '';
  }
  setContent(content) {
    const tab = this.getTab(this.activeTabIndex);
    if (tab) {
      const transaction = this.editorView.state.update({
        changes: {
          from: 0,
          to: this.editorView.state.doc.length,
          insert: content
        }
      });
      this.updateCurrentTabState();
      this.editorView.dispatch(transaction);
      return;
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

  ////////////////////////////////////////////////////////////////////////////
  // Tab management methods
  ////////////////////////////////////////////////////////////////////////////
  async addNewTab(oldTab = {},content='') {
    var state = null;
    if (oldTab.state){
      state=oldTab.state;
    }
    const tab = {
      id: this.root.utilities.getUniqueIdentifier( {}, 'editor' + this.currentMode ),
      name: oldTab.name || 'Untitled',
      path: oldTab.path || null,
      mode: oldTab.mode || this.currentMode,
      modified: false,
      justLoaded: true,
      state: state,
      scrollTop: 0,
      scrollLeft: 0,
    };
    
    this.tabs.push(tab);    
    this.updateCurrentTabState();      
    this.activeTabIndex = this.tabs.length - 1;      
    await this.createEditor(tab,content);
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
  closeTab(index) {
    this.tabs.splice(index, 1);
    if (this.tabs.length === 0) {
      this.activeTabIndex = -1;
      if (this.editorView)
        this.editorView.destroy();
    } else if (index === this.activeTabIndex) {
      this.activeTabIndex = Math.min(index, this.tabs.length - 1);
    } else if (index < this.activeTabIndex) {
      this.activeTabIndex--;
    }
    this.renderTabs();
    this.showActiveTab();
    return true;
  }
  async closeAllTabs() {
    while (this.tabs.length > 0) {
      this.closeTab(0);
    }
    return true;
  }
  async closeAndSaveAllTabs() {
    for(var i=this.tabs.length-1;i>=0;i--)
    {
      if (!await this.ensureTabSaved(i))
        return false;
    }
    await this.closeAllTabs();
    return true;
  }
  async saveAllTabs() {
    for(var i=this.tabs.length-1;i>=0;i--)
    {
      if (!await this.ensureTabSaved(i))
        return false;
    }
    return true;
  }
  async saveAllTabsForce() {
    var redrawTabs = false;
    this.updateCurrentTabState();
    for(var i=this.tabs.length-1;i>=0;i--)
    {
      if (!this.tabs[i].modified)
        continue;
      var fileInfo = this.getTabFileInfo(i);
      var forceDialog = false;
      if (!fileInfo.path)
      {
        fileInfo.path = this.editorConfig.defaultFilename;
        fileInfo.name = this.editorConfig.defaultFilename;
        forceDialog = true;
      }
      var response = await this.sendRequestTo('class:ProjectManager', PROJECTMESSAGES.SAVE_FILE, { fileInfo: fileInfo, forceDialog: forceDialog });
      if (response.error)          
        return false;
      this.tabs[i].modified = false;
      redrawTabs = true;
    }
    if (redrawTabs)
      this.renderTabs();
    return true;
  }
  async ensureTabSaved(index){
    const tab = this.getTab(index);
    if (!tab)
      return false;
    
    if (tab.modified)       
    {
      var fileName = tab.name;
      if (!tab.path)
        fileName = '';
      var message = this.root.messages.getMessage('stam:file-modified-message', { name: fileName });
      var answer = await this.root.alert.showCustom('stam:save-changes', message, ['stam:cancel|neutral', 'stam:no|negative', 'stam:yes|positive'], 'question');
      if (answer == 0)
        return false;
      if (answer === 2)
      {
        if (index == this.activeTabIndex)
          this.updateCurrentTabState(); 
        var fileInfo = this.getTabFileInfo(index);
        var forceDialog = false;
        if (!fileInfo.path)
        {
          fileInfo.path = this.editorConfig.defaultFilename;
          fileInfo.name = this.editorConfig.defaultFilename;
          forceDialog = true;
        }
        var response = await this.sendRequestTo('class:ProjectManager', PROJECTMESSAGES.SAVE_FILE, { fileInfo: fileInfo, forceDialog: forceDialog });
        if (response.error)          
          return false;
      }
    }
    return true;
  }
  async closeTabIfSaved(index) {
    if (!await this.ensureTabSaved(index))
      return false;
    this.closeTab(index);
    return true;
  }  
  async switchToTab(index) {
    const tab = this.getTab(index);
    if (!tab)
      return;
    
    // Save the state of the current tab before switching
    this.updateCurrentTabState();
    
    // Update the active tab index
    this.activeTabIndex = index;
    this.tabs[this.activeTabIndex].justLoaded = true;
    
    // Update the tabs UI
    this.renderTabs();
    
    // Show the newly active tab
    await this.showActiveTab();
  }
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
        } catch (error) {}
      }, 50);
    }
  }
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
          this.closeTabIfSaved(index);
        } else {
          // Otherwise switch to this tab
          this.switchToTab(index);
        }
      });
      
      this.tabsContainer.appendChild(tabElement);
    });
    
    // Add a "new tab" button if project loaded
    if (this.projectLoaded)
    {
      const newTabBtn = document.createElement('div');
      newTabBtn.className = 'editor-new-tab';
      newTabBtn.textContent = '+';
      newTabBtn.addEventListener('click', () => this.addNewTab({ setActive:true }));
      this.tabsContainer.appendChild(newTabBtn);
    }
  }

  getDefaultCss() {
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
  async handleCanModeChange(data, sender){
    return await this.handleCanCloseProject(data, sender);
  }
  async handleModeChange(data, sender) {
    if (!data.mode) return false;
    
    const newMode = data.mode;
    if (this.currentMode === newMode && !data.force) return true; // Already in this mode


    // Store the current mode's state before switching
    if (!this.modeStates) {
      this.modeStates = {};
    }
    
    // Save current mode state including all tabs and their content
    this.updateCurrentTabState();
    this.modeStates[this.currentMode] = {
      tabs: this.tabs.map(tab => {
        return { ...tab };
      }),
      activeTabIndex: this.activeTabIndex
    };
    
    // Destroy current interface
    this.destroy();
    
    // Update the current mode
    this.currentMode = newMode;
    
    // Load the mode-specific editor configuration
    await this.loadModeSpecificConfig(this.currentMode);
   
    // Show or hide tabs based on the mode's multi property
    if (this.tabsContainer) {
      this.tabsContainer.style.display = this.editorConfig.multi ? 'flex' : 'none';
    }
    
    // Check if we have previously saved state for this mode
    if (this.modeStates[this.currentMode]) {
      const savedState = this.modeStates[this.currentMode];
      this.tabs = savedState.tabs.map(tab => ({ ...tab })); // Deep copy
      this.activeTabIndex = savedState.activeTabIndex;      
    } else {
      this.tabs = [];
      this.activeTabIndex = -1;
    }
    this.render();
    return true;
  }
  
  async handleLayoutReady(data, sender) {
    if (this.editorConfig == null)
      await this.loadModeSpecificConfig({ mode: this.currentMode, force: true });    
    return true;
  }
  
  async handleFileLoaded(file, sender) {
    // Check if the current mode supports multi-file editing
    if (this.editorConfig.multi) 
    {
      // If already open-> activate
      for (let index = 0; index < this.tabs.length; index++) {
        if (this.tabs[index].path === file.path) {
          this.switchToTab(index);
          return true;
        } 
      }
        
      // Create a new tab with the file content in multi-file mode
      var content = file.content;
      if (file.state)
        content = file.state.doc.toString();
      var data = {
        name: file.name,
        path: file.path,
        state: file.state,
        mode: this.currentMode,
        setActive: true
      }
      await this.addNewTab(data, content);
      return true;
    } 
    // In single-file mode, replace the content of the current tab
    const activeTab = this.getActiveTab();
    if (activeTab) {
      // Update the tab info
      activeTab.name = file.name || 'Untitled';
      activeTab.path = file.path || null;
      activeTab.mode = this.currentMode;
      activeTab.state = file.state;
      activeTab.modified = false;
      this.loadTabState(activeTab, activeTab.state);          

      // Render the tabs (even though they might be hidden)
      this.renderTabs();
    }
    return true;
  }
  async handleFileClosed(data, sender)
  {
    let tab = this.findTab(data.path);
    if ( tab ){
      this.closeTab(tab);
      return true;
    }
    return false;
  }
  
  async handleSaveAsFile(data, sender) {
    var tab = this.getActiveTab();
    if (tab) {
      this.updateCurrentTabState();
      var fileInfo = this.getTabFileInfo(tab);
      var response = await this.sendRequestTo('class:ProjectManager', PROJECTMESSAGES.SAVE_FILE, { fileInfo: fileInfo, forceDialog: true });
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
      this.updateCurrentTabState();
      var fileInfo = this.getTabFileInfo(tab);
      var forceDialog = fileInfo.path == '';
      var response = await this.sendRequestTo('class:ProjectManager', PROJECTMESSAGES.SAVE_FILE, { fileInfo: fileInfo, forceDialog: forceDialog });
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

    // Force save all tabs
    var saved = await this.saveAllTabs();
    if (!saved)
      return false;

    var running = null;
    if (this.editor.run)
    {
      running = await this.editor.run();
    }
    else
    {
      var tested = await this.sendRequestTo('class:ProjectManager', PROJECTMESSAGES.TEST_PROGRAM);
      if (tested.error){
        await this.root.alert.showError(tested.error);
        return false;
      }

      this.setInterface('run');
      var running = await this.sendRequestTo('class:ProjectManager', PROJECTMESSAGES.RUN_PROGRAM);
      if (running.error) {
        await this.root.alert.showError(running.error);
        this.setInterface('source');
        return false;
      }
    }
    return true;
  }
  
  async handleDebugProgram(data, sender) {
    // Force save all tabs
    var saved = await this.saveAllTabs();
    if (!saved)
      return false;

    var debugging = null;
    if (this.editor.debug)
    {
      debugging = await this.editor.debug();
    }
    else
    {
      this.setInterface('debug');
      var debugging = await this.sendRequestTo('class:ProjectManager', PROJECTMESSAGES.DEBUG_PROGRAM);
      if (debugging.error){
        await this.root.alert.showError(debugging.error);
        this.setInterface('source');
        return false;
      }
      this.setInterface('debugging', debugging)
    }
    return true;
  }

  async handleCloseFile(data, sender) {
    if (this.activeTabIndex >= 0 && this.activeTabIndex < this.tabs.length) 
      return this.closeTabIfSaved(this.activeTabIndex);
    return false;
  }

  async handleGetDefaultFilename(data, sender) {
    if ( this.editorConfig )
      return this.editorConfig.defaultFilename;
    return 'untitled.js';
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

  async handleSaveAllFiles(data, sender) 
  {
    if ( data.force )
      return await this.saveAllTabsForce();
    return await this.saveAllTabs();
  }
  async handleCanCloseProject(data, sender) 
  {
    return await this.saveAllTabs(data, sender);
  }
  async handleProjectClosed(data, sender) 
  {
    if ( this.projectLoaded )
    {
      var closed = this.closeAllTabs();
      if (closed)
      {
        this.destroy();
        this.render()
      }
    }
  }  
  async handleProjectLoaded(data, sender) 
  {
    this.projectLoaded = true;
    this.tabs = [];
    this.activeTabIndex = -1;
    this.renderTabs();
    
    // Reload all files...
    if (this.layoutLoaded)
    {
      for (let i = 0; i < this.tabs.length; i++) {
        const tab = this.tabs[i];
        if (tab.path)
        {
          var answer = await this.sendRequestTo('class:ProjectManager', MENUCOMMANDS.OPEN_FILE, { path: tab.path });
          if ( answer.error )
            break;
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
