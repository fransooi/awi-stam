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
* @file ProjectSideWindow.js
* @author FL (Francois Lionet)
* @version 0.5
*
* @short Project side window implementation
*/
import SideWindow from './SideWindow.js';
import { MESSAGES } from '../../utils/BaseComponent.js';
import { PROJECTMESSAGES } from '../ProjectManager.js'
import { MENUCOMMANDS } from '../MenuBar.js';
import PopupMenu from '../PopupMenu.js';

class ProjectSideWindow extends SideWindow {
  constructor(parentId, containerId, initialHeight = 300) {
    super('Project', 'Project Files', parentId, containerId, initialHeight);
    this.projectTree = [];
    this.messageMap[MESSAGES.CONTENT_HEIGHT_CHANGED] = this.handleContentHeightChanged;
    this.messageMap[PROJECTMESSAGES.PROJECT_LOADED] = this.handleProjectLoaded;
    this.messageMap[PROJECTMESSAGES.PROJECT_CLOSED] = this.handleProjectClosed;
    this.messageMap[PROJECTMESSAGES.NEW_FILE_ADDED] = this.handleNewFileAdded;
    this.messageMap[PROJECTMESSAGES.FILE_DELETED] = this.handleFileDeleted;
    this.messageMap[PROJECTMESSAGES.FILE_RENAMED] = this.handleFileRenamed;
  }
  
  /**
   * Initialize the component
   * 
   * @param {Object} options - Optional configuration options
   */
  async init(options) {
    super.init(options);
  }
  
  /**
   * Destroy the component
   */
  async destroy() {
    this.parentContainer.removeChild(this.treeElement);
    this.treeElement = null;
    super.destroy();
  }

  /**
   * Override render to set up content and event listeners
   * @returns {HTMLElement} - The rendered window element
   */
  async render(containerId) {
    await super.render(containerId);
    
    // Override the default black background with the theme's container background
    this.content.style.backgroundColor = 'var(--container-background, #252526)';
   
    // Create project tree container
    this.treeElement = document.createElement('div');
    this.treeElement.id = 'project-tree';
    this.treeElement.className = 'project-tree';  
    this.content.appendChild(this.treeElement);
  
    // Add some basic styling
    this.addStyles();
    
    // Populate with initial data
    this.populateProjectTree();
    
    return this.container;
  }
  
  /**
   * Handle content height changes
   * @param {number} height - New content height
   */
  handleContentHeightChanged(height) {
    if (this.projectTree) {
      this.projectTree.style.height = `${height}px`;
      this.projectTree.style.maxHeight = `${height}px`;
    }
  }
  
  /**
   * Add styles for the project tree
   */
  addStyles() {
    // Add styles if not already present
    if (!document.getElementById('project-side-window-styles')) {
      const style = document.createElement('style');
      style.id = 'project-side-window-styles';
      style.textContent = `
        .project-tree {
          overflow-y: auto;
          padding: 5px;
          font-family: Arial, sans-serif;
          font-size: 14px;
          width: 100%;
          display: block;
        }
        
        .project-item {
          padding: 3px 0;
          cursor: pointer;
          display: block;
          width: 100%;
          margin-bottom: 4px;
          white-space: nowrap;
        }
        
        .project-item:hover {
          background-color: rgba(0, 0, 0, 0.05);
        }
        
        .project-item-icon {
          margin-right: 5px;
          width: 16px;
          text-align: center;
          display: inline-block;
          vertical-align: middle;
        }
        
        .project-item-name {
          display: inline-block;
          vertical-align: middle;
        }
        
        .project-folder {
          font-weight: bold;
        }
        
        .project-folder-contents {
          padding-left: 20px;
          width: 100%;
          display: block;
        }
        
        .project-folder-collapsed .project-folder-contents {
          display: none;
        }
      `;
      document.head.appendChild(style);
    }
  }
  
