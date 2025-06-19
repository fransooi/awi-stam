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
* @file SideWindow.js
* @author FL (Francois Lionet)
* @version 0.5
*
* @short SideWindow implementation
*/
import BaseComponent from '../../utils/BaseComponent.js';
import { MESSAGES } from '../../utils/BaseComponent.js';

class SideWindow extends BaseComponent {
  constructor(id, title, parentId, containerId, initialHeight = 200) {
    super(id + 'SideWindow',parentId,containerId);
    this.id = id;
    this.title = title;
    this.height = initialHeight;
    this.content = null;
    this.header = null;
    this.isVisible = true;
    this.minimized = false;
    this.enlarged = false;
    this.enlargedDialog = null;
    this.originalHeight = initialHeight;
    this.headerHeight = 34; // Approximate height of the header
    this.messageMap[MESSAGES.WINDOW_TOGGLE] = this.handleWindowToggle;
    this.messageMap[MESSAGES.WINDOW_CLOSE] = this.handleWindowClose;
    this.messageMap[MESSAGES.WINDOW_RESIZE] = this.handleWindowResize;
    this.messageMap[MESSAGES.WINDOW_ENLARGE] = this.handleWindowEnlarge;
    this._customButtons = new Map(); // Track custom buttons/icons
  }

  /**
   * Initialize the component
   * 
   * @param {Object} options - Optional configuration options
   */ 
  async init(options = {}) {
    super.init(options);
  }

  /**
   * Destroy the component
   */
  async destroy() {
    super.destroy();
    if (this.container) {
      this.parentContainer.removeChild(this.container);
    }
  }

  /**
   * Create the DOM structure for this side window
   * @param {HTMLElement} parentContainer - The parent container to append this window to
   * @returns {HTMLElement} The created window element
   */
  /**
   * Check if this is the top window in the sidebar
   * @returns {boolean} True if this is the top window
   */
  isTopWindow() {
    if (!this.container) return false;
    
    // Find the sidebar container that holds all windows
    const sidebar = this.container.closest('.side-windows-container');
    if (!sidebar) return false;
    
    // Get all side windows in the sidebar
    const sideWindows = Array.from(sidebar.querySelectorAll('.side-window'));
    if (sideWindows.length === 0) return false;
    
    // Find the first visible window
    for (const win of sideWindows) {
      const style = window.getComputedStyle(win);
      if (style.display !== 'none' && style.visibility !== 'hidden') {
        // Found the first visible window, check if it's this one
        return win === this.container;
      }
    }
    
    return false;
  }

