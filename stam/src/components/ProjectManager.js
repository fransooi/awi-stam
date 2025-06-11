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
* @file ProjectManager.js
* @author FL (Francois Lionet)
* @version 0.5
*
* @short This component manages the project
* @description
* This class provides a default implementation of the StatusBar component.
* It extends the BaseComponent class and implements the necessary methods
* for handling status updates and temporary status messages.
*/
import BaseComponent from '../utils/BaseComponent.js';
import { SOCKETMESSAGES } from './sidewindows/SocketSideWindow.js';
import { EditorState } from '@codemirror/state';
import { MENUCOMMANDS } from './MenuBar.js';
import { Dialog } from '../utils/Dialog.js';

export const PROJECTMESSAGES = {
  UPDATE_PROJECT: 'PROJECT_UPDATE_PROJECT',
  PROJECT_LOADED: 'PROJECT_LOADED',
  CLOSE_PROJECT: 'PROJECT_CLOSE_PROJECT',
  FILE_LOADED: 'PROJECT_FILE_LOADED',
  RELOAD_FILE: 'PROJECT_RELOAD_FILE',
  SAVE_FILE: 'PROJECT_SAVE_FILE',
  FILE_SAVED: 'PROJECT_FILE_SAVED',
  NEW_FILE_ADDED: 'PROJECT_NEW_FILE_ADDED',
  GET_PROJECT: 'PROJECT_GET_PROJECT',
  GET_TEMPLATE: 'PROJECT_GET_TEMPLATE',
  CHOOSE_TEMPLATE: 'PROJECT_CHOOSE_TEMPLATE',
  CHOOSE_PROJECT: 'PROJECT_CHOOSE_PROJECT',
};

class ProjectManager extends BaseComponent {
  /**
   * Constructor
   * @param {string} parentId - ID of the parent component
   */
  constructor(parentId = null,containerId) {
    super('Project', parentId,containerId);      
    this.projectName = null;
    this.project = null;
    this.expandedFolders = new Set(); // Track expanded folders by their path

    this.messageMap[SOCKETMESSAGES.CONNECTED] = this.handleConnected;
    this.messageMap[SOCKETMESSAGES.DISCONNECTED] = this.handleDisconnected;
    this.messageMap[MENUCOMMANDS.NEW_PROJECT] = this.handleNewProject;
    this.messageMap[MENUCOMMANDS.OPEN_PROJECT] = this.handleOpenProject;
    this.messageMap[MENUCOMMANDS.OPEN_FILE] = this.handleOpenFile;
    this.messageMap[PROJECTMESSAGES.RELOAD_FILE] = this.handleReloadFile;
    this.messageMap[MENUCOMMANDS.NEW_FILE] = this.handleNewFile;
    this.messageMap[PROJECTMESSAGES.SAVE_FILE] = this.handleSaveFile;
    this.messageMap[PROJECTMESSAGES.GET_PROJECT] = this.handleGetProject;
    this.messageMap[PROJECTMESSAGES.GET_TEMPLATE] = this.handleGetTemplate;
    this.messageMap[PROJECTMESSAGES.CHOOSE_TEMPLATE] = this.handleChooseTemplate;
    this.messageMap[PROJECTMESSAGES.CHOOSE_PROJECT] = this.handleChooseProject;
    
  }

  async init(options = {}) {
    await super.init(options);
  }
  
  async destroy() {
    await super.destroy();
  }
  
  getProjectInformation()
  {
    return {projectLoaded: this.project!=null, project: this.project};
  }
  
  // Find a file in the project
  findFile( path )
  {
      function find( parent, path )
      {
          for ( var f = 0; f < parent.files.length; f++ )
          {
              var file = parent.files[f];
              if ( file.path == path )
                  return file;
              if ( file.isDirectory )
              {
                  var found = find( file, path );
                  if ( found )
                      return found;
              }
          }
          return null;
      }
      if ( this.project )
          return find( this.project, path );
      return null;
  }
  findFileParent( path )
  {
      function find( parent, path )
      {
          for ( var f = 0; f < parent.files.length; f++ )
          {
              var file = parent.files[f];
              if ( file.path == path )
                  return parent;
              if ( file.isDirectory )
              {
                  var found = find( file, path );
                  if ( found )
                      return found;
              }
          }
          return null;
      }
      if ( this.project )
          return find( this.project, path );
      return null;
  }
  findFolder( path )
  {
      function find( parent, path )
      {
          for ( var f = 0; f < parent.files.length; f++ )
          {
              var file = parent.files[f];
              if ( file.path == path && file.isDirectory )
                  return parent;
              if ( file.isDirectory )
              {
                  var found = find( file, path );
                  if ( found )
                      return found;
              }
          }
          return null;
      }
      if ( this.project )
          return find( this.project, path );
      return null;
  }
  addNewFile(file) {
    var folder = file.path.substring(0, file.path.lastIndexOf('/'));
    var hostFile = this.findFolder(folder);
    if (hostFile)
    {
      hostFile.files.push(file);
    }   
  }