  /**
 * Populate the project tree with data
 */
populateProjectTree() {
  if (!this.treeElement) return;
  
  // Clear existing content
  this.treeElement.innerHTML = '';
  
  // Initialize project tree
  this.projectTree = [];
  if (this.project && this.project.files) {
    // Process the project files recursively
    this.projectTree = this.processProjectFiles(this.project.files);
    
    // Render the project tree
    this.projectTree.forEach(item => {
      this.treeElement.appendChild(this.createProjectItem(item));
    });
  }
}

/**
 * Process project files recursively
 * @param {Array} files - Array of file/directory objects
 * @returns {Array} - Processed tree items
 */
processProjectFiles(files) {
  if (!Array.isArray(files)) return [];
  
  return files.map(file => {
    const item = {
      name: file.name,
      type: file.isDirectory ? 'folder' : 'file',
      path: file.path,
      size: file.size || 0
    };
    
    // Process children recursively if it's a directory
    if (file.isDirectory && Array.isArray(file.files)) {
      item.children = this.processProjectFiles(file.files);
    }
    
    return item;
  }).sort((a, b) => {
    // Folders first, then files, alphabetically
    if (a.type === 'folder' && b.type !== 'folder') return -1;
    if (a.type !== 'folder' && b.type === 'folder') return 1;
    return a.name.localeCompare(b.name);
  });
}

/**
 * Get the full file path for a file item
 * @param {Object} item - The file item
 * @returns {string} - The full file path
 */
getFilePath(item) {
  return item.path;
}
  
  /**
   * Create a project item element
   * @param {Object} item - The project item data
   * @returns {HTMLElement} - The created element
   */
  createProjectItem(item) {
    const itemElement = document.createElement('div');
    itemElement.className = 'project-item';
    
    const iconElement = document.createElement('span');
    iconElement.className = 'project-item-icon';
    
    const nameElement = document.createElement('span');
    nameElement.className = 'project-item-name';
    nameElement.textContent = item.name;
    
    if (item.type === 'folder') {
      itemElement.classList.add('project-folder');
      itemElement.classList.add('project-folder-collapsed');
      iconElement.textContent = '▶';
      
      // Create folder contents
      const contentsElement = document.createElement('div');
      contentsElement.className = 'project-folder-contents';
      
      // Add children
      if (item.children && item.children.length > 0) {
        item.children.forEach(child => {
          contentsElement.appendChild(this.createProjectItem(child));
        });
      }
      
      // Add click handler to toggle folder
      itemElement.addEventListener('click', (e) => {
        if (e.target === itemElement || e.target === iconElement || e.target === nameElement) {
          itemElement.classList.toggle('project-folder-collapsed');
          iconElement.textContent = itemElement.classList.contains('project-folder-collapsed') ? '▶' : '▼';
          e.stopPropagation();
        }
      });

      // Add right-click (context menu) handler for folder
      itemElement.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        const menuItems = [
          { name: 'Open', command: MENUCOMMANDS.OPEN_FOLDER, data: { 
            name: item.name,
            path: this.getFilePath(item, itemElement)
          } },
          '-',
          { name: 'Cut', command: MENUCOMMANDS.CUT, data: { 
            name: item.name,
            path: this.getFilePath(item, itemElement)
          } },
          { name: 'Copy', command: MENUCOMMANDS.COPY, data: { 
            name: item.name,
            path: this.getFilePath(item, itemElement)
          } },
          { name: 'Paste', command: MENUCOMMANDS.PASTE, data: { 
            name: item.name,
            path: this.getFilePath(item, itemElement)
          } },
          { name: 'Rename', command: MENUCOMMANDS.RENAME, data: { 
            name: item.name,
            path: this.getFilePath(item, itemElement)
          } },
          { name: 'Delete', command: MENUCOMMANDS.DELETE, data: { 
            name: item.name,
            path: this.getFilePath(item, itemElement)
          } },
        ];
        const menu = new PopupMenu(this.getComponentID(), {
          items: menuItems,
          parent: itemElement,
          position: { x: e.clientX, y: e.clientY },
          menuContext: 'ProjectFolder'
        });
        menu.show();
      });