  /**
   * Set up drag handling for the window
   */
  setupDragHandling() {
    if (!this.header) {
      return;
    }
    
    // Get wrapper element once
    const wrapper = this.container.closest('.side-window-wrapper');
    if (!wrapper) {
      return;
    }
    
    // State for drag operation
    let startY, startHeight, prevWrapper, startPrevHeight;
    
    // Get the previous visible window wrapper if it exists
    const getPrevWrapper = () => {
      const sidebar = wrapper.parentElement;
      if (!sidebar || !sidebar.classList.contains('side-windows-container')) return null;
      
      const wrappers = Array.from(sidebar.querySelectorAll('.side-window-wrapper'));
      const currentIndex = wrappers.indexOf(wrapper);
      
      if (currentIndex <= 0) return null;
      
      // Find the previous visible wrapper
      for (let i = currentIndex - 1; i >= 0; i--) {
        const w = wrappers[i];
        const style = window.getComputedStyle(w);
        if (style.display !== 'none' && style.visibility !== 'hidden') {
          return w;
        }
      }
      return null;
    };
    
    // Handle mousedown on header
    const handleMouseDown = (e) => {
      if (this.isTopWindow() || e.target.closest('button')) return;
      
      e.preventDefault();
      e.stopPropagation();
      
      // Store initial positions
      startY = e.clientY;
      startHeight = wrapper.offsetHeight;
      prevWrapper = getPrevWrapper();
      startPrevHeight = prevWrapper ? prevWrapper.offsetHeight : 0;
      
      // Add global event listeners
      const moveHandler = handleMouseMove;
      const upHandler = () => {
        document.removeEventListener('mousemove', moveHandler);
        document.removeEventListener('mouseup', upHandler);
        handleMouseUp();
      };
      
      document.addEventListener('mousemove', moveHandler);
      document.addEventListener('mouseup', upHandler, { once: true });
      
      // Update styles
      document.body.style.cursor = 'row-resize';
      document.body.style.userSelect = 'none';
      document.body.style.webkitUserSelect = 'none';
      this.container.classList.add('resizing');
      
      // Store cleanup function
      this._cleanupDrag = () => {
        document.removeEventListener('mousemove', moveHandler);
        document.removeEventListener('mouseup', upHandler);
      };
    };
    
    // Function to update the content area size
    const updateContentSize = (wrapper, newHeight) => {
      if (!wrapper) return;
      
      // Update the wrapper height
      wrapper.style.height = `${newHeight}px`;
      
      // The window inside will take full height of its wrapper
      const winElement = wrapper.querySelector('.side-window');
      if (!winElement) return;
      
      // Update content height if needed
      const header = winElement.querySelector('.side-window-header');
      const content = winElement.querySelector('.side-window-content');
      
      if (header && content) {
        const headerHeight = header.offsetHeight;
        content.style.height = `${newHeight - headerHeight}px`;
      }
    };
    
    // Handle mousemove for dragging
    const handleMouseMove = (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      // Calculate the distance moved from the start
      const dy = e.clientY - startY;
      const newHeight = startHeight - dy;  // Inverted the sign to match mouse movement
      
      // Apply minimum height constraint
      const minHeight = 100;
      
      if (newHeight >= minHeight) {
        // If there's a window above, adjust its height to maintain the total height
        if (prevWrapper) {
          const newPrevHeight = startPrevHeight + dy;
          
          if (newPrevHeight >= minHeight) {
            // Update the previous window's height
            updateContentSize(prevWrapper, newPrevHeight);
            // Update the current window's height
            updateContentSize(wrapper, newHeight);
          } else {
            // If the previous window would be too small, cap the current window's height
            const maxNewHeight = startHeight + startPrevHeight - minHeight;
            // Set the previous window to minimum height first
            updateContentSize(prevWrapper, minHeight);
            // Then update the current window's height
            updateContentSize(wrapper, maxNewHeight);
          }
        } else {
          // If there's no previous window, just update the current window's height
          updateContentSize(wrapper, newHeight);
        }
        
        // Force a reflow to ensure the layout is updated
        void wrapper.offsetHeight;
      }
    };
    
    // Handle mouseup to end dragging
    const handleMouseUp = () => {
      // Reset styles
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.body.style.webkitUserSelect = '';
      this.container.classList.remove('resizing');
      
      // Clean up event listeners
      if (this._cleanupDrag) {
        this._cleanupDrag();
        this._cleanupDrag = null;
      }
      
      // Dispatch resize event
      window.dispatchEvent(new Event('resize'));
    };
    
    // Add mousedown event to header
    this.header.addEventListener('mousedown', handleMouseDown);
    
    // Prevent text selection during drag
    this.header.addEventListener('selectstart', (e) => {
      e.preventDefault();
      return false;
    });    
  }

  async render() {
    // Create the container element
    this.container = document.createElement('div');
    this.container.id = `side-window-${this.id}`;
    this.container.className = 'side-window';
    this.container.style.borderTop = '1px solid var(--side-border, #444444)';
    this.container.style.borderBottom = '1px solid var(--side-border, #444444)';
    this.container.style.display = 'flex';
    this.container.style.flexDirection = 'column';
    this.container.style.height = '100%';
    
    // Create the header with theme support
    this.header = document.createElement('div');
    this.header.className = 'side-window-header';
    this.header.style.backgroundColor = 'var(--side-title-background, #333333)';
    this.header.style.color = 'var(--side-title-text, #ffffff)';
    this.header.style.borderBottom = '1px solid var(--side-border, #444444)';
    this.header.style.flexShrink = '0'; // Prevent header from shrinking
    
    // Create the title
    const titleElement = document.createElement('div');
    titleElement.className = 'side-window-title';
    titleElement.textContent = this.title;
    
    // Create the buttons container
    this.buttons = document.createElement('div');
    this.buttons.className = 'side-window-controls';
    
    // Create enlarge button
    const enlargeButton = document.createElement('button');
    enlargeButton.className = 'side-window-enlarge';
    enlargeButton.innerHTML = '⤢';
    enlargeButton.title = 'Enlarge';
    enlargeButton.addEventListener('click', (event) => {
      event.stopPropagation();
      this.toggleEnlarge();
    });
    
    // Create toggle button
    const toggleButton = document.createElement('button');
    toggleButton.className = 'side-window-toggle';
    toggleButton.innerHTML = this.minimized ? '▼' : '▲';
    toggleButton.title = this.minimized ? 'Maximize' : 'Minimize';
    toggleButton.addEventListener('click', (event) => {
      event.stopPropagation();
      this.toggle();
    });
    
    // Create close button
    const closeButton = document.createElement('button');
    closeButton.className = 'side-window-close';
    closeButton.innerHTML = '×';
    closeButton.title = 'Close';
    closeButton.addEventListener('click', (event) => {
      event.stopPropagation();
      this.close();
    });
    
    // Add buttons to the buttons container
    this.buttons.appendChild(enlargeButton);
    this.buttons.appendChild(toggleButton);
    this.buttons.appendChild(closeButton);
    
    // Add title and buttons to the header
    this.header.appendChild(titleElement);
    this.header.appendChild(this.buttons);
    
    // Create the content area
    this.content = document.createElement('div');
    this.content.className = 'side-window-content';
    this.content.style.backgroundColor = '#000000'; // Default black background
    this.content.style.flexGrow = '1';
    this.content.style.overflow = 'auto'; // Ensure content is scrollable
    this.content.style.minHeight = '0'; // Allow content to shrink below its default minimum size
    
    // Add header and content to the container
    this.container.appendChild(this.header);
    this.container.appendChild(this.content);
        
    // Set initial height
    if (this.minimized) {
      this.container.classList.add('minimized');
      this.content.style.display = 'none';
    } else {
      this.updateContentHeight();
    }
      this.parentContainer.appendChild(this.container);
    this.layoutContainer = this.container;

    // Prevent default context menu on the entire side window
    this.container.addEventListener('contextmenu', (e) => {
      // If any child already called preventDefault, don't do it again
      if (!e.defaultPrevented) {
        e.preventDefault();
      }
    });
    
    // Setup drag handling after all elements are created
    this.setupDragHandling();
    
    return this.container;
  }

  /**
   * Add a custom TEXT button to the title bar.
   * @param {Object} param0
   * @param {string} param0.text - The button text (unique per button)
   * @param {string} param0.hint - Tooltip text
   * @param {function} param0.onClick - Click callback
   */
    addTextButton({ text, hint, onClick, id }) {
      if (!this.header || !this.buttons) return;
      const key = `text:${text}`;
      if (this._customButtons.has(key)) return this._customButtons.get(key); // prevent duplicate, return existing

      const btn = document.createElement('button');
      btn.className = 'side-window-btn side-window-btn--text side-window-btn--custom';
      btn.textContent = text;
      btn.title = hint || text;
      if (id) {
        btn.id = id;
      } else {
        btn.dataset.buttonKey = key;
      }
      btn.addEventListener('click', onClick);

      this._insertCustomButton(btn);
      this._customButtons.set(key, btn);
      return btn;
    }

  /**
   * Add a custom ICON button to the title bar.
   * @param {Object} param0
   * @param {string} param0.key - Button key (unique per button)
   * @param {string} param0.iconName - Font Awesome icon name (e.g., 'fa-play')
   * @param {string} param0.hint - Tooltip text
   * @param {function} param0.onClick - Click callback
   */
  addIconButton({ key, iconName, hint, onClick }) {
    if (!this.header || !this.buttons) return;
    if (this._customButtons.has(key)) return; // prevent duplicate

    const btn = document.createElement('button');
    btn.className = 'side-window-btn side-window-btn--icon side-window-btn--custom';
    btn.title = hint || iconName;
    btn.innerHTML = `<i class="fa ${iconName}"></i>`;
    btn.addEventListener('click', onClick);

    this._insertCustomButton(btn);
    this._customButtons.set(key, btn);
    return btn;
  }
  updateIconButton({ key, iconName, hint, onClick }) {
    if (!this.header || !this.buttons) return;
    if (!this._customButtons.has(key)) return; // prevent duplicate
    const btn = this._customButtons.get(key);
    btn.title = hint || iconName;
    btn.innerHTML = `<i class="fa ${iconName}"></i>`;
    if (onClick)
      btn.addEventListener('click', onClick);
  }