  setFileContent(file) {
    var hostFile = this.findFile(file.path);
    if (hostFile)
    {
      hostFile.content = file.content;
      hostFile.state = file.state;
    }   
  }

  async checkProject() {
    if ( !await this.sendRequestTo( 'class:SocketSideWindow', SOCKETMESSAGES.ENSURE_CONNECTED, {}))
      return false;
    if ( !this.project)
    {
      console.error('No project loaded');
      return false;
    }
    return true;
  }

  async handleConnected(data, senderId) {
    // If no project is loaded...
    if (!this.project)
    {
      // But there was one before
      if (this.projectName)
      {
        await this.handleOpenProject({ name: this.projectName, mode: this.projectMode }, senderId);
      } 
    }    
  }

  async handleDisconnected(data, senderId) {
    
  }

  async handleGetTemplate(data, senderId) {
    if ( !await this.sendRequestTo( 'class:SocketSideWindow', SOCKETMESSAGES.ENSURE_CONNECTED, {}))
      return null;
    var templates = await this.root.server.getTemplates({ mode: this.root.currentMode })
    if ( templates )
      return await this.showNewProjectDialog(templates);
    return null;
  }
  async handleGetProjectList(data, senderId) {
    if ( !await this.sendRequestTo( 'class:SocketSideWindow', SOCKETMESSAGES.ENSURE_CONNECTED, {}))
      return null;
    var projects = await this.root.server.getProjectList({ mode: this.root.currentMode });
    if (projects)
      return await this.showOpenProjectDialog(projects);
    return null;
  }

  async handleChooseTemplate(data, senderId) {
    if ( !await this.sendRequestTo( 'class:SocketSideWindow', SOCKETMESSAGES.ENSURE_CONNECTED, {}))
      return;
   
    var templates = await this.root.server.getTemplates({ mode: this.root.currentMode });
    if ( templates )
    {
      var response = await this.showNewProjectDialog(templates, true);
      if (response)
        return response;
      return null;
    }
    return null;
  }
  async handleChooseProject(data, senderId)
  {
    if ( !await this.sendRequestTo( 'class:SocketSideWindow', SOCKETMESSAGES.ENSURE_CONNECTED, {}))
      return null;
    var projects = await this.root.server.getProjectList({ mode: this.root.currentMode });
    if (projects)
      return await this.showOpenProjectDialog(projects);
    return null;

  }
  async handleNewProject(data, senderId) {
    if ( !await this.sendRequestTo( 'class:SocketSideWindow', SOCKETMESSAGES.ENSURE_CONNECTED, {}))
      return;

    var self = this;
    function createProject(data) {
      // Create a new project
      data.name = data.name ? data.name : 'New Project';
      data.template = data.template ? data.template : 'default';
      data.overwrite = data.overwrite ? data.overwrite : true;
      self.root.server.newProject(data)
      .then((project) => {
        self.projectName = project.name;
        self.project = project;
        console.log( 'New project created: ', self.projectName );
        console.log( '                   : ', project.url );
        self.broadcast(PROJECTMESSAGES.PROJECT_LOADED, project);
      })
      .catch((error) => {
        console.error('Error creating new project:', error);
      });
    }
    if (!data.name || !data.template)
    {
      this.root.server.getTemplates({ mode: this.root.currentMode })
      .then((templates) => {
        if ( templates )
        {
          this.showNewProjectDialog(templates).then((response) =>{
            if (response)
            {
              createProject({ name: response.projectName, 
                template: response.name,
                overwrite: response.overwrite });
            }
          });
        }
      })
      return false;
    }
    else
    {
      createProject(data);
      return true;
    }
  }
  
  async handleLoadProject(data, senderId) {
    if ( !await this.sendRequestTo( 'class:SocketSideWindow', SOCKETMESSAGES.ENSURE_CONNECTED, {}))
      return;
    if ( data.name )
    {
      this.root.server.openProject(data)
      .then((project) => {
        if (!project.error)
        {
          this.projectName = project.name;
          this.project = project;
          this.broadcast(PROJECTMESSAGES.PROJECT_LOADED, project);
        }
      })
      .catch((error) => {
        console.error('Error loading project:', error);
      });
    }
  }

