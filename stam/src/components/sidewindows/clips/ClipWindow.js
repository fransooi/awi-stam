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
* @file ClipWindow.js
* @author FL (Francois Lionet)
* @version 0.5
*
* @short Clip window implementation
*/
class ClipWindow {
  constructor(id, title, initialUrl = '') {
    this.id = id;
    this.title = title;
    this.url = initialUrl || 'about:blank';
    this.iframe = null;
    this.modalContainer = null;
    this.iframeContainer = null;
    this.content = null;
  }
  

  /**
   * Render the content of the clip window
   * @param {HTMLElement} contentElement - The content element to render into
   */
  async render(contentElement) {
    this.content = contentElement;
    
    // Clear existing content
    contentElement.innerHTML = '';
    
    this.initIframeContainer(contentElement);
    
    // Create the modal dialog (hidden by default)
    this.createUrlModal();
    
    return this.iframeContainer;
  }
  
  /**
   * Initialize the iframe container
   * @param {HTMLElement} parentElement - The parent element to append the iframe to
   */
  initIframeContainer(parentElement) {
    // Create iframe container
    this.iframeContainer = document.createElement('div');
    this.iframeContainer.className = 'clip-iframe-container';
    this.iframeContainer.style.width = '100%';
    this.iframeContainer.style.position = 'relative';
    this.iframeContainer.style.paddingTop = '56.25%'; // 16:9 aspect ratio
    
    // Create iframe
    this.iframe = document.createElement('iframe');
    this.iframe.className = 'clip-iframe';
    this.iframe.frameBorder = '0';
    this.iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
    this.iframe.referrerPolicy = 'no-referrer-when-downgrade';
    this.iframe.loading = 'lazy';
    this.iframe.setAttribute('allowfullscreen', 'true');
    
    // Set iframe to fill container
    this.iframe.style.position = 'absolute';
    this.iframe.style.top = '0';
    this.iframe.style.left = '0';
    this.iframe.style.width = '100%';
    this.iframe.style.height = '100%';
    
    // Set the URL
    this.setUrl(this.url);
    
    // Append iframe to container
    this.iframeContainer.appendChild(this.iframe);
    
    // Return new container
    return this.iframeContainer;
  }
  
  /**
   * Create the URL edit modal dialog
   */
  createUrlModal() {
    // Create modal container
    this.modalContainer = document.createElement('div');
    this.modalContainer.className = 'url-modal';
    this.modalContainer.style.display = 'none';
    
    // Create modal content
    const modalContent = document.createElement('div');
    modalContent.className = 'url-modal-content';
    
    // Create modal header
    const modalHeader = document.createElement('div');
    modalHeader.className = 'url-modal-header';
    modalHeader.textContent = `Enter ${this.title} URL`;
    
    // Create close button
    const closeButton = document.createElement('button');
    closeButton.className = 'url-modal-close';
    closeButton.innerHTML = '×';
    closeButton.addEventListener('click', () => this.hideUrlModal());
    
    modalHeader.appendChild(closeButton);
    
    // Create form
    const form = document.createElement('form');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const urlInput = form.querySelector('#url-input');
      if (urlInput && urlInput.value) {
        this.setUrl(urlInput.value);
        this.hideUrlModal();
      }
    });
    
    // Create URL input
    const urlInput = document.createElement('input');
    urlInput.type = 'url';
    urlInput.id = 'url-input';
    urlInput.placeholder = this.getUrlPlaceholder();
    urlInput.value = this.url !== 'about:blank' ? this.url : '';
    urlInput.required = true;
    
    // Create URL help text
    const helpText = document.createElement('div');
    helpText.className = 'url-help-text';
    helpText.innerHTML = this.getUrlHelpText();
    
    // Create submit button
    const submitButton = document.createElement('button');
    submitButton.type = 'submit';
    submitButton.textContent = 'Load';
    
    // Assemble form
    form.appendChild(urlInput);
    form.appendChild(helpText);
    form.appendChild(submitButton);
    
    // Assemble modal
    modalContent.appendChild(modalHeader);
    modalContent.appendChild(form);
    this.modalContainer.appendChild(modalContent);
    
    // Add modal to the document body
    document.body.appendChild(this.modalContainer);
    
    // Add click event to close modal when clicking outside
    this.modalContainer.addEventListener('click', (e) => {
      if (e.target === this.modalContainer) {
        this.hideUrlModal();
      }
    });
  }
  
  /**
   * Show the URL edit modal
   */
  showUrlModal() {
    if (this.modalContainer) {
      this.modalContainer.style.display = 'flex';
      
      // Focus the input
      const urlInput = this.modalContainer.querySelector('#url-input');
      if (urlInput) {
        urlInput.focus();
        urlInput.select();
      }
    }
  }
  
  /**
   * Hide the URL edit modal
   */
  hideUrlModal() {
    if (this.modalContainer) {
      this.modalContainer.style.display = 'none';
    }
  }
  
  /**
   * Set a new URL for the iframe
   * @param {string} url - The new URL to load
   */
  setUrl(url) {
    this.url = url;
    
    if (this.iframe) {
      this.iframe.src = this.processUrl(url);
    }
  }
  
  /**
   * Process the URL before setting it to the iframe
   * @param {string} url - The URL to process
   * @returns {string} - The processed URL
   */
  processUrl(url) {
    // Base implementation just returns the URL as is
    // Override in subclasses for specific URL processing
    return url;
  }
  
  /**
   * Get the placeholder text for the URL input
   * @returns {string} - The placeholder text
   */
  getUrlPlaceholder() {
    return 'https://example.com';
  }
  
  /**
   * Get the help text for the URL input
   * @returns {string} - The help text HTML
   */
  getUrlHelpText() {
    return 'Enter a valid URL';
  }
  
  /**
   * Resize the iframe to fit the available space
   * @param {number} height - The available height for the iframe
   */
  resize(height) {
    // We don't need to do anything here as the iframe is set to maintain
    // its aspect ratio and always use 100% width of its container
    // The height will be determined by the aspect ratio (16:9)
  }
  
  /**
   * Update the clip window with new data
   * @param {Object} data - The data to update with
   * @param {string} data.url - The new URL to load
   */
  update(data) {
    if (data && data.url) {
      this.setUrl(data.url);
    }
  }
  
  /**
   * Clean up resources when the window is closed
   */
  cleanup() {
    // Remove the modal from the document
    if (this.modalContainer && this.modalContainer.parentNode) {
      this.modalContainer.parentNode.removeChild(this.modalContainer);
    }
  }
}

export default ClipWindow;
