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
import BaseComponent, { MESSAGES } from '../utils/BaseComponent.js';
import { EditorState } from '@codemirror/state'
import { SOCKETMESSAGES } from './sidewindows/SocketSideWindow.js';
import { MENUCOMMANDS } from './MenuBar.js'

export const PROJECTMESSAGES = {
  UPDATE_PROJECT: 'PROJECT_UPDATE_PROJECT',
  PROJECT_LOADED: 'PROJECT_LOADED',
  CLOSE_PROJECT: 'PROJECT_CLOSE_PROJECT',
  FILE_LOADED: 'PROJECT_FILE_LOADED',
  RELOAD_FILE: 'PROJECT_RELOAD_FILE',
  SAVE_FILE: 'PROJECT_SAVE_FILE',
  FILE_SAVED: 'PROJECT_FILE_SAVED',
  NEW_FILE_ADDED: 'PROJECT_NEW_FILE_ADDED'
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

    this.messageMap[SOCKETMESSAGES.CONNECTED] = this.handleConnected;
    this.messageMap[SOCKETMESSAGES.DISCONNECTED] = this.handleDisconnected;
    this.messageMap[MENUCOMMANDS.NEW_PROJECT] = this.handleNewProject;
    this.messageMap[MENUCOMMANDS.OPEN_PROJECT] = this.handleOpenProject;
    this.messageMap[MENUCOMMANDS.OPEN_FILE] = this.handleOpenFile;
    this.messageMap[PROJECTMESSAGES.RELOAD_FILE] = this.handleReloadFile;
    this.messageMap[MENUCOMMANDS.NEW_FILE] = this.handleNewFile;
    this.messageMap[PROJECTMESSAGES.SAVE_FILE] = this.handleSaveFile;
  }

  async init(options = {}) {
    await super.init(options);
  }
  
  async destroy() {
    await super.destroy();
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

  async handleNewProject(data, senderId) {
    if ( !await this.sendRequestTo( 'class:SocketSideWindow', SOCKETMESSAGES.ENSURE_CONNECTED, {}))
      return;

    var self = this;
    function createProject(data) {
      // Create a new project
      data.name = data.name ? data.name : 'New Project';
      data.template = data.template ? data.template : 'default';
      data.overwrite = data.overwrite ? data.overwrite : true;
      self.root.fileSystem.newProject(data)
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
      this.root.fileSystem.getTemplates({ mode: this.root.currentMode })
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
      this.root.fileSystem.openProject(data)
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

    this.root.fileSystem.getProjectList({ mode: this.root.currentMode })
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
    var file = await this.root.fileSystem.loadFile(data)
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
    this.root.fileSystem.loadFile(data)
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
    var answer = await this.root.fileSystem.saveFile(newData);
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

  
  showNewProjectDialog(templateList) {
    return new Promise((resolve, reject) => {
      // Create the dialog element
      const dialog = document.createElement('div');
      dialog.className = 'new-project-dialog';
      dialog.style.position = 'fixed';
      dialog.style.top = '50%';
      dialog.style.left = '50%';
      dialog.style.transform = 'translate(-50%, -50%)';
      dialog.style.backgroundColor = '#2a2a2a';
      dialog.style.border = '1px solid #444';
      dialog.style.borderRadius = '4px';
      dialog.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.3)';
      dialog.style.padding = '20px';
      dialog.style.minWidth = '500px';
      dialog.style.maxWidth = '800px';
      dialog.style.zIndex = '1000';
      
      // Create dialog header
      const header = document.createElement('div');
      header.style.marginBottom = '20px';
      header.style.borderBottom = '1px solid #444';
      header.style.paddingBottom = '10px';
      
      const title = document.createElement('h2');
      title.textContent = 'Create New Project';
      title.style.margin = '0';
      title.style.color = '#eee';
      title.style.fontSize = '18px';
      
      header.appendChild(title);
      dialog.appendChild(header);
      
      // Create dialog content area
      const content = document.createElement('div');
      content.style.marginBottom = '20px';
      
      // Project name input field
      const projectNameContainer = document.createElement('div');
      projectNameContainer.style.marginBottom = '20px';
      
      const projectNameLabel = document.createElement('label');
      projectNameLabel.textContent = 'Project Name:';
      projectNameLabel.style.display = 'block';
      projectNameLabel.style.color = '#ddd';
      projectNameLabel.style.marginBottom = '5px';
      
      const projectNameInput = document.createElement('input');
      projectNameInput.type = 'text';
      projectNameInput.value = 'New Project';
      projectNameInput.style.width = '100%';
      projectNameInput.style.padding = '8px';
      projectNameInput.style.backgroundColor = '#3a3a3a';
      projectNameInput.style.color = '#fff';
      projectNameInput.style.border = '1px solid #555';
      projectNameInput.style.borderRadius = '4px';
      projectNameInput.style.fontSize = '14px';
      
      projectNameContainer.appendChild(projectNameLabel);
      projectNameContainer.appendChild(projectNameInput);
      content.appendChild(projectNameContainer);
      
      // Overwrite checkbox
      const overwriteContainer = document.createElement('div');
      overwriteContainer.style.marginBottom = '20px';
      overwriteContainer.style.display = 'flex';
      overwriteContainer.style.alignItems = 'center';
      
      const overwriteCheckbox = document.createElement('input');
      overwriteCheckbox.type = 'checkbox';
      overwriteCheckbox.id = 'overwrite-checkbox';
      overwriteCheckbox.checked = true;
      overwriteCheckbox.style.marginRight = '8px';
      overwriteCheckbox.style.cursor = 'pointer';
      
      const overwriteLabel = document.createElement('label');
      overwriteLabel.htmlFor = 'overwrite-checkbox';
      overwriteLabel.textContent = 'Overwrite existing project';
      overwriteLabel.style.color = '#ddd';
      overwriteLabel.style.cursor = 'pointer';
      
      overwriteContainer.appendChild(overwriteCheckbox);
      overwriteContainer.appendChild(overwriteLabel);
      content.appendChild(overwriteContainer);
      
      // Template section with scrollable container
      const templateSection = document.createElement('div');
      templateSection.style.maxHeight = '300px';
      templateSection.style.overflowY = 'auto';
      
      // Instructions text
      const instructions = document.createElement('p');
      instructions.textContent = 'Select a template for your new project:';
      instructions.style.color = '#ddd';
      instructions.style.marginBottom = '15px';
      templateSection.appendChild(instructions);
      
      // Template container
      const templateContainer = document.createElement('div');
      templateContainer.style.display = 'flex';
      templateContainer.style.flexDirection = 'column';
      templateContainer.style.gap = '10px';
      
      let selectedTemplate = null;
      
      // Create template items
      if (templateList && templateList.length > 0) {
        templateList.forEach((template, index) => {
          const templateItem = document.createElement('div');
          templateItem.className = 'template-item';
          templateItem.style.display = 'flex';
          templateItem.style.padding = '10px';
          templateItem.style.border = '1px solid #444';
          templateItem.style.borderRadius = '4px';
          templateItem.style.cursor = 'pointer';
          templateItem.style.transition = 'background-color 0.2s';
          
          // Add click handler to select template
          templateItem.addEventListener('click', () => {
            // Deselect all templates
            document.querySelectorAll('.template-item').forEach(item => {
              item.style.backgroundColor = '#2a2a2a';
              item.style.borderColor = '#444';
            });
            
            // Select this template
            templateItem.style.backgroundColor = '#3a3a3a';
            templateItem.style.borderColor = '#666';
            selectedTemplate = template;
          });
          
          // Icon container
          if (template.iconUrl) {
            const iconContainer = document.createElement('div');
            iconContainer.style.marginRight = '15px';
            iconContainer.style.width = '96px';
            iconContainer.style.height = '96px';
            iconContainer.style.display = 'flex';
            iconContainer.style.alignItems = 'center';
            iconContainer.style.justifyContent = 'center';
            
            const icon = document.createElement('img');
            icon.src = template.iconUrl;
            icon.style.maxWidth = '100%';
            icon.style.maxHeight = '100%';
            icon.alt = template.name;
            
            iconContainer.appendChild(icon);
            templateItem.appendChild(iconContainer);
          }
          
          // Template info
          const templateInfo = document.createElement('div');
          templateInfo.style.flex = '1';
          
          const templateName = document.createElement('h3');
          templateName.textContent = template.name;
          templateName.style.margin = '0 0 5px 0';
          templateName.style.color = '#eee';
          templateName.style.fontSize = '16px';
          
          const templateDescription = document.createElement('p');
          templateDescription.textContent = template.description;
          templateDescription.style.margin = '0';
          templateDescription.style.color = '#bbb';
          templateDescription.style.fontSize = '14px';
          templateDescription.style.whiteSpace = 'pre-line'; // Preserve line breaks
          
          templateInfo.appendChild(templateName);
          templateInfo.appendChild(templateDescription);
          templateItem.appendChild(templateInfo);
          
          templateContainer.appendChild(templateItem);
          
          // Select the first template by default
          if (index === 0) {
            templateItem.click();
          }
        });
      } else {
        const noTemplates = document.createElement('p');
        noTemplates.textContent = 'No templates available.';
        noTemplates.style.color = '#ddd';
        templateContainer.appendChild(noTemplates);
      }
      
      templateSection.appendChild(templateContainer);
      content.appendChild(templateSection);
      dialog.appendChild(content);
      
      // Create dialog footer with buttons
      const footer = document.createElement('div');
      footer.style.display = 'flex';
      footer.style.justifyContent = 'flex-end';
      footer.style.gap = '10px';
      footer.style.marginTop = '20px';
      
      const cancelButton = document.createElement('button');
      cancelButton.textContent = 'Cancel';
      cancelButton.style.padding = '8px 16px';
      cancelButton.style.backgroundColor = '#3a3a3a';
      cancelButton.style.color = '#ddd';
      cancelButton.style.border = 'none';
      cancelButton.style.borderRadius = '4px';
      cancelButton.style.cursor = 'pointer';
      cancelButton.addEventListener('click', () => {
        document.body.removeChild(dialog);
        resolve({});
      });
      
      const createButton = document.createElement('button');
      createButton.textContent = 'Create';
      createButton.style.padding = '8px 16px';
      createButton.style.backgroundColor = '#4a4a4a';
      createButton.style.color = '#fff';
      createButton.style.border = 'none';
      createButton.style.borderRadius = '4px';
      createButton.style.cursor = 'pointer';
      createButton.addEventListener('click', () => {
        if (selectedTemplate) {
          document.body.removeChild(dialog);
          // Include the project name and overwrite flag in the resolved object
          resolve({
            ...selectedTemplate,
            projectName: projectNameInput.value || 'New Project',
            overwrite: overwriteCheckbox.checked
          });
        } else {
          alert('Please select a template');
        }
      });
      
      footer.appendChild(cancelButton);
      footer.appendChild(createButton);
      dialog.appendChild(footer);
      
      // Add the dialog to the document body
      document.body.appendChild(dialog);
    });
  }

  /**
   * Show the open project dialog
   * @param {Array} projectList - List of available projects
   * @returns {Promise} - Resolves with the selected project or null if cancelled
   */
  showOpenProjectDialog(projectList) {
    return new Promise((resolve, reject) => {
      // Create the dialog element
      const dialog = document.createElement('div');
      dialog.className = 'open-project-dialog';
      dialog.style.position = 'fixed';
      dialog.style.top = '50%';
      dialog.style.left = '50%';
      dialog.style.transform = 'translate(-50%, -50%)';
      dialog.style.backgroundColor = '#2a2a2a';
      dialog.style.border = '1px solid #444';
      dialog.style.borderRadius = '4px';
      dialog.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.3)';
      dialog.style.padding = '20px';
      dialog.style.minWidth = '500px';
      dialog.style.maxWidth = '800px';
      dialog.style.zIndex = '1000';
      
      // Create dialog header
      const header = document.createElement('div');
      header.style.marginBottom = '20px';
      header.style.borderBottom = '1px solid #444';
      header.style.paddingBottom = '10px';
      
      const title = document.createElement('h2');
      title.textContent = 'Open Project';
      title.style.margin = '0';
      title.style.color = '#eee';
      title.style.fontSize = '18px';
      
      header.appendChild(title);
      dialog.appendChild(header);
      
      // Create dialog content area
      const content = document.createElement('div');
      content.style.marginBottom = '20px';
      
      // Project section with scrollable container
      const projectSection = document.createElement('div');
      projectSection.style.maxHeight = '400px';
      projectSection.style.overflowY = 'auto';
      
      // Instructions text
      const instructions = document.createElement('p');
      instructions.textContent = 'Select a project to open:';
      instructions.style.color = '#ddd';
      instructions.style.marginBottom = '15px';
      projectSection.appendChild(instructions);
      
      // Project container
      const projectContainer = document.createElement('div');
      projectContainer.style.display = 'flex';
      projectContainer.style.flexDirection = 'column';
      projectContainer.style.gap = '10px';
      
      let selectedProject = null;
      
      // Create project items
      if (projectList && projectList.length > 0) {
        projectList.forEach((project, index) => {
          const projectItem = document.createElement('div');
          projectItem.className = 'project-item';
          projectItem.style.display = 'flex';
          projectItem.style.padding = '10px';
          projectItem.style.border = '1px solid #444';
          projectItem.style.borderRadius = '4px';
          projectItem.style.cursor = 'pointer';
          projectItem.style.transition = 'background-color 0.2s';
          
          // Add click handler to select project
          projectItem.addEventListener('click', () => {
            // Deselect all projects
            document.querySelectorAll('.project-item').forEach(item => {
              item.style.backgroundColor = '#2a2a2a';
              item.style.borderColor = '#444';
            });
            
            // Select this project
            projectItem.style.backgroundColor = '#3a3a3a';
            projectItem.style.borderColor = '#666';
            selectedProject = project;
          });
          
          // Icon container
          if (project.iconUrl) {
            const iconContainer = document.createElement('div');
            iconContainer.style.marginRight = '15px';
            iconContainer.style.width = '96px';
            iconContainer.style.height = '96px';
            iconContainer.style.display = 'flex';
            iconContainer.style.alignItems = 'center';
            iconContainer.style.justifyContent = 'center';
            
            const icon = document.createElement('img');
            icon.src = project.iconUrl;
            icon.style.maxWidth = '100%';
            icon.style.maxHeight = '100%';
            icon.alt = project.name;
            
            iconContainer.appendChild(icon);
            projectItem.appendChild(iconContainer);
          }
          
          // Project info
          const projectInfo = document.createElement('div');
          projectInfo.style.flex = '1';
          
          const projectName = document.createElement('h3');
          projectName.textContent = project.name;
          projectName.style.margin = '0 0 5px 0';
          projectName.style.color = '#eee';
          projectName.style.fontSize = '16px';
          
          const projectDescription = document.createElement('p');
          projectDescription.textContent = project.description || '';
          projectDescription.style.margin = '0';
          projectDescription.style.color = '#bbb';
          projectDescription.style.fontSize = '14px';
          projectDescription.style.whiteSpace = 'pre-line'; // Preserve line breaks
          
          projectInfo.appendChild(projectName);
          projectInfo.appendChild(projectDescription);
          projectItem.appendChild(projectInfo);
          
          projectContainer.appendChild(projectItem);
          
          // Select the first project by default
          if (index === 0) {
            projectItem.click();
          }
        });
      } else {
        const noProjects = document.createElement('p');
        noProjects.textContent = 'No projects available.';
        noProjects.style.color = '#ddd';
        projectContainer.appendChild(noProjects);
      }
      
      projectSection.appendChild(projectContainer);
      content.appendChild(projectSection);
      dialog.appendChild(content);
      
      // Create dialog footer with buttons
      const footer = document.createElement('div');
      footer.style.display = 'flex';
      footer.style.justifyContent = 'flex-end';
      footer.style.gap = '10px';
      footer.style.marginTop = '20px';
      
      const cancelButton = document.createElement('button');
      cancelButton.textContent = 'Cancel';
      cancelButton.style.padding = '8px 16px';
      cancelButton.style.backgroundColor = '#3a3a3a';
      cancelButton.style.color = '#ddd';
      cancelButton.style.border = 'none';
      cancelButton.style.borderRadius = '4px';
      cancelButton.style.cursor = 'pointer';
      cancelButton.addEventListener('click', () => {
        document.body.removeChild(dialog);
        resolve(null);
      });
      
      const openButton = document.createElement('button');
      openButton.textContent = 'Open';
      openButton.style.padding = '8px 16px';
      openButton.style.backgroundColor = '#4a4a4a';
      openButton.style.color = '#fff';
      openButton.style.border = 'none';
      openButton.style.borderRadius = '4px';
      openButton.style.cursor = 'pointer';
      openButton.addEventListener('click', () => {
        if (selectedProject) {
          document.body.removeChild(dialog);
          resolve(selectedProject);
        } else {
          alert('Please select a project');
        }
      });
      
      footer.appendChild(cancelButton);
      footer.appendChild(openButton);
      dialog.appendChild(footer);
      
      // Add the dialog to the document body
      document.body.appendChild(dialog);
    });
  }
  
  /**
   * Show a file open dialog with the project file structure
   * @param {Array|string} fileExtensions - File extensions to filter (e.g., "*.js" or ["*.js", "*.mjs"])
   * @returns {Promise} - Resolves with the selected file or null if cancelled
   */
  async showOpenFileDialog(fileExtensions = null) {
    return new Promise((resolve) => {
      // Convert single extension to array for consistent handling
      const extensions = Array.isArray(fileExtensions) ? fileExtensions : (fileExtensions ? [fileExtensions] : null);
      
      // Create the dialog element
      const dialog = document.createElement('div');
      dialog.className = 'file-dialog';
      dialog.style.display = 'block';
      dialog.style.position = 'fixed';
      dialog.style.top = '50%';
      dialog.style.left = '50%';
      dialog.style.transform = 'translate(-50%, -50%)';
      dialog.style.backgroundColor = '#2a2a2a';
      dialog.style.border = '1px solid #444';
      dialog.style.borderRadius = '4px';
      dialog.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.3)';
      dialog.style.padding = '20px';
      dialog.style.width = '500px';
      dialog.style.maxHeight = '80vh';
      dialog.style.zIndex = '1000';
      dialog.style.display = 'flex';
      dialog.style.flexDirection = 'column';
      
      // Create dialog header
      const header = document.createElement('div');
      header.className = 'file-dialog-header';
      header.style.marginBottom = '20px';
      header.style.borderBottom = '1px solid #444';
      header.style.paddingBottom = '10px';
      
      const title = document.createElement('h2');
      title.textContent = 'Open File';
      title.style.margin = '0';
      title.style.color = '#eee';
      title.style.fontSize = '18px';
      
      header.appendChild(title);
      dialog.appendChild(header);
      
      // Create filter display if extensions are provided
      if (extensions && extensions.length > 0) {
        const filterInfo = document.createElement('div');
        filterInfo.style.fontSize = '14px';
        filterInfo.style.color = '#aaa';
        filterInfo.style.marginBottom = '10px';
        filterInfo.textContent = `Filter: ${extensions.join(', ')}`;
        dialog.appendChild(filterInfo);
      }
      
      // Create file tree container
      const treeContainer = document.createElement('div');
      treeContainer.className = 'file-tree-container';
      treeContainer.style.overflowY = 'auto';
      treeContainer.style.maxHeight = 'calc(80vh - 150px)';
      treeContainer.style.marginBottom = '20px';
      treeContainer.style.border = '1px solid #444';
      treeContainer.style.borderRadius = '4px';
      treeContainer.style.padding = '10px';
      
      // Function to check if a file matches the extensions filter
      const fileMatchesFilter = (filename) => {
        if (!extensions || extensions.length === 0) return true;
        
        return extensions.some(ext => {
          const pattern = ext.replace('*.', '.').toLowerCase();
          return filename.toLowerCase().endsWith(pattern);
        });
      };
      
      // Function to recursively build the file tree
      const buildFileTree = (files, parentElement, level = 0) => {
        if (!Array.isArray(files)) return;
        
        // Sort files: directories first, then files alphabetically
        const sortedFiles = [...files].sort((a, b) => {
          if (a.isDirectory && !b.isDirectory) return -1;
          if (!a.isDirectory && b.isDirectory) return 1;
          return a.name.localeCompare(b.name);
        });
        
        sortedFiles.forEach(file => {
          const isDirectory = file.isDirectory;
          
          // Skip files that don't match the filter
          if (!isDirectory && !fileMatchesFilter(file.name)) return;
          
          // Create item container
          const itemContainer = document.createElement('div');
          itemContainer.className = 'file-tree-item';
          itemContainer.style.paddingLeft = `${level * 20}px`;
          itemContainer.style.padding = '5px';
          itemContainer.style.paddingLeft = `${level * 20 + 5}px`;
          itemContainer.style.cursor = 'pointer';
          itemContainer.style.display = 'flex';
          itemContainer.style.alignItems = 'center';
          itemContainer.style.borderRadius = '3px';
          
          // Hover effect
          itemContainer.addEventListener('mouseover', () => {
            itemContainer.style.backgroundColor = '#3a3a3a';
          });
          
          itemContainer.addEventListener('mouseout', () => {
            itemContainer.style.backgroundColor = 'transparent';
          });
          
          // Create icon
          const icon = document.createElement('span');
          icon.className = 'file-icon';
          icon.style.marginRight = '5px';
          icon.style.fontSize = '14px';
          icon.textContent = isDirectory ? '📁' : '📄';
          
          // Create label
          const label = document.createElement('span');
          label.className = 'file-label';
          label.textContent = file.name;
          label.style.color = '#ddd';
          
          // Add elements to container
          itemContainer.appendChild(icon);
          itemContainer.appendChild(label);
          parentElement.appendChild(itemContainer);
          
          // Handle directory expansion
          if (isDirectory) {
            // Add expand/collapse indicator
            const expandIcon = document.createElement('span');
            expandIcon.className = 'expand-icon';
            expandIcon.style.marginRight = '5px';
            expandIcon.textContent = '▶';
            expandIcon.style.fontSize = '10px';
            expandIcon.style.color = '#aaa';
            
            // Insert expand icon before the folder icon
            itemContainer.insertBefore(expandIcon, icon);
            
            // Create container for children (initially hidden)
            const childrenContainer = document.createElement('div');
            childrenContainer.className = 'file-children';
            childrenContainer.style.display = 'none';
            parentElement.appendChild(childrenContainer);
            
            // Toggle expansion on click
            let expanded = false;
            itemContainer.addEventListener('click', (e) => {
              e.stopPropagation();
              expanded = !expanded;
              expandIcon.textContent = expanded ? '▼' : '▶';
              childrenContainer.style.display = expanded ? 'block' : 'none';
              
              // Only build children the first time we expand
              if (expanded && childrenContainer.children.length === 0) {
                buildFileTree(file.files, childrenContainer, level + 1);
              }
            });
          } else {
            // File selection
            itemContainer.addEventListener('click', () => {
              // Remove selection from any previously selected item
              const selectedItems = treeContainer.querySelectorAll('.file-selected');
              selectedItems.forEach(item => {
                item.classList.remove('file-selected');
                item.style.backgroundColor = 'transparent';
              });
              
              // Mark this item as selected
              itemContainer.classList.add('file-selected');
              itemContainer.style.backgroundColor = '#4a6da7';
              
              // Store the selected file
              selectedFile = file;
              updateOpenButtonState();
            });
            
            // Double-click to select and confirm
            itemContainer.addEventListener('dblclick', () => {
              selectedFile = file;
              closeDialogWithResult(true);
            });
          }
        });
      };
      
      // Variable to store the selected file
      let selectedFile = null;
      
      // Build the initial file tree
      if (this.project && this.project.files) {
        buildFileTree(this.project.files, treeContainer);
      } else {
        const noFiles = document.createElement('div');
        noFiles.textContent = 'No files available';
        noFiles.style.padding = '10px';
        noFiles.style.color = '#aaa';
        treeContainer.appendChild(noFiles);
      }
      
      dialog.appendChild(treeContainer);
      
      // Create dialog footer with buttons
      const footer = document.createElement('div');
      footer.className = 'file-dialog-footer';
      footer.style.display = 'flex';
      footer.style.justifyContent = 'flex-end';
      footer.style.gap = '10px';
      footer.style.marginTop = 'auto';
      
      const cancelButton = document.createElement('button');
      cancelButton.textContent = 'Cancel';
      cancelButton.style.padding = '8px 16px';
      cancelButton.style.backgroundColor = '#3a3a3a';
      cancelButton.style.color = '#ddd';
      cancelButton.style.border = 'none';
      cancelButton.style.borderRadius = '4px';
      cancelButton.style.cursor = 'pointer';
      
      const openButton = document.createElement('button');
      openButton.textContent = 'Open';
      openButton.style.padding = '8px 16px';
      openButton.style.backgroundColor = '#4a6da7';
      openButton.style.color = '#fff';
      openButton.style.border = 'none';
      openButton.style.borderRadius = '4px';
      openButton.style.cursor = 'pointer';
      openButton.disabled = true;
      openButton.style.opacity = '0.6';
      
      // Function to close the dialog and return result
      const closeDialogWithResult = (confirmed) => {
        document.body.removeChild(dialog);
        if (confirmed && selectedFile) {
          resolve(selectedFile);
        } else {
          resolve(null);
        }
      };
      
      // Update open button state when a file is selected
      const updateOpenButtonState = () => {
        if (selectedFile && !selectedFile.isDirectory) {
          openButton.disabled = false;
          openButton.style.opacity = '1';
        } else {
          openButton.disabled = true;
          openButton.style.opacity = '0.6';
        }
      };
      
      // Set up button click handlers
      cancelButton.addEventListener('click', () => closeDialogWithResult(false));
      openButton.addEventListener('click', () => closeDialogWithResult(true));
      
      footer.appendChild(cancelButton);
      footer.appendChild(openButton);
      dialog.appendChild(footer);
      
      // Add the dialog to the document body
      document.body.appendChild(dialog);
      
      // Add keyboard navigation
      dialog.tabIndex = 0;
      dialog.focus();
      dialog.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          closeDialogWithResult(false);
        } else if (e.key === 'Enter') {
          if (selectedFile && !selectedFile.isDirectory) {
            closeDialogWithResult(true);
          }
        }
      });
    });
  }
  
  /**
   * Show a file save dialog with the project file structure
   * @param {string} initialContent - The content to save
   * @param {string} defaultFileName - Default filename suggestion
   * @returns {Promise} - Resolves with the file data object or null if cancelled
   */
  async showSaveFileDialog(defaultFileName = 'Untitled.js', title='') {
    return new Promise((resolve) => {
      // Create the dialog element
      const dialog = document.createElement('div');
      dialog.className = 'file-dialog';
      dialog.style.display = 'block';
      dialog.style.position = 'fixed';
      dialog.style.top = '50%';
      dialog.style.left = '50%';
      dialog.style.transform = 'translate(-50%, -50%)';
      dialog.style.backgroundColor = '#2a2a2a';
      dialog.style.border = '1px solid #444';
      dialog.style.borderRadius = '4px';
      dialog.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.3)';
      dialog.style.padding = '20px';
      dialog.style.width = '500px';
      dialog.style.maxHeight = '80vh';
      dialog.style.zIndex = '1000';
      dialog.style.display = 'flex';
      dialog.style.flexDirection = 'column';
      
      // Create dialog header
      const header = document.createElement('div');
      header.className = 'file-dialog-header';
      header.style.marginBottom = '20px';
      header.style.borderBottom = '1px solid #444';
      header.style.paddingBottom = '10px';
      
      const title = document.createElement('h2');
      title.textContent = title || 'Save File';
      title.style.margin = '0';
      title.style.color = '#eee';
      title.style.fontSize = '18px';
      
      header.appendChild(title);
      dialog.appendChild(header);
      
      // Create filename input section
      const filenameSection = document.createElement('div');
      filenameSection.style.marginBottom = '15px';
      
      const filenameLabel = document.createElement('label');
      filenameLabel.textContent = 'Filename:';
      filenameLabel.style.display = 'block';
      filenameLabel.style.marginBottom = '5px';
      filenameLabel.style.color = '#ddd';
      
      const filenameInput = document.createElement('input');
      filenameInput.type = 'text';
      filenameInput.value = defaultFileName;
      filenameInput.style.width = '100%';
      filenameInput.style.padding = '8px';
      filenameInput.style.backgroundColor = '#3a3a3a';
      filenameInput.style.color = '#fff';
      filenameInput.style.border = '1px solid #555';
      filenameInput.style.borderRadius = '4px';
      filenameInput.style.marginBottom = '10px';
      
      filenameSection.appendChild(filenameLabel);
      filenameSection.appendChild(filenameInput);
      dialog.appendChild(filenameSection);
      
      // Create location section
      const locationSection = document.createElement('div');
      locationSection.style.marginBottom = '15px';
      
      const locationLabel = document.createElement('label');
      locationLabel.textContent = 'Location:';
      locationLabel.style.display = 'block';
      locationLabel.style.marginBottom = '5px';
      locationLabel.style.color = '#ddd';
      
      locationSection.appendChild(locationLabel);
      dialog.appendChild(locationSection);
      
      // Create directory tree container
      const treeContainer = document.createElement('div');
      treeContainer.className = 'directory-tree-container';
      treeContainer.style.overflowY = 'auto';
      treeContainer.style.maxHeight = 'calc(80vh - 250px)';
      treeContainer.style.marginBottom = '20px';
      treeContainer.style.border = '1px solid #444';
      treeContainer.style.borderRadius = '4px';
      treeContainer.style.padding = '10px';
      
      // Function to recursively build the directory tree
      const buildDirectoryTree = (files, parentElement, level = 0, parentPath = '') => {
        if (!Array.isArray(files)) return;
        
        // Sort files: directories first, then files alphabetically
        const sortedFiles = [...files].sort((a, b) => {
          if (a.isDirectory && !b.isDirectory) return -1;
          if (!a.isDirectory && b.isDirectory) return 1;
          return a.name.localeCompare(b.name);
        });
        
        sortedFiles.forEach(file => {
          // Only show directories
          if (!file.isDirectory) return;
          
          // Create item container
          const itemContainer = document.createElement('div');
          itemContainer.className = 'directory-tree-item';
          itemContainer.style.paddingLeft = `${level * 20}px`;
          itemContainer.style.padding = '5px';
          itemContainer.style.paddingLeft = `${level * 20 + 5}px`;
          itemContainer.style.cursor = 'pointer';
          itemContainer.style.display = 'flex';
          itemContainer.style.alignItems = 'center';
          itemContainer.style.borderRadius = '3px';
          
          // Hover effect
          itemContainer.addEventListener('mouseover', () => {
            if (!itemContainer.classList.contains('directory-selected')) {
              itemContainer.style.backgroundColor = '#3a3a3a';
            }
          });
          
          itemContainer.addEventListener('mouseout', () => {
            if (!itemContainer.classList.contains('directory-selected')) {
              itemContainer.style.backgroundColor = 'transparent';
            }
          });
          
          // Create icon
          const icon = document.createElement('span');
          icon.className = 'directory-icon';
          icon.style.marginRight = '5px';
          icon.style.fontSize = '14px';
          icon.textContent = '📁';
          
          // Create label
          const label = document.createElement('span');
          label.className = 'directory-label';
          label.textContent = file.name;
          label.style.color = '#ddd';
          
          // Add elements to container
          itemContainer.appendChild(icon);
          itemContainer.appendChild(label);
          parentElement.appendChild(itemContainer);
          
          // Add expand/collapse indicator
          const expandIcon = document.createElement('span');
          expandIcon.className = 'expand-icon';
          expandIcon.style.marginRight = '5px';
          expandIcon.textContent = '▶';
          expandIcon.style.fontSize = '10px';
          expandIcon.style.color = '#aaa';
          
          // Insert expand icon before the folder icon
          itemContainer.insertBefore(expandIcon, icon);
          
          // Create container for children (initially hidden)
          const childrenContainer = document.createElement('div');
          childrenContainer.className = 'directory-children';
          childrenContainer.style.display = 'none';
          parentElement.appendChild(childrenContainer);
          
          // Current directory's full path
          const currentPath = parentPath ? `${parentPath}/${file.name}` : file.name;
          
          // Toggle expansion on click
          let expanded = false;
          itemContainer.addEventListener('click', (e) => {
            e.stopPropagation();
            
            // Select this directory
            const selectedItems = treeContainer.querySelectorAll('.directory-selected');
            selectedItems.forEach(item => {
              item.classList.remove('directory-selected');
              item.style.backgroundColor = 'transparent';
            });
            
            itemContainer.classList.add('directory-selected');
            itemContainer.style.backgroundColor = '#4a6da7';
            
            // Store the selected directory path
            selectedDirectory = file.path;
            updateSaveButtonState();
            
            // Toggle expansion
            expanded = !expanded;
            expandIcon.textContent = expanded ? '▼' : '▶';
            childrenContainer.style.display = expanded ? 'block' : 'none';
            
            // Only build children the first time we expand
            if (expanded && childrenContainer.children.length === 0) {
              buildDirectoryTree(file.files, childrenContainer, level + 1, currentPath);
            }
          });
        });
      };
      
      // Variable to store the selected directory
      let selectedDirectory = this.project.path;  
      
      // Build the initial directory tree
      if (this.project && this.project.files) {
        // Add a root directory option
        const rootContainer = document.createElement('div');
        rootContainer.className = 'directory-tree-item';
        rootContainer.style.padding = '5px';
        rootContainer.style.cursor = 'pointer';
        rootContainer.style.display = 'flex';
        rootContainer.style.alignItems = 'center';
        rootContainer.style.borderRadius = '3px';
        rootContainer.classList.add('directory-selected');
        rootContainer.style.backgroundColor = '#4a6da7';
        
        const rootIcon = document.createElement('span');
        rootIcon.style.marginRight = '5px';
        rootIcon.style.fontSize = '14px';
        rootIcon.textContent = '📁';
        
        const rootLabel = document.createElement('span');
        rootLabel.textContent = this.project.name + ' (root)';
        rootLabel.style.color = '#ddd';
        
        rootContainer.appendChild(rootIcon);
        rootContainer.appendChild(rootLabel);
        
        rootContainer.addEventListener('click', () => {
          const selectedItems = treeContainer.querySelectorAll('.directory-selected');
          selectedItems.forEach(item => {
            item.classList.remove('directory-selected');
            item.style.backgroundColor = 'transparent';
          });
          
          rootContainer.classList.add('directory-selected');
          rootContainer.style.backgroundColor = '#4a6da7';
          
          selectedDirectory = this.project.path;
          updateSaveButtonState();
        });
        
        treeContainer.appendChild(rootContainer);
        
        // Add the rest of the directory tree
        buildDirectoryTree(this.project.files, treeContainer);
      } else {
        const noDirectories = document.createElement('div');
        noDirectories.textContent = 'No directories available';
        noDirectories.style.padding = '10px';
        noDirectories.style.color = '#aaa';
        treeContainer.appendChild(noDirectories);
      }
      
      locationSection.appendChild(treeContainer);
      
      // Selected path display
      const selectedPathDisplay = document.createElement('div');
      selectedPathDisplay.style.marginTop = '10px';
      selectedPathDisplay.style.fontSize = '14px';
      selectedPathDisplay.style.color = '#aaa';
      selectedPathDisplay.textContent = `Selected: ${selectedDirectory || 'Root'}`;
      
      locationSection.appendChild(selectedPathDisplay);
      
      // Update the selected path display when a directory is selected
      const updateSelectedPath = () => {
        selectedPathDisplay.textContent = `Selected: ${selectedDirectory || 'Root'}`;
      };
      
      // Create dialog footer with buttons
      const footer = document.createElement('div');
      footer.className = 'file-dialog-footer';
      footer.style.display = 'flex';
      footer.style.justifyContent = 'flex-end';
      footer.style.gap = '10px';
      footer.style.marginTop = 'auto';
      
      const cancelButton = document.createElement('button');
      cancelButton.textContent = 'Cancel';
      cancelButton.style.padding = '8px 16px';
      cancelButton.style.backgroundColor = '#3a3a3a';
      cancelButton.style.color = '#ddd';
      cancelButton.style.border = 'none';
      cancelButton.style.borderRadius = '4px';
      cancelButton.style.cursor = 'pointer';
      
      const saveButton = document.createElement('button');
      saveButton.textContent = 'Save';
      saveButton.style.padding = '8px 16px';
      saveButton.style.backgroundColor = '#4a6da7';
      saveButton.style.color = '#fff';
      saveButton.style.border = 'none';
      saveButton.style.borderRadius = '4px';
      saveButton.style.cursor = 'pointer';
      saveButton.disabled = false; // Enabled by default since we have a default directory
      
      // Function to close the dialog and return result
      const closeDialogWithResult = (confirmed) => {
        document.body.removeChild(dialog);
        if (confirmed) {
          const filename = filenameInput.value.trim();
          if (!filename) {
            resolve(null);
            return;
          }
          
          // Construct the full path
          let fullPath = `${selectedDirectory}/${filename}`;
          
          // Make sure the path doesn't have double slashes
          fullPath = fullPath.replace(/\/+/g, '/');
          
          resolve({
            path: fullPath
          });
        } else {
          resolve(null);
        }
      };
      
      // Update save button state
      const updateSaveButtonState = () => {
        const filename = filenameInput.value.trim();
        if (filename) {
          saveButton.disabled = false;
          saveButton.style.opacity = '1';
        } else {
          saveButton.disabled = true;
          saveButton.style.opacity = '0.6';
        }
        
        // Update the selected path display
        updateSelectedPath();
      };
      
      // Set up button click handlers
      cancelButton.addEventListener('click', () => closeDialogWithResult(false));
      saveButton.addEventListener('click', () => closeDialogWithResult(true));
      
      // Update save button state when filename changes
      filenameInput.addEventListener('input', updateSaveButtonState);
      
      footer.appendChild(cancelButton);
      footer.appendChild(saveButton);
      dialog.appendChild(footer);
      
      // Add the dialog to the document body
      document.body.appendChild(dialog);
      
      // Focus the filename input
      filenameInput.focus();
      filenameInput.select();
      
      // Add keyboard navigation
      dialog.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          closeDialogWithResult(false);
        } else if (e.key === 'Enter') {
          if (!saveButton.disabled) {
            closeDialogWithResult(true);
          }
        }
      });
      
      // Initial update of the save button state
      updateSaveButtonState();
    });
  }
  
  /////////////////////////////////////////////////////////////////////////
  // Project Dialog Box
  /////////////////////////////////////////////////////////////////////////
  async render(containerId)
  {
    await super.render(containerId);

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
    title.textContent = 'Project';
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
    message.textContent = 'Project dialog box';
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
    okButton.textContent = 'OK';
    okButton.style.padding = '8px 16px';
    okButton.style.backgroundColor = '#4a4a4a';
    okButton.style.color = '#fff';
    okButton.style.border = 'none';
    okButton.style.borderRadius = '4px';
    okButton.style.cursor = 'pointer';
    okButton.onclick = () => this.handleOkClick();
    
    const cancelButton = document.createElement('button');
    cancelButton.textContent = 'Cancel';
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
 