      // Add elements to item
      itemElement.appendChild(iconElement);
      itemElement.appendChild(nameElement);
      itemElement.appendChild(contentsElement);
    } else {
      iconElement.textContent = '📄';
      
      // Add click handler for file
      itemElement.addEventListener('click', () => {
        this.broadcast(MENUCOMMANDS.OPEN_FILE, { 
          name: item.name,
          path: this.getFilePath(item, itemElement)
        });
      });
      
      // Add right-click (context menu) handler for file
      itemElement.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        const menuItems = [
          { name: 'Open', command: MENUCOMMANDS.OPEN_FILE, data: { 
            name: item.name,
            path: this.getFilePath(item, itemElement)
          } },
          { name: 'Open with...', command: MENUCOMMANDS.OPEN_WITH, data: { 
            name: item.name,
            path: this.getFilePath(item, itemElement)
          } },
          '-',
          { name: 'Copy', command: MENUCOMMANDS.COPY, data: { 
            name: item.name,
            path: this.getFilePath(item, itemElement)
          } },
          { name: 'Cut', command: MENUCOMMANDS.CUT, data: { 
            name: item.name,
            path: this.getFilePath(item, itemElement)
          } },
          { name: 'Rename', command: MENUCOMMANDS.RENAME, data: { 
            name: item.name,
            path: this.getFilePath(item, itemElement)
          } },
          { name: 'Delete', command: MENUCOMMANDS.DELETE, data: { 
            name: item.name,
            path: this.getFilePath(item, itemElement)
          } },
        ];
        const menu = new PopupMenu(this.getComponentID(), {
          items: menuItems,
          parent: itemElement,
          position: { x: e.clientX, y: e.clientY },
          menuContext: 'ProjectFile'
        });
        menu.show();
      });
      
      // Add elements to item
      itemElement.appendChild(iconElement);
      itemElement.appendChild(nameElement);
    }
    
    return itemElement;
  }
  
  /**
   * Update the project tree with new data
   * @param {Array} tree - The new project tree data
   */
  update(tree) {
    if (Array.isArray(tree)) {
      this.projectTree = tree;
      this.populateProjectTree();
    }
  }

  /**
   * Handle a set project message
   * @param {Object} project - The project object
   */
  async handleProjectClosed(data, sender) {
    this.project = null;
    this.setTitle('Project Files');
    this.populateProjectTree();
  }
  
  async handleProjectLoaded(project, sender) {
    this.project = project;
    
    // Update the window title to the project name
    if (project && project.name) {
      this.setTitle(project.name);
    } else {
      this.setTitle('Project Files');
    }
    
    this.populateProjectTree(project);
  }
  
  /**
   * Handle a new file added message
   * @param {Object} file - The file object
   */
  async handleNewFileAdded(file, sender) {
    if (!this.treeElement || !file || !file.path) return;
    
    // Extract the directory path from the file path
    const filePath = file.path;
    const lastSlashIndex = filePath.lastIndexOf('/');
    const directoryPath = lastSlashIndex > 0 ? filePath.substring(0, lastSlashIndex) : '';
    const fileName = lastSlashIndex > 0 ? filePath.substring(lastSlashIndex + 1) : filePath;
    
    // Create the new file item
    const newFileItem = {
      name: fileName,
      type: 'file',
      path: filePath,
      size: file.size || 0
    };
    
    // Find the parent folder in the DOM
    let parentFolderElement = this.treeElement;
    
    if (directoryPath) {
      // If the file is not in the root, find its parent folder
      const pathParts = directoryPath.split('/').filter(part => part.length > 0);
      let currentPath = '';
      
      // Navigate through the DOM tree to find the parent folder
      for (const part of pathParts) {
        currentPath = currentPath ? `${currentPath}/${part}` : part;
        
        // Find the folder element with this path
        const folderElements = parentFolderElement.querySelectorAll('.project-folder');
        let found = false;
        
        for (const folderElement of folderElements) {
          const nameElement = folderElement.querySelector('.project-item-name');
          if (nameElement && nameElement.textContent === part) {
            // Found the folder, now get its contents element
            const contentsElement = folderElement.querySelector('.project-folder-contents');
            if (contentsElement) {
              parentFolderElement = contentsElement;
              found = true;
              break;
            }
          }
        }
        
        if (!found) {
          // If we can't find the parent folder, fall back to rebuilding the tree
          this.populateProjectTree();
          return;
        }
      }
    }
    
    // Check if the file already exists
    const existingFileElements = parentFolderElement.querySelectorAll('.project-item:not(.project-folder)');
    for (const fileElement of existingFileElements) {
      const nameElement = fileElement.querySelector('.project-item-name');
      if (nameElement && nameElement.textContent === fileName) {
        // File already exists, no need to add it again
        return;
      }
    }
    
    // Create the new file element
    const newFileElement = this.createProjectItem(newFileItem);
    
    // Find the correct position to insert the new file (after folders, alphabetically among files)
    const childElements = Array.from(parentFolderElement.children);
    let insertPosition = null;
    
    for (let i = 0; i < childElements.length; i++) {
      const child = childElements[i];
      
      // Skip folders
      if (child.classList.contains('project-folder')) continue;
      
      // Compare file names to find the correct alphabetical position
      const childNameElement = child.querySelector('.project-item-name');
      if (childNameElement && childNameElement.textContent.localeCompare(fileName) > 0) {
        insertPosition = child;
        break;
      }
    }
    
    // Insert the new file element
    if (insertPosition) {
      parentFolderElement.insertBefore(newFileElement, insertPosition);
    } else {
      parentFolderElement.appendChild(newFileElement);
    }
    
    // If the parent folder is collapsed, expand it to show the new file
    const parentFolder = parentFolderElement.parentElement;
    if (parentFolder && parentFolder.classList.contains('project-folder-collapsed')) {
      parentFolder.classList.remove('project-folder-collapsed');
      const iconElement = parentFolder.querySelector('.project-item-icon');
      if (iconElement) {
        iconElement.textContent = '▼';
      }
    }
  }
  
  /**
   * Handle a file deleted message
   * @param {Object} file - The file object or file path
   */
  async handleFileDeleted(file, sender) {
    if (!this.treeElement) return;
    
    // Extract the file path
    const filePath = typeof file === 'string' ? file : (file.path || '');
    if (!filePath) return;
    
    // Extract the directory path and filename from the file path
    const lastSlashIndex = filePath.lastIndexOf('/');
    const directoryPath = lastSlashIndex > 0 ? filePath.substring(0, lastSlashIndex) : '';
    const fileName = lastSlashIndex > 0 ? filePath.substring(lastSlashIndex + 1) : filePath;
    
    // Find the parent folder in the DOM
    let parentFolderElement = this.treeElement;
    
    if (directoryPath) {
      // If the file is not in the root, find its parent folder
      const pathParts = directoryPath.split('/').filter(part => part.length > 0);
      let currentPath = '';
      
      // Navigate through the DOM tree to find the parent folder
      for (const part of pathParts) {
        currentPath = currentPath ? `${currentPath}/${part}` : part;
        
        // Find the folder element with this path
        const folderElements = parentFolderElement.querySelectorAll('.project-folder');
        let found = false;
        
        for (const folderElement of folderElements) {
          const nameElement = folderElement.querySelector('.project-item-name');
          if (nameElement && nameElement.textContent === part) {
            // Found the folder, now get its contents element
            const contentsElement = folderElement.querySelector('.project-folder-contents');
            if (contentsElement) {
              parentFolderElement = contentsElement;
              found = true;
              break;
            }
          }
        }
        
        if (!found) {
          // If we can't find the parent folder, fall back to rebuilding the tree
          this.populateProjectTree();
          return;
        }
      }
    }
    
    // Find the file element to remove
    const fileElements = parentFolderElement.querySelectorAll('.project-item:not(.project-folder)');
    for (const fileElement of fileElements) {
      const nameElement = fileElement.querySelector('.project-item-name');
      if (nameElement && nameElement.textContent === fileName) {
        // Found the file element, remove it
        parentFolderElement.removeChild(fileElement);
        
        // Check if the parent folder is now empty
        if (parentFolderElement.children.length === 0) {
          // If the parent folder is now empty and it's not the root element,
          // we might want to update its appearance or collapse it
          const parentFolder = parentFolderElement.parentElement;
          if (parentFolder && parentFolder !== this.treeElement) {
            // Add an empty indicator or special styling if needed
            const emptyIndicator = document.createElement('div');
            emptyIndicator.className = 'empty-folder-indicator';
            emptyIndicator.textContent = '(Empty)';
            emptyIndicator.style.color = '#888';
            emptyIndicator.style.fontStyle = 'italic';
            emptyIndicator.style.padding = '2px 0 2px 20px';
            emptyIndicator.style.fontSize = '0.9em';
            
            parentFolderElement.appendChild(emptyIndicator);
          }
        }
        
        return;
      }
    }
    
    // If we couldn't find the file element, fall back to rebuilding the tree
    this.populateProjectTree();
  }
  
  /**
   * Handle a file renamed message
   * @param {Object} data - Object containing oldFile and newFile
   */
  async handleFileRenamed(data, sender) {
    if (!this.treeElement || !data || !data.oldFile || !data.newFile) return;
    
    // Extract the old file path and new file path
    const oldFilePath = typeof data.oldFile === 'string' ? data.oldFile : (data.oldFile.path || '');
    const newFilePath = typeof data.newFile === 'string' ? data.newFile : (data.newFile.path || '');
    
    if (!oldFilePath || !newFilePath) return;
    
    // Extract the directory paths and filenames
    const oldLastSlashIndex = oldFilePath.lastIndexOf('/');
    const oldDirectoryPath = oldLastSlashIndex > 0 ? oldFilePath.substring(0, oldLastSlashIndex) : '';
    const oldFileName = oldLastSlashIndex > 0 ? oldFilePath.substring(oldLastSlashIndex + 1) : oldFilePath;
    
    const newLastSlashIndex = newFilePath.lastIndexOf('/');
    const newDirectoryPath = newLastSlashIndex > 0 ? newFilePath.substring(0, newLastSlashIndex) : '';
    const newFileName = newLastSlashIndex > 0 ? newFilePath.substring(newLastSlashIndex + 1) : newFilePath;
    
    // Check if only the filename changed or if the file was moved to a different directory
    const isSameDirectory = oldDirectoryPath === newDirectoryPath;
    
    if (isSameDirectory) {
      // Simple rename within the same directory
      // Find the parent folder in the DOM
      let parentFolderElement = this.treeElement;
      
      if (oldDirectoryPath) {
        // If the file is not in the root, find its parent folder
        const pathParts = oldDirectoryPath.split('/').filter(part => part.length > 0);
        let currentPath = '';
        
        // Navigate through the DOM tree to find the parent folder
        for (const part of pathParts) {
          currentPath = currentPath ? `${currentPath}/${part}` : part;
          
          // Find the folder element with this path
          const folderElements = parentFolderElement.querySelectorAll('.project-folder');
          let found = false;
          
          for (const folderElement of folderElements) {
            const nameElement = folderElement.querySelector('.project-item-name');
            if (nameElement && nameElement.textContent === part) {
              // Found the folder, now get its contents element
              const contentsElement = folderElement.querySelector('.project-folder-contents');
              if (contentsElement) {
                parentFolderElement = contentsElement;
                found = true;
                break;
              }
            }
          }
          
          if (!found) {
            // If we can't find the parent folder, fall back to rebuilding the tree
            this.populateProjectTree();
            return;
          }
        }
      }
      
      // Find the file element to rename
      const fileElements = parentFolderElement.querySelectorAll('.project-item:not(.project-folder)');
      for (const fileElement of fileElements) {
        const nameElement = fileElement.querySelector('.project-item-name');
        if (nameElement && nameElement.textContent === oldFileName) {
          // Found the file element, update its name
          nameElement.textContent = newFileName;
          
          // Update the file path attribute if it exists
          if (fileElement.dataset && fileElement.dataset.path) {
            fileElement.dataset.path = newFilePath;
          }
          
          // Reposition the file element if needed to maintain alphabetical order
          this.repositionFileElement(fileElement, parentFolderElement);
          
          return;
        }
      }
    } else {
      // The file was moved to a different directory
      // First, remove the file from its old location
      await this.handleFileDeleted(data.oldFile, sender);
      
      // Then, add the file to its new location
      await this.handleNewFileAdded(data.newFile, sender);
      
      return;
    }
    
    // If we couldn't find the file element, fall back to rebuilding the tree
    this.populateProjectTree();
  }
  
  /**
   * Reposition a file element to maintain alphabetical order
   * @param {HTMLElement} fileElement - The file element to reposition
   * @param {HTMLElement} parentElement - The parent element containing the file
   */
  repositionFileElement(fileElement, parentElement) {
    // Get the file name
    const nameElement = fileElement.querySelector('.project-item-name');
    if (!nameElement) return;
    
    const fileName = nameElement.textContent;
    
    // Remove the file element from its current position
    parentElement.removeChild(fileElement);
    
    // Find the correct position to insert the file element (after folders, alphabetically among files)
    const childElements = Array.from(parentElement.children);
    let insertPosition = null;
    
    for (let i = 0; i < childElements.length; i++) {
      const child = childElements[i];
      
      // Skip folders
      if (child.classList.contains('project-folder')) continue;
      
      // Skip empty folder indicators
      if (child.classList.contains('empty-folder-indicator')) continue;
      
      // Compare file names to find the correct alphabetical position
      const childNameElement = child.querySelector('.project-item-name');
      if (childNameElement && childNameElement.textContent.localeCompare(fileName) > 0) {
        insertPosition = child;
        break;
      }
    }
    
    // Insert the file element
    if (insertPosition) {
      parentElement.insertBefore(fileElement, insertPosition);
    } else {
      parentElement.appendChild(fileElement);
    }
  }
}

export default ProjectSideWindow;
