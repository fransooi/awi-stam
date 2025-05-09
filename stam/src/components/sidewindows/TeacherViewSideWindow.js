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
* @file TeacherViewSideWindow.js
* @author FL (Francois Lionet)
* @version 0.5
*
* @short Teacher View side window implementation
*/
import SideWindow from './SideWindow.js';
import { CLASSROOMCOMMANDS } from '../ClassroomManager.js';
class TeacherViewSideWindow extends SideWindow {
  constructor(parentId, containerId, initialHeight = 200) {
    super('TeacherView', 'TeacherView', parentId, containerId, initialHeight);
    this.connected = false;
    this.classroomId = '';
    this.classroomName = '';
    this.stream = null;
    this.error = null;
    this.messageMap[CLASSROOMCOMMANDS.TEACHER_CONNECTED] = this.handleTeacherConnected;
  }

  async init(options) {
    await super.init(options);
  }

  async destroy() {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    await super.destroy();
  }

  async render(containerId) {
    await super.render(containerId);
    this.renderTitleBar();
    this.content.innerHTML = '';
    this.videoElement = document.createElement('video');
    this.videoElement.className = 'side-window-video';
    this.videoElement.autoplay = true;
    this.videoElement.playsInline = true;
    this.videoElement.controls = false;
    this.videoElement.style.background = 'black';
    this.videoElement.style.width = '100%';
    this.videoElement.style.height = 'auto';
    this.content.appendChild(this.videoElement);
    return this.container;
  }
  async handleTeacherConnected(data, senderId) {
    await this.connectToClassroom(data.classroomId);
  }
  async connectToClassroom(classroomId) {
    if (!classroomId) {
      this.showError('No classroom ID provided.');
      return;
    }
    try {
      const response = await this.sendRequestTo('class:ClassroomManager', 'STUDENT_CONNECT', { classroomId: this.classroomId });
      if (response && response.stream) {
        this.stream = response.stream;
        this.classroomId = classroomId;
        this.videoElement.srcObject = this.stream;
        this.error = null;
        return true;
      } else if (response && response.error) {
        this.showError(response.error);
      } else {
        this.showError('Unknown error while connecting to classroom.');
      }
    } catch (err) {
      this.showError(err.message || 'Error connecting to classroom.');
    }
    return false;
  }

  renderTitleBar() {
    if (!this.titleBar) return;
    this.titleBar.innerHTML = '';
    // Classroom name
    const title = document.createElement('span');
    title.textContent = this.classroomName || 'Classroom';
    title.className = 'side-window-title';
    this.titleBar.appendChild(title);
    // Volume icon (popup/slider to be implemented in next step)
    const volumeIcon = document.createElement('span');
    volumeIcon.className = 'side-window-volume-icon';
    volumeIcon.innerHTML = '<i class="fa fa-volume-up"></i>';
    volumeIcon.style.cursor = 'pointer';
    // TODO: Implement popup slider
    this.titleBar.appendChild(volumeIcon);
  }

  showError(msg) {
    this.error = msg;
    this.content.innerHTML = '';
    const errDiv = document.createElement('div');
    errDiv.className = 'side-window-error';
    errDiv.textContent = msg;
    this.content.appendChild(errDiv);
  }

  async getLayoutInfo() {
    const layoutInfo = await super.getLayoutInfo();
    return layoutInfo;
  }

  async applyLayout(layoutInfo) {
    await super.applyLayout(layoutInfo);
  }
}

export default TeacherViewSideWindow;