  /**
   * Insert a custom button before the enlarge button (or before controls if not found).
   * @param {HTMLElement} btn
   */
  _insertCustomButton(btn) {
    // Find enlarge button
    const enlargeBtn = this.buttons.querySelector('.side-window-enlarge');
    if (enlargeBtn) {
      this.buttons.insertBefore(btn, enlargeBtn);
    } else {
      this.buttons.insertBefore(btn, this.buttons.firstChild);
    }
  }

  /**
   * Optionally clear all custom buttons (for future theme switching, etc.)
   */
  clearCustomButtons() {
    for (const btn of this._customButtons.values()) {
      btn.remove();
    }
    this._customButtons.clear();
  }
  

  /**
   * Handle window toggle command
   * @param {Object} messageData - Command data
   * @param {string} sender - Sender ID
   * @returns {boolean} - True if command was handled
   */
  async handleWindowToggle(messageData, sender) {
    this.toggle();
    return true;
  }
  /**
   * Handle window close command
   * @param {Object} messageData - Command data
   * @param {string} sender - Sender ID
   * @returns {boolean} - True if command was handled
   */
  async handleWindowClose(messageData, sender) {
    this.close();
    return true;
  }
  /**
   * Handle window resize command
   * @param {Object} messageData - Command data
   * @param {string} sender - Sender ID
   * @returns {boolean} - True if command was handled
   */
  async handleWindowResize(messageData, sender) {
    if (messageData.height) {
      this.resize(messageData.height);
      return true;
    }
    return false;
  }
  /**
   * Handle window enlarge command
   * @param {Object} messageData - Command data
   * @param {string} sender - Sender ID
   * @returns {boolean} - True if command was handled
   */
  async handleWindowEnlarge(messageData, sender) {
    this.toggleEnlarge();
    return true;
  }
  


  /**
   * Toggle the window between minimized and normal state
   */
  async setMinimized(minimized) {
    if(this.minimized !== minimized) {
      if (!this.container)
        this.minimized = minimized;
      else
        await this.toggle();
    }
  }
  async toggle() {
    if (!this.container) return;
    
    // Get the sidebar element
    const sidebarContainer = this.container.closest('.side-windows-container');
    if (!sidebarContainer) return;
    
    // Get all side windows in the sidebar
    const sideWindowWrappers = Array.from(sidebarContainer.querySelectorAll('.side-window-wrapper'));
    
    // Find this window's wrapper
    const thisWrapper = this.container.closest('.side-window-wrapper');
    if (!thisWrapper) return;
    
    // Find the index of this window wrapper
    const index = sideWindowWrappers.indexOf(thisWrapper);
    
    // Check if this is the only visible window
    const visibleWrappers = sideWindowWrappers.filter(wrapper => {
      const sideWindow = wrapper.querySelector('.side-window');
      return sideWindow && !sideWindow.classList.contains('minimized') && sideWindow !== this.container;
    });
    
    // If this is the only window or the only visible window, don't allow minimizing
    if ((sideWindowWrappers.length === 1 || visibleWrappers.length === 0) && !this.minimized) {
      console.log('Cannot minimize the only visible window');
      return;
    }
    
    // Toggle minimized state
    this.minimized = !this.minimized;
    
    if (this.minimized) {
      // Save original height before minimizing
      this.originalHeight = this.height;
      
      // Minimize: collapse to just show the header
      this.container.classList.add('minimized');
      this.content.style.display = 'none';
      
      // Update the wrapper's flex properties
      thisWrapper.style.height = `${this.headerHeight}px`;
      thisWrapper.style.minHeight = `${this.headerHeight}px`;
      thisWrapper.style.flex = '0 0 auto';
      
      // Update toggle button
      const toggleButton = this.container.querySelector('.side-window-toggle');
      if (toggleButton) {
        toggleButton.innerHTML = '▼';
        toggleButton.title = 'Maximize';
      }
    } else {
      // Maximize: restore to original height
      this.container.classList.remove('minimized');
      this.content.style.display = 'block';
      
      // Update the wrapper's flex properties
      thisWrapper.style.height = `${this.originalHeight}px`;
      thisWrapper.style.minHeight = `${this.headerHeight}px`;
      thisWrapper.style.flex = '1 1 auto';
      
      // Update toggle button
      const toggleButton = this.container.querySelector('.side-window-toggle');
      if (toggleButton) {
        toggleButton.innerHTML = '▲';
        toggleButton.title = this.root.messages.getMessage('stam:minimize');
      }
      
      // Update content height to match new container size
      this.updateContentHeight();
    }
    
    // Notify that window state has changed
    this.sendMessageTo('sidebar', 'SIDEBAR_LAYOUT_CHANGED', {
      windowId: this.id,
      minimized: this.minimized
    });
  }

