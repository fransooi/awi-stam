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

class RightBar extends SideBar {
    constructor(parentId,containerId) {
        super(parentId,containerId,'RightBar');
        this.resizeEdge = 'left'; // Make resize handle appear on the left
        // Mark this as a right bar for CSS targeting
        if (this.parentContainer) {
            this.parentContainer.classList.add('right-bar');
        }
    }
}
export default RightBar;