  async handleOpenProject(data, senderId) {
    if ( !await this.sendRequestTo( 'class:SocketSideWindow', SOCKETMESSAGES.ENSURE_CONNECTED, {}))
      return;

    if (data.name)
    {
      this.handleLoadProject(data, senderId);
      return;
    }

    this.root.server.getProjectList({ mode: this.root.currentMode })
    .then((projects) => {
      if ( projects )
      {
        this.showOpenProjectDialog(projects).then((response) =>{
          if (response)
          {
            this.handleLoadProject(response, senderId);
          }
        });
      }
    })
  }

  async handleReloadFile(data, senderId){
    if (!await this.checkProject() || !data.path)
      return null;

    data.mode = this.root.currentMode;
    data.handle = this.project.handle;
    var file = await this.root.server.loadFile(data)
    if ( file )
    {
      this.setFileContent(file);
    }
    return file;
  }
  
  async handleOpenFile(data, senderId) {
    if ( !await this.checkProject())
      return;

    // No file name-> file selector
    if (!data.path)
    {
      this.showOpenFileDialog().then((response) =>{
        if (response)
        {
          this.handleOpenFile(response, senderId);
        }
      });
      return;
    }

    // If the file is already loaded-> display it
    var file = this.findFile(data.path);
    if (file && file.content)
    {
      this.broadcast(PROJECTMESSAGES.FILE_LOADED, file);
      return;
    }

    // Load the file from the server
    data.mode = this.root.currentMode;
    data.handle = this.project.handle;
    this.root.server.loadFile(data)
    .then((file) => {
      if (file && !file.error)
      {
        if (file.state)
          file.state=EditorState.fromJSON(JSON.parse(file.state));
        this.setFileContent(file);
        this.broadcast(PROJECTMESSAGES.FILE_LOADED, file);
      }
    })
  }
  
  async handleNewFile(data, senderId) {
    if ( !await this.checkProject())
      return;

    var response = await this.showSaveFileDialog('New file.js', 'Create a new file');
    if (response)
    {
      data.path = response.path;
      data.name = this.root.utilities.getFileNameFromPath(data.path);
      data.content = '';
      data.mode = this.root.currentMode;
      data.handle = this.project.handle;
      var newFile = await this.handleSaveFile(data, senderId);
      if ( !newFile.error )
      {
        this.addNewFile(newFile);
        this.broadcast(PROJECTMESSAGES.NEW_FILE_ADDED, newFile);
        return newFile;
      }
    }
    return false;
  }
  /**
   * Handle save file command
   * @param {Object} data - File data to save
   * @param {string} data.path - File path
   * @param {string} data.name - File name
   * @param {string} data.content - File content
   * @param {string} data.mode - File mode
   * @param {string} data.handle - Project handle
   * @param {string} senderId - ID of the sender
   */
  async handleSaveFile(data, senderId) {
    if ( !await this.checkProject())
      return;

    // No file name-> get current file from editor
    if (!data.path)
    {
      var response = await this.showSaveFileDialog(data.name);
      if (response)
      {
        data.path = response.path;
        data.name = this.root.utilities.getFileNameFromPath(data.path);
        var newFile = await this.handleSaveFile(data, senderId);
        if ( !newFile.error )
        {
          this.addNewFile(newFile);
          this.broadcast(PROJECTMESSAGES.NEW_FILE_ADDED, newFile);
          return newFile;
        }
      }
      return false;
    }

    // Save the file on the server
    var state = null;
    if (data.state)
      state = JSON.stringify(data.state.toJSON());
    var newData = {
      path: data.path,
      name: data.name,
      content: data.content,
      state: state,
      mode: this.root.currentMode,
      handle: this.project.handle
    };
    var answer = await this.root.server.saveFile(newData);
    if (answer && !answer.error){
      var file = this.findFile(data.path);
      file.content = data.content;
      file.state = data.state;
    }
    return answer;
  }
  
  async getLayoutInfo() {
    const layoutInfo = await super.getLayoutInfo();
    layoutInfo.projectName = this.projectName;
    layoutInfo.projectMode = this.projectMode;
    return layoutInfo;
  }

