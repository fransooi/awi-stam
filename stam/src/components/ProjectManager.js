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
  CAN_CLOSE_PROJECT: 'PROJECT_CAN_CLOSE_PROJECT',
  FILE_LOADED: 'PROJECT_FILE_LOADED',
  SAVE_FILE: 'PROJECT_SAVE_FILE',
  CLOSE_FILE: 'PROJECT_CLOSE_FILE',
  FILE_SAVED: 'PROJECT_FILE_SAVED',
  NEW_FILE_ADDED: 'PROJECT_NEW_FILE_ADDED',
  GET_TEMPLATE: 'PROJECT_GET_TEMPLATE',
  CHOOSE_TEMPLATE: 'PROJECT_CHOOSE_TEMPLATE',
  CHOOSE_PROJECT: 'PROJECT_CHOOSE_PROJECT',
  FILE_RENAMED: 'PROJECT_FILE_RENAMED',
  FILE_DELETED: 'PROJECT_FILE_DELETED',
  FILE_CLOSED: 'PROJECT_FILE_CLOSED',
  PROJECT_CLOSED: 'PROJECT_CLOSED',
  PROJECT_RENAMED: 'PROJECT_RENAMED',
  RUN_PROJECT: 'PROJECT_RUN_PROJECT',
  STOP_PROJECT: 'PROJECT_STOP_PROJECT',
  DEBUG_PROJECT: 'PROJECT_DEBUG_PROJECT',
  TEST_CODE: 'PROJECT_TEST_CODE',
  FORMAT_CODE: 'PROJECT_FORMAT_CODE',
  COMPILE_PROJECT: 'PROJECT_COMPILE_PROJECT',
  PROJECT_STOPPED: 'PROJECT_STOPPED',
  PROJECT_RUNNED: 'PROJECT_RUNNED',
  PROJECT_DEBUGGED: 'PROJECT_DEBUGGED',
  PROJECT_TESTED: 'PROJECT_TESTED',
  PROJECT_COMPILED: 'PROJECT_COMPILED',
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
    this.expandedFolders = new Set(); // Track expanded folders by their path\
    this.compileMode = 'debug';
    this.runMode = 'run';

    this.messageMap[SOCKETMESSAGES.CONNECTED] = this.handleConnected;
    this.messageMap[SOCKETMESSAGES.DISCONNECTED] = this.handleDisconnected;
    this.messageMap[MENUCOMMANDS.NEW_PROJECT] = this.handleNewProject;
    this.messageMap[MENUCOMMANDS.OPEN_PROJECT] = this.handleOpenProject;
    this.messageMap[MENUCOMMANDS.CLOSE_PROJECT] = this.handleCloseProject;
    this.messageMap[MENUCOMMANDS.RENAME_PROJECT] = this.handleRenameProject;
    this.messageMap[MENUCOMMANDS.DELETE_PROJECT] = this.handleDeleteProject;
    this.messageMap[MENUCOMMANDS.DOWNLOAD_PROJECT] = this.handleDownloadProject;
    this.messageMap[MENUCOMMANDS.OPEN_FILE] = this.handleOpenFile;
    this.messageMap[MENUCOMMANDS.NEW_FILE] = this.handleNewFile;
    this.messageMap[PROJECTMESSAGES.SAVE_FILE] = this.handleSaveFile;
    this.messageMap[MENUCOMMANDS.SAVE_ALL_FILES] = this.handleSaveAllFiles;
    this.messageMap[PROJECTMESSAGES.CLOSE_FILE] = this.handleCloseFile;
    this.messageMap[PROJECTMESSAGES.GET_TEMPLATE] = this.handleGetTemplate;
    this.messageMap[PROJECTMESSAGES.CHOOSE_TEMPLATE] = this.handleChooseTemplate;
    this.messageMap[PROJECTMESSAGES.CHOOSE_PROJECT] = this.handleChooseProject;
    this.messageMap[PROJECTMESSAGES.RUN_PROJECT] = this.handleRunProject;
    this.messageMap[PROJECTMESSAGES.STOP_PROJECT] = this.handleStopProject;
    this.messageMap[PROJECTMESSAGES.DEBUG_PROJECT] = this.handleDebugProject;
    this.messageMap[PROJECTMESSAGES.TEST_CODE] = this.handleTestCode;
    this.messageMap[PROJECTMESSAGES.FORMAT_CODE] = this.handleFormatCode;
    this.messageMap[PROJECTMESSAGES.COMPILE_PROJECT] = this.handleCompileProject;
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
      hostFile.files.push(file);
  }
  removeFile(path) {
    var folder = path.substring(0, path.lastIndexOf('/'));
    var hostFile = this.findFolder(folder);
    if (hostFile)
    {
      for ( var f = 0; f < hostFile.files.length; f++ )
      {
          var file = hostFile.files[f];
          if ( file.path == path )
          {
              hostFile.files.splice(f, 1);
              return;
          }
      }
    }   
  }

  setFileContent(file) {
    var hostFile = this.findFile(file.path);
    if (hostFile)
    {
      hostFile.state = file.state;
    }   
  }

  async checkProject() {
    if ( !await this.sendRequestTo( 'class:SocketSideWindow', SOCKETMESSAGES.ENSURE_CONNECTED, {}))
      return false;
    if (!this.project)
    {
      this.root.alert.showError('stam:roject-not-opened');
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
          // Create options folder
          if (!this.project.compileOptions)
          {
            this.project.compileOptions = {
              debug: {},
              run: {},
            };
            this.project.runOptions = {
              run: { autoRun: true, runEnlarged: false },
            };
            this.project.debugOptions = {
              run: {},
            };
            this.project.compileMode = 'debug';
            this.project.debugMode = 'run';
            this.project.runMode = 'run';
          }
          this.broadcast(PROJECTMESSAGES.PROJECT_LOADED, project);
          if ( project.runOptions[ project.runMode ].autoRun)
            this.handleRunProject(project, senderId);
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

  async handleDeleteProject(data, senderId) {
    if ( !await this.sendRequestTo( 'class:SocketSideWindow', SOCKETMESSAGES.ENSURE_CONNECTED, {}))
      return false;
    if ( !this.project)
      return false;
    if ( !data.force )
    {
      var message = this.root.messages.getMessage( 'stam:delete-project-message', { name: this.projectName });
      var answer = await this.root.alert.showCustom('stam:delete-project-title', message, ['stam:cancel|neutral', 'stam:download-and-delete|positive', 'stam:delete|negative'], 'question');
      if (answer == 0)
        return false;
      if (answer == 1)
      {
        answer = await this.handleDownloadProject(data, senderId);
        if (!answer)
          return false;
      }
    }
    var projectHandle = this.project.handle;
    var answer = await this.handleCloseProject(data, senderId);
    if (!answer)
      return false;
    answer = await this.root.server.deleteProject({ mode: this.root.currentMode, handle: projectHandle });
    if (answer.error)
    {
      this.root.alert.showError(answer.error);
      return false;
    }
    return true;
  }
  async handleRenameProject(data, senderId) {
    if ( !await this.sendRequestTo( 'class:SocketSideWindow', SOCKETMESSAGES.ENSURE_CONNECTED, {}))
      return false;
    if (!this.project)
      return false;

    var oldName = this.projectName;
    var newName = oldName;
    if (!data.newName){
      newName = await this.root.alert.showEditBox('stam:rename-project-title', 'stam:new-name', oldName);
      if (!newName)
        return false;
    }
    if (newName==oldName)
      return true;

    var answer = await this.root.server.renameProject({ mode: this.root.currentMode, handle: this.project.handle, newName: newName });
    if (answer.error)
    {
      this.root.alert.showError(answer.error);
      return false;
    }    
    this.projectName = newName;
    this.project.name = newName;
    this.broadcast(PROJECTMESSAGES.PROJECT_RENAMED, this.project);
    return true;
  }
  async handleDownloadProject(data, senderId) {
    if ( !await this.sendRequestTo( 'class:SocketSideWindow', SOCKETMESSAGES.ENSURE_CONNECTED, {}))
      return false;
    
    if (!this.project){
      await this.root.alert.showError('stam:project-not-opened');
      return false;
    }
    
    // Download zip from server
    await this.root.alert.showDownloading('stam:project-downloading');
    var answer = await this.root.server.downloadProject({ mode: this.root.currentMode, handle: this.project.handle });
    if (answer.error)
    {
      await this.root.alert.hideDownloading();
      this.root.alert.showError(answer.error);
      return false;
    }    

    // Unzip to buffer
    var buffer = this.root.utilities.convertStringToArrayBuffer(answer.zipBase64);

    // Using blob as we are in a browser, save as a file.
    var blob = new Blob([buffer], { type: 'application/zip' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = this.projectName + '.zip';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    await this.root.alert.hideDownloading();
    return true;
  }
  async handleCloseProject(data, senderId) {
    if ( !await this.sendRequestTo( 'class:SocketSideWindow', SOCKETMESSAGES.ENSURE_CONNECTED, {}))
      return false;

    // If already closed-> job done!
    if (!this.project)
      return true;

    // If not forced-> ask for confirmation
    if (!data.force){
      var canClose = await this.sendRequestTo( 'class:Editor', PROJECTMESSAGES.CAN_CLOSE_PROJECT, {});
      if (!canClose)
        return false;
    }

    var answer = await this.root.server.closeProject({ mode: this.root.currentMode, handle: this.project.handle });
    if (answer.error)
    {
      this.root.alert.showError(answer.error);
      return false;
    }
    this.projectName = null;
    this.project = null;
    this.broadcast(PROJECTMESSAGES.PROJECT_CLOSED, {});
    return true;
  }

  async handleOpenFile(data, senderId) {
    if ( !await this.checkProject())
      return;

    // No file name-> file selector
    if (!data.path)
    {
      this.showOpenFileDialog('stam:filter-' + this.root.currentMode).then((response) =>{
        if (response)
        {
          this.handleOpenFile(response, senderId);
        }
      });
      return false;
    }

    // If the file is already loaded-> display it
    var file = this.findFile(data.path);
    if (file && file.state)
    {
      this.broadcast(PROJECTMESSAGES.FILE_LOADED, file);
      return true;
    }

    // Load the file from the server
    data.mode = this.root.currentMode;
    data.handle = this.project.handle;
    var file = await this.root.server.loadFile(data)
    if (file)
    {
      if ( !file.error )
      {
        if (file.state)
          file.state=EditorState.fromJSON(JSON.parse(file.state));
        file.open = true;
        this.broadcast(PROJECTMESSAGES.FILE_LOADED, file);
        return true;
      }
    }
    this.root.alert.showError(file.error);
    return false;
  }
  async handleCloseFile(data, senderId) {
    if ( !await this.checkProject())
      return;
  
    // If the file is already loaded-> display it
    var file = this.findFile(data.path);
    if (file && file.open)
    {
      file.open = false;
      this.broadcast(PROJECTMESSAGES.FILE_CLOSED, file);
      return true;
    }
    return false;
  }
 
  async handleNewFile(data, senderId) {
    if ( !await this.checkProject())
      return;

    var filename = await this.sendRequestTo( 'class:Editor', PROJECTMESSAGES.GET_DEFAULT_FILENAME, {});
    if (!filename)
      filename = 'untitled.js';
    var path = await this.showSaveFileDialog(filename, this.root.messages.getMessage('stam:new-file-title'));
    if (path)
    {
      var fileInfo = {
        path: path,
        name: this.root.utilities.getFileNameFromPath(path),
        content: '',
        state: null
      };
      var file = await this.handleSaveFile({ fileInfo }, senderId);
      if (file && !file.error)
      {
        file.open = true;
        if (data.fromIcon)
          this.broadcast(PROJECTMESSAGES.FILE_LOADED, fileInfo);
        return true;
      }
    }
    return false;
  }
  
  async handleSaveAllFiles(data, senderId) {
    if ( !await this.checkProject())
      return;
    
    // Save all files
    var saved = await this.sendRequestTo( 'class:Editor', MENUCOMMANDS.SAVE_ALL_FILES, { force: true });
    if (!saved)
      return false;
    return true;
  }
  
  /**
   * Handle save file command
   * @param {Object} data - File data to save
   * @param {string} data.path - File path
   * @param {string} data.name - File name
   * @param {string} data.mode - File mode
   * @param {string} data.handle - Project handle
   * @param {string} senderId - ID of the sender
   */
  async handleSaveFile(data, senderId) {
    if ( !await this.checkProject())
      return;

    // No file name-> get current file from editor
    var oldPath = data.fileInfo.path;
    var newPath = oldPath;
    var oldName = data.fileInfo.name;
    var newName = oldName;
    if (data.forceDialog) {      
      newPath = await this.showSaveFileDialog(oldPath, this.root.messages.getMessage('stam:new-file-title'));
      if (!newPath)
        return null;
      newName = this.root.utilities.getFileNameFromPath(newPath);
    }
    
    // Save the file on the server
    var infoSave = {
      path: newPath,
      name: newName,
      content: data.fileInfo.content,
      state: data.fileInfo.state,
      mode: this.root.currentMode,
      handle: this.project.handle
    };
    var answer = await this.root.server.saveFile(infoSave);
    if (answer.error){
      this.root.alert.showError(answer.error);
      return false;
    }
    if ( !this.findFile(this.project, infoSave.path) )
    {
      this.addNewFile(infoSave);
      this.broadcast(PROJECTMESSAGES.NEW_FILE_ADDED, infoSave);
    }
    return infoSave;
  }
  ///////////////////////////////////////////////////////////
  // COMPILATION / RUNNING / DEBUGGING / TESTING / SHARING
  ///////////////////////////////////////////////////////////
  async handleRunProject(data, senderId) {
    if ( !await this.checkProject())
      return;

    // Save all files
    var saved = await this.sendRequestTo( 'class:Editor', MENUCOMMANDS.SAVE_ALL_FILES, { force: true });
    if (!saved)
      return false;
    
    // Compile project
    var compileOptions = {
      mode: this.root.currentMode,
      handle: this.project.handle,
      compileMode: 'run',
      options: this.project.compileOptions['run'],
    }
    var answer = await this.root.server.compileProject(compileOptions );
    if (answer.error){
      this.root.alert.showError(answer.error);
      return false;
    }

    // Run project
    var runOptions = {
      mode: this.root.currentMode,
      handle: this.project.handle,
      runMode: this.project.runMode,
      options: this.project.runOptions[this.project.runMode],
    }
    var answer = await this.root.server.runProject(runOptions);
    if (answer.error){
      this.root.alert.showError(answer.error);
      return false;
    }
    this.project.running = true;
    await this.broadcast(PROJECTMESSAGES.PROJECT_RUNNED, answer);
    return true;
  }
  async handleStopProject(data, senderId) {
    if ( !await this.checkProject())
      return;

    if (this.project.running)
    {
      this.project.running = false;
      await this.broadcast(PROJECTMESSAGES.PROJECT_STOPPED, {});
      return true;
    }
    return false;
  }

  async handleDebugProject(data, senderId) {
    if ( !await this.checkProject())
      return;
    
    // Save all files
    var saved = await this.sendRequestTo( 'class:Editor', MENUCOMMANDS.SAVE_ALL_FILES, { force: true });
    if (!saved)
      return false;
    
    // Compile project
    var compileOptions = {
      mode: this.root.currentMode,
      handle: this.project.handle,
      compileMode: 'debug',
      options: this.project.compileOptions['debug'],
    }
    var answer = await this.root.server.compileProject(compileOptions);
    if (answer.error){
      this.root.alert.showError(answer.error);
      return false;
    }

    // Debug project
    var debugOptions = {
      mode: this.root.currentMode,
      handle: this.project.handle,
      compileMode: 'debug',
      debugMode: 'run',
      options: this.project.debugOptions['run'],
    }
    var answer = await this.root.server.debugProject(debugOptions);
    if (answer.error){
      this.root.alert.showError(answer.error);
      return false;
    }
    await this.broadcast(PROJECTMESSAGES.PROJECT_DEBUGGED, answer);
    return true;
  }
  async handleTestProject(data, senderId) {
    if ( !await this.checkProject())
      return;
    
    // Save all files
    var saved = await this.sendRequestTo( 'class:Editor', MENUCOMMANDS.SAVE_ALL_FILES, { force: true });
    if (!saved)
      return false;
    
    // Test project
    var testOptions = {
      mode: this.root.currentMode,
      handle: this.project.handle,
      compileMode: this.project.compileMode,
      options: this.project.compileOptions[this.project.compileMode],
    }
    var answer = await this.root.server.testProject(testOptions);
    if (answer.error){
      this.root.alert.showError(answer.error);
      return false;
    }
    await this.broadcast(PROJECTMESSAGES.PROJECT_TESTED, answer);
    return true;
  }
  async handleCompileProject(data, senderId) {
    if ( !await this.checkProject())
      return;
    
    // Save all files
    var saved = await this.sendRequestTo( 'class:Editor', MENUCOMMANDS.SAVE_ALL_FILES, { force: true });
    if (!saved)
      return false;
    
    // Compile project
    var compileOptions = {
      mode: this.root.currentMode,
      handle: this.project.handle,
      compileMode: this.project.compileMode,
      options: this.project.compileOptions[this.project.compileMode],
    }
    var answer = await this.root.server.compileProject(compileOptions);
    if (answer.error){
      this.root.alert.showError(answer.error);
      return false;
    }
    await this.broadcast(PROJECTMESSAGES.PROJECT_COMPILED, answer);
    return true;
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
      
      // Create content HTML
      content.innerHTML = `
        <div class="form-group">
          <label for="project-name"">${this.root.messages.getMessage('stam:project-name')}</label>
          <input type="text" id="project-name" value="${projectName}" 
                  placeholder="${this.root.messages.getMessage('stam:enter-project-name')}">
        </div>
        <div class="form-group">
          <checkbox>
            <input type="checkbox" id="overwrite-checkbox" ${overwriteExisting ? 'checked' : ''}>
            <label for="overwrite-checkbox">${this.root.messages.getMessage('stam:overwrite-existing-project')}</label>
          </checkbox>
        </div>
        <div class="form-group">
          <label for="iconiclist">${this.root.messages.getMessage('stam:select-template-for-new-project')}</label>
          <div class="iconiclist-list">
            ${this._renderTemplateList(templateList, theme)}
          </div>
        </div>
      `;

      // Set up event listeners
      const nameInput = content.querySelector('#project-name');
      const overwriteCheckbox = content.querySelector('#overwrite-checkbox');
      
      // Handle template selection
      content.querySelectorAll('.iconiclist-item').forEach((item, index) => {
        item.addEventListener('click', () => {
          selectedTemplate = templateList[index];
          
          // Update UI
          content.querySelectorAll('.iconiclist-item').forEach(el => 
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
      return `<div class="iconiclist-list-empty>
        ${this.root.messages.getMessage('stam:no-templates-available')}
      </div>`;
    }
    
    return templates.map((template, index) => `
      <div class="iconiclist-item ${index === 0 ? 'selected' : ''}">
        ${template.iconUrl ? `
          <div class="iconiclist-icon">
            <img src="${template.iconUrl}" alt="${template.name}">
          </div>` : ''}
        <div class="iconiclist-info">
          <div class="iconiclist-name">${template.name}</div>
          ${template.description ? `
            <div class="iconiclist-description">${template.description}</div>` : ''}
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
     
      // Create content HTML
      content.innerHTML = `
      <div class="form-group">
          <label for="iconiclist">${this.root.messages.getMessage('stam:select-project-to-open')}</label>
          <div class="iconiclist-list">
            ${this._renderProjectList(projectList)}
          </div>
        </div>
      `;

     let selectedProject = projectList?.[0] || null;
      
      // Handle project selection
      content.querySelectorAll('.iconiclist-item').forEach((item, index) => {
        item.addEventListener('click', () => {
          selectedProject = projectList[index];
          
          // Update UI
          content.querySelectorAll('.iconiclist-item').forEach(el => 
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
        <div class="iconiclist-list-empty">
          ${this.root.messages.getMessage('stam:no-projects-available')}
        </div>`;
    }
    
    return projects.map((project, index) => `
      <div class="iconiclist-item ${index === 0 ? 'selected' : ''}" 
           data-project-index="${index}">
        ${project.iconUrl ? `
          <div class="iconiclist-icon">
            <img src="${project.iconUrl}" alt="${project.name}">
          </div>` : ''}
        <div class="iconiclist-info">
          <div class="iconiclist-name">${project.name}</div>
          ${project.description ? `
            <div class="iconiclist-description">${project.description}</div>` : ''}
        </div>
      </div>
    `).join('');
  }
  
  // Show a file open dialog with the project file structure
  // @param string fileExtensions - File extensions to filter eg. Phaser:*.js,*.mjs;Three:*.js,*.mjs;
  // @returns {Promise} - Resolves with the selected file or null if cancelled
  // ["Phaser:'*.js','*.mjs','*.ts','*.tsx','*.json','*.html','*.css','*.md','*.txt'"]
  async showOpenFileDialog(defaultFilter = "stam:filter-all-files") {
    return new Promise((resolve) => {
      const theme = this.root.preferences.getCurrentTheme();
      let selectedFile = null;
      let userFilter = '';
      let currentFilterId = defaultFilter;
      let filterList = this.root.messages.getMessagesStartingWith('stam:filter-');
      let currentFilter = this.root.messages.getMessage(currentFilterId);     
      
      // Create dialog content container
      const content = document.createElement('div');
      content.className = 'file-selector';
      
      // Create content HTML
      content.innerHTML = `
        <div class="form-group file-list-container">
          <input type="text" id="file-filter-user" class="form-control" placeholder="${this.root.messages.getMessage('stam:filter-files-placeholder')}">
          <div class="form-filter-select">
            <select id="file-filter-select" class="form-control">
            </select>
          </div>
          <div class="file-list" id="file-list">
            ${this._renderFileList(this.project?.files || [], userFilter, currentFilterId)}
          </div>
        </div>
      `;

      // Create and show the dialog
      const dialog = new Dialog({
        title: this.root.messages.getMessage('stam:select-file-to-open'),
        content: content,
        theme: this.root.preferences.getCurrentTheme(),
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

      // Fill and update the filter select
      const fileList = content.querySelector('#file-list');
      const filterSelect = content.querySelector('#file-filter-select');
      const filterInput = content.querySelector('#file-filter-user');
      filterSelect.innerHTML = '';
      filterList.forEach((filter) => {
        const option = document.createElement('option');
        option.value = filter;
        option.textContent = this.root.messages.getMessage(filter);
        filterSelect.appendChild(option);
      });
      filterSelect.value = currentFilterId;
      filterSelect.addEventListener('change', (e) => {
        if ( e.target.value != currentFilterId ) {
          currentFilterId = e.target.value;
          fileList.innerHTML = this._renderFileList(this.project?.files || [], userFilter, currentFilterId);
        }
      });

      // Handle filter input changes
      filterInput.addEventListener('input', (e) => {
        userFilter = e.target.value;
        if (userFilter.length > 0) {
          filterSelect.disabled = true;
        } else {
          filterSelect.disabled = false;
        }
        fileList.innerHTML = this._renderFileList(this.project?.files || [], userFilter, currentFilterId);
      });

      // Set up double click
      content.addEventListener('dblclick', (e) => {
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
          fileList.innerHTML = this._renderFileList(this.project?.files || [], userFilter, currentFilterId);
        } else {
          // Handle file selection
          content.querySelectorAll('.file-item').forEach(el => 
            el.classList.remove('selected')
          );
          fileItem.classList.add('selected');
          
          // Find the selected file
          const file = this._findFileByPath(this.project?.files || [], filePath);
          if ( file ){
            resolve(file);
            dialog.close();
          }
        }
        e.stopPropagation();
      });
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
          fileList.innerHTML = this._renderFileList(this.project?.files || [], userFilter, currentFilterId);
          e.stopPropagation();
          dialog.buttons[1].element.disabled = true;
          selectedFile = null;
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
            dialog.buttons[1].element.disabled = false;
          }
        }
      });

      // Store reference to the dialog for external access if needed
      this._openFileDialog = dialog;

      // Show the dialog
      dialog.open();
      dialog.buttons[1].element.disabled = true;
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
  _renderFileList(files, userFilter, currentFilterId, level = 0, parentPath = '') {
    if (!files || !files.length) {
      return `
        <div class="file-list-empty" style="padding-left: ${level * 16}px;">
          ${this.root.messages.getMessage('stam:no-files-found')}
        </div>
      `;
    }
    
    // Convert filter string to filter array
    function _extractFilters(filter) {
      var extensions = [];
      if (filter) {
        filter = filter.replace(/'/g, '');
        filter = filter.replace(/"/g, '');
        var parts = filter.split(';');
        for ( var p in parts) {
          var part = parts[ p ].trim();
          if (part.length === 0) continue;
          var column = part.indexOf(':');
          if ( column > -1) {
            part = part.substring(column + 1);
          }
          extensions.push(...part.split(',').map(ext => ext.trim()));
        } 
      }
      return extensions;
    }
    var currentFilter = this.root.messages.getMessage(currentFilterId);
    var extensions = _extractFilters(userFilter?userFilter:currentFilter);
    
    let result = '';    
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
      var matched = isDirectory || extensions.length == 0;
      if (!matched) {
        for ( var f = 0; f < extensions.length && !matched; f++ ) {
          var filter = extensions[f];
          var filterParts = filter.split('.');
          if (filterParts.length == 1) {
            if (filterParts[0].indexOf('*') > -1) 
              matched = true;
            else if ( file.name.toLowerCase().indexOf(filterParts[0]) > -1 )
              matched = true;
          } else {
            var fileParts = file.name.toLowerCase().split('.');
            var maxFilters = Math.min(fileParts.length, filterParts.length);
            var matchedCount = 0;
            for ( var p = 0; p < maxFilters; p++ ) {
              if (filterParts[p].indexOf('*') > -1) 
                matchedCount++;
              else if (fileParts[p].indexOf(filterParts[p]) > -1)
                matchedCount++;
            }
            if ( matchedCount == maxFilters )
              matched = true;
          }
        }
      }
      if (!matched) return;
      
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
        result += this._renderFileList(file.files, userFilter, currentFilterId, level + 1, filePath);
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
  async showSaveFileDialog(defaultPath = 'Untitled.js', title = '') {
    return new Promise((resolve) => {
      let dialog;
      let userFilter = '';
      let currentFilterId = 'stam:filter-all-files';
      let currentPath = defaultPath;
      let currentFilename = currentPath.split('/').pop();

      // Create dialog content container
      const content = document.createElement('div');
      content.className = 'file-selector';
      
      // Create content HTML
      content.innerHTML = `
        <div class="form-group file-list-container">
          <div class="form-group-row">
            <label for="path-label">${this.root.messages.getMessage('stam:path-label')}</label>
            <input type="text" id="path-input" class="form-control" value="${currentPath}">
          </div>
          <div class="file-list" id="file-list">
            ${this._renderFileList(this.project?.files || [], userFilter, currentFilterId)}
          </div>
        </div>
      `;

      // Handle file name input changes
      const fileList = content.querySelector('#file-list');
      var pathInput = content.querySelector('#path-input');
      pathInput?.addEventListener('input', (e) => {
        currentPath = e.target.value.trim();
        if (currentPath.length > 0)
        {
          if (currentPath.startsWith('/'))
            currentPath = currentPath.substring(1);
          if (currentPath.length > 0)
          {
            var parts = currentPath.split('/');
            if (parts.length > 0)
              currentFilename = parts[parts.length - 1];
            else
              currentFilename = '';
          }
          dialog.buttons[ 1 ].element.disabled = !currentFilename.trim();
        }
        else
        {
          currentFilename = '';
          dialog.buttons[ 1 ].element.disabled = true;
        }
      });
     
      // Set up event listeners for file and folder selection
      content.addEventListener('click', (e) => {
        const fileItem = e.target.closest('.file-item');
        if (!fileItem) return;
        
        const isDirectory = fileItem.dataset.isDirectory === 'true';
        let filePath = fileItem.dataset.path;
        
        if (isDirectory) {
          // Toggle folder expansion
          if (this.expandedFolders.has(filePath)) {
            this.expandedFolders.delete(filePath);
          } else {
            this.expandedFolders.add(filePath);
            currentPath = filePath + '/' + currentFilename;
          }          
          fileList.innerHTML = this._renderFileList(this.project?.files || [], userFilter, currentFilterId);          
        } else {
          // Update selected file name
          const parts = filePath.split('/');
          currentFilename = parts[parts.length - 1];
          currentPath = filePath;
        }
        dialog.buttons[ 1 ].element.disabled = !currentFilename.trim();
        pathInput.value = currentPath;
        e.stopPropagation();
      });

      // Create and show the dialog
      dialog = new Dialog({
        title: title || this.root.messages.getMessage('stam:save-file'),
        content: content,
        theme: this.root.preferences.getCurrentTheme(),
        className: 'file-dialog',
        onOpen: (dialogEl) => {
          // Ensure dialog maintains fixed height
          const contentEl = dialogEl.querySelector('.dialog-content');
          if (contentEl) {
            contentEl.style.overflow = 'auto';
            contentEl.style.display = 'flex';
            contentEl.style.flexDirection = 'column';
            contentEl.style.flex = '1 1 auto';
            contentEl.style.minHeight = '0'; 
          }
          
          // Focus the path input
          pathInput.focus();
          pathInput.select();
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
            disabled: !currentFilename.trim(),
            onClick: async () => {
              // Check if file exists
              const fileExists = this._findFileByPath(this.project?.files || [], currentPath);              
              if (fileExists) {
                // Show confirmation dialog for overwrite
                var message = this.root.messages.getMessage('stam:file-exists-overwrite', { name: currentPath });
                var answer = await this.root.alert.showConfirm(message);
                if (answer === 1)
                  resolve(currentPath);
                else
                  resolve(null);
                dialog.close();
              } else {
                resolve(currentPath);
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
 