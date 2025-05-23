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

// Default theme definition
const DEFAULT_THEME = {
  name: 'Dark',
  colors: {
    'background': '#1e1e1e',
    'dialog-background': '#2d2d2d',
    'container-background': '#252526',
    'button-positive': '#1a73e8',
    'button-negative': '#dc3545',
    'button-neutral': '#6c757d',
    'list-background': '#3a3a3a',
    'popup-background': '#333333',
    'text-primary': '#e0e0e0',
    'text-secondary': '#b0b0b0',
    'text-positive': '#ffffff',
    'text-negative': '#ffffff',
    'text-neutral': '#ffffff',
    'popup-text': '#ffffff',
    'side-title-background': '#333333',
    'side-title-text': '#ffffff',
    'side-border': '#444444',
    'side-resize': '#555555',
    'side-title-background-hover': '#3d3d3d',
    'border-color': '#444',
    'slider-background': '#444',
    'slider-track': '#666',
    'slider-thumb': '#888',
  },
  fonts: {
    'menu': 'Inter, system-ui, sans-serif',
    'side-window': 'Inter, system-ui, sans-serif',
    'status-bar': 'Consolas, monospace'
  }
};

// Available themes
const THEMES = {
  'default-dark': { ...DEFAULT_THEME },
  'default-light': {
    name: 'Light',
    colors: {
      'background': '#f5f5f5',
      'dialog-background': '#ffffff',
      'container-background': '#f0f0f0',
      'button-positive': '#1a73e8',
      'button-negative': '#dc3545',
      'button-neutral': '#6c757d',
      'list-background': '#ffffff',
      'popup-background': '#ffffff',
      'text-primary': '#000000',
      'text-secondary': '#666666',
      'text-positive': '#ffffff',
      'text-negative': '#ffffff',
      'text-neutral': '#ffffff',
      'popup-text': '#333333',
      'side-title-background': '#e0e0e0',
      'side-title-text': '#000000',
      'side-border': '#cccccc',
      'side-resize': '#999999',
      'side-title-background-hover': '#d0d0d0',
      'border-color': '#ddd',
      'slider-background': '#444',
      'slider-track': '#666',
      'slider-thumb': '#888',
    },
    fonts: {
      'menu': 'Inter, system-ui, sans-serif',
      'side-window': 'Inter, system-ui, sans-serif',
      'status-bar': 'Consolas, monospace'
    }
  }
};

class PreferenceManager extends BaseComponent {
  /**
   * Constructor
   * @param {string} parentId - ID of the parent component
   */
  constructor(parentId = null,containerId) {
    super('PreferenceManager', parentId,containerId);      
    this.messageMap[MENUCOMMANDS.PREFERENCES] = this.handleShowPreferences;
    this.currentThemeId = 'default-dark';
    this.themes = { ...THEMES };
  }

  /**
   * Get the current theme
   * @returns {Object} Current theme object
   */
  getCurrentTheme() {
    return this.themes[this.currentThemeId] || { ...DEFAULT_THEME };
  }

  /**
   * Apply the current theme to the document
   */
  applyTheme() {
    const theme = this.getCurrentTheme();
    
    // Remove any existing theme styles
    const existingStyles = document.querySelectorAll('style[id^="theme-styles"]');
    existingStyles.forEach(style => style.remove());
    
    // Create new style element
    const style = document.createElement('style');
    style.id = 'theme-styles';
    
    // Build CSS with kebab-case variable names
    let css = ':root {\n';
    
    // Add color variables
    Object.entries(theme.colors).forEach(([key, value]) => {
      css += `  --${key}: ${value};\n`;
    });
    
    // Add font variables
    Object.entries(theme.fonts).forEach(([key, value]) => {
      css += `  --font-${key}: ${value};\n`;
    });
    
    css += '}';
    
    // Apply the styles
    style.textContent = css;
    document.head.appendChild(style);
    
    // Force a reflow to ensure styles are applied
    document.documentElement.getBoundingClientRect();
    
    // Save theme preference
    localStorage.setItem('stam-theme', this.currentThemeId);
  }