  async applyLayout(layout) {
    await super.applyLayout(layout);
    this.projectName = layout.projectName;
    this.projectMode = layout.projectMode;
    
  }

  
  async showNewProjectDialog(templateList,chooseTemplate = false) {
    return new Promise((resolve) => {
      const theme = this.root.preferences.getCurrentTheme();
      let selectedTemplate = templateList?.[0] || null;
      let projectName = selectedTemplate?.name || this.root.messages.getMessage('stam:new-project');
      let overwriteExisting = true;

      // Create dialog content container
      const content = document.createElement('div');
      content.className = 'new-project-dialog';
      content.style.padding = '0';
      content.style.margin = '0';
      content.style.width = 'auto';
      content.style.minWidth = '0';
      content.style.maxWidth = '100%';
      content.style.boxSizing = 'border-box';
      content.style.display = 'flex';
      content.style.flexDirection = 'column';
      
      // Create content HTML
      content.innerHTML = `
        <div style="padding: 0px 0px 0 0px; width: 100%; box-sizing: border-box;">
          <div class="form-group">
            <label for="project-name" class="dialog-label">${this.root.messages.getMessage('stam:project-name')}</label>
            <input type="text" id="project-name" class="dialog-input" value="${projectName}" 
                   placeholder="${this.root.messages.getMessage('stam:enter-project-name')}">
          </div>
        </div>
        
        <div style="padding: 0 0px; width: 100%; box-sizing: border-box;">
          <div class="form-group">
            <label class="checkbox-label">
              <input type="checkbox" id="overwrite-checkbox" ${overwriteExisting ? 'checked' : ''}>
              ${this.root.messages.getMessage('stam:overwrite-existing-project')}
            </label>
          </div>
        </div>
        
        <div style="flex: 1; display: flex; flex-direction: column; min-height: 0; padding: 2px 24px 2px 24px; width: 100%; box-sizing: border-box;">
          <div class="dialog-label">${this.root.messages.getMessage('stam:template')}</div>
          <div class="dialog-description" style="margin-bottom: 8px;">${this.root.messages.getMessage('stam:select-template-for-new-project')}</div>
          <div class="template-list">
            ${this._renderTemplateList(templateList, theme)}
          </div>
        </div>
      `;

      // Set up event listeners
      const nameInput = content.querySelector('#project-name');
      const overwriteCheckbox = content.querySelector('#overwrite-checkbox');
      
      // Handle template selection
      content.querySelectorAll('.template-item').forEach((item, index) => {
        item.addEventListener('click', () => {
          selectedTemplate = templateList[index];
          
          // Update UI
          content.querySelectorAll('.template-item').forEach(el => 
            el.classList.remove('selected')
          );
          item.classList.add('selected');
          
          // Update project name if it's still the default
          nameInput.value = selectedTemplate.name;
        });
      });
      
      // Create and show the dialog
      const dialog = new Dialog({
        title: this.root.messages.getMessage(chooseTemplate ? 'stam:choose-template' : 'stam:new-project'),
        content: content,
        theme: theme,
        buttons: [
          {
            label: this.root.messages.getMessage('stam:cancel'),
            className: 'btn btn-neutral',
            onClick: () => {
              resolve({}); dialog.close();}
          },
          {
            label: this.root.messages.getMessage(chooseTemplate?'stam:choose':'stam:create'),
            className: 'btn btn-positive',
            onClick: () => {
              if (selectedTemplate) {
                resolve({
                  ...selectedTemplate,
                  projectName: nameInput.value || 'New Project',
                  overwrite: overwriteCheckbox.checked
                });
                dialog.close();
              } else {
                this.root.alert.showWarning('stam:please-select-a-template');
                return false;
              }
            }
          }
        ]
      });
      
      dialog.open();
    });
  }
  
  /**
   * Renders the template list HTML
   * @private
   */
  _renderTemplateList(templates, theme) {
    if (!templates || !templates.length) {
      return `<div class="no-templates dialog-list-empty">
        ${this.root.messages.getMessage('stam:no-templates-available')}
      </div>`;
    }
    
    return templates.map((template, index) => `
      <div class="template-item dialog-list-item ${index === 0 ? 'selected' : ''}">
        ${template.iconUrl ? `
          <div class="template-icon dialog-list-item-icon">
            <img src="${template.iconUrl}" alt="${template.name}">
          </div>` : ''}
        <div class="template-info dialog-list-item-info">
          <div class="template-name dialog-list-item-name">${template.name}</div>
          ${template.description ? `
            <div class="template-description dialog-list-item-description">${template.description}</div>` : ''}
        </div>
      </div>
    `).join('');
  }

