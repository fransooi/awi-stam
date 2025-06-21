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
* @file icons.js
* @author FL (Francois Lionet)
* @version 0.5
*
* @short AMOS Pro Icon Bar component
*/
import BaseIcons from '../../BaseIcons.js';

class AMOSProIcons extends BaseIcons {
  constructor(parentId,containerId) {
    super('AMOSProIcons', parentId, containerId);
    this.buttonStates = {}; // Track button states (up/down)
    
    // Define original button widths (approximate pixel widths from original images)
    this.buttonWidths = {
      row1: [
        { x: 1, width: 64, height: 48 },   // button-1-1
        { x: 2, width: 320, height: 48 },  // button-2-1 (wider than others)
        { x: 3, width: 64, height: 48 },   // button-3-1
        { x: 4, width: 64, height: 48 },   // button-4-1
        { x: 5, width: 64, height: 48 },   // button-5-1
        { x: 6, width: 64, height: 48 },   // button-6-1
        { x: 7, width: 64, height: 48 },   // button-7-1
        { x: 8, width: 64, height: 48 },   // button-8-1
        { x: 9, width: 64, height: 48 },   // button-9-1 (now 9-1)
        { x: 10, width: 64, height: 48 },  // button-10-1 (now 10-1)
        { x: 11, width: 64, height: 48 },  // button-11-1 (now 11-1)
        { x: 12, width: 64, height: 48 },  // button-12-1 (now 12-1)
        { x: 13, width: 192, height: 48 }, // button-13-1 (now 13-1)
        { x: 14, width: 64, height: 48 },  // button-14-1
      ],
      row2: [
        { x: 1, width: 48, height: 32 },   // button-1-2
        { x: 2, width: 1136, height: 32 }, // button-2-2
        { x: 3, width: 48, height: 32 },   // button-3-2
        { x: 4, width: 48, height: 32 }    // button-4-2
      ]
    };
    
    // Calculate total width of all buttons in row 1
    this.totalRow1Width = this.buttonWidths.row1.reduce((sum, button) => sum + button.width, 0);
    // Calculate total width of all buttons in row 2
    this.totalRow2Width = this.buttonWidths.row2.reduce((sum, button) => sum + button.width, 0);    
  }
  
  async init(options) {
    // Create a ResizeObserver to monitor container size changes
    this.resizeObserver = new ResizeObserver(entries => {
      this.handleResize();
    });
  }
  async destroy() {
    if(this.resizeObserver)
    {
      this.resizeObserver.unobserve(this.parentContainer);
      this.resizeObserver=null;
    }
    if(this.iconBar)
    {
      this.parentContainer.removeChild(this.iconBar);
      this.iconBar=null;
      this.removeStyles();
    }
  }

  async render(containerId) {
    this.parentContainer=await super.render(containerId, false);
    this.parentContainer.innerHTML = '';
    this.layoutContainer=this.parentContainer;
    this.addStyles();
    this.buttons=[];
    this.parentContainer.style.backgroundColor = 'var(--container-background)';

    // Create the main icon bar container
    this.iconBar = document.createElement('div');
    this.iconBar.className = 'amospro-icon-bar';
    
    // Apply styles directly to the icon bar for consistent display
    this.iconBar.style.display = 'flex';
    this.iconBar.style.flexDirection = 'column';
    this.iconBar.style.width = '100%';
    this.iconBar.style.backgroundColor = '#000';
    this.iconBar.style.fontFamily = 'monospace';
    this.iconBar.style.boxSizing = 'border-box';
    
    // Create top row (row 1)
    const topRow = document.createElement('div');
    topRow.className = 'amospro-button-row';
    
    // Apply styles directly to the top row
    topRow.style.display = 'flex';
    topRow.style.width = '100%';
    topRow.style.justifyContent = 'flex-start';
    topRow.style.fontSize = '0'; // Remove whitespace between buttons
    
    // Add buttons for top row (1-1 to 14-1)
    for (let i = 1; i <= 14; i++) { 
      this.addButton(i, 1, topRow);
    }
    
    this.iconBar.appendChild(topRow);
    
    // Create bottom row (row 2)
    const bottomRow = document.createElement('div');
    bottomRow.className = 'amospro-button-row';
    
    // Apply styles directly to the bottom row
    bottomRow.style.display = 'flex';
    bottomRow.style.width = '100%';
    bottomRow.style.justifyContent = 'flex-start';
    bottomRow.style.fontSize = '0'; // Remove whitespace between buttons
    
    // Add buttons for bottom row (1-2 to 4-2)
    for (let i = 1; i <= 4; i++) {
      this.addButton(i, 2, bottomRow);
    }    
    this.iconBar.appendChild(bottomRow);
    this.parentContainer.appendChild(this.iconBar);
    
    // Start observing for resize events
    this.resizeObserver.observe(this.parentContainer);
    
    return this.iconBar;
  }
  