  /**
   * Toggle the window between enlarged and normal state
   */
  async toggleEnlarge() {
    if (!this.container) return;
    
    // Toggle enlarged state
    this.enlarged = !this.enlarged;
    
    if (this.enlarged) {
      // Create enlarged dialog if it doesn't exist
      this.createEnlargedDialog();
    } else {
      // Close the enlarged dialog
      this.closeEnlargedDialog(true);
    }
    this.updateContentHeight();
  }

  /**
   * Create the enlarged dialog
   */
  async createEnlargedDialog() {
    //var theme = this.root.preferences.getCurrentTheme();

    // Create the dialog overlay
    this.enlargedDialog = document.createElement('div');
    this.enlargedDialog.className = 'side-window-enlarged-overlay';
    this.enlargedDialog.id = `enlarged-${this.id}`;
    
    // Create the dialog container
    const dialogContainer = document.createElement('div');
    dialogContainer.className = 'side-window-enlarged-container';
    
    // Create the dialog header
    const dialogHeader = document.createElement('div');
    dialogHeader.className = 'side-window-enlarged-header';
    
    // Create the dialog title
    const dialogTitle = document.createElement('div');
    dialogTitle.className = 'side-window-enlarged-title';
    dialogTitle.textContent = this.title;

    // Create the minimize button with fa- icon...
    const minimizeButton = document.createElement('button');
    minimizeButton.className = 'side-window-enlarged-minimize';
    minimizeButton.innerHTML = '<i class="fa fa-minus"></i>';
    minimizeButton.title = 'Minimize';
    minimizeButton.addEventListener('click', (event) => {
      event.stopPropagation();
      this.closeEnlargedDialog(true);
    });
    
    // Create the close button
    const closeButton = document.createElement('button');
    closeButton.className = 'side-window-enlarged-close';
    closeButton.innerHTML = '×';
    closeButton.title = 'Close';
    closeButton.addEventListener('click', (event) => {
      event.stopPropagation();
      this.closeEnlargedDialog();
    });
    
    // Add title and close button to header
    dialogHeader.appendChild(dialogTitle);
    dialogHeader.appendChild(minimizeButton);
    dialogHeader.appendChild(closeButton);
    
    // Create the dialog content
    this.dialogContent = document.createElement('div');
    this.dialogContent.className = 'side-window-enlarged-content';
    
    // Store references to the original content and its parent
    this.originalContentParent = this.content.parentNode;
    this.originalContentRect = this.content.getBoundingClientRect();
    
    // Instead of moving the content directly, we'll create a placeholder in the dialog
    // and use the placeholder in the original location
    this.contentPlaceholder = document.createElement('div');
    this.contentPlaceholder.className = 'side-window-content side-window-content-placeholder';
    this.contentPlaceholder.innerHTML = '<div class="placeholder-message">Content is currently enlarged. Close the enlarged view to restore.</div>';
    
    // Replace the original content with the placeholder
    this.originalContentParent.replaceChild(this.contentPlaceholder, this.content);
    
    // Add the original content to the dialog
    this.dialogContent.appendChild(this.content);
    
    // Add header and content to the dialog container
    dialogContainer.appendChild(dialogHeader);
    dialogContainer.appendChild(this.dialogContent);
    
    // Add the dialog container to the overlay
    this.enlargedDialog.appendChild(dialogContainer);
    
    // Add the overlay to the document body
    document.body.appendChild(this.enlargedDialog);
    if (this.enlargedDialogContentHeight)
      this.dialogContent.style.height = this.enlargedDialogContentHeight + 'px';
    
    // Update the enlarge button
    const enlargeButton = this.container.querySelector('.side-window-enlarge');
    if (enlargeButton) {
      enlargeButton.innerHTML = '⤓';
      enlargeButton.title = this.root.messages.getMessage('stam:restore');
    }
    this.updateContentHeight();
  }