  /**
   * Show the open project dialog
   * @param {Array} projectList - List of available projects
   * @returns {Promise} - Resolves with the selected project or null if cancelled
   */
  showOpenProjectDialog(projectList) {
    return new Promise((resolve) => {
      // Create the dialog element using the Dialog component
      const content = document.createElement('div');
      content.className = 'open-project-dialog';
      content.style.padding = '0';
      content.style.margin = '0';
      content.style.width = '600px';
      content.style.maxWidth = '90vw';
      content.style.boxSizing = 'border-box';
      content.style.display = 'flex';
      content.style.flexDirection = 'column';
      
      // Create content HTML
      content.innerHTML = `
        <div style="padding: 0 24px 2px 24px; width: 100%; box-sizing: border-box;">
          <div class="form-group">
            <div class="dialog-label">${this.root.messages.getMessage('stam:select-project-to-open')}</div>
          </div>
          
          <div class="dialog-list-container">
            ${this._renderProjectList(projectList)}
          </div>
        </div>
      `;
      
      let selectedProject = projectList?.[0] || null;
      
      // Handle project selection
      content.querySelectorAll('.dialog-list-item').forEach((item, index) => {
        item.addEventListener('click', () => {
          selectedProject = projectList[index];
          
          // Update UI
          content.querySelectorAll('.dialog-list-item').forEach(el => 
            el.classList.remove('selected')
          );
          item.classList.add('selected');
        });
      });
      
      // Create and show the dialog
      const dialog = new Dialog({
        title: this.root.messages.getMessage('stam:open-project'),
        content: content,
        theme: this.root.themeManager?.getCurrentTheme() || {},
        className: 'project-dialog',
        style: {
          width: '600px',
          maxWidth: '90vw',
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          position: 'relative',
          margin: '0',
          padding: '0',
          boxSizing: 'border-box'
        },
        buttons: [
          {
            label: this.root.messages.getMessage('stam:cancel'),
            className: 'btn btn-neutral',
            onClick: () => {resolve(null); dialog.close();}
          },
          {
            label: this.root.messages.getMessage('stam:open'),
            className: 'btn btn-positive',
            onClick: () => {
              if (selectedProject) {
                resolve(selectedProject);
                dialog.close();
              } else {
                this.root.alert.showWarning('stam:please-select-a-project');
                dialog.close();
                return false;
              }
            }
          }
        ]
      });
      
      dialog.open();
    });
  }
  
  /**
   * Renders the project list HTML using the generic list item styles
   * @param {Array} projects - Array of project objects
   * @returns {string} HTML string of the project list
   * @private
   */
  _renderProjectList(projects) {
    if (!projects || !projects.length) {
      return `
        <div class="dialog-list-empty">
          ${this.root.messages.getMessage('stam:no-projects-available')}
        </div>`;
    }
    
    return projects.map((project, index) => `
      <div class="dialog-list-item ${index === 0 ? 'selected' : ''}" 
           data-project-index="${index}">
        ${project.iconUrl ? `
          <div class="dialog-list-item-icon">
            <img src="${project.iconUrl}" alt="${project.name}">
          </div>` : ''}
        <div class="dialog-list-item-info">
          <div class="dialog-list-item-name">${project.name}</div>
          ${project.description ? `
            <div class="dialog-list-item-description">${project.description}</div>` : ''}
        </div>
      </div>
    `).join('');
  }
  
  // Show a file open dialog with the project file structure
  // @param {Array|string} fileExtensions - File extensions to filter (e.g., "*.js" or ["*.js", "*.mjs"])
  // @returns {Promise} - Resolves with the selected file or null if cancelled
  async showOpenFileDialog(fileExtensions = null) {
    return new Promise((resolve) => {
      const theme = this.root.preferences.getCurrentTheme();
      let selectedFile = null;
      let extensions = [];

      // Convert single extension string to array if needed
      if (typeof fileExtensions === 'string') {
        extensions = [fileExtensions];
      } else if (Array.isArray(fileExtensions)) {
        extensions = [...fileExtensions];
      }

      // Create dialog content container
      const content = document.createElement('div');
      content.className = 'file-selector';
      
      // Create content HTML
      content.innerHTML = `
        ${extensions.length > 0 ? `
          <div class="file-selector-header">
            <div class="file-selector-filter">
              ${this.root.messages.getMessage('stam:filter')}: ${extensions.join(', ')}
            </div>
          </div>` : ''}
        
        <div class="file-list-container">
          <div class="file-list">
            ${this._renderFileList(this.project?.files || [], extensions)}
          </div>
        </div>
      `;

      // Set up event listeners for file and folder selection
      content.addEventListener('click', (e) => {
        const fileItem = e.target.closest('.file-item');
        if (!fileItem) return;
        
        const isDirectory = fileItem.dataset.isDirectory === 'true';
        const filePath = fileItem.dataset.path;
        
        if (isDirectory) {
          // Toggle folder expansion
          if (this.expandedFolders.has(filePath)) {
            this.expandedFolders.delete(filePath);
          } else {
            this.expandedFolders.add(filePath);
          }
          
          // Re-render the file list
          const fileList = content.querySelector('.file-list');
          if (fileList) {
            fileList.innerHTML = this._renderFileList(this.project?.files || [], extensions);
            // Re-attach event listeners after re-rendering
            this._attachFileListEventListeners(content);
          }
          e.stopPropagation();
        } else {
          // Handle file selection
          content.querySelectorAll('.file-item').forEach(el => 
            el.classList.remove('selected')
          );
          fileItem.classList.add('selected');
          
          // Find the selected file
          const file = this._findFileByPath(this.project?.files || [], filePath);
          if (file) {
            selectedFile = file;
            // Enable the Open button when a file is selected
            const openButton = content.closest('.dialog').querySelector('.dialog-button.primary');
            if (openButton) {
              openButton.disabled = false;
            }
          }
        }
      });
      
      // Helper method to attach event listeners to file items
      this._attachFileListEventListeners = (container) => {
        // No need to reattach click handlers as we're using event delegation
      };

      // Create and show the dialog
      const dialog = new Dialog({
        title: this.root.messages.getMessage('stam:select-file-to-open'),
        content: content,
        style: {
          width: '600px',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          position: 'relative',
          margin: '0',
          padding: '0',
          boxSizing: 'border-box'
        },
        className: 'file-dialog',
        onOpen: (dialogEl) => {
          // Ensure dialog maintains fixed height
          const contentEl = dialogEl.querySelector('.dialog-content');
          if (contentEl) {
            contentEl.style.overflow = 'auto';
            contentEl.style.display = 'flex';
            contentEl.style.flexDirection = 'column';
            contentEl.style.flex = '1 1 auto';
            contentEl.style.minHeight = '0'; /* Crucial for flex children to respect overflow */
          }
        },
        buttons: [
          {
            label: this.root.messages.getMessage('stam:cancel'),
            className: 'btn btn-neutral',
            onClick: () => {
              resolve(null);
              dialog.close();
            }
          },
          {
            label: this.root.messages.getMessage('stam:open'),
            className: 'btn btn-positive',
            disabled: true, // Initially disabled until a file is selected
            onClick: () => {
              if (selectedFile) {
                resolve(selectedFile);
                dialog.close();
              }
            }
          }
        ]
      });

      // Store reference to the dialog for external access if needed
      this._openFileDialog = dialog;

      // Show the dialog
      dialog.open();
    });
  }