  /**
   * Show theme selection dialog
   * @returns {Promise} Resolves with the selected theme ID or null if cancelled
   */
  async showThemeSelectionDialog() {
    const dialog = document.createElement('div');
    dialog.className = 'dialog-overlay';
    
    const themeItems = Object.entries(this.themes).map(([id, theme]) => ({
      id,
      ...theme
    }));
    
    dialog.innerHTML = `
      <div class="dialog-content" style="max-width: 500px;">
        <div class="dialog-header">
          <h3>${this.root.messages.getMessage('stam:theme-choose')}</h3>
          <button class="close-button" aria-label="${this.root.messages.getMessage('stam:theme-close')}">&times;</button>
        </div>
        <div class="dialog-body" style="max-height: 60vh; overflow-y: auto;">
          <div class="theme-list">
            ${themeItems.map(theme => `
              <div class="theme-item" data-theme-id="${theme.id}">
                <div class="theme-preview" 
                     style="background: ${theme.colors.background};
                            color: ${theme.colors.textPrimary};
                            padding: 10px;
                            border-radius: 4px;
                            margin-bottom: 10px;
                            border: 2px solid ${theme.id === this.currentThemeId ? theme.colors.buttonPositive : 'transparent'};">
                  <div style="font-weight: bold; margin-bottom: 8px;">${theme.name}</div>
                  <div style="display: flex; gap: 4px; margin-bottom: 8px;">
                    <span style="background: ${theme.colors.buttonPositive}; 
                                      color: ${theme.colors.textPositive}; 
                                      padding: 2px 6px; 
                                      border-radius: 3px; 
                                      font-size: 12px;">
                      ${this.root.messages.getMessage('stam:theme-preview-button')}
                    </span>
                  </div>
                  <div style="background: ${theme.colors.listBackground}; 
                                      color: ${theme.colors.textPrimary}; 
                                      padding: 4px 8px; 
                                      border-radius: 3px; 
                                      font-size: 12px;">
                    ${this.root.messages.getMessage('stam:theme-preview-list')}
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
        <div class="dialog-footer">
          <button class="btn btn-secondary" id="theme-cancel">
            ${this.root.messages.getMessage('stam:theme-cancel')}
          </button>
          <button class="btn btn-primary" id="theme-use" disabled>
            ${this.root.messages.getMessage('stam:theme-use')}
          </button>
        </div>
      </div>
    `;

    // Add to DOM
    document.body.appendChild(dialog);
    
    // Focus the first interactive element
    dialog.querySelector('.close-button').focus();
    
    return new Promise((resolve) => {
      let selectedThemeId = null;
      
      // Handle theme selection
      const themeItems = dialog.querySelectorAll('.theme-item');
      themeItems.forEach(item => {
        item.addEventListener('click', () => {
          // Remove selection from all items
          themeItems.forEach(i => i.querySelector('.theme-preview').style.borderColor = 'transparent');
          
          // Select clicked item
          item.querySelector('.theme-preview').style.borderColor = 
            this.themes[item.dataset.themeId]?.colors.buttonPositive || '#1a73e8';
          
          selectedThemeId = item.dataset.themeId;
          dialog.querySelector('#theme-use').disabled = false;
        });
      });
      
      // Handle dialog close
      const closeDialog = (result) => {
        if (document.body.contains(dialog)) {
          document.body.removeChild(dialog);
        }
        resolve(result);
      };
      
      // Set up event listeners
      dialog.querySelector('.close-button').addEventListener('click', () => closeDialog(null));
      dialog.querySelector('#theme-cancel').addEventListener('click', () => closeDialog(null));
      dialog.querySelector('#theme-use').addEventListener('click', () => {
        closeDialog(selectedThemeId);
      });
      
      // Close on Escape key
      const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          closeDialog(null);
        }
      };
      
      dialog.addEventListener('keydown', handleKeyDown);
      
      // Clean up
      dialog._cleanup = () => {
        dialog.removeEventListener('keydown', handleKeyDown);
      };
      
    }).finally(() => {
      if (dialog._cleanup) dialog._cleanup();
    });
  }
  
  /**
   * Show theme editor dialog
   * @param {string} themeId - Theme ID to edit (or null for new theme)
   * @returns {Promise} Resolves with the saved theme or null if cancelled
   */
  async showThemeEditorDialog(themeToEdit = null) {
    // Always create a copy of the current theme
    const currentTheme = themeToEdit || this.getCurrentTheme();
    const theme = { ...currentTheme };
    
    // Reset ID and update name for the new theme
    delete theme.id;
    theme.name = this.root.messages.getMessage('stam:theme-copy-of') + ' ' + 
                (currentTheme.name || this.root.messages.getMessage('stam:theme'));

    const dialog = document.createElement('div');
    dialog.className = 'dialog-overlay';
    
    // Create tabs for colors and fonts
    dialog.innerHTML = `
      <div class="dialog-content" style="max-width: 700px;">
        <div class="dialog-header">
          <h3>${this.root.messages.getMessage('stam:theme-create')}</h3>
          <button class="close-button" aria-label="${this.root.messages.getMessage('stam:theme-close')}">&times;</button>
        </div>
        <div class="dialog-body">
          <div class="form-group">
            <label for="theme-name">${this.root.messages.getMessage('stam:theme-name')}</label>
            <input type="text" id="theme-name" class="form-control" value="${theme.name}">
          </div>
          
          <div class="tabs" style="display: flex; margin: 15px 0; border-bottom: 1px solid var(--border-color, #444);">
            <button class="tab-button active" data-tab="colors" style="padding: 8px 16px; background: none; border: none; border-bottom: 2px solid var(--button-positive, #1a73e8); color: var(--text-primary, #e0e0e0); cursor: pointer; font-size: 14px; margin-right: 5px;">
              ${this.root.messages.getMessage('stam:theme-colors')}
            </button>
            <button class="tab-button" data-tab="fonts" style="padding: 8px 16px; background: none; border: none; border-bottom: 2px solid transparent; color: var(--text-secondary, #b0b0b0); cursor: pointer; font-size: 14px; margin-right: 5px;">
              ${this.root.messages.getMessage('stam:theme-fonts')}
            </button>
            <button class="tab-button" data-tab="preview" style="padding: 8px 16px; background: none; border: none; border-bottom: 2px solid transparent; color: var(--text-secondary, #b0b0b0); cursor: pointer; font-size: 14px;">
              ${this.root.messages.getMessage('stam:theme-preview')}
            </button>
          </div>
          
          <div class="tab-content" id="colors-tab">
            <h4>${this.root.messages.getMessage('stam:theme-colors')}</h4>
            ${Object.entries({
              background: this.root.messages.getMessage('stam:theme-background'),
              dialogBackground: this.root.messages.getMessage('stam:theme-dialog-bg'),
              containerBackground: this.root.messages.getMessage('stam:theme-container-bg'),
              buttonPositive: this.root.messages.getMessage('stam:theme-button-positive'),
              buttonNegative: this.root.messages.getMessage('stam:theme-button-negative'),
              buttonNeutral: this.root.messages.getMessage('stam:theme-button-neutral'),
              listBackground: this.root.messages.getMessage('stam:theme-list-bg'),
              popupBackground: this.root.messages.getMessage('stam:theme-popup-bg'),
              textPrimary: this.root.messages.getMessage('stam:theme-text-primary'),
              textSecondary: this.root.messages.getMessage('stam:theme-text-secondary'),
              textPositive: this.root.messages.getMessage('stam:theme-text-positive'),
              textNegative: this.root.messages.getMessage('stam:theme-text-negative'),
              textNeutral: this.root.messages.getMessage('stam:theme-text-neutral'),
              popupText: this.root.messages.getMessage('stam:theme-popup-text')
            }).concat([
              ['sidetitleBackground', 'Side Window Title Background'],
              ['sidetitleText', 'Side Window Title Text'],
              ['sideBorder', 'Side Window Border'],
              ['sideResize', 'Side Window Resize Handle']
            ]).map(([key, label]) => `
              <div class="form-group" style="display: flex; align-items: center; margin-bottom: 10px;">
                <label style="flex: 1; margin-right: 10px; color: var(--text-primary, #e0e0e0);" for="color-${key}">${label}</label>
                <input type="color" id="color-${key}" value="${theme.colors[key] || '#000000'}" 
                       data-theme-property="colors.${key}"
                       style="width: 60px; height: 30px; padding: 0; border: 1px solid var(--border-color, #444); background: var(--container-background, #252526);
                              cursor: pointer;" class="theme-color-input">
              </div>
            `).join('')}
          </div>
          
          <div class="tab-content" id="fonts-tab" style="display: none;">
            <h4>${this.root.messages.getMessage('stam:theme-fonts')}</h4>
            ${Object.entries({
              menu: this.root.messages.getMessage('stam:theme-font-menu'),
              sideWindow: this.root.messages.getMessage('stam:theme-font-sidewindow'),
              statusBar: this.root.messages.getMessage('stam:theme-font-statusbar')
            }).map(([key, label]) => `
              <div class="form-group" style="margin-bottom: 15px;" data-font-field="${key}">
                <label for="font-${key}" style="display: block; margin-bottom: 5px; color: var(--text-primary, #e0e0e0);">${label}</label>
                <div style="display: flex; gap: 8px;">
                  <input type="text" id="font-${key}" class="form-control" data-theme-property="fonts.${key}"
                         value="${theme.fonts[key] || ''}" style="flex: 1; padding: 8px; border-radius: 4px; border: 1px solid var(--border-color, #444);
                                background: var(--container-background, #252526); color: var(--text-primary, #e0e0e0);"
                         readonly>
                  <button class="btn btn-secondary choose-font" data-font-field="${key}" 
                          style="white-space: nowrap; padding: 0 12px;">
                    ${this.root.messages.getMessage('stam:theme-choose-font')}
                  </button>
                </div>
              </div>
            `).join('')}
          </div>
          
          <div class="tab-content" id="preview-tab" style="display: none;">
            <h4 style="color: var(--text-primary, #e0e0e0); margin-bottom: 15px;">${this.root.messages.getMessage('stam:theme-preview')}</h4>
            <div id="theme-preview" style="padding: 20px; border: 1px solid var(--border-color, #444); border-radius: 4px; margin-top: 10px;
                                      background: var(--background, #1e1e1e); color: var(--text-primary, #e0e0e0);">
              <div style="margin-bottom: 20px;">
                <h3 style="color: var(--text-primary, #e0e0e0);">${this.root.messages.getMessage('stam:theme-preview-title')}</h3>
                <p style="color: var(--text-secondary, #b0b0b0);">${this.root.messages.getMessage('stam:theme-preview-description')}</p>
              </div>
              <div style="display: flex; gap: 10px; margin-bottom: 20px;">
                <button style="padding: 8px 16px; background: var(--button-positive, #1a73e8); color: var(--text-positive, #ffffff);
                                   border: none; border-radius: 4px; cursor: pointer;">
                  ${this.root.messages.getMessage('stam:theme-preview-button')}
                </button>
                <button style="padding: 8px 16px; background: var(--button-neutral, #6c757d); color: var(--text-neutral, #ffffff);
                                   border: none; border-radius: 4px; cursor: pointer;">
                  ${this.root.messages.getMessage('stam:theme-preview-cancel')}
                </button>
              </div>
              <div style="background: var(--list-background, #3a3a3a); padding: 15px; border-radius: 4px;">
                <p style="margin: 0 0 10px 0; color: var(--text-primary, #e0e0e0);">${this.root.messages.getMessage('stam:theme-preview-list')}</p>
                <ul style="margin: 0; padding-left: 20px; color: var(--text-primary, #e0e0e0);">
                  <li>${this.root.messages.getMessage('stam:theme-preview-item1')}</li>
                  <li>${this.root.messages.getMessage('stam:theme-preview-item2')}</li>
                  <li>${this.root.messages.getMessage('stam:theme-preview-item3')}</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
        <div class="dialog-footer">
          <button class="btn btn-secondary" id="theme-editor-cancel">
            ${this.root.messages.getMessage('stam:theme-cancel')}
          </button>
          <button class="btn btn-primary" id="theme-editor-save">
            ${this.root.messages.getMessage('stam:theme-save')}
          </button>
        </div>
      </div>
    `;
    
    // Add to DOM
    document.body.appendChild(dialog);
    
    // Set up tab switching
    const tabs = dialog.querySelectorAll('.tab-button');
    const switchTab = (tabName) => {
      // Update active tab
      dialog.querySelectorAll('.tab-button').forEach(btn => {
        const isActive = btn.getAttribute('data-tab') === tabName;
        btn.style.borderBottomColor = isActive ? 'var(--button-positive, #1a73e8)' : 'transparent';
        btn.style.color = isActive ? 'var(--text-primary, #e0e0e0)' : 'var(--text-secondary, #b0b0b0)';
      });
      
      // Show corresponding tab content
      dialog.querySelectorAll('.tab-content').forEach(content => {
        content.style.display = 'none';
      });
      document.getElementById(`${tabName}-tab`).style.display = 'block';
      
      // Force preview update when switching to preview tab
      if (tabName === 'preview') {
        updatePreview();
      }
    };
    
    dialog.querySelectorAll('.tab-button').forEach(button => {
      button.addEventListener('click', () => {
        const tabName = button.getAttribute('data-tab');
        switchTab(tabName);
      });
    });
    
    // Update preview with current theme
    const updatePreview = () => {
      const preview = dialog.querySelector('#theme-preview');
      if (!preview) return;
      
      // Update preview styles
      const style = {
        '--background': theme.colors.background || '#1e1e1e',
        '--dialog-background': theme.colors.dialogBackground || '#2d2d2d',
        '--container-background': theme.colors.containerBackground || '#252526',
        '--button-positive': theme.colors.buttonPositive || '#1a73e8',
        '--button-negative': theme.colors.buttonNegative || '#dc3545',
        '--button-neutral': theme.colors.buttonNeutral || '#6c757d',
        '--list-background': theme.colors.listBackground || '#3a3a3a',
        '--popup-background': theme.colors.popupBackground || '#333333',
        '--text-primary': theme.colors.textPrimary || '#e0e0e0',
        '--text-secondary': theme.colors.textSecondary || '#b0b0b0',
        '--text-positive': theme.colors.textPositive || '#ffffff',
        '--text-negative': theme.colors.textNegative || '#ffffff',
        '--text-neutral': theme.colors.textNeutral || '#ffffff',
        '--popup-text': theme.colors.popupText || '#ffffff',
        '--sidetitle-background': theme.colors.sidetitleBackground || '#333333',
        '--sidetitle-text': theme.colors.sidetitleText || '#ffffff',
        '--side-border': theme.colors.sideBorder || '#444444',
        '--side-resize': theme.colors.sideResize || '#555555',
        '--border-color': '#444',
        'font-family': theme.fonts.menu || 'Inter, system-ui, sans-serif'
      };
      
      Object.entries(style).forEach(([key, value]) => {
        preview.style.setProperty(key, value);
      });
    };
    
    // Update theme when inputs change
    const updateThemeFromInputs = () => {
      // Update colors
      dialog.querySelectorAll('.theme-color-input').forEach(input => {
        const property = input.getAttribute('data-theme-property');
        const [category, key] = property.split('.');
        if (category && key && theme[category]) {
          theme[category][key] = input.value;
        }
      });
      
      // Update fonts
      dialog.querySelectorAll('input[data-theme-property^="fonts."]').forEach(input => {
        const property = input.getAttribute('data-theme-property');
        const [category, key] = property.split('.');
        if (category && key && theme[category]) {
          theme[category][key] = input.value;
        }
      });
      
      // Update preview if it's visible
      if (dialog.querySelector('#preview-tab').style.display === 'block') {
        updatePreview();
      }
    };
    
    // Add event listeners for live updates
    dialog.addEventListener('input', (e) => {
      if (e.target.matches('input[data-theme-property]')) {
        updateThemeFromInputs();
      }
    });
    
    // Add event listeners for font picker buttons
    dialog.addEventListener('click', async (e) => {
      if (e.target.classList.contains('choose-font')) {
        const fontField = e.target.getAttribute('data-font-field');
        const input = dialog.querySelector(`#font-${fontField}`);
        if (!input) return;
        
        const currentFont = input.value;
        const selectedFont = await this.showFontPicker(currentFont);
        
        if (selectedFont) {
          input.value = selectedFont;
          theme.fonts[fontField] = selectedFont;
          updatePreview();
        }
      }
    });
    
    // Also update when tab changes
    dialog.addEventListener('click', (e) => {
      if (e.target.classList.contains('tab-button') && e.target.getAttribute('data-tab') === 'preview') {
        // Ensure all selected fonts are loaded before showing preview
        const fontPromises = Object.values(theme.fonts)
          .filter(font => font) // Filter out empty fonts
          .map(font => loadFont(font).catch(console.error));
        
        Promise.all(fontPromises).then(() => {
          updatePreview();
        });
      }
    });
    
    // Show first tab by default
    if (tabs.length > 0) {
      tabs[0].click();
    }
    
    // Focus the first input
    dialog.querySelector('input').focus();
    
    return new Promise((resolve) => {
      const closeDialog = (result) => {
        if (document.body.contains(dialog)) {
          document.body.removeChild(dialog);
        }
        resolve(result);
      };
      
      // Set up event listeners
      dialog.querySelector('.close-button').addEventListener('click', () => closeDialog(null));
      dialog.querySelector('#theme-editor-cancel').addEventListener('click', () => closeDialog(null));
      
      dialog.querySelector('#theme-editor-save').addEventListener('click', () => {
        try {
          // Collect theme data
          const themeName = dialog.querySelector('#theme-name').value.trim();
          if (!themeName) {
            // Show error or highlight the field
            dialog.querySelector('#theme-name').style.borderColor = 'red';
            return;
          }
          
          // Always create a new theme with a unique ID
          const newTheme = { ...theme };
          newTheme.name = themeName;
          newTheme.id = `theme-${Date.now()}`;
          
          // Check if a theme with this name already exists (case insensitive)
          const existingThemes = this.getThemes();
          const nameExists = existingThemes.some(t => {
            // Skip the current theme if it exists (being edited)
            if (theme.id && t.id === theme.id) return false;
            // For default themes, check both id and name since they might not have ids
            const isDefaultTheme = !t.id || t.id.startsWith('default-');
            const isSameName = t.name.toLowerCase() === themeName.toLowerCase();
            return isSameName && (isDefaultTheme || t.id !== theme.id);
          });
          
          if (nameExists) {
            // Show alert to user
            alert(this.root.messages.getMessage('stam:theme-name-exists'));
            return;
          }
          
          // Close the dialog and return the new theme
          closeDialog(newTheme);
        } catch (error) {
          console.error('Error saving theme:', error);
          closeDialog(null);
        }
      });
      
      // Close on Escape key
      const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          closeDialog(null);
        }
      };
      
      dialog.addEventListener('keydown', handleKeyDown);
      
      // Clean up
      dialog._cleanup = () => {
        dialog.removeEventListener('keydown', handleKeyDown);
      };
      
    }).finally(() => {
      if (dialog._cleanup) dialog._cleanup();
    });
  }

  async init(options = {}) {
    if (await super.init(options))
      return;
    
    // Load saved theme if exists
    const savedThemeId = localStorage.getItem('stam-theme');
    if (savedThemeId && this.themes[savedThemeId]) {
      this.currentThemeId = savedThemeId;
    }
    
    // Apply the theme
    this.applyTheme();
    return true;
  }
  
  async destroy() {
    await super.destroy();
    return true;
  }
  
  async handleShowPreferences(currentPrefs = {}) {
    await this.showPreferencesDialog(currentPrefs);    
  }

  /**
   * Get all available themes
   * @returns {Array} Array of theme objects
   */
  getThemes() {
    // Get all themes from localStorage or use default themes
    try {
      const savedThemes = JSON.parse(localStorage.getItem('stam-themes') || '[]');
      // Combine with default themes, giving priority to saved themes
      const allThemes = [
        ...savedThemes,
        ...Object.values(THEMES).filter(theme => 
          !savedThemes.some(t => t.id === theme.id)
        )
      ];
      return allThemes;
    } catch (error) {
      console.error('Error loading themes:', error);
      return Object.values(THEMES);
    }
  }

  /**
   * Show font picker dialog
   * @param {string} currentFont - Currently selected font
   * @returns {Promise<string>} - Selected font family or null if cancelled
   */
  async showFontPicker(currentFont = '') {
    const dialog = document.createElement('div');
    dialog.className = 'dialog-overlay';
    dialog.style.zIndex = '10000';
    
    // Load Google Fonts API if not already loaded
    if (!document.getElementById('google-fonts-api')) {
      const link = document.createElement('link');
      link.id = 'google-fonts-api';
      link.href = 'https://fonts.googleapis.com/css2?family=Roboto:wght@400;500&display=swap';
      link.rel = 'stylesheet';
      document.head.appendChild(link);
    }
    
    // Font categories
    const categories = [
      { id: 'all', name: 'stam:font-picker-category-all' },
      { id: 'sans-serif', name: 'stam:font-picker-category-sans' },
      { id: 'serif', name: 'stam:font-picker-category-serif' },
      { id: 'display', name: 'stam:font-picker-category-display' },
      { id: 'handwriting', name: 'stam:font-picker-category-handwriting' },
      { id: 'monospace', name: 'stam:font-picker-category-monospace' }
    ];
    
    // Curated list of web-safe fonts that work well for code editors
    const webSafeFonts = [
      // System fonts (available on most systems)
      'Arial', 'Helvetica', 'Verdana', 'Tahoma', 'Trebuchet MS',
      'Courier New', 'Courier', 'monospace',
      'Georgia', 'Times New Roman', 'Palatino',
      
      // Common coding fonts (often pre-installed)
      'Consolas', 'Menlo', 'Monaco', 'Andale Mono', 'Lucida Console',
      'DejaVu Sans Mono', 'Bitstream Vera Sans Mono', 'Liberation Mono',
      
      // Common UI fonts
      'Segoe UI', 'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Roboto Condensed',
      'Source Sans Pro', 'Oswald', 'Raleway', 'PT Sans', 'Ubuntu',
      'Roboto Mono', 'Inconsolata', 'Fira Code', 'Courier Prime', 'JetBrains Mono',
      'Droid Sans', 'Droid Serif'
    ].filter((value, index, self) => self.indexOf(value) === index); // Remove duplicates
    
    // Font categories mapping
    const fontCategories = {
      'sans-serif': ['Arial', 'Helvetica', 'Verdana', 'Tahoma', 'Trebuchet MS', 
                    'Segoe UI', 'Roboto', 'Open Sans', 'Lato', 'Montserrat', 
                    'Source Sans Pro', 'Droid Sans'],
      'serif': ['Georgia', 'Times New Roman', 'Palatino', 'Droid Serif'],
      'monospace': ['Courier New', 'Courier', 'monospace', 'Consolas', 'Menlo', 
                   'Monaco', 'Andale Mono', 'Lucida Console', 'DejaVu Sans Mono',
                   'Bitstream Vera Sans Mono', 'Liberation Mono', 'Roboto Mono', 
                   'Inconsolata', 'Fira Code', 'Courier Prime', 'JetBrains Mono'],
      'display': ['Oswald', 'Raleway', 'Impact', 'Arial Black', 'Arial Narrow'],
      'handwriting': ['Comic Sans MS', 'Comic Sans', 'Brush Script MT', 'Brush Script Std']
    };
    
    // Get recently used fonts from localStorage
    const recentFonts = JSON.parse(localStorage.getItem('recentFonts') || '[]')
      .filter(font => font !== currentFont);
    if (currentFont) recentFonts.unshift(currentFont);
    
    dialog.innerHTML = `
      <div class="dialog-content" style="width: 600px; max-width: 90vw; max-height: 80vh; display: flex; flex-direction: column;">
        <div class="dialog-header">
          <h3>${this.root.messages.getMessage('stam:font-picker-title')}</h3>
          <button class="close-button" aria-label="${this.root.messages.getMessage('stam:theme-close')}">&times;</button>
        </div>
        <div style="padding: 15px; border-bottom: 1px solid var(--border-color, #444);">
          <input type="text" id="font-search" class="form-control" 
                 placeholder="${this.root.messages.getMessage('stam:font-picker-search-placeholder')}"
                 style="width: 100%; padding: 8px 12px; margin-bottom: 10px;">
          
          <div class="font-categories" style="display: flex; gap: 8px; margin-bottom: 0; flex-wrap: wrap;">
            ${categories.map(cat => `
              <button class="font-category ${cat.id === 'all' ? 'active' : ''}" 
                      data-category="${cat.id}" 
                      style="padding: 4px 12px; border-radius: 15px; border: 1px solid var(--border-color, #444);
                             background: ${cat.id === 'all' ? 'var(--button-positive, #1a73e8)' : 'var(--button-secondary, #333)'}; 
                             color: ${cat.id === 'all' ? 'white' : 'var(--text-secondary, #ccc)'}; 
                             font-size: 13px; transition: all 0.2s; cursor: pointer;">
                ${this.root.messages.getMessage(cat.name)}
              </button>
            `).join('')}
          </div>
        </div>
        
        <div id="font-list" style="flex: 1; overflow-y: auto; padding: 10px 15px 15px 15px;">
          <div class="loading" style="padding: 20px; text-align: center;">
            ${this.root.messages.getMessage('stam:font-picker-loading')}
          </div>
        </div>
        
        <div style="padding: 12px 15px; border-top: 1px solid var(--border-color, #444); background: var(--dialog-footer-bg, #1e1e1e);">
          <div style="display: flex; justify-content: flex-end; gap: 10px;">
            <button id="font-picker-cancel" class="btn btn-secondary" style="min-width: 80px;">
              ${this.root.messages.getMessage('stam:theme-cancel')}
            </button>
            <button id="font-picker-use" class="btn btn-primary" disabled style="min-width: 80px;">
              ${this.root.messages.getMessage('stam:theme-use')}
            </button>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(dialog);
    
    // Helper function to load a font dynamically
    const loadFont = (fontName) => {
      // Skip if it's a system font family
      if (['sans-serif', 'serif', 'monospace', 'cursive', 'fantasy', 'system-ui'].includes(fontName.toLowerCase())) {
        return Promise.resolve();
      }
      
      // Create a stylesheet for the font if it doesn't exist
      const styleId = `font-${fontName.replace(/\s+/g, '-').toLowerCase()}`;
      if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
          @font-face {
            font-family: '${fontName}';
            src: local('${fontName}'), 
                 local('${fontName.replace(/ /g, '')}'),
                 local('${fontName.replace(/ /g, '-')}');
            font-display: swap;
          }
        `;
        document.head.appendChild(style);
      }
      
      // Create a test element to force font loading
      const testString = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      const testElement = document.createElement('span');
      testElement.style.fontFamily = `'${fontName}', sans-serif`;
      testElement.style.position = 'absolute';
      testElement.style.visibility = 'hidden';
      testElement.style.fontSize = '16px';
      testElement.textContent = testString;
      document.body.appendChild(testElement);
      
      return new Promise((resolve) => {
        // Small delay to ensure the font has a chance to load
        setTimeout(() => {
          document.body.removeChild(testElement);
          resolve();
        }, 100);
      });
    };
    
    // Load available fonts
    const loadFonts = async (category = 'all', search = '') => {
      const fontList = document.getElementById('font-list');
      fontList.innerHTML = `
        <div class="loading" style="padding: 20px; text-align: center;">
          ${this.root.messages.getMessage('stam:font-picker-loading')}
        </div>
      `;
      
      try {
        let fonts = [];
        
        // Get fonts for the selected category
        if (category === 'all') {
          fonts = [...webSafeFonts];
        } else if (fontCategories[category]) {
          fonts = fontCategories[category];
        }
        
        // Filter by search
        if (search) {
          const searchLower = search.toLowerCase();
          fonts = fonts.filter(font => font.toLowerCase().includes(searchLower));
        }
        
        // Sort fonts alphabetically
        fonts.sort((a, b) => a.localeCompare(b));
        
        // Show recently used first
        const recentSection = recentFonts.length > 0 ? `
          <div class="recent-fonts">
            <h4>${this.root.messages.getMessage('stam:font-picker-recent')}</h4>
            ${recentFonts.map(font => {
              const fontCategory = getFontCategory(font);
              const previewText = this.root.messages.getMessage('stam:font-picker-preview-text');
              const isSelected = currentFont === font;
              
              return `
                <div class="font-item" data-font="${font}" 
                     style="padding: 10px; margin: 8px 0; border-radius: 4px;
                            border: 1px solid var(--border-color, #444); 
                            cursor: pointer;
                            ${isSelected ? 'background: var(--button-positive, #1a73e8); color: white;' : ''}">
                  <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                      <div style="font-family: '${font}', ${fontCategory}; font-size: 16px; font-weight: 500;">
                        ${font}
                      </div>
                      <div class="font-preview-text" 
                           style="font-family: '${font}', ${fontCategory}; font-size: 12px; opacity: 0.8;">
                        ${previewText}
                      </div>
                    </div>
                    <div style="font-size: 11px; opacity: 0.7; text-transform: capitalize;">
                      ${fontCategory}
                    </div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
          <div style="margin: 15px 0 10px 0; border-top: 1px solid var(--border-color, #444);"></div>
        ` : '';
        
        // Render font list with previews
        fontList.innerHTML = recentSection + fonts.map(font => {
          const isSelected = currentFont === font;
          const fontCategory = fontCategories['sans-serif'].includes(font) ? 'sans-serif' :
                             fontCategories['serif'].includes(font) ? 'serif' :
                             fontCategories['monospace'].includes(font) ? 'monospace' :
                             fontCategories['display'].includes(font) ? 'display' :
                             fontCategories['handwriting'].includes(font) ? 'handwriting' : 'sans-serif';
          
          // Preview text - always use the localized version
          const previewText = this.root.messages.getMessage('stam:font-picker-preview-text');
          
          return `
            <div class="font-item" data-font="${font}" 
                 style="padding: 10px; margin: 8px 0; border-radius: 4px;
                        border: 1px solid var(--border-color, #444); 
                        cursor: pointer;
                        ${isSelected ? 'background: var(--button-positive, #1a73e8); color: white;' : ''}">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                  <div style="font-family: '${font}', ${fontCategory}; font-size: 16px; font-weight: 500;">
                    ${font}
                  </div>
                  <div class="font-preview-text" 
                       style="font-family: '${font}', ${fontCategory}; font-size: 12px; opacity: 0.8;">
                    ${previewText}
                  </div>
                </div>
                <div style="font-size: 11px; opacity: 0.7; text-transform: capitalize;">
                  ${fontCategory}
                </div>
              </div>
            </div>
          `;
        }).join('');
        
        // Add event listeners to font items
        fontList.querySelectorAll('.font-item').forEach(item => {
          item.addEventListener('click', () => {
            const font = item.getAttribute('data-font');
            selectFont(font);
          });
        });
        
      } catch (error) {
        console.error('Error loading fonts:', error);
        fontList.innerHTML = `
          <div style="padding: 20px; text-align: center; color: var(--text-error, #dc3545);">
            Failed to load fonts. Please check your connection.
          </div>
        `;
      }
    };
    
    // Handle font selection
    let selectedFont = currentFont;
    const selectFont = async (font) => {
      try {
        // Show loading state on the selected font item
        const fontItems = document.querySelectorAll('.font-item');
        fontItems.forEach(item => {
          const itemFont = item.getAttribute('data-font');
          if (itemFont === font) {
            const previewText = item.querySelector('.font-preview-text');
            if (previewText) {
              const originalContent = previewText.innerHTML;
              previewText.innerHTML = `
                <div style="display: inline-flex; align-items: center; gap: 6px;">
                  <span class="spinner" style="width: 12px; height: 12px; border-width: 2px;"></span>
                  <span>${this.root.messages.getMessage('stam:font-picker-loading')}</span>
                </div>
              `;
              
              // Load the font
              loadFont(font).then(() => {
                // Update the preview with the loaded font
                const fontCategory = getFontCategory(font);
                previewText.innerHTML = originalContent;
                previewText.style.fontFamily = `'${font}', ${fontCategory}`;
                
                // Update the selected state
                item.style.background = 'var(--button-positive, #1a73e8)';
                item.style.color = 'white';
                
                // Reset other items
                fontItems.forEach(otherItem => {
                  if (otherItem !== item) {
                    otherItem.style.background = '';
                    otherItem.style.color = '';
                  }
                });
                
                // Enable use button
                selectedFont = font;
                document.getElementById('font-picker-use').disabled = false;
              }).catch(error => {
                console.error('Error loading font:', error);
                previewText.innerHTML = originalContent;
                previewText.style.color = 'var(--text-error, #dc3545)';
                previewText.textContent = this.root.messages.getMessage('stam:font-picker-load-error');
              });
            }
          } else {
            // Reset other items
            item.style.background = '';
            item.style.color = '';
          }
        });
        
      } catch (error) {
        console.error('Error in selectFont:', error);
      }
    };
    
    // Helper to get font category
    const getFontCategory = (font) => {
      if (fontCategories['sans-serif'].includes(font)) return 'sans-serif';
      if (fontCategories['serif'].includes(font)) return 'serif';
      if (fontCategories['monospace'].includes(font)) return 'monospace';
      if (fontCategories['display'].includes(font)) return 'sans-serif';
      if (fontCategories['handwriting'].includes(font)) return 'cursive';
      return 'sans-serif';
    };
    
    // Close dialog
    const closeDialog = (result) => {
      if (document.body.contains(dialog)) {
        document.body.removeChild(dialog);
      }
      return result;
    };
    
    // Event listeners
    document.getElementById('font-search').addEventListener('input', (e) => {
      const search = e.target.value.trim();
      loadFonts(document.querySelector('.font-category.active')?.dataset.category || 'all', search);
    });
    
    // Category buttons
    document.querySelectorAll('.font-category').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.font-category').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        loadFonts(btn.dataset.category, document.getElementById('font-search').value.trim());
      });
    });
    
    // Close buttons
    dialog.querySelector('.close-button').addEventListener('click', () => closeDialog(null));
    document.getElementById('font-picker-cancel').addEventListener('click', () => closeDialog(null));
    document.getElementById('font-picker-use').addEventListener('click', () => {
      // Save to recent fonts
      if (selectedFont) {
        const recentFonts = JSON.parse(localStorage.getItem('recentFonts') || '[]');
        const updated = [selectedFont, ...recentFonts.filter(f => f !== selectedFont)].slice(0, 5);
        localStorage.setItem('recentFonts', JSON.stringify(updated));
      }
      closeDialog(selectedFont);
    });
    
    // Initial load
    loadFonts('all');
    if (currentFont) {
      selectFont(currentFont);
    }
    
    // Return a promise that resolves when a font is selected or dialog is closed
    return new Promise((resolve) => {
      const checkClosed = setInterval(() => {
        if (!document.body.contains(dialog)) {
          clearInterval(checkClosed);
          resolve(selectedFont);
        }
      }, 100);
    });
  }
  
  async showPreferencesDialog(currentPrefs = {}) {
    // Request available languages from the root component
    const availableLangs = await this.sendRequestTo(this.root.messages.componentId, 'GET_AVAILABLE_LANGUAGES');
    
    // Get current theme
    const currentTheme = this.getCurrentTheme();
    
    // Create dialog container
    const dialog = document.createElement('div');
    dialog.className = 'dialog-overlay';
    
    // Create dialog content
    dialog.innerHTML = `
      <div class="dialog-content">
        <div class="dialog-header">
          <h3>${this.root.messages.getMessage('stam:preferences')}</h3>
          <button class="close-button" aria-label="${this.root.messages.getMessage('stam:theme-close')}" tabindex="0">&times;</button>
        </div>
        <div class="dialog-body">
          <!-- Language Selection -->
          <div class="form-group">
            <label for="language-select">${this.root.messages.getMessage('stam:preferences-language')}</label>
            <select id="language-select" class="form-control">
              ${availableLangs.map(lang => 
                `<option value="${lang.language}" ${currentPrefs?.language === lang.language ? 'selected' : ''}>
                  ${lang.country} (${lang.language})
                </option>`
              ).join('')}
            </select>
          </div>
          
          <!-- Theme Selection -->
          <div class="form-group">
            <label>${this.root.messages.getMessage('stam:theme-current')}</label>
            <div style="display: flex; gap: 10px; margin-top: 5px;">
              <div id="current-theme-name" style="flex: 1; padding: 10px; border: 1px solid #444; border-radius: 4px; display: flex; align-items: center;">
                ${currentTheme.name}
              </div>
              <button id="choose-theme" class="btn btn-secondary" type="button">
                ${this.root.messages.getMessage('stam:theme-choose')}
              </button>
              <button id="create-theme" class="btn btn-secondary" type="button">
                ${this.root.messages.getMessage('stam:theme-create')}
              </button>
            </div>
          </div>
        </div>
        <div class="dialog-footer">
          <button class="btn btn-secondary" id="pref-cancel" type="button">
            ${this.root.messages.getMessage('stam:preferences-cancel')}
          </button>
          <button class="btn btn-primary" id="pref-save" type="button">
            ${this.root.messages.getMessage('stam:preferences-save')}
          </button>
        </div>
      </div>`;
    
    // Add to DOM
    document.body.appendChild(dialog);
    
    // Focus the first interactive element
    const closeButton = dialog.querySelector('.close-button');
    closeButton.focus();
    
    // Set up event listeners
    const closeDialog = (result) => {
      if (document.body.contains(dialog)) {
        document.body.removeChild(dialog);
      }
      return result;
    };
    
    // Handle theme selection
    dialog.querySelector('#choose-theme').addEventListener('click', async () => {
      const selectedThemeId = await this.showThemeSelectionDialog();
      if (selectedThemeId) {
        this.currentThemeId = selectedThemeId;
        const theme = this.getCurrentTheme();
        dialog.querySelector('#current-theme-name').textContent = theme.name;
      }
    });
    
    // Handle theme creation
    dialog.querySelector('#create-theme').addEventListener('click', async () => {
      // Use current theme as the source for the new theme
      const currentTheme = this.getCurrentTheme();
      const newTheme = await this.showThemeEditorDialog(JSON.parse(JSON.stringify(currentTheme)));
      if (newTheme) {
        // Generate a unique ID for the new theme
        const newThemeId = `custom-${Date.now()}`;
        newTheme.id = newThemeId;
        this.themes[newThemeId] = newTheme;
        this.currentThemeId = newThemeId;
        dialog.querySelector('#current-theme-name').textContent = newTheme.name;
      }
    });
    
    // Handle dialog close
    closeButton.addEventListener('click', () => closeDialog(null));
    dialog.querySelector('#pref-cancel').addEventListener('click', () => closeDialog(null));
    
    // Handle save
    dialog.querySelector('#pref-save').addEventListener('click', () => {
      const language = dialog.querySelector('#language-select').value;
      
      // Apply the selected theme
      this.applyTheme();
      
      closeDialog({
        language,
        theme: this.currentThemeId
      });
    });
    
    // Close on Escape key
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeDialog(null);
      }
    };
    
    dialog.addEventListener('keydown', handleKeyDown);
    
    // Clean up
    dialog._cleanup = () => {
      dialog.removeEventListener('keydown', handleKeyDown);
    };
    
    return new Promise((resolve) => {
      dialog._resolve = resolve;
      
      // Update close handlers to resolve the promise
      const handleClose = (result) => {
        if (dialog._resolve) {
          const finalResult = closeDialog(result);
          dialog._resolve(finalResult);
          dialog._resolve = null;
        }
      };
      
      // Set up final close handlers
      closeButton.onclick = () => handleClose(null);
      dialog.querySelector('#pref-cancel').onclick = () => handleClose(null);
      dialog.querySelector('#pref-save').onclick = () => {
        const language = dialog.querySelector('#language-select').value;
        handleClose({
          language,
          theme: this.currentThemeId
        });
      };
    }).finally(() => {
      if (dialog._cleanup) {
        dialog._cleanup();
      }
      if (dialog._resolve) {
        delete dialog._resolve;
      }
    });
  }
  
  /**
   * Handle keyboard navigation for dialogs
   * @param {HTMLElement} dialog - The dialog element to set up keyboard navigation for
   */
  _setupDialogKeyboardNavigation(dialog) {
    const focusableSelector = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    const focusableElements = dialog.querySelectorAll(focusableSelector);
    const firstFocusableElement = focusableElements[0];
    const lastFocusableElement = focusableElements[focusableElements.length - 1];
    
    const handleTabKey = (e) => {
      if (e.key === 'Tab') {
        const currentFocus = document.activeElement;
        
        // If there's only one focusable element, prevent tabbing out of the dialog
        if (focusableElements.length === 1) {
          e.preventDefault();
          firstFocusableElement.focus();
          return;
        }
        
        // If shift + tab on first element, move to last element
        if (e.shiftKey && currentFocus === firstFocusableElement) {
          e.preventDefault();
          lastFocusableElement.focus();
        } 
        // If tab on last element, move to first element
        else if (!e.shiftKey && currentFocus === lastFocusableElement) {
          e.preventDefault();
          firstFocusableElement.focus();
        }
      }
    };
    
    // Add event listener for tab key
    dialog.addEventListener('keydown', handleTabKey);
    
    // Clean up function to remove event listener
    return () => {
      dialog.removeEventListener('keydown', handleTabKey);
    };
  }
}
export default PreferenceManager;