  /**
   * Close the enlarged dialog
   */
  async closeEnlargedDialog() {
    if (!this.enlargedDialog) return;
    
    // Replace the placeholder with the original content
    if (this.content && this.contentPlaceholder && this.contentPlaceholder.parentNode) {
      // Ensure the content is visible when restoring
      this.content.style.display = 'block';
      this.originalContentParent.replaceChild(this.content, this.contentPlaceholder);
    }
    
    // Store the dialog content height before removing it
    if (this.dialogContent && !this.enlargedDialogContentHeight) {
      this.enlargedDialogContentHeight = this.dialogContent.offsetHeight;
    }
    
    // Remove the dialog from the DOM
    if (this.enlargedDialog.parentNode) {
      this.enlargedDialog.remove();
    }
    this.enlargedDialog = null;
    
    // Update the enlarge button
    const enlargeButton = this.container?.querySelector('.side-window-enlarge');
    if (enlargeButton) {
      enlargeButton.innerHTML = '⤢';
      enlargeButton.title = this.root.messages.getMessage('stam:enlarge');
    }
    
    // Update content height to match container size
    this.updateContentHeight();
    
    // Force a reflow to ensure the layout is updated
    if (this.content) {
      void this.content.offsetHeight;
    }
  }
  
  /**
   * Update the content area height to match the available space
   */
  updateContentHeight() {
    if (!this.enlargedDialog){
      if (!this.container || !this.content || !this.header || this.minimized) return;
    
      // Calculate available height (container height minus header height)
      const containerHeight = this.container.offsetHeight;
      const headerHeight = this.header.offsetHeight;
      
      // Account for borders and padding
      const computedStyle = window.getComputedStyle(this.content);
      let verticalPadding = parseFloat(computedStyle.paddingTop) + parseFloat(computedStyle.paddingBottom);
      let verticalBorders = parseFloat(computedStyle.borderTopWidth) + parseFloat(computedStyle.borderBottomWidth);
      if (isNaN(verticalPadding)) verticalPadding = 0;
      if (isNaN(verticalBorders)) verticalBorders = 0;
      
      // Add a small buffer (2px) to ensure no scrollbar appears
      const buffer = 2;
      
      // Calculate the final available height
      // We use a 12px bottom margin to account for the resize separator that's added by SideBar
      const bottomMargin = 12;
      const availableHeight = containerHeight - headerHeight - verticalPadding - verticalBorders - buffer - bottomMargin;
      
      // Set content height
      if (availableHeight > 0) {
        this.content.style.height = `${availableHeight}px`;
      }
      return availableHeight;
    }
    else
    {
      if (this.enlargedDialogContentHeight)
        this.content.style.height = this.enlargedDialogContentHeight + 'px';
      return this.dialogContent.offsetHeight;
    }
  }
  
  /**
   * Close the window
   */
  async close() {
    if (!this.container) return;
    
    // If the window is enlarged, close the enlarged dialog first
    if (this.enlarged) {
      this.closeEnlargedDialog();
    }
    /*
    // Remove the window from the DOM
    const wrapper = this.container.closest('.side-window-wrapper');
    if (wrapper) {
      wrapper.remove();
    } else {
      this.container.remove();
    }    
    // Dispatch an event to notify that the window has been closed
    */
    await this.parent.handleWindowClosed(this);
  }
  