  // Helper method to find a file by its path
  _findFileByPath(files, targetPath, currentPath = '') {
    for (const file of files) {
      const filePath = currentPath ? `${currentPath}/${file.name}` : file.name;
      
      if (filePath === targetPath) {
        return file;
      }
      
      if (file.isDirectory && file.files) {
        const found = this._findFileByPath(file.files, targetPath, filePath);
        if (found) return found;
      }
    }
    return null;
  }

  // Renders the file list HTML
  _renderFileList(files, extensions = [], level = 0, parentPath = '') {
    if (!files || !files.length) {
      return `
        <div class="file-list-empty" style="padding-left: ${level * 16}px;">
          ${this.root.messages.getMessage('stam:no-files-found')}
        </div>
      `;
    }
    
    let result = '';
    
    // Sort files: directories first, then files alphabetically
    const sortedFiles = [...files].sort((a, b) => {
      if (a.isDirectory && !b.isDirectory) return -1;
      if (!a.isDirectory && b.isDirectory) return 1;
      return a.name.localeCompare(b.name);
    });
    
    sortedFiles.forEach(file => {
      const isDirectory = file.isDirectory;
      const filePath = parentPath ? `${parentPath}/${file.name}` : file.name;
      const indent = level * 16;
      const isExpanded = isDirectory && this.expandedFolders.has(filePath);
      
      // Only show files that match the filter
      if (!isDirectory && extensions.length > 0) {
        const matchesFilter = extensions.some(ext => {
          const pattern = ext.replace('*.', '.').toLowerCase();
          return file.name.toLowerCase().endsWith(pattern);
        });
        if (!matchesFilter) return;
      }
      
      result += `
        <div class="file-item ${isDirectory ? 'is-folder' : ''} ${isExpanded ? 'is-expanded' : ''}" 
             style="padding-left: ${indent}px;" 
             data-path="${filePath}" 
             data-is-directory="${isDirectory}">
          <div class="file-icon">
            ${isDirectory ? (isExpanded ? '📂' : '📁') : '📄'}
          </div>
          <div class="file-name">${file.name}</div>
        </div>
      `;
      
      // Render children if this is an expanded directory
      if (isDirectory && isExpanded && file.files && file.files.length > 0) {
        result += this._renderFileList(file.files, extensions, level + 1, filePath);
      }
    });
    
    if (!result.trim() && extensions.length > 0) {
      return `
        <div class="file-list-empty" style="padding-left: ${level * 16}px;">
          ${this.root.messages.getMessage('stam:no-matching-files')}
        </div>
      `;
    }
    
    return result;
  }  
  