  // Add styles to document if not present
  addStyles() {
    const styles = document.querySelectorAll('style[data-amospro-style]');
    if (styles.length > 0) {
      return;
    }
    const style = document.createElement('style');
    style.setAttribute('data-amospro-style', true);
    style.textContent = `
      .amospro-icon-bar {
        display: flex;
        flex-direction: column;
        width: 100%;
        font-family: 'Topaz', 'Courier New', monospace;
        background-color: #000000;
        padding: 0;
        margin: 0;
        overflow: hidden;
      }

      .amospro-button-row {
        display: flex;
        width: 100%;
        padding: 0;
        margin: 0;
        font-size: 0; /* Remove any space between inline elements */
        justify-content: flex-start; /* Align buttons to the left */
      }

      .amospro-button {
        padding: 0;
        margin: 0;
        border: 0;
        cursor: pointer;
        display: block;
        height: auto;
        width: auto;
        max-width: none; /* Allow images to be smaller than their natural size */
        font-size: 0; /* Ensure no whitespace between buttons */
      }

      .amospro-status-bar {
        display: flex;
        justify-content: space-between;
        background-color: #000000;
        color: #FFFFFF;
        padding: 2px 4px;
        font-size: 12px;
        border-top: 1px solid #444444;
      }

      /* When in AMOS Pro mode, change the icon bar background */
      .amosPro-mode #icon-area {
        background-color: var(--background);
        padding: 0;
        margin: 0;
        overflow-x: auto; /* Add horizontal scrolling if needed */
        width: 100%; /* Ensure it takes full width */
        max-width: 100%; /* Prevent any max-width limitations */
      }
    `;
    document.head.appendChild(style);
  }

  // Remove styles from document if not present
  removeStyles() {
    const styles = document.querySelectorAll('style[data-amospro-style]');
    styles.forEach(style => style.remove());
  }

  handleResize() {
    if (!this.parentContainer) return;

    // Get the container width
    const containerWidth = this.parentContainer.clientWidth;
    
    // Get all button rows
    const rows = document.querySelectorAll('.amospro-button-row');
    if (!rows || rows.length < 2) return;
    
    // Set fixed heights for rows
    const row1Height = 48;
    const row2Height = 32;
    
    // First, set all buttons to their original proportional sizes
    // but with fixed heights
    
    // Handle top row (row 1)
    const topRowButtons = Array.from(rows[0].querySelectorAll('.amospro-button'));
    
    // First, set all non-adaptive buttons to their fixed size
    let totalFixedWidth1 = 0;
    
    topRowButtons.forEach((button, index) => {
      const buttonNumber = index + 1;
      
      // Skip the adaptive button (button-2-1)
      if (buttonNumber === 2) return;
      
      // Set fixed width and height for this button
      const buttonInfo = this.buttonWidths.row1.find(b => b.x === buttonNumber);
      if (buttonInfo) {
        const width = buttonInfo.width;
        button.style.width = `${width}px`;
        button.style.height = `${row1Height}px`;
        totalFixedWidth1 += width;
      }
    });
    
    // Now handle the adaptive button (button-2-1)
    const adaptiveButton1 = topRowButtons[1]; // Index 1 is button-2-1
    if (adaptiveButton1) {
      // Calculate remaining width
      const remainingWidth = Math.max(containerWidth - totalFixedWidth1, 64);
      adaptiveButton1.style.width = `${remainingWidth}px`;
      adaptiveButton1.style.height = `${row1Height}px`;
    }
    
    // Handle bottom row (row 2)
    const bottomRowButtons = Array.from(rows[1].querySelectorAll('.amospro-button'));
    
    // First, set all non-adaptive buttons to their fixed size
    let totalFixedWidth2 = 0;
    
    bottomRowButtons.forEach((button, index) => {
      const buttonNumber = index + 1;
      
      // Skip the adaptive button (button-2-2)
      if (buttonNumber === 2) return;
      
      // Set fixed width and height for this button
      const buttonInfo = this.buttonWidths.row2.find(b => b.x === buttonNumber);
      if (buttonInfo) {
        const width = buttonInfo.width;
        button.style.width = `${width}px`;
        button.style.height = `${row2Height}px`;
        totalFixedWidth2 += width;
      }
    });
    
    // Now handle the adaptive button (button-2-2)
    const adaptiveButton2 = bottomRowButtons[1]; // Index 1 is button-2-2
    if (adaptiveButton2) {
      // Calculate remaining width
      const remainingWidth = Math.max(containerWidth - totalFixedWidth2, 64);
      adaptiveButton2.style.width = `${remainingWidth}px`;
      adaptiveButton2.style.height = `${row2Height}px`;
    }
    
    // If the total width is too large, scale everything down proportionally
    const totalWidth1 = totalFixedWidth1 + (adaptiveButton1 ? parseInt(adaptiveButton1.style.width) : 0);
    const totalWidth2 = totalFixedWidth2 + (adaptiveButton2 ? parseInt(adaptiveButton2.style.width) : 0);
    
    if (totalWidth1 > containerWidth || totalWidth2 > containerWidth) {
      const scaleFactor1 = containerWidth / totalWidth1;
      const scaleFactor2 = containerWidth / totalWidth2;
      
      // Scale top row
      topRowButtons.forEach(button => {
        const currentWidth = parseInt(button.style.width);
        button.style.width = `${currentWidth * scaleFactor1}px`;
      });
      
      // Scale bottom row
      bottomRowButtons.forEach(button => {
        const currentWidth = parseInt(button.style.width);
        button.style.width = `${currentWidth * scaleFactor2}px`;
      });
    }
    
    // Set rows to flex-start to ensure buttons are aligned to the left
    rows[0].style.justifyContent = 'flex-start';
    rows[1].style.justifyContent = 'flex-start';
  }

