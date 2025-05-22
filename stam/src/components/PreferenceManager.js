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
* @file PreferenceManager.js
* @author FL (Francois Lionet)
* @version 0.5
*
* @short This component manages application preferences and layout persistence.
* @description
* This class provides a default implementation of the StatusBar component.
* It extends the BaseComponent class and implements the necessary methods
* for handling status updates and temporary status messages.
*/
import BaseComponent from '../utils/BaseComponent.js';
import { MENUCOMMANDS } from './MenuBar.js';

class PreferenceManager extends BaseComponent {
  /**
   * Constructor
   * @param {string} parentId - ID of the parent component
   */
  constructor(parentId = null,containerId) {
    super('PreferenceManager', parentId,containerId);      
    this.messageMap[MENUCOMMANDS.PREFERENCES] = this.handleShowPreferences;
  }

  async init(options = {}) {
    if (await super.init(options))
      return;
    return true;
  }
  
  async destroy() {
    await super.destroy();
    return true;
  }
  
  async handleShowPreferences(currentPrefs) {
    this.showPreferencesDialog(currentPrefs);
  }
  
  async showPreferencesDialog(currentPrefs) {
    // Request available languages from the root component
    const availableLangs = await this.sendRequestTo(this.root.messages.componentId, 'GET_AVAILABLE_LANGUAGES');
    
    // Create dialog container
    const dialog = document.createElement('div');
    dialog.className = 'dialog-overlay';
    
    // Create dialog content
    dialog.innerHTML = `
      <div class="dialog-content">
        <div class="dialog-header">
          <h3>${this.root.messages.getMessage('stam:preferences-title')}</h3>
          <button class="close-button" aria-label="Close">&times;</button>
        </div>
        <div class="dialog-body">
          <div class="form-group">
            <label for="language-select">${this.root.messages.getMessage('stam:preferences-language')}</label>
            <select id="language-select" class="form-control">
              ${availableLangs.map(lang => 
                `<option value="${lang.language}" ${currentPrefs.language === lang.language ? 'selected' : ''}>
                  ${lang.country} (${lang.language})
                </option>`
              ).join('')}
            </select>
          </div>
        </div>
        <div class="dialog-footer">
          <button class="btn btn-secondary" id="cancel-button" type="button">
            ${this.root.messages.getMessage('stam:preferences-cancel')}
          </button>
          <button class="btn btn-primary" id="save-button" type="button">
            ${this.root.messages.getMessage('stam:preferences-save')}
          </button>
        </div>
      </div>
    `;
    
    // Add to DOM first so we can set up event listeners
    document.body.appendChild(dialog);
    
    // Focus the first interactive element for better keyboard navigation
    const closeButton = dialog.querySelector('.close-button');
    closeButton.focus();
    
    // Return a promise that resolves when the dialog is closed
    return new Promise((resolve) => {
      const closeDialog = (result) => {
        // Remove the dialog from the DOM
        if (document.body.contains(dialog)) {
          document.body.removeChild(dialog);
        }
        resolve(result);
      };
      
      // Set up event listeners
      closeButton.addEventListener('click', () => closeDialog(null));
      dialog.querySelector('#cancel-button').addEventListener('click', () => closeDialog(null));
      dialog.querySelector('#save-button').addEventListener('click', () => {
        const selectedLang = dialog.querySelector('#language-select').value;
        closeDialog({ language: selectedLang });
      });
      
      // Close on Escape key
      const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          closeDialog(null);
        }
      };
      
      // Handle keyboard navigation
      const handleTabKey = (e) => {
        if (e.key === 'Tab') {
          const focusableElements = dialog.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
          const firstElement = focusableElements[0];
          const lastElement = focusableElements[focusableElements.length - 1];
          
          if (e.shiftKey) {
            if (document.activeElement === firstElement) {
              e.preventDefault();
              lastElement.focus();
            }
          } else {
            if (document.activeElement === lastElement) {
              e.preventDefault();
              firstElement.focus();
            }
          }
        }
      };
      
      // Add event listeners
      dialog.addEventListener('keydown', handleKeyDown);
      dialog.addEventListener('keydown', handleTabKey);
      
      // Close on overlay click
      dialog.addEventListener('click', (e) => {
        if (e.target === dialog) {
          closeDialog(null);
        }
      });
      
      // Clean up function
      const cleanup = () => {
        dialog.removeEventListener('keydown', handleKeyDown);
        dialog.removeEventListener('keydown', handleTabKey);
      };
      
      // Store cleanup function for finally block
      dialog._cleanup = cleanup;
      
    }).finally(() => {
      // Ensure cleanup happens even if the promise is rejected
      if (dialog._cleanup) {
        dialog._cleanup();
      }
    });
  }
}
export default PreferenceManager;