  /**
   * Show a file save dialog with the project file structure
   * @param {string} initialContent - The content to save
   * @param {string} defaultFileName - Default filename suggestion
   * @returns {Promise} - Resolves with the file data object or null if cancelled
   */
  /**
   * Show a file save dialog with the project file structure
   * @param {string} defaultFileName - Default filename suggestion
   * @param {string} title - Dialog title
   * @returns {Promise} - Resolves with the file data object or null if cancelled
   */
  async showSaveFileDialog(defaultFileName = 'Untitled.js', title = '') {
    return new Promise((resolve) => {
      const theme = this.root.preferences.getCurrentTheme();
      let currentPath = '';
      let fileName = defaultFileName;
      let currentDirectory = null;

      // Create dialog content container
      const content = document.createElement('div');
      content.className = 'file-selector';
      
      // Create content HTML
      content.innerHTML = `
        <div class="file-save-controls" style="margin-bottom: 16px;">
          <div style="margin-bottom: 8px; font-size: 14px; color: var(--text-secondary, #b0b0b0);">
            ${this.root.messages.getMessage('stam:filename')}:
          </div>
          <input type="text" class="file-name-input" value="${defaultFileName}" 
                 style="width: 100%; padding: 8px; margin-bottom: 16px; background: var(--container-background, #252526); 
                        border: 1px solid var(--borders, #444); color: var(--text-primary, #e0e0e0);
                        border-radius: 4px; font-size: 14px; outline: none;">
          
          <div style="margin-bottom: 8px; font-size: 14px; color: var(--text-secondary, #b0b0b0);">
            ${this.root.messages.getMessage('stam:location')}:
          </div>
          <div class="current-location" style="margin-bottom: 16px; padding: 8px; background: var(--container-background, #252526); 
                                          border: 1px solid var(--borders, #444); color: var(--text-primary, #e0e0e0);
                                          border-radius: 4px; font-size: 14px; min-height: 16px;">
            ${currentPath ? `/${currentPath}` : '/'}
          </div>
        </div>
        
        <div class="file-list-container" style="flex: 1; overflow: auto; border: 1px solid var(--borders, #444);">
          <div class="file-list">
            ${this._renderFileList(this.project?.files || [])}
          </div>
        </div>
      `;

      // Helper function to update the UI
      const updateUI = () => {
        const locationEl = content.querySelector('.current-location');
        if (locationEl) {
          locationEl.textContent = currentPath ? `/${currentPath}` : '/';
        }
        
        // Update save button state
        const saveButton = content.closest('.dialog')?.querySelector('.dialog-button.primary');
        if (saveButton) {
          saveButton.disabled = !fileName.trim();
        }
      };

      // Set up event listeners for file and folder selection
      content.addEventListener('click', (e) => {
        const fileItem = e.target.closest('.file-item');
        if (!fileItem) return;
        
        const isDirectory = fileItem.dataset.isDirectory === 'true';
        const filePath = fileItem.dataset.path;
        
        if (isDirectory) {
          // Toggle folder expansion
          if (this.expandedFolders.has(filePath)) {
            this.expandedFolders.delete(filePath);
          } else {
            this.expandedFolders.add(filePath);
            // Update current path when entering a directory
            currentPath = filePath;
            currentDirectory = this._findFileByPath(this.project?.files || [], filePath);
            updateUI();
          }
          
          // Re-render the file list
          const fileList = content.querySelector('.file-list');
          if (fileList) {
            fileList.innerHTML = this._renderFileList(this.project?.files || []);
          }
          e.stopPropagation();
        } else {
          // Update selected file name
          const fileNameInput = content.querySelector('.file-name-input');
          if (fileNameInput) {
            const parts = filePath.split('/');
            fileNameInput.value = parts[parts.length - 1];
            fileName = fileNameInput.value;
            updateUI();
          }
        }
      });

      // Handle file name input changes
      content.querySelector('.file-name-input')?.addEventListener('input', (e) => {
        fileName = e.target.value.trim();
        updateUI();
      });

      // Create and show the dialog
      const dialog = new Dialog({
        title: title || this.root.messages.getMessage('stam:save-file'),
        content: content,
        style: {
          width: '600px',
          height: '500px',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          position: 'relative',
          margin: '0',
          padding: '0',
          boxSizing: 'border-box'
        },
        className: 'file-dialog',
        onOpen: (dialogEl) => {
          // Ensure dialog maintains fixed height
          const contentEl = dialogEl.querySelector('.dialog-content');
          if (contentEl) {
            contentEl.style.overflow = 'auto';
            contentEl.style.display = 'flex';
            contentEl.style.flexDirection = 'column';
            contentEl.style.flex = '1 1 auto';
            contentEl.style.minHeight = '0'; // Crucial for flex children to respect overflow
          }
          
          // Focus the file name input
          const fileNameInput = dialogEl.querySelector('.file-name-input');
          if (fileNameInput) {
            fileNameInput.focus();
            fileNameInput.select();
          }
        },
        buttons: [
          {
            label: this.root.messages.getMessage('stam:cancel'),
            className: 'btn btn-neutral',
            onClick: () => {
              resolve(null);
              dialog.close();
            }
          },
          {
            label: this.root.messages.getMessage('stam:save'),
            className: 'btn btn-positive',
            disabled: !fileName.trim(),
            onClick: () => {
              const fullPath = currentPath ? `${currentPath}/${fileName}` : fileName;
              
              // Check if file exists
              const fileExists = this._findFileByPath(this.project?.files || [], fullPath);
              
              if (fileExists) {
                // Show confirmation dialog for overwrite
                if (confirm(this.root.messages.getMessage('stam:file-exists-overwrite', { fileName }))) {
                  resolve({ path: fullPath, name: fileName });
                  dialog.close();
                }
              } else {
                resolve({ path: fullPath, name: fileName });
                dialog.close();
              }
            }
          }
        ]
      });

      // Show the dialog
      dialog.open();
    });
  }
  
