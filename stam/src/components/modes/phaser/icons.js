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
* @short Phaser Icon Bar component
*/
import BaseIcons from '../../sidewindows/BaseIcons.js';

class PhaserIcons extends BaseIcons {
  constructor(parentId,containerId) {
    super('PhaserIcons', parentId, containerId);
  }

  async init(options) {
    super.init(options);
  }
  async destroy() {
    super.destroy();
  }
}

export default PhaserIcons;
