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
* @file RightBar.js
* @author FL (Francois Lionet)
* @version 0.5
*
* @short Component for the left sidebar that manages multiple SideWindow instances
* @description
* This class provides a default implementation of the StatusBar component.
* It extends the BaseComponent class and implements the necessary methods
* for handling status updates and temporary status messages.
*/
import SideBar from './SideBar.js';
import { SIDEBARCOMMANDS } from './SideBar.js';

// Define message types for preference handling
export const RIGHTBARCOMMANDS = {
    ADD_SIDEWINDOW: 'ADD_RIGHT_SIDEWINDOW',
    REMOVE_SIDEWINDOW: 'REMOVE_RIGHT_SIDEWINDOW',
    TOGGLE_SIDEWINDOW: 'TOGGLE_RIGHT_SIDEWINDOW',
    IS_SIDEWINDOW_OPEN: 'IS_RIGHT_SIDEWINDOW_OPEN',
    TOGGLE_VISIBLE: 'TOGGLE_RIGHT_VISIBLE',
  };
  
class RightBar extends SideBar {
    constructor(parentId,containerId) {
        super(parentId,containerId,'RightBar');
        this.resizeEdge = 'left'; // Make resize handle appear on the left
        // Mark this as a right bar for CSS targeting
        if (this.parentContainer) {
            this.parentContainer.classList.add('right-bar');
        }
        this.messageMap[SIDEBARCOMMANDS.ADD_SIDEWINDOW] = null;
        this.messageMap[SIDEBARCOMMANDS.REMOVE_SIDEWINDOW] = null;
        this.messageMap[SIDEBARCOMMANDS.TOGGLE_SIDEWINDOW] = null;
        this.messageMap[SIDEBARCOMMANDS.IS_SIDEWINDOW_OPEN] = null;
        this.messageMap[RIGHTBARCOMMANDS.ADD_SIDEWINDOW] = this.handleAddSideWindow.bind(this);
        this.messageMap[RIGHTBARCOMMANDS.REMOVE_SIDEWINDOW] = this.handleRemoveSideWindow.bind(this);
        this.messageMap[RIGHTBARCOMMANDS.TOGGLE_SIDEWINDOW] = this.handleToggleSideWindow.bind(this);
        this.messageMap[RIGHTBARCOMMANDS.IS_SIDEWINDOW_OPEN] = this.handleIsSideWindowOpen.bind(this);
        this.messageMap[RIGHTBARCOMMANDS.TOGGLE_VISIBLE] = this.handleToggleVisible.bind(this);
    }
    async init(options)
    {
        var result = await super.init(options);
        this.otherSide = this.root.sideBar;
        return result;
    }
}
export default RightBar;