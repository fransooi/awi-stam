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
* @file SideBar.js
* @author FL (Francois Lionet)
* @version 0.5
*
* @short Component for the left sidebar that manages multiple SideWindow instances
* @description
* This class provides a default implementation of the StatusBar component.
* It extends the BaseComponent class and implements the necessary methods
* for handling status updates and temporary status messages.
*/
import BaseComponent, { MESSAGES } from '../utils/BaseComponent.js';

class SideBar extends BaseComponent {
  constructor(parentId,containerId,componentName='SideBar') {
    super(componentName,parentId,containerId);
    this.resizeEdge = 'right'; // Default: resize handle on the right
    this.windows = [];
    this.separators = [];
    this.isDragging = false;
    this.activeSeparatorIndex = -1;
    this.windowRegistry = new Map(); // Registry to look up window objects by DOM element
    this.messageMap[MESSAGES.ADD_SIDE_WINDOW] = this.handleAddSideWindow.bind(this);
    this.messageMap[MESSAGES.REMOVE_SIDE_WINDOW] = this.handleRemoveSideWindow.bind(this);
  }

  async init(options) {
    super.init(options);   

    // Add global event listeners for mouse move and mouse up
    document.addEventListener('mousemove', this.handleMouseMove.bind(this));
    document.addEventListener('mouseup', this.handleMouseUp.bind(this));
    //document.addEventListener('click', this.handleDocumentClick.bind(this));
    document.addEventListener('sideWindowClosed', (event) => {
      this.handleWindowClosed(event.detail.id);
    });    

    // Create the SideWindows contained int he layout
    if (options.layout && options.layout.componentTypes[this.componentName]) {
      this.createSideWindows(options.layout.componentTypes[this.componentName]);
    }
  }

  async destroy() {
    document.removeEventListener('mousemove', this.handleMouseMove.bind(this));
    document.removeEventListener('mouseup', this.handleMouseUp.bind(this));
    document.removeEventListener('sideWindowClosed', (event) => {
      this.handleWindowClosed(event.detail.id);
    });
    //document.removeEventListener('click', this.handleDocumentClick.bind(this));
    if (this.windowsContainer) {
      this.parentContainer.removeChild(this.windowsContainer);
      this.windowsContainer=null;
    }
    for (var w=0;w<this.windows.length;w++)
      this.windows[w].destroy();
    this.windows=[];
    super.destroy();
  }

  /**
   * Render the sidebar with default windows
   */
  async render(containerId) {
    this.parentContainer=await super.render(containerId);
    this.parentContainer.innerHTML = ''; 
    this.separators = [];
    this.windowRegistry.clear();
    
    // Insert sidebar CSS
    if (!document.getElementById('sidebar-css')) {
      const link = document.createElement('link');
      link.id = 'sidebar-css';
      link.rel = 'stylesheet';
      link.type = 'text/css';
      link.href = '/css/sidebar.css';
      document.head.appendChild(link);
    }
    
    // Create a wrapper for all windows
    this.windowsContainer = document.createElement('div');
    this.windowsContainer.className = `${this.componentName.toLowerCase()}-windows-container side-windows-container`;
    this.windowsContainer.style.display = 'flex';
    this.windowsContainer.style.flexDirection = 'column';
    this.windowsContainer.style.height = '100%';
    this.windowsContainer.style.overflow = 'hidden';
    this.parentContainer.appendChild(this.windowsContainer);
    this.layoutContainer = this.windowsContainer;

    // Render each window
    this.windows.forEach((window, index) => {
      // Create a window wrapper
      const windowWrapper = document.createElement('div');
      windowWrapper.className = 'side-window-wrapper';
      windowWrapper.style.position = 'relative';
      windowWrapper.style.width = '100%';
      
      // Set flex properties based on minimized state
      if (window.isMinimized && window.isMinimized()) {
        windowWrapper.style.height = `${window.headerHeight}px`;
        windowWrapper.style.minHeight = `${window.headerHeight}px`;
        windowWrapper.style.flex = '0 0 auto';
      } else {
        windowWrapper.style.height = `${window.height}px`;
        windowWrapper.style.minHeight = `${window.headerHeight}px`;
        windowWrapper.style.flex = '1 1 auto';
      }
      
      // Register the window element for lookup
      this.windowRegistry.set(windowWrapper.querySelector('.side-window'), window);
      
      // Add a resize separator after each window except the last one
      if (index < this.windows.length - 1) {
        const separator = this.createSeparator(index);
        windowWrapper.appendChild(separator);
        this.separators.push(separator);
      }
      
      // Add the window wrapper to the container
      this.windowsContainer.appendChild(windowWrapper);
      window.parentContainer=windowWrapper;
    });

    // Add a persistent resize handle at the bottom of the sidebar (after the last window)
    if (this.windows.length > 0) {
      const bottomSeparator = document.createElement('div');
      bottomSeparator.className = 'resize-separator resize-separator-bottom';
      bottomSeparator.style.height = '8px';
      bottomSeparator.style.cursor = 'ns-resize';
      bottomSeparator.style.position = 'relative';
      bottomSeparator.style.width = '100%';

      let startY = 0;
      let startHeight = 0;
      const sidebar = this.parentContainer;
      bottomSeparator.addEventListener('mousedown', (e) => {
        startY = e.clientY;
        startHeight = sidebar.offsetHeight;
        document.body.style.userSelect = 'none';

        const onMouseMove = (event) => {
          const deltaY = event.clientY - startY;
          const newHeight = Math.max(100, startHeight + deltaY);
          sidebar.style.height = `${newHeight}px`;
        };
        const onMouseUp = () => {
          document.removeEventListener('mousemove', onMouseMove);
          document.removeEventListener('mouseup', onMouseUp);
          document.body.style.userSelect = '';
        };
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
        e.preventDefault();
      });
      this.windowsContainer.appendChild(bottomSeparator);

      // Add a bottom right corner resize handle for the left bar
      if (this.resizeEdge === 'right') {
        const bottomRightHandle = document.createElement('div');
        bottomRightHandle.className = 'resize-separator resize-separator-bottomright';
        bottomRightHandle.title = 'Resize width';
        let startX = 0;
        let startWidth = 0;
        const sidebar = this.parentContainer;
        bottomRightHandle.addEventListener('mousedown', (e) => {
          startX = e.clientX;
          startWidth = sidebar.offsetWidth;
          document.body.style.userSelect = 'none';

          const onMouseMove = (event) => {
            const deltaX = event.clientX - startX;
            const newWidth = Math.max(120, startWidth + deltaX);
            sidebar.style.width = `${newWidth}px`;
          };
          const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            document.body.style.userSelect = '';
          };
          document.addEventListener('mousemove', onMouseMove);
          document.addEventListener('mouseup', onMouseUp);
          e.preventDefault();
        });
        sidebar.style.position = 'relative';
        sidebar.appendChild(bottomRightHandle);
      }
    }

    // Add a horizontal (width) resize handle at the bottom left if this is a RightBar
    if (this.resizeEdge === 'left' && this.windows.length > 0) {
      const cornerSeparator = document.createElement('div');
      cornerSeparator.className = 'resize-separator resize-separator-corner';
      cornerSeparator.style.width = '14px';
      cornerSeparator.style.height = '14px';
      cornerSeparator.style.position = 'absolute';
      cornerSeparator.style.left = '0';
      cornerSeparator.style.bottom = '0';

      cornerSeparator.style.cursor = 'col-resize';
      cornerSeparator.style.zIndex = '1001';
      cornerSeparator.style.borderBottomLeftRadius = '5px';
      cornerSeparator.style.opacity = '0.8';
      cornerSeparator.title = 'Resize width';

      let startX = 0;
      let startWidth = 0;
      const sidebar = this.parentContainer;
      cornerSeparator.addEventListener('mousedown', (e) => {
        startX = e.clientX;
        startWidth = sidebar.offsetWidth;
        document.body.style.userSelect = 'none';

        const onMouseMove = (event) => {
          const deltaX = startX - event.clientX;
          const newWidth = Math.max(120, startWidth + deltaX);
          sidebar.style.width = `${newWidth}px`;
        };
        const onMouseUp = () => {
          document.removeEventListener('mousemove', onMouseMove);
          document.removeEventListener('mouseup', onMouseUp);
          document.body.style.userSelect = '';
        };
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
        e.preventDefault();
      });
      sidebar.style.position = 'relative';
      sidebar.appendChild(cornerSeparator);
    }
    
    // Patch the SideWindow.getWindowObjectFromElement method to use our registry
    this.patchSideWindowGetWindowObjectMethod();

    // Set width?
    if (this.widthToSet) {
      this.parentContainer.style.width = `${this.widthToSet}px`;
      this.widthToSet=0;
    }
    
    // Container for children
    return this.windowsContainer;
  }

  // Here you should  put code to render only the new sidewindow,
  // taking care of updating all the sizes and positions of the existing windows
  // and also rendering the new window.
  addWindowToDisplay(window) {
    // Create a window wrapper
    const windowWrapper = document.createElement('div');
    windowWrapper.className = 'side-window-wrapper';
    windowWrapper.style.position = 'relative';
    windowWrapper.style.width = '100%';
    // Set flex properties based on minimized state
    if (window.isMinimized && window.isMinimized()) {
      windowWrapper.style.height = `${window.headerHeight}px`;
      windowWrapper.style.minHeight = `${window.headerHeight}px`;
      windowWrapper.style.flex = '0 0 auto';
    } else {
      windowWrapper.style.height = `${window.height}px`;
      windowWrapper.style.minHeight = `${window.headerHeight}px`;
      windowWrapper.style.flex = '1 1 auto';
    }
    // Add the window wrapper to the container
    this.windowsContainer.appendChild(windowWrapper);
    window.parentContainer = windowWrapper;
    // Actually render the window into its wrapper
    if (typeof window.render === 'function') {
      window.render(windowWrapper);
    }
  }

  /**
   * Remove a SideWindow from display without full render.
   * @param {SideWindow|string} windowOrId - SideWindow instance or componentId
   */
  async removeSideWindowFromDisplay(windowOrId) {
    // Accept either a window instance or a componentId
    let window = typeof windowOrId === 'string'
      ? this.windows.find(w => w.componentId === windowOrId)
      : windowOrId;
    if (!window || !window.parentContainer) return false;
    // Destroy the window
    await window.destroy();
    // Remove the wrapper from the DOM
    const wrapper = window.parentContainer;
    if (wrapper && wrapper.parentNode === this.windowsContainer) {
      // Remove separator if present (it may be the last child in wrapper)
      const sep = wrapper.querySelector('.resize-separator');
      if (sep && sep.parentNode === wrapper) {
        wrapper.removeChild(sep);
        // Remove from separators array if present
        const sepIdx = this.separators.indexOf(sep);
        if (sepIdx !== -1) this.separators.splice(sepIdx, 1);
      }
      this.windowsContainer.removeChild(wrapper);
    }
    // Remove from windowRegistry
    for (let [el, win] of this.windowRegistry.entries()) {
      if (win === window) {
        this.windowRegistry.delete(el);
        break;
      }
    }
    // Remove from windows array
    const idx = this.windows.indexOf(window);
    if (idx !== -1) this.windows.splice(idx, 1);
    // Clean up reference
    window.parentContainer = null;
    return true;
  }

  /**
   * Patch the SideWindow.getWindowObjectFromElement method to use our registry
   */
  patchSideWindowGetWindowObjectMethod() {
    // Find a SideWindow instance to patch
    if (this.windows.length > 0) {
      const sideWindow = this.windows[0];
      
      // Override the getWindowObjectFromElement method
      sideWindow.constructor.prototype.getWindowObjectFromElement = (element) => {
        return this.windowRegistry.get(element) || null;
      };
    }
  }
  
  /**
   * Override getLayoutInfo to include SideBar-specific information
   * @returns {Object} Layout information for this SideBar
   */
  async getLayoutInfo() {
    // Get base layout information from parent class
    const layoutInfo = await super.getLayoutInfo();
    
    // Add width of container
    layoutInfo.containerWidth = this.parentContainer.offsetWidth;
    
    // Add SideBar-specific information
    layoutInfo.windows = [];
    for(var w=0;w<this.windows.length;w++){
      // Get the window's own layout info
      const windowLayoutInfo = await this.windows[w].getLayoutInfo();
      
      // Ensure we have the basic window properties
      layoutInfo.windows.push({
        id: this.windows[w].id,
        type: this.windows[w].constructor.name,
        height: this.windows[w].height,
        minimized: this.windows[w].minimized,
        ...windowLayoutInfo // Include all window-specific properties
      });
    }
    
    // Add information about the active window
    const activeWindow = this.windows.find(window => window.element && 
      window.element.classList.contains('active'));
    
    if (activeWindow) {
      layoutInfo.activeWindow = activeWindow.id;
    }
    
    return layoutInfo;
  }
  
  /**
   * Apply layout information to restore the sidebar state
   * @param {Object} layoutInfo - Layout information for this SideBar
   */
  async applyLayout(layoutInfo) {      
    // Set active window if specified
    if (layoutInfo.activeWindow) {
      const activeWindow = this.windows.find(w => w.type === layoutInfo.type);
      if (activeWindow && activeWindow.element) {
        activeWindow.element.classList.add('active');
      }
    }

    // Set container width if specified
    if (layoutInfo.containerWidth) {
      this.parentContainer.style.width = `${layoutInfo.containerWidth}px`;
    }
  }

  
  /**
   * Create SideWindows based on the provided layout
   * @param {Object} layout - The layout configuration
   */
  async createSideWindows(layout) {
    // Create SideWindows based on the layout
    if (layout.windows) {
      for( var i = 0; i < layout.windows.length; i++) {
        const { type, height } = layout.windows[i];
        await this.handleAddSideWindow({ type, height }, this.componentId);
      }
    }
  }

  /**
   * Handle add side window message
   * @param {Object} data - Message data
   * @param {string} sender - Sender ID
   * @returns {boolean} - Whether the message was handled
   */
  async handleAddSideWindow(data, sender) {
    if (data.type) {
      let window = null;
      try {
        // Dynamically import the SideWindow class based on the type
        const module = await import(`./sidewindows/${data.type}.js`);
        const SideWindowClass = module.default;
        window = new SideWindowClass(this.componentId, null, data.height);
        await this.sendMessageTo(window.componentId, MESSAGES.INIT, this.options);
        this.windows.push(window);
        if (data.width) 
          this.widthToSet=data.width;   
        // If we already had a render, performs a limited render
        if (this.parentContainer)
          this.addWindowToDisplay(window);
        if(typeof data.minimized !== 'undefined')
          await window.setMinimized(data.minimized);
      return window;
      } catch (err) {
        console.warn(`Could not load SideWindow for type: ${data.type}`, err);
        return {error:`Could not load SideWindow for type: ${data.type}`};
      }
    }
    return {error:`No type specified`};
  }

  
  /**
   * Create a separator element for resizing windows
   * @param {number} index - Index of the separator
   * @returns {HTMLElement} - The created separator element
   */
  createSeparator(index) {
    const separator = document.createElement('div');
    separator.className = 'resize-separator';
    separator.classList.add(`resize-separator-${this.resizeEdge}`);
    separator.dataset.index = index;
    
    // Set up the resize functionality
    separator.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      this.activeSeparatorIndex = index;
      this.startY = e.clientY;
      
      // Store the starting heights of the windows above and below this separator
      this.startHeightAbove = this.windows[index].height;
      this.startHeightBelow = this.windows[index + 1].height;
      
      separator.classList.add('active');
      
      // Prevent text selection during drag
      document.body.style.userSelect = 'none';
      
      // Prevent default to avoid text selection
      e.preventDefault();
    });
    
    return separator;
  }  

  /**
   * Handle `remov`e side window message
   * @param {Object} data - Message data
   * @param {string} sender - Sender ID
   * @returns {boolean} - Whether the message was handled
   */
  async handleRemoveSideWindow(data, sender) {
    if (data.id)
      return await this.removeSideWindowFromDisplay(data.id);
    else if (data.name)
      return await this.removeSideWindowFromDisplay(this.getWindowIdFromComponentName(data.name));
    return false;
  }
  getWindowIdFromComponentName(componentName){
    for(var w=0;w<this.windows.length;w++){
      if (this.windows[w].componentName==componentName)
        return this.windows[w].componentId;
    }
    return null;
  }
  
  /**
   * Get a window by its ID
   * @param {string} windowId - ID of the window to get
   * @returns {SideWindow|null} - The window object or null if not found
   */
  getWindow(componentId) {
    return this.windows.find(w => w.componentId === componentId) || null;
  }
  
  /**
   * Handle window closed event
   * @param {string} windowId - ID of the closed window
   */
  async handleWindowClosed(windowId) {
    await this.removeSideWindowFromDisplay(windowId);
  }
  
  /**
   * Handle mouse down event on a separator
   * @param {number} index - Index of the separator
   * @param {MouseEvent} event - The mouse event
   */
  handleSeparatorMouseDown(index, event) {
    this.isDragging = true;
    this.activeSeparatorIndex = index;
    this.startY = event.clientY;
    
    // Store the starting heights of the windows above and below this separator
    this.startHeightAbove = this.windows[index].height;
    this.startHeightBelow = this.windows[index + 1].height;
    
    const separator = this.separators[index];
    separator.classList.add('active');
    
    // Prevent text selection during drag
    document.body.style.userSelect = 'none';
    
    // Prevent default to avoid text selection
    event.preventDefault();
  }
  
  /**
   * Handle mouse move event during separator drag
   * @param {MouseEvent} event - The mouse event
   */
  handleMouseMove(event) {
    if (!this.isDragging || this.activeSeparatorIndex === -1) return;
    
    // Calculate the delta Y from the start position
    const deltaY = event.clientY - this.startY;
    
    // Get the windows above and below the separator
    const windowAbove = this.windows[this.activeSeparatorIndex];
    const windowBelow = this.windows[this.activeSeparatorIndex + 1];
    
    if (!windowAbove || !windowBelow) return;
    
    // Calculate new heights ensuring minimum heights
    const minHeight = 80;
    const newHeightAbove = Math.max(minHeight, this.startHeightAbove + deltaY);
    const newHeightBelow = Math.max(minHeight, this.startHeightBelow - deltaY);
    
    // Update the heights
    windowAbove.height = newHeightAbove;
    windowBelow.height = newHeightBelow;
    
    // Update the window wrapper heights
    const wrapperAbove = windowAbove.container.closest('.side-window-wrapper');
    const wrapperBelow = windowBelow.container.closest('.side-window-wrapper');
    
    if (wrapperAbove) {
      wrapperAbove.style.height = `${newHeightAbove}px`;
    }
    
    if (wrapperBelow) {
      wrapperBelow.style.height = `${newHeightBelow}px`;
    }
    
    // Prevent default to avoid text selection
    event.preventDefault();
  }
  
  /**
   * Handle mouse up event after separator drag
   */
  handleMouseUp() {
    if (this.isDragging) {
      this.isDragging = false;
      this.activeSeparatorIndex = -1;
      
      // Remove active class from all separators
      this.separators.forEach(separator => {
        separator.classList.remove('active');
      });
      
      document.body.style.userSelect = '';
    }
  }  
}

export default SideBar;
