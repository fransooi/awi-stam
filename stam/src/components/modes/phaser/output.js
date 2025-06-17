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
* @file output.js
* @author FL (Francois Lionet)
* @version 0.5
*
* @short Phaser Output component
*/
import BaseOutput from '../../sidewindows/BaseOutput.js';
import { PROJECTMESSAGES } from '../../ProjectManager.js'

class PhaserOutput extends BaseOutput {
  constructor(parentId,containerId,initialHeight = 200) {
    super('PhaserOutput',parentId,containerId,initialHeight);
    this.modeName = 'phaser';
    this.messageMap[PROJECTMESSAGES.PROJECT_LOADED] = this.handleProjectLoaded;
    this.messageMap[PROJECTMESSAGES.PROJECT_CLOSED] = this.handleProjectClosed;
    this.messageMap[PROJECTMESSAGES.PROJECT_RUNNED] = this.handleProjectRunned;
    this.messageMap[PROJECTMESSAGES.PROJECT_STOPPED] = this.handleProjectStopped;
    this.projectUrl = null;
  }
  
  /**
   * Create the output UI specific to STOS mode
   * @param {string} containerId - The ID of the container element
   * @returns {Promise<HTMLDivElement>} The rendered output container
   */
  async render(containerId) {
    this.container = await super.render(containerId);
    
    // Add Phaser-specific UI elements and styling
    this.addPhaserSpecificStyles();
    
    // Apply direct styling to ensure it overrides any default styles
    this.container.style.fontFamily = 'Consolas, monospace';
    this.container.style.backgroundColor = '#f8f8f8';
    this.container.style.color = '#333';
    this.container.style.border = 'none';
    this.container.style.padding = '0px';
    this.container.style.overflow = 'hidden';
    
    // Create a container for the iframe/project URL display
    this.projectDisplay = document.createElement('div');
    this.projectDisplay.id = 'phaser-project-display';
    this.projectDisplay.style.width = '100%';
    this.projectDisplay.style.height = '100%';
    this.projectDisplay.style.border = 'none';
    this.projectDisplay.style.overflow = 'hidden';
    
    // Append the project display container
    this.container.appendChild(this.projectDisplay);
    
    // If we already have a project URL, display it
    this.displayProjectUrl(this.projectUrl);
    
    return this.container;
  }
  
  /**
   * Add Phaser-specific styles for the output window
   */
  addPhaserSpecificStyles() {
    // Add styles if not already present
    if (!document.getElementById('phaser-output-styles')) {
      const style = document.createElement('style');
      style.id = 'phaser-output-styles';
      style.textContent = `
        /* Direct styling for the output window in Phaser mode */
        .phaser-mode #output-window,
        .phaser-mode .output-window {
          font-family: 'Consolas', monospace !important;
          background-color: #f8f8f8 !important;
          color: #333 !important;
          border: none !important;
          padding: 0px !important;
          overflow: hidden !important;
        }
        /* Eliminate parent padding/scrollbar for Phaser mode */
        .phaser-mode .side-window-content {
          padding: 0 !important;
          overflow: hidden !important;
          box-sizing: border-box !important;
        }
        .phaser-mode .output-window .error {
          color: #e74c3c !important;
          font-weight: bold !important;
        }
        
        .phaser-mode .output-window .warning {
          color: #f39c12 !important;
        }
        
        .phaser-mode .output-window .success {
          color: #2ecc71 !important;
        }
        
        .phaser-mode .output-window .info {
          color: #3498db !important;
        }
        
        /* Phaser console-style log formatting */
        .phaser-mode .output-window .log-entry {
          margin-bottom: 4px;
          border-bottom: 1px solid #eee;
          padding-bottom: 4px;
        }
        
        .phaser-mode .output-window .log-time {
          color: #999;
          font-size: 0.8em;
          margin-right: 5px;
        }
      `;
      document.head.appendChild(style);
    }
  }

  /**
   * Handle the PROJECT_LOADED message from ProjectManager
   * @param {Object} project - The project object containing URL and other properties
   */
  handleProjectLoaded(project) {
    if (project) {
      this.project = project;
    }
  }
  
  /**
   * Handle the PROJECT_CLOSED message from ProjectManager
   * @param {Object} project - The project object containing URL and other properties
   * @param {string} senderId - ID of the component that sent the message
   */
  handleProjectClosed(project, senderId) {
    this.project = null;
    this.displayProjectUrl(null);
  }
  
  handleProjectRunned(project, senderId) {
    if (this.project) {
      this.displayProjectUrl(this.project.runUrl);
    }
  }
  handleProjectStopped(project, senderId) {
    if (this.project) {
      this.displayProjectUrl(null);
    }
  }
  /**
   * Display the project URL in an iframe
   * @param {string} url - The URL to display
   */
  displayProjectUrl(url) {
    
    if (!this.projectDisplay)
      return;

    // Clear any existing content
    this.projectDisplay.innerHTML = '';

    // Display black
    if (!url)
    {
      const div = document.createElement('div');
      div.style.width = '100%';
      div.style.height = '100%';
      div.style.backgroundColor = 'black';
      this.projectDisplay.appendChild(div);
      return;
    }
    
    // Create an iframe to display the project
    const iframe = document.createElement('iframe');
    iframe.src = url;
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.border = 'none';
    iframe.style.overflow = 'hidden';
    
    // Prevent full-screen capability
    iframe.setAttribute('allow', 'accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture');
    iframe.setAttribute('allowfullscreen', 'false');
    iframe.setAttribute('webkitallowfullscreen', 'false');
    iframe.setAttribute('mozallowfullscreen', 'false');
    
    // Add the iframe to the display container
    this.projectDisplay.appendChild(iframe);
  }
}

export default PhaserOutput;