  handleFunctionKeyClick(button, key) {
    switch(key)
    {
      case '1-3':
        if (button.dataset.running === 'true') {
          this.broadcast(PROJECTMESSAGES.STOP_PROJECT, { fromIcon: true, key: key, text: 'Stop' });
        } else {
          this.broadcast(PROJECTMESSAGES.RUN_PROJECT, { fromIcon: true, key: key, text: 'Run' });
        }
        break;
    }
  }
  
  addButton(x, y, container) {
    const buttonId = `button-${x}-${y}`;
    
    // Create button element
    const button = document.createElement('img');
    button.className = 'amospro-button';
    button.dataset.x = x;
    button.dataset.y = y;
    button.dataset.id = buttonId;
    
    // Apply consistent styling directly to the button
    button.style.padding = '0';
    button.style.margin = '0';
    button.style.border = 'none';
    button.style.backgroundColor = 'transparent';
    button.style.cursor = 'pointer';
    button.style.display = 'inline-block';
    button.style.boxSizing = 'border-box';
    
    // Set initial state to 'up'
    this.buttonStates[buttonId] = 'up';
    button.src = `/amosPro/${buttonId}-up.png`;
    
    // Add mousedown event to show button pressed
    button.addEventListener('mousedown', () => {
      button.src = `/amosPro/${buttonId}-down.png`;
      this.buttonStates[buttonId] = 'down';
      this.handleClick(buttonId)
    });
    
    // Add mouseup event to release button
    button.addEventListener('mouseup', () => {
      button.src = `/amosPro/${buttonId}-up.png`;
      this.buttonStates[buttonId] = 'up';
      
    });
    
    // Add mouseout event to reset button if mouse leaves while pressed
    button.addEventListener('mouseout', () => {
      if (this.buttonStates[buttonId] === 'down') {
        button.src = `/amosPro/${buttonId}-up.png`;
        this.buttonStates[buttonId] = 'up';
      }
    });

    button.addEventListener('click', () => this.handleFunctionKeyClick(buttonId, 'click'));
    
    // Add to container
    container.appendChild(button);
    this.buttons.push(button);
  }
  handleProjectRunned() {
    this.buttons.forEach(button => {
      if (button.dataset.id === 'button-1-3') {
        button.src = `/amosPro/button-1-3-down.png`;
        button.dataset.running = 'true';
        this.buttonStates['button-1-3'] = 'down';
      }
    });
  }
  handleProjectStopped() {
    this.buttons.forEach(button => {
      if (button.dataset.id === 'button-1-3') {
        button.src = `/amosPro/button-1-3-up.png`;
        button.dataset.running = 'false';
        this.buttonStates['button-1-3'] = 'up';
      }
    });
  }
}

export default AMOSProIcons;