  /**
   * Set the height of the window
   * @param {number} height - New height in pixels
   */
  setHeight(height, wrapper) {
    if (!this.container) return;
    
    this.height = height;
    
    // Update the wrapper's height
    if (!this.enlargedDialog){
      const wrapper = this.container.closest('.side-window-wrapper');
      if (wrapper && !this.minimized) {
        this.originalHeight = height;
        wrapper.style.height = `${height}px`;
        
        // Update content height to match new container size
        this.updateContentHeight(height,wrapper);
      }
    }
  }
  
  /**
   * Get the current height of the window
   * @returns {number} - Current height in pixels
   */
  getHeight() {
    return this.minimized ? this.headerHeight : this.height;
  }
  
  /**
   * Check if the window is minimized
   * @returns {boolean} - True if minimized
   */
  isMinimized() {
    return this.minimized;
  }

  /**
   * Check if the window is enlarged
   * @returns {boolean} - True if enlarged
   */
  isEnlarged() {
    return this.enlarged;
  }

  /**
   * Update the window with new data
   * @param {Object} data - Data to update the window with
   */
  update(data) {
    // Default implementation - to be overridden by subclasses
    console.log(`Updating ${this.title} with data:`, data);
  }
  
  /**
   * Resize the window to a new height
   * @param {number} height - The new height in pixels
   */
  resize(height) {
    this.setHeight(height);
  }
  
  
  /**
   * Get the SideWindow object associated with a DOM element
   * @param {HTMLElement} element - The DOM element
   * @returns {SideWindow|null} - The SideWindow object or null if not found
   */
  getWindowObjectFromElement(element) {
    const windowId = element.id.replace('side-window-', '');
    // This is a simplified approach - in a real implementation, you might
    // want to use a registry or other mechanism to look up window objects
    return null; // Placeholder - will be implemented by SideBar
  }
  
  /**
   * Add a custom button to the title bar
   * @param {HTMLElement} buttonElement - The button element to add
   * @param {boolean} beforeControls - If true, add before standard controls; if false, add after any custom buttons but before standard controls
   */
  addCustomTitleBarButton(buttonElement, beforeControls = false) {
    if (!this.header) return;
    
    // Get the buttons container
    const buttonsContainer = this.header.querySelector('.side-window-controls');
    if (!buttonsContainer) return;
    
    if (beforeControls) {
      // Insert at the beginning of the controls container
      buttonsContainer.insertBefore(buttonElement, buttonsContainer.firstChild);
    } else {
      // Insert before the standard controls (enlarge, toggle, close)
      const enlargeButton = buttonsContainer.querySelector('.side-window-enlarge');
      if (enlargeButton) {
        buttonsContainer.insertBefore(buttonElement, enlargeButton);
      } else {
        const toggleButton = buttonsContainer.querySelector('.side-window-toggle');
        if (toggleButton) {
          buttonsContainer.insertBefore(buttonElement, toggleButton);
        } else {
          buttonsContainer.appendChild(buttonElement);
        }
      }
    }
  }
  
  /**
   * Override getLayoutInfo to include SideWindow-specific information
   * @returns {Object} Layout information for this SideWindow
   */
  async getLayoutInfo() {
    // Get base layout information from parent class
    const layoutInfo = await super.getLayoutInfo();
    
    // Add SideWindow-specific information
    layoutInfo.minimized = this.minimized;
    layoutInfo.height = this.height;
    layoutInfo.windowId = this.id;
    
    return layoutInfo;
  }
  async applyLayout(layoutInfo) {
    await this.setMinimized(layoutInfo.minimized);
  }

  /**
   * Set the title of the window
   * @param {string} newTitle - The new title to set
   */
  setTitle(newTitle) {
    if (!newTitle) return;
    
    // Update the title property
    this.title = newTitle;
    
    // Update the DOM if the window has been rendered
    if (this.container) {
      const titleElement = this.container.querySelector('.side-window-title');
      if (titleElement) {
        titleElement.textContent = newTitle;
      }
    }
  }
}

export default SideWindow;
