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
* @short Commodore 64 Icon Bar component
*/
import BaseIcons from '../../BaseIcons.js';

class C64Icons extends BaseIcons  {
  constructor(parentId,containerId) {
    super('C64Icons', parentId, containerId);
  }

  async init(options) {
    await super.init(options);
  }
  async destroy() {
    await super.destroy();
  }
  async render(containerId) {
    await super.render(containerId, true);
    this.parentContainer.style.backgroundColor='#8A7ACE';
    return this.parentContainer;
  }
  // add styles to document if not present
  addStyles() {
    const styles = document.querySelectorAll('style[data-c64-style]');
    if (styles.length > 0) {
      return;
    }

    const style = document.createElement('style');
    style.setAttribute(`data-c64-style`, true);

    style.textContent = `
      .c64-button {
        border: 1px solid var(--borders, #555);
        border-style: solid !important;
        border-width: 1px !important;
        border-radius: 4px;
        padding: 10px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 24px;
        transition: all 0.2s ease;
        background-color: transparent;
        margin: 0 4px;
        width: 64px;
        height: 45px;
        flex-shrink: 0;
        box-sizing: border-box;
      }
      .c64-button:hover {
        background-color: #8A7ACE;
      }
      .c64-button-new {
        background-color: #4D3A99;
        color: #90CAF9;
      }
      .c64-button-new:hover {
        background-color: #8A7ACE;
      }
      .c64-button-open {
        background-color: #4D3A99;
        color: #FFE082;
      }
      .c64-button-open:hover {
        background-color: #8A7ACE;
      }
      .c64-button-save {
        background-color: #4D3A99;
        color: #A5D6A7;
      }
      .c64-button-save:hover {
        background-color: #8A7ACE;
      }
      .c64-button-run {
        background-color: #4D3A99;
        color: #81C784;
      }
      .c64-button-run:hover {
        background-color: #8A7ACE;
      }
      .c64-button-debug {
        background-color: #4D3A99;
        color: #FFB74D;
      }
      .c64-button-debug:hover {
        background-color: #8A7ACE;
      }
      .c64-button-share {
        background-color: #4D3A99;
        color: #9FA8DA;
      }
      .c64-button-share:hover {
        background-color:#8A7ACE;
      }
      .c64-button-help {
        background-color: #4D3A99;
        color: #CE93D8;
      }
      .c64-button-help:hover {
        background-color: #8A7ACE;
      }
      .c64-button-stop {
        background-color: #4D3A99;
        color: #ef4444;
      }
      c64-button-stop:hover {
        background-color: #8A7ACE;
      }
      
      /* Icon border effect */
      .c64-icon {
        text-shadow: 
          -1px -1px 0 #000,
          1px -1px 0 #000,
          -1px 1px 0 #000,
          1px 1px 0 #000;
        /* Fallback for browsers that don't support text-stroke */
        -webkit-text-stroke: 0.5px #000;
        text-stroke: 0.5px #000;
        paint-order: stroke fill;
      }
    `;
    document.head.appendChild(style);
  }  
}

export default C64Icons;