  /////////////////////////////////////////////////////////////////////////
  // Project Dialog Box
  /////////////////////////////////////////////////////////////////////////
  async showProjectDialog()
  {
    // Create the dialog element
    this.element = document.createElement('div');
    this.element.id = 'project-dialog';
    this.element.className = 'project-dialog';
    this.element.style.display = 'none';
    this.element.style.position = 'fixed';
    this.element.style.top = '50%';
    this.element.style.left = '50%';
    this.element.style.transform = 'translate(-50%, -50%)';
    this.element.style.backgroundColor = '#2a2a2a';
    this.element.style.border = '1px solid #444';
    this.element.style.borderRadius = '4px';
    this.element.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.3)';
    this.element.style.padding = '20px';
    this.element.style.minWidth = '400px';
    this.element.style.zIndex = '1000';
    
    // Create dialog header
    const header = document.createElement('div');
    header.className = 'project-dialog-header';
    header.style.marginBottom = '20px';
    header.style.borderBottom = '1px solid #444';
    header.style.paddingBottom = '10px';
    
    const title = document.createElement('h2');
    title.textContent = this.root.messages.getMessage('stam:project');
    title.style.margin = '0';
    title.style.color = '#eee';
    title.style.fontSize = '18px';
    
    header.appendChild(title);
    this.element.appendChild(header);
    
    // Create dialog content area
    const content = document.createElement('div');
    content.className = 'project-dialog-content';
    content.style.marginBottom = '20px';
    
    const message = document.createElement('p');
    message.textContent = this.root.messages.getMessage('stam:project-dialog-box');
    message.style.color = '#ddd';
    
    content.appendChild(message);
    this.element.appendChild(content);
    
    // Create dialog footer with buttons
    const footer = document.createElement('div');
    footer.className = 'project-dialog-footer';
    footer.style.display = 'flex';
    footer.style.justifyContent = 'flex-end';
    footer.style.gap = '10px';
    
    const okButton = document.createElement('button');
    okButton.textContent = this.root.messages.getMessage('stam:ok');
    okButton.style.padding = '8px 16px';
    okButton.style.backgroundColor = '#4a4a4a';
    okButton.style.color = '#fff';
    okButton.style.border = 'none';
    okButton.style.borderRadius = '4px';
    okButton.style.cursor = 'pointer';
    okButton.onclick = () => this.handleOkClick();
    
    const cancelButton = document.createElement('button');
    cancelButton.textContent = this.root.messages.getMessage('stam:cancel');
    cancelButton.style.padding = '8px 16px';
    cancelButton.style.backgroundColor = '#3a3a3a';
    cancelButton.style.color = '#ddd';
    cancelButton.style.border = 'none';
    cancelButton.style.borderRadius = '4px';
    cancelButton.style.cursor = 'pointer';
    cancelButton.onclick = () => this.handleCancelClick();
    
    footer.appendChild(cancelButton);
    footer.appendChild(okButton);
    this.element.appendChild(footer);
    
    // Add the dialog to the document body
    document.body.appendChild(this.element);
  }

  /**
   * Handle OK button click
   */
  handleOkClick() {
    // Just hide the dialog without saving layout
    this.hide();
  }
  
  /**
   * Handle Cancel button click
   */
  handleCancelClick() {
    this.hide();
  }
  
  /**
   * Show the preferences dialog
   */
  show() {
    this.element.style.display = 'block';
  }
  
  /**
   * Hide the preferences dialog
   */
  hide() {
    this.element.style.display = 'none';
  }
  
}

export default ProjectManager;
 