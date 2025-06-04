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
* @file Alerts.js
* @author FL (Francois Lionet)
* @version 0.5
*
* @short This component manages application alerts.
* @description
* This class provides a default implementation of the Alerts component.
* using the application UI and style.
*/
import BaseComponent from '../utils/BaseComponent.js';
import { Dialog } from '../utils/Dialog.js';
export const ALERTSCOMMANDS = {
  SHOW_YESNO: 'ALERT_YESNO',
  SHOW_OK: 'ALERT_OK',
  SHOW_OK_CANCEL: 'ALERT_OK_CANCEL',
  SHOW_ABORT_CANCEL: 'ALERT_ABORT_CANCEL',
  SHOW_CUSTOM: 'ALERT_CUSTOM',
};

class Alerts extends BaseComponent {
  /**
   * Constructor
   * @param {string} parentId - ID of the parent component
   */
  constructor(parentId = null, containerId) {
    super('Alerts', parentId, containerId);      
    this.messageMap[ALERTSCOMMANDS.SHOW_YESNO] = this.handleShowYesNo;
    this.messageMap[ALERTSCOMMANDS.SHOW_OK] = this.handleShowOk;
    this.messageMap[ALERTSCOMMANDS.SHOW_OK_CANCEL] = this.handleShowOkCancel;
    this.messageMap[ALERTSCOMMANDS.SHOW_ABORT_CANCEL] = this.handleShowAbortCancel;
    this.messageMap[ALERTSCOMMANDS.SHOW_CUSTOM] = this.handleShowCustom;
  }

  async init(options = {}) {
    if (await super.init(options))
      return;
    return true;
  }
  async destroy() {
    await super.destroy();
    return true;
  }
  
  /**
   * Show an alert
   */
  async handleShowYesNo(data, senderId) {
    return this.showYesNo(data.title, data.message);
  }
  async handleShowOk(data, senderId) {
    return this.showOk(data.title, data.message);
  }
  async handleShowOkCancel(data, senderId) {
    return this.showOkCancel(data.title, data.message);
  }
  async handleShowAbortCancel(data, senderId) {
    return this.showAbortCancel(data.title, data.message);
  }
  async handleShowCustom(data, senderId) {
    return this.showCustom(data.title, data.message);
  }
}
export default Alerts;
