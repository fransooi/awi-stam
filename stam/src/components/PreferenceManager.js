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
import { Dialog } from '../utils/Dialog.js';
import { MESSAGESCOMMANDS } from './MessageManager.js';

// Default theme definition
const DEFAULT_THEME = {
  name: 'Dark',
  description: 'The default STAM dark theme...',
  id: 'default-dark',
  colors: {
    'background': '#1e1e1e',                  // UI Background color
    'dialog-background': '#2d2d2d',           // Dialog Background color
    'container-background': '#252526',        // Container Background color
    'borders': '#808080',                     // Border color
    'list-background': '#3a3a3a',             // List Background color
    'list-item-background': '#2a2a2a',        // List Item Background color
    'list-item-background-hover': '#252526',  // List Item Background color
    'menu-background': '#252526',             // Menu Background color
    'menu-background-hover': '#353535',       // Menu Hover Background color
    'menu-text': '#e0e0e0',                   // Menu Text color
    'menu-text-hover': '#ffffff',             // Menu Hover Text color
    'popup-border': '#444444',                // Popup Border color
    'button-positive': '#1a73e8',             // Button Positive color
    'button-negative': '#dc3545',             // Button Negative color
    'button-neutral': '#6c757d',              // Button Neutral color
    'button-positive-hover': '#2a83f8',       // Button Positive color hover
    'button-negative-hover': '#ec4555',       // Button Negative color hover
    'button-neutral-hover': '#7c858d',        // Button Neutral color hover
    'text-primary': '#e0e0e0',                // Text Primary color
    'text-secondary': '#b0b0b0',              // Text Secondary color
    'text-positive': '#ffffff',               // Text Positive color
    'text-negative': '#ffffff',               // Text Negative color
    'text-neutral': '#ffffff',                // Text Neutral color
    'side-title-background': '#333333',       // Side Title Background color
    'side-title-background-hover': '#3d3d3d', // Side Title Background Hover color
    'side-title-text': '#ffffff',             // Side Title Text color
    'side-title-button-hover': '#ffff00',     // Side Title Button Hover color
    'side-border': '#444444',                 // Side Border color
    'side-resize': '#555555',                 // Side Resize color
    'slider-background': '#444',              // Slider Background color
    'slider-track': '#666',                   // Slider Track color
    'slider-thumb': '#888',                   // Slider Thumb color
    'icon-button-background': '#2d2d2d',        // Icon Button Background color
    'icon-button-background-hover': '#4d4d4d',  // Icon Button Background Hover color
  },
  fonts: {
    'menu': 'Inter, system-ui, sans-serif', // Menu Font
    'side-window': 'Inter, system-ui, sans-serif', // Side Window Font
    'status-bar': 'Consolas, monospace', // Status Bar Font
    'editor': 'Inter, system-ui, sans-serif', // Editor Font
  },
  fontSizes: {
    'menu': '12px', // Menu Font Size
    'side-window': '12px', // Side Window Font Size
    'status-bar': '12px', // Status Bar Font Size
    'editor': '12px' // Editor Font Size
  }
};

// Available themes
const THEMES = {
  'default-dark': { ...DEFAULT_THEME },
  'default-light': {
    name: 'Light',
    description: 'The default STAM light theme...',
    id: 'default-light',
    colors: {
      'background': '#ffffff',                  // UI Background color
      'dialog-background': '#f3f3f3',           // Dialog Background color
      'container-background': '#e3e3e3',        // Container Background color
      'borders': '#808080',                        // Border color
      'list-background': '#e3e3e3',             // List Background color
      'list-item-background': '#d3d3d3',        // List Item Background color
      'list-item-background-hover': '#a3a3a3',  // List Item Background color
      'menu-background': '#f3f3f3',             // Menu Background color
      'menu-background-hover': '#a3a3a3',       // Menu Hover Background color
      'menu-text': '#000000',                   // Menu Text color
      'menu-text-hover': '#000000',             // Menu Hover Text color
      'popup-border': '#c3c3c3',                // Popup Border color
      'button-positive': '#05aff2',             // Button Positive color
      'button-negative': '#d9580d',             // Button Negative color
      'button-neutral': '#a3a3a3',              // Button Neutral color
      'button-positive-hover': '#04bfe2',       // Button Positive color hover
      'button-negative-hover': '#c94800',       // Button Negative color hover
      'button-neutral-hover': '#939393',        // Button Neutral color hover
      'text-primary': '#000000',                // Text Primary color
      'text-secondary': '#202020',              // Text Secondary color
      'text-positive': '#000000',               // Text Positive color
      'text-negative': '#000000',               // Text Negative color
      'text-neutral': '#000000',                // Text Neutral color
      'side-title-background': '#e4e6f1',       // Side Title Background color
      'side-title-background-hover': '#d4d6f1', // Side Title Background Hover color
      'side-title-text': '#000000',             // Side Title Text color
      'side-title-button-hover': '#f0cc90',     // Side Title Button Hover color
      'side-border': '#c3c3c3',                 // Side Border color
      'side-resize': '#b3b3b3',                 // Side Resize color
      'slider-background': '#c3c3c3',              // Slider Background color
      'slider-track': '#b3b3b3',                   // Slider Track color
      'slider-thumb': '#a3a3a3',                   // Slider Thumb color
      'icon-button-background': '#e3e3e3',        // Icon Button Background color
      'icon-button-background-hover': '#d3d3d3',  // Icon Button Background Hover color
    },
    fonts: {
      'menu': 'Inter, system-ui, sans-serif', // Menu Font
      'side-window': 'Inter, system-ui, sans-serif', // Side Window Font
      'status-bar': 'Consolas, monospace', // Status Bar Font
      'editor': 'Inter, system-ui, sans-serif', // Editor Font
    },
    fontSizes: {
      'menu': '12px', // Menu Font Size
      'side-window': '12px', // Side Window Font Size
      'status-bar': '12px', // Status Bar Font Size
      'editor': '12px' // Editor Font Size
    }
  },
};

class PreferenceManager extends BaseComponent {
  /**
   * Constructor
   * @param {string} parentId - ID of the parent component
   */
  constructor(parentId = null, containerId) {
    super('PreferenceManager', parentId, containerId);      
    this.messageMap[MENUCOMMANDS.PREFERENCES] = this.handleShowPreferences;
    this.defaultThemeId = 'default-dark';
    this.themes = { ...THEMES };
    this.currentPrefs = {
      language: 'en',
      themeId: this.defaultThemeId
    };
  }

  async init(options = {}) {
    if (await super.init(options))
      return;
    
    this.loadPreferences();
    this.applyTheme();
    return true;
  }
  async setLanguage(language) {
    if (language && language != this.currentPrefs.language)
      this.currentPrefs.language = language;
    await this.sendRequestTo('class:MessageManager', MESSAGESCOMMANDS.SET_LANGUAGE, { language: this.currentPrefs.language });
    return true;
  }
  async destroy() {
    await super.destroy();
    return true;
  }
  
  /**
   * Load preferences
   */
  loadPreferences() {
    // Get all themes from localStorage or use default themes
    try {
      const savedPrefs = JSON.parse(localStorage.getItem('stam-preferences'));
      if (savedPrefs){
        for ( var t in savedPrefs.themes)
          this.themes[t] = savedPrefs.themes[t];
        delete savedPrefs.themes;
        this.currentPrefs = savedPrefs;
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    }
  }

  savePreferences() {
    // Save preference
    var toSave = this.root.utilities.copyObject(this.currentPrefs);
    toSave.themes = {};
    for (var t in this.themes) 
    {
      if (this.themes[t].id.indexOf('default') < 0)
        toSave.themes[this.themes[t].id] = this.themes[t];
    }
    localStorage.setItem('stam-preferences', JSON.stringify(toSave));
    return true;
  }
        
  /**
   * Get the current theme
   * @returns {Object} Current theme object
   */
  getCurrentTheme() {
    return this.getTheme(this.currentPrefs.themeId);
  }
  getTheme(themeId) {
    for (var t in this.themes){
      if (this.themes[t].id === themeId)
        return this.themes[t];
    }
    console.log('Theme not found:', themeId);
    return { ...DEFAULT_THEME };
  }
  applyTheme(refresh = false) {
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
    if (refresh)
    {
      document.documentElement.getBoundingClientRect();    
    }
  }

  async handleShowPreferences(currentPrefs = {}) {
    var response = await this.showPreferencesDialog(currentPrefs);    
    if (response)
    {
      if (response.theme)
        this.currentPrefs.themeId = response.themeId;
      this.applyTheme(true);
      this.savePreferences();
      this.root.alert.showSuccess('stam:preferences-saved');
      this.root.messages.sendRequestTo(this.root.messages.componentId, MESSAGESCOMMANDS.SET_LANGUAGE, { language: response.language });
    }
    return true;
  }


  async showPreferencesDialog(currentPrefs = {}) {
    // Request available languages from the root component
    const availableLangs = await this.sendRequestTo(this.root.messages.componentId, 'GET_AVAILABLE_LANGUAGES');
    
    // Get current theme
    const currentThemeId = this.currentPrefs.themeId;
    const currentTheme = this.getTheme(currentThemeId);
    let selectedThemeId = currentThemeId;
    let dialogClosed = false;
    let dialogAnswer = null;
    
    // Create dialog content container
    const content = document.createElement('div');
    content.className = 'preferences-dialog-content';
    
    // Create language selection
    const langGroup = document.createElement('div');
    langGroup.className = 'form-group';
    const currentLanguage = (currentPrefs?.language || this.currentPrefs.language);
    langGroup.innerHTML = `
      <label for="language-select">${this.root.messages.getMessage('stam:preferences-language')}</label>
      <select id="language-select" class="form-control">
        ${availableLangs.map(lang => 
          `<option value="${lang.language}" ${currentLanguage === lang.language ? 'selected' : ''}>
            ${lang.country} (${lang.language})
          </option>`
        ).join('')}
      </select>
    `;
    content.appendChild(langGroup);
    
    // Create theme selection
    const themeGroup = document.createElement('div');
    themeGroup.className = 'form-group';
    themeGroup.innerHTML = `
      <label>${this.root.messages.getMessage('stam:theme-current')}</label>
      <div style="display: flex; gap: 10px; margin-top: 5px;">
        <div id="current-theme-name" style="flex: 1; padding: 10px; border: 1px solid var(--borders, #444); border-radius: 4px; display: flex; align-items: center;">
          ${currentTheme.name}
        </div>
        <button id="choose-theme" class="btn btn-neutral" type="button">
          ${this.root.messages.getMessage('stam:theme-choose')}
        </button>
        <button id="create-theme" class="btn btn-neutral" type="button">
          ${this.root.messages.getMessage('stam:theme-create')}
        </button>
      </div>
    `;
    content.appendChild(themeGroup);
    
    // Create dialog buttons
    const buttons = [
      {
        label: this.root.messages.getMessage('stam:preferences-cancel'),
        className: 'btn-neutral',
        onClick: function(){
          dialog.close();
          dialogClosed = true;
          dialogAnswer = null;
        }
      },
      {
        label: this.root.messages.getMessage('stam:preferences-save'),
        className: 'btn-positive',
        onClick: () => {
          const language = content.querySelector('#language-select').value;
          dialog.close();
          dialogClosed = true;
          dialogAnswer = {
            language,
            themeId: selectedThemeId,
            theme: this.getTheme(selectedThemeId)
          };
        }
      }
    ];
    
    // Create and show the dialog
    const dialog = new Dialog({
      title: this.root.messages.getMessage('stam:preferences'),
      content: content,
      buttons: buttons,
      theme: this.getCurrentTheme()
    });
    
    // Get references to interactive elements
    const chooseThemeBtn = content.querySelector('#choose-theme');
    const createThemeBtn = content.querySelector('#create-theme');
    
    // Handle theme selection
    chooseThemeBtn.addEventListener('click', async () => {
      const selectedTheme = await this.showThemeSelectionDialog();
      if (selectedTheme) {
        selectedThemeId = selectedTheme.id;
        content.querySelector('#current-theme-name').textContent = selectedTheme.name;
      }
    });
    
    // Handle theme creation
    createThemeBtn.addEventListener('click', async () => {
      const currentTheme = this.getCurrentTheme();
      const newTheme = await this.showThemeEditorDialog(currentTheme);
      if (newTheme) {
        this.themes[newTheme.id] = newTheme;
        selectedThemeId = newTheme.id;
        content.querySelector('#current-theme-name').textContent = newTheme.name;
      }
    });
    
    // Show the dialog and return the promise
    dialog.open();

    return new Promise(async (resolve) => {
      while(true)
      {
        await this.root.utilities.sleep(10);
        if (dialogClosed)
          break;
      }
      resolve(dialogAnswer);
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

  /**
   * Show theme selection dialog
   * @returns {Promise} Resolves with the selected theme ID or null if cancelled
   */
  async showThemeSelectionDialog() {

    // Create dialog content
    const content = document.createElement('div');
    content.className = 'theme-selection-content';
    content.style.maxHeight = '60vh';
    content.style.overflowY = 'auto';
    content.style.padding = '10px 0';
    
    // Create theme list
    const themeList = document.createElement('div');
    themeList.className = 'theme-list';
    themeList.style.display = 'grid';
    themeList.style.gridTemplateColumns = 'repeat(auto-fill, minmax(200px, 1fr))';
    themeList.style.gap = '15px';
    
    // Create theme items
    Object.entries(this.themes).forEach(([themeId, theme]) => {
      const themeItem = document.createElement('div');
      themeItem.className = 'theme-item';
      themeItem.dataset.themeId = themeId;
      themeItem.style.cursor = 'pointer';
      themeItem.style.transition = 'transform 0.2s';
      
      themeItem.innerHTML = `
        <div class="theme-preview" 
             style="background: ${theme.colors['background']};
                    color: ${theme.colors['text-primary']};
                    padding: 15px;
                    border-radius: 6px;
                    border: 2px solid ${theme.id === this.currentPrefs.themeId ? theme.colors['button-positive'] : 'transparent'};
                    transition: border-color 0.2s;
                    height: 100%;">
          <div style="font-weight: bold; margin-bottom: 12px; font-size: 1.1em;">${theme.name}</div>
          <div style="display: flex; gap: 6px; margin-bottom: 12px;">
            <span style="background: ${theme.colors['button-positive']}; 
                              color: ${theme.colors['text-positive']}; 
                              padding: 4px 8px; 
                              border-radius: 4px; 
                              font-size: 12px;">
              ${this.root.messages.getMessage('stam:theme-preview-button')}
            </span>
          </div>
          <div style="background: ${theme.colors['list-background']}; 
                              color: ${theme.colors['text-primary']}; 
                              padding: 6px 10px; 
                              border-radius: 4px; 
                              font-size: 13px;">
            ${this.root.messages.getMessage('stam:theme-preview-list')}
          </div>
        </div>
      `;
      
      themeList.appendChild(themeItem);
    });
    
    content.appendChild(themeList);
    
    let selectedThemeId = null;
    let selectedTheme = null;
    let dialogClosed = false;
    
    function closeDialog() {
      dialog.close();
      dialogClosed = true;
    }

    // Create dialog buttons
    const buttons = [
      {
        label: this.root.messages.getMessage('stam:theme-cancel'),
        className: 'btn-neutral',
        onClick: () => closeDialog()
      },
      {
        label: this.root.messages.getMessage('stam:theme-use'),
        className: 'btn-positive',
        id: 'theme-use',
        disabled: true,
        onClick: () => closeDialog()
      }
    ];
    
    // Create and show the dialog
    const dialog = new Dialog({
      title: this.root.messages.getMessage('stam:theme-choose'),
      content: content,
      buttons: buttons,
      theme: this.getCurrentTheme(),
      style: { maxWidth: '800px' }
    });

    // Show the dialog
    dialog.open();
    
    // Handle theme selection
    const themeItemsElements = content.querySelectorAll('.theme-item');
    themeItemsElements.forEach(item => {
      item.addEventListener('click', () => {
        // Remove selection from all items
        themeItemsElements.forEach(i => {
          i.querySelector('.theme-preview').style.borderColor = 'transparent';
          i.style.transform = 'none';
        });
        
        // Select clicked item
        selectedThemeId = item.dataset.themeId;
        selectedTheme = this.getTheme(selectedThemeId);
        item.querySelector('.theme-preview').style.borderColor = 
          selectedTheme?.colors.buttonPositive || '#1a73e8';
        item.style.transform = 'translateY(-3px)';
        
        // Enable the Use button
        const useButton = dialog.dialog.querySelector('#theme-use');
        if (useButton) useButton.disabled = false;
      });
      
      // Add hover effect
      item.addEventListener('mouseenter', () => {
        if (!item.classList.contains('selected')) {
          item.style.transform = 'translateY(-3px)';
        }
      });
      
      item.addEventListener('mouseleave', () => {
        if (!item.classList.contains('selected')) {
          item.style.transform = 'none';
        }
      });
    }); 
    
    return new Promise(async (resolve) => {
      while(true)
      {
        await this.root.utilities.sleep(10);
        if (dialogClosed)
          break;
      }
      resolve(selectedTheme);
    });
  }
  
  /**
   * Show theme editor dialog
   * @param {Object} themeToEdit - Theme object to edit (or null for new theme)
   * @returns {Promise} Resolves with the saved theme or null if cancelled
   */
  async showThemeEditorDialog(themeToEdit = null) {
    // Always create a copy of the current theme
    const currentTheme = themeToEdit || this.getCurrentTheme();
    const theme = JSON.parse(JSON.stringify(currentTheme));
    
    // Reset ID and update name for the new theme
    theme.id = this.root.utilities.getUniqueIdentifier(this.themes, 'theme');
    theme.name = this.root.messages.getMessage('stam:theme-copy-of') + ' ' + 
                (currentTheme.name || this.root.messages.getMessage('stam:theme'));

    // Create dialog content
    const content = document.createElement('div');
    content.className = 'theme-editor-content';
    content.style.maxHeight = '70vh';
    content.style.overflowY = 'auto';
    content.style.padding = '10px 0';
    
    // Create form elements
    const formGroup = document.createElement('div');
    formGroup.className = 'form-group';
    formGroup.style.marginBottom = '15px';
    
    const nameLabel = document.createElement('label');
    nameLabel.htmlFor = 'theme-name';
    nameLabel.textContent = this.root.messages.getMessage('stam:theme-name');
    nameLabel.style.display = 'block';
    nameLabel.style.marginBottom = '5px';
    nameLabel.style.color = 'var(--text-primary, #e0e0e0)';
    
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.id = 'theme-name';
    nameInput.className = 'form-control';
    nameInput.value = theme.name;
    nameInput.style.width = '100%';
    nameInput.style.padding = '8px';
    nameInput.style.borderRadius = '4px';
    nameInput.style.border = '1px solid var(--borders, #444)';
    nameInput.style.backgroundColor = 'var(--container-background, #252526)';
    nameInput.style.color = 'var(--text-primary, #e0e0e0)';
    
    formGroup.appendChild(nameLabel);
    formGroup.appendChild(nameInput);
    content.appendChild(formGroup);
    
    // Create tabs container
    const tabsContainer = document.createElement('div');
    tabsContainer.className = 'tabs';
    tabsContainer.style.display = 'flex';
    tabsContainer.style.margin = '15px 0';
    tabsContainer.style.borderBottom = '1px solid var(--borders, #444)';
    
    // Create tab buttons
    const iTabs = [
      { id: 'colors', label: this.root.messages.getMessage('stam:theme-colors') },
      { id: 'fonts', label: this.root.messages.getMessage('stam:theme-fonts') },
      { id: 'preview', label: this.root.messages.getMessage('stam:theme-preview') }
    ];
    
    iTabs.forEach((tab, index) => {
      const tabButton = document.createElement('button');
      tabButton.className = 'tab-button' + (index === 0 ? ' active' : '');
      tabButton.dataset.tab = tab.id;
      tabButton.textContent = tab.label;
      tabButton.style.padding = '8px 16px';
      tabButton.style.background = 'none';
      tabButton.style.border = 'none';
      tabButton.style.borderBottom = `2px solid ${index === 0 ? 'var(--button-positive, #1a73e8)' : 'transparent'}`;
      tabButton.style.color = index === 0 ? 'var(--text-primary, #e0e0e0)' : 'var(--text-secondary, #b0b0b0)';
      tabButton.style.cursor = 'pointer';
      tabButton.style.fontSize = '14px';
      tabButton.style.marginRight = '5px';
      tabButton.style.transition = 'all 0.2s';
      
      tabButton.addEventListener('mouseover', () => {
        if (!tabButton.classList.contains('active')) {
          tabButton.style.borderBottomColor = 'var(--button-positive, #1a73e8)';
          tabButton.style.opacity = '0.8';
        }
      });
      
      tabButton.addEventListener('mouseout', () => {
        if (!tabButton.classList.contains('active')) {
          tabButton.style.borderBottomColor = 'transparent';
          tabButton.style.opacity = '1';
        }
      });
      
      tabsContainer.appendChild(tabButton);
    });
    
    content.appendChild(tabsContainer);
    
    // Create tab content container
    const tabContent = document.createElement('div');
    tabContent.className = 'tab-content';
    tabContent.style.marginTop = '15px';
    
    // Create colors tab
    const colorsTab = document.createElement('div');
    colorsTab.id = 'colors-tab';
    colorsTab.className = 'tab-pane active';
    
    /*const colorsHeader = document.createElement('h4');
    colorsHeader.textContent = this.root.messages.getMessage('stam:theme-colors');
    colorsHeader.style.marginTop = '0';
    colorsHeader.style.color = 'var(--text-primary, #e0e0e0)';    
    colorsTab.appendChild(colorsHeader);
    */
    // Create color inputs
    let colorGroups = {};
    for ( var c in currentTheme.colors )
      colorGroups['stam:theme-' + c] = c;
    
    Object.entries(colorGroups).forEach(([labelKey, colorKey]) => {
      const formGroup = document.createElement('div');
      formGroup.className = 'form-group';
      formGroup.style.display = 'flex';
      formGroup.style.alignItems = 'center';
      formGroup.style.marginBottom = '10px';
      
      const label = document.createElement('label');
      label.htmlFor = `color-${colorKey}`;
      label.textContent = this.root.messages.getMessage(labelKey);
      label.style.flex = '1';
      label.style.marginRight = '10px';
      label.style.color = 'var(--text-primary, #e0e0e0)';
      
      const colorInput = document.createElement('input');
      colorInput.type = 'color';
      colorInput.id = `color-${colorKey}`;
      colorInput.value = theme.colors[colorKey] || '#000000';
      colorInput.dataset.themeProperty = `colors.${colorKey}`;
      colorInput.className = 'theme-color-input';
      colorInput.style.width = '60px';
      colorInput.style.height = '30px';
      colorInput.style.padding = '0';
      colorInput.style.border = '1px solid var(--borders, #444)';
      colorInput.style.backgroundColor = 'var(--container-background, #252526)';
      colorInput.style.cursor = 'pointer';
      
      formGroup.appendChild(label);
      formGroup.appendChild(colorInput);
      colorsTab.appendChild(formGroup);
    });    
    tabContent.appendChild(colorsTab);
    
    const fontsTab = document.createElement('div');
    fontsTab.id = 'fonts-tab';
    fontsTab.className = 'tab-pane';
        
    var fontList = {};
    for ( var f in theme.fonts )
      fontList[f] = this.root.messages.getMessage('stam:theme-font-' + f);
    fontsTab.innerHTML = `
    ${Object.entries(fontList).map(([key, label]) => {
      const currentFont = theme.fonts[key] || '';
      const currentSize = (theme.fontSizes && theme.fontSizes[key]) || '12px';
      
      return `
      <div class="form-group" style="margin-bottom: 15px;" data-font-field="${key}">
        <label for="font-${key}" style="display: block; margin-bottom: 5px; color: var(--text-primary, #e0e0e0);">
          ${label} <span style="color: var(--text-secondary, #b0b0b0); font-size: 0.9em;">(${currentSize})</span>
        </label>
        <div style="display: flex; gap: 8px;">
          <input type="text" id="font-${key}" class="form-control" data-theme-property="fonts.${key}"
                 value="${currentFont}" style="flex: 1; padding: 8px; border-radius: 4px; border: 1px solid var(--borders, #444);
                        background: var(--container-background, #252526); color: var(--text-primary, #e0e0e0);"
                 readonly>
          <button class="btn btn-secondary choose-font" data-font-field="${key}" 
                  style="white-space: nowrap; padding: 0 12px;">
            ${this.root.messages.getMessage('stam:theme-choose-font')}
          </button>
        </div>
      </div>
    `;}).join('')}
    `;
    
    tabContent.appendChild(fontsTab);
    
    const previewTab = document.createElement('div');
    previewTab.id = 'preview-tab';
    previewTab.className = 'tab-pane';
    previewTab.innerHTML = `
    <div id="theme-preview" style="padding: 20px; border: 1px solid var(--borders, #444); border-radius: 4px; margin-top: 10px;
                              background: var(--background, #1e1e1e); color: var(--text-primary, #e0e0e0);">
      <div style="margin-bottom: 20px;">
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
    `;
    tabContent.appendChild(previewTab);
    content.appendChild(tabContent);
    
    // Create dialog buttons
    const buttons = [
      {
        label: this.root.messages.getMessage('stam:theme-cancel'),
        className: 'btn-neutral',
        onClick: () => dialog.close(null)
      },
      {
        label: this.root.messages.getMessage('stam:theme-save'),
        className: 'btn-positive',
        onClick: () => {
          // Update theme name
          theme.name = nameInput.value.trim() || theme.name;
          
          // Update theme colors
          document.querySelectorAll('.theme-color-input').forEach(input => {
            const propertyPath = input.dataset.themeProperty.split('.');
            const property = propertyPath.pop();
            let obj = theme;
            
            for (const prop of propertyPath) {
              if (!obj[prop]) obj[prop] = {};
              obj = obj[prop];
            }
            
            obj[property] = input.value;
          });
          
          dialog.close(theme);
        }
      }
    ];
    
    // Create and show the dialog
    const dialog = new Dialog({
      title: this.root.messages.getMessage('stam:theme-create'),
      content: content,
      buttons: buttons,
      theme: this.getCurrentTheme(),
      style: { 
        maxWidth: '700px',
        maxHeight: '80vh',
        display: 'flex',
        flexDirection: 'column'
      }
    });

    // Show the dialog
    dialog.open();
    
    // Set up tab switching
    const switchTab = (tabName) => {
      // Update active tab
      const tabButtons = dialog.dialog.querySelectorAll('.tab-button');
      tabButtons.forEach(btn => {
        const isActive = btn.getAttribute('data-tab') === tabName;
        btn.style.borderBottomColor = isActive ? 'var(--button-positive, #1a73e8)' : 'transparent';
        btn.style.color = isActive ? 'var(--text-primary, #e0e0e0)' : 'var(--text-secondary, #b0b0b0)';
      });
      
      // Show corresponding tab content
      dialog.dialog.querySelectorAll('.tab-pane').forEach(pane => {
        pane.style.display = 'none';
      });
      const tabContent = dialog.dialog.querySelector(`#${tabName}-tab`);
      if (tabContent) {
        tabContent.style.display = 'block';
        
        // Force preview update when switching to preview tab
        if (tabName === 'preview') {
          updatePreview();
        }
      }
    };
    
    // Get all tab buttons
    const tabs = dialog.dialog.querySelectorAll('.tab-button');
    
    // Add click handlers to tab buttons
    tabs.forEach(button => {
      button.addEventListener('click', () => {
        const tabName = button.getAttribute('data-tab');
        switchTab(tabName);
      });
    });
    
    // Initialize first tab as active
    if (tabs.length > 0) {
      const firstTab = tabs[0].getAttribute('data-tab');
      switchTab(firstTab);
    }
    
    // Update preview with current theme
    const updatePreview = () => {
      const preview = dialog.dialog.querySelector('#theme-preview');
      if (!preview) return;
      
      // Update preview styles
      let styles = {};
      for ( var c in theme.colors )
        styles['--' + c] = theme.colors[c];
      
      Object.entries(styles).forEach(([key, value]) => {
        preview.style.setProperty(key, value);
      });
    };
    
    // Update theme when inputs change
    const updateThemeFromInputs = () => {
      // Update colors
      dialog.dialog.querySelectorAll('.theme-color-input').forEach(input => {
        const property = input.getAttribute('data-theme-property');
        const [category, key] = property.split('.');
        if (category && key && theme[category]) {
          theme[category][key] = input.value;
        }
      });
      
      // Update fonts
      dialog.dialog.querySelectorAll('input[data-theme-property^="fonts."]').forEach(input => {
        const property = input.getAttribute('data-theme-property');
        const [category, key] = property.split('.');
        if (category && key && theme[category]) {
          theme[category][key] = input.value;
        }
      });
      
      // Update preview if it's visible
      if (dialog.dialog.querySelector('#preview-tab').style.display === 'block') {
        updatePreview();
      }
    };
    
    // Add event listeners for live updates
    dialog.dialog.addEventListener('input', (e) => {
      if (e.target.matches('input[data-theme-property]')) {
        updateThemeFromInputs();
      }
    });
    
    // Add event listeners for font picker buttons
    dialog.dialog.addEventListener('click', async (e) => {
      if (e.target.classList.contains('choose-font')) {
        const fontField = e.target.getAttribute('data-font-field');
        const input = dialog.dialog.querySelector(`#font-${fontField}`);
        if (!input) return;
        
        const currentFont = input.value;
        const result = await this.showFontPicker(currentFont);
        
        if (result) {
          // Update font family
          input.value = result.font;
          theme.fonts[fontField] = result.font;
          
          // Update font size if provided
          if (result.size) {
            if (!theme.fontSizes) theme.fontSizes = {};
            theme.fontSizes[fontField] = result.size;
            
            // Update the displayed size in the label
            const label = input.closest('.form-group').querySelector('label');
            const sizeSpan = label.querySelector('span');
            if (sizeSpan) {
              sizeSpan.textContent = `(${result.size})`;
            }
          }
          
          updatePreview();
        }
      }
    });
    
    // Also update when tab changes
    dialog.dialog.addEventListener('click', (e) => {
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
    dialog.dialog.querySelector('input').focus();
    
    return new Promise((resolve) => {
      const closeDialog = (result) => {
        if (document.body.contains(dialog.overlay)) {
          document.body.removeChild(dialog.overlay);
        }
        resolve(result);
      };
      
      // Set up event listeners
      dialog.dialog.querySelector('.dialog-close').addEventListener('click', () => closeDialog(null));
      dialog.buttons[0].element.addEventListener('click', () => closeDialog(null));
      
      dialog.buttons[1].element.addEventListener('click', () => {
        try {
          // Collect theme data
          const themeName = dialog.dialog.querySelector('#theme-name').value.trim();
          if (!themeName) {
            // Show error or highlight the field
            dialog.dialog.querySelector('#theme-name').style.borderColor = 'red';
            return;
          }
          
          // Always create a new theme with a unique ID
          const newTheme = { ...theme };
          newTheme.name = themeName;
          newTheme.id = this.root.utilities.getUniqueIdentifier(this.themes, 'theme');
                    
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
      
      dialog.dialog.addEventListener('keydown', handleKeyDown);
      
      // Clean up
      dialog._cleanup = () => {
        dialog.dialog.removeEventListener('keydown', handleKeyDown);
      };
      
    }).finally(() => {
      if (dialog._cleanup) dialog._cleanup();
    });
  }

  /**
   * Show font picker dialog
   * @param {string} currentFont - Currently selected font
   * @returns {Promise<string|null>} Selected font or null if cancelled
   */
  async showFontPicker(currentFont = '') {
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

    // Create dialog content
    const content = document.createElement('div');
    content.style.display = 'flex';
    content.style.flexDirection = 'column';
    content.style.width = '600px';
    content.style.maxWidth = '90vw';
    content.style.maxHeight = '80vh';

    // Create search and categories section
    const searchSection = document.createElement('div');
    searchSection.style.padding = '15px';
    searchSection.style.borderBottom = '1px solid var(--borders, #444)';

    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.id = 'font-search';
    searchInput.className = 'form-control';
    searchInput.placeholder = this.root.messages.getMessage('stam:font-picker-search-placeholder');
    searchInput.style.width = '100%';
    searchInput.style.padding = '8px 12px';
    searchInput.style.marginBottom = '10px';
    searchInput.style.background = 'var(--input-background, #2d2d2d)';
    searchInput.style.border = '1px solid var(--borders, #444)';
    searchInput.style.borderRadius = '4px';
    searchInput.style.color = 'var(--text-primary, #e0e0e0)';

    const categoriesContainer = document.createElement('div');
    categoriesContainer.className = 'font-categories';
    categoriesContainer.style.display = 'flex';
    categoriesContainer.style.gap = '8px';
    categoriesContainer.style.marginBottom = '0';
    categoriesContainer.style.flexWrap = 'wrap';

    categories.forEach(cat => {
      const button = document.createElement('button');
      button.className = `btn btn-sm ${cat.id === 'all' ? 'btn-primary' : 'btn-secondary'}`;
      button.dataset.category = cat.id;
      button.textContent = this.root.messages.getMessage(cat.name);
      button.style.whiteSpace = 'nowrap';
      categoriesContainer.appendChild(button);
    });

    searchSection.appendChild(searchInput);
    searchSection.appendChild(categoriesContainer);
    content.appendChild(searchSection);

    // Create font list container with reduced height
    const fontList = document.createElement('div');
    fontList.id = 'font-list';
    fontList.style.flex = '0 0 60%';
    fontList.style.overflowY = 'auto';
    fontList.style.padding = '15px';
    fontList.style.maxHeight = '300px';  

    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'loading';
    loadingDiv.style.padding = '20px';
    loadingDiv.style.textAlign = 'center';
    loadingDiv.textContent = this.root.messages.getMessage('stam:font-picker-loading');
    
    fontList.appendChild(loadingDiv);

    // Create font size controls container
    const sizeContainer = document.createElement('div');
    sizeContainer.style.padding = '15px';
    sizeContainer.style.borderTop = '1px solid var(--borders, #444)';
  
    // Font size controls
    sizeContainer.innerHTML = `
      <div style="margin-bottom: 10px; font-weight: 500; color: var(--text-primary, #e0e0e0);">
        ${this.root.messages.getMessage('stam:font-picker-size')}
      </div>
      <div style="display: flex; align-items: center; gap: 10px;">
        <button id="decrease-size" class="btn btn-neutral" style="padding: 4px 8px; min-width: 32px;">-</button>
        <input type="text" id="font-size" class="form-control" 
               value="12" 
               style="width: 60px; text-align: center;"
               inputmode="numeric" pattern="[0-9]*">
        <span style="color: var(--text-secondary, #b0b0b0);">px</span>
        <button id="increase-size" class="btn btn-neutral" style="padding: 4px 8px; min-width: 32px;">+</button>
      </div>
    `;

    content.appendChild(fontList);
    content.appendChild(sizeContainer);

    // Initialize font size value if provided
    const sizeInput = sizeContainer.querySelector('#font-size');
    const currentSize = currentFont.match(/(\d+)px/);
    if (currentSize && currentSize[1]) {
      sizeInput.value = currentSize[1];
    }

    // Add event listeners for size controls
    sizeContainer.querySelector('#decrease-size').addEventListener('click', () => {
      const current = parseInt(sizeInput.value) || 12;
      if (current > 6) sizeInput.value = current - 1;
    });

    sizeContainer.querySelector('#increase-size').addEventListener('click', () => {
      const current = parseInt(sizeInput.value) || 12;
      if (current < 72) sizeInput.value = current + 1;
    });

    // Validate size input
    sizeInput.addEventListener('input', (e) => {
      const value = e.target.value;
      if (!/^\d*$/.test(value)) {
        e.target.value = value.replace(/[^\d]/g, '');
      } else if (value) {
        const size = parseInt(value);
        if (size < 6) e.target.value = '6';
        if (size > 72) e.target.value = '72';
      }
    });

    // Add event delegation for font item clicks
    fontList.addEventListener('click', (e) => {
      const fontItem = e.target.closest('.font-item');
      if (fontItem) {
        const font = fontItem.dataset.font;
        if (font) {
          selectFont(font);
        }
      }
    });
    
    // Create the dialog
    let selectedFont = null;
    
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
        style.className = 'font-face-temp'; // Add class for cleanup
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
      const testElement = document.createElement('span');
      testElement.style.fontFamily = `'${fontName}', sans-serif`;
      testElement.style.position = 'absolute';
      testElement.style.visibility = 'hidden';
      testElement.style.fontSize = '16px';
      testElement.textContent = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      document.body.appendChild(testElement);
      
      return new Promise((resolve) => {
        // Small delay to ensure the font has a chance to load
        setTimeout(() => {
          document.body.removeChild(testElement);
          resolve();
        }, 100);
      });
    };
    
    // Create the dialog
    const dialog = new Dialog({
      title: this.root.messages.getMessage('stam:font-picker-title'),
      content,
      buttons: [
        {
          label: this.root.messages.getMessage('stam:theme-cancel'),
          className: 'btn-neutral',
          onClick: () => dialog.close(null)
        },
        {
          label: this.root.messages.getMessage('stam:theme-use'),
          className: 'btn-positive',
          disabled: !currentFont,
          onClick: () => {
            // Save the selected font to recent fonts before closing
            if (selectedFont) {
              // Remove if already exists
              const index = recentFonts.indexOf(selectedFont);
              if (index > -1) {
                recentFonts.splice(index, 1);
              }
              // Add to beginning
              recentFonts.unshift(selectedFont);
              // Keep only the 5 most recent
              if (recentFonts.length > 5) {
                recentFonts.length = 5;
              }
              // Save to localStorage
              localStorage.setItem('recentFonts', JSON.stringify(recentFonts));
              dialog.close(selectedFont);
            } else {
              dialog.close(currentFont || null);
            }
          }
        }
      ],
      onClose: (result) => {
          // Clean up any loaded fonts
          document.querySelectorAll('.font-face-temp').forEach(el => el.remove());
          return result;
      },
      theme: this.getCurrentTheme(),
      styles: {
          width: '600px',
          maxWidth: '90vw',
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column'
        }
    });
    
    // Load available fonts
    const loadFonts = async (category = 'all', search = '') => {
      // Show loading state
      fontList.innerHTML = `
        <div class="loading" style="padding: 20px; text-align: center; color: var(--text-secondary, #b0b0b0);">
          ${this.root.messages.getMessage('stam:font-picker-loading')}
        </div>
      `;
      
      try {
        // Filter fonts based on category and search
        let fonts = [];
        
        // Get fonts for the selected category
        if (category === 'all') {
          fonts = [...webSafeFonts];
        } else if (fontCategories[category]) {
          fonts = [...fontCategories[category]];
        }
        
        // Apply search filter
        if (search) {
          const searchLower = search.toLowerCase();
          fonts = fonts.filter(font => font.toLowerCase().includes(searchLower));
        }
        
        // Generate font items HTML
        let html = '';
        
        // Add recently used fonts section if showing all fonts
        if (category === 'all' && recentFonts && recentFonts.length > 0) {
          html += `
            <div class="recent-fonts" style="margin-bottom: 20px;">
              <div style="font-size: 12px; font-weight: 500; color: var(--text-secondary, #b0b0b0); margin-bottom: 8px;">
                ${this.root.messages.getMessage('stam:font-picker-recent')}
              </div>
              <div class="font-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 8px; margin-bottom: 16px;">
                ${recentFonts.map(font => {
                  const safeFont = font.replace(/'/g, '&apos;');
                  const previewText = this.root.messages.getMessage('stam:font-picker-preview-text');
                  return `
                    <div class="font-item" data-font="${safeFont}" style="padding: 10px; border-radius: 4px; cursor: pointer; transition: all 0.2s; background: var(--list-background, #2a2a2a);">
                      <div style="font-family: '${font}'; font-size: 14px; font-weight: 500;">${font}</div>
                      <div class="font-preview" style="font-family: '${font}'; font-size: 12px; color: var(--text-secondary, #b0b0b0); margin-top: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                        ${previewText}
                      </div>
                    </div>`;
                }).join('')}
              </div>
            </div>`;
        }
        
        // Add main font grid
        html += `
          <div class="font-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 8px;">
            ${fonts.map(font => {
              const safeFont = font.replace(/'/g, '&apos;');
              const previewText = this.root.messages.getMessage('stam:font-picker-preview-text');
              return `
                <div class="font-item" data-font="${safeFont}" style="padding: 10px; border-radius: 4px; cursor: pointer; transition: all 0.2s;">
                  <div style="font-family: '${font}'; font-size: 14px; font-weight: 500;">${font}</div>
                  <div class="font-preview" style="font-family: '${font}'; font-size: 12px; color: var(--text-secondary, #b0b0b0); margin-top: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                    ${previewText}
                  </div>
                </div>`;
            }).join('')}
          </div>
        `;
        
        // Update the font list
        fontList.innerHTML = html;
        
        // If there's a selected font, ensure it's highlighted
        if (selectedFont) {
          selectFont(selectedFont);
        }
        
      } catch (error) {
        console.error('Error loading fonts:', error);
        fontList.innerHTML = `
          <div style="padding: 20px; text-align: center; color: var(--text-error, #dc3545);">
            ${this.root.messages.getMessage('stam:font-picker-load-error')}
          </div>
        `;
      }
    };
    
    // Select a font
    const selectFont = (font) => {
      selectedFont = font;
      
      // Update selected state in UI
      const items = fontList.querySelectorAll('.font-item');
      items.forEach(item => {
        if (item.dataset.font === font) {
          item.style.backgroundColor = 'var(--button-positive, #1a73e8)';
          item.style.color = 'white';
          item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          
          // Update the font preview
          const previewText = item.querySelector('.font-preview');
          if (previewText) {
            previewText.style.fontFamily = `"${font}", ${getFontCategory(font) || 'sans-serif'}`;
            previewText.textContent = this.root.messages.getMessage('stam:font-picker-preview-text');
          }
        } else {
          // Reset other items
          item.style.background = '';
          item.style.color = '';
          item.classList.remove('selected');
        }
      });
      
      // Update the Use button state
      updateUseButton();
      
      // Load the font preview
      loadFont(font).catch(err => {
        console.warn(`Failed to load font ${font}:`, err);
      });
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
    
    // Event listeners
    searchInput.addEventListener('input', (e) => {
      const searchTerm = e.target.value.trim();
      const activeCategory = document.querySelector('.font-category-btn.active');
      loadFonts(activeCategory ? activeCategory.dataset.category : 'all', searchTerm);
    });
    
    categoriesContainer.addEventListener('click', (e) => {
      const button = e.target.closest('.btn');
      if (!button) return;
      
      const category = button.dataset.category;
      if (!category) return;
      
      // Update active state
      categoriesContainer.querySelectorAll('.btn').forEach(btn => {
        btn.classList.remove('active');
      });
      button.classList.add('active');
      
      // Load fonts for selected category
      loadFonts(category, searchInput.value.trim());
    });
    
    // Get reference to the use button for later updates
    const useButton = dialog.getButtonElement(1);
    
    // Function to update the use button state
    const updateUseButton = () => {
      if (dialog.setButtonState) {
        dialog.setButtonState(1, !selectedFont);
      } else if (useButton) {
        useButton.disabled = !selectedFont;
      }
    };

    // Open the dialog and return a promise that resolves with the selected font
    dialog.open();
    
    // Initial update of button state after dialog is open
    updateUseButton();
    
    // Load initial fonts
    loadFonts('all', '');
    
    // Set up keyboard navigation and focus management
    if (dialog.dialogElement) {
      this._setupDialogKeyboardNavigation(dialog.dialogElement);
      
      // Focus the search input when dialog opens
      const searchInputEl = dialog.dialogElement.querySelector('#font-search');
      if (searchInputEl) {
        // Use requestAnimationFrame to ensure the dialog is fully rendered
        requestAnimationFrame(() => {
          searchInputEl.focus();
        });
      } else {
        // Fallback: focus the first focusable element
        const focusable = dialog.dialogElement.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        if (focusable) {
          requestAnimationFrame(() => focusable.focus());
        }
      }
    }
    
    // Return a promise that resolves with the selected font or null if cancelled
    return new Promise((resolve) => {
      // Store the original onClose handler
      const originalOnClose = dialog.onClose;
      
      // Override the onClose handler to resolve our promise
      dialog.onClose = () => {
        // Clean up any loaded fonts
        document.querySelectorAll('.font-face-temp').forEach(el => el.remove());
        
        // Call the original onClose if it exists
        if (typeof originalOnClose === 'function') {
          originalOnClose();
        }
        
        // Get selected size
        const selectedSize = sizeInput.value || '12';
        
        // Resolve with selected font and size
        resolve({
          font: selectedFont,
          size: selectedSize + 'px'
        });
        dialog.close();
      };
    });    
  }
}
export default PreferenceManager;
