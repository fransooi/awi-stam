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
    this.messageMap[CLASSROOMCOMMANDS.TEACHER_VIEW_CONNECT] = this.handleTeacherViewConnect;
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
    // Display static video for testing
    this.videoElement.src = '/connecting.mp4';
    this.videoElement.loop = true;
    this.videoElement.muted = true;
    this.videoElement.play();
    this.content.appendChild(this.videoElement);
    return this.container;
  }
  async handleTeacherViewConnect(data, senderId) {
    var self = this;
    setTimeout(function()
    {
      self.connectToClassroom(data.classroomId,data.studentHandle);
    }, 1000);
  }
  async handleTeacherConnected(data, senderId) {
    var self = this;
    setTimeout(function()
    {
      self.connectToClassroom(data.classroomId,data.studentHandle);
    }, 1000);
  }
  async connectToClassroom(classroomId,studentHandle) {
    if (!classroomId) {
      this.showError('No classroom ID provided.');
      return;
    }
    if (!studentHandle) {
      this.showError('No student handle provided.');
      return;
    }
    try {
      const response2 = await this.sendRequestTo('class:ClassroomManager', CLASSROOMCOMMANDS.STUDENT_CONNECT, { classroomId, studentHandle });
      if (response2.error) {
        this.showError(response2.error);
        return;
      }
      if (response2.stream) {
        var self = this;
        setTimeout(function()
        {
          self.stream = response2.stream;
          self.classroomId = classroomId;
          self.studentHandle = studentHandle;
          self.videoElement.srcObject = self.stream;
          self.videoElement.autoplay = true;
          self.videoElement.playsInline = true;
          self.videoElement.muted = false;
          //self.videoElement.setAttribute('data-peer', response1.studentHandle);
          self.videoElement.play();
          self.error = null;
          // Diagnostic: listen for mute/unmute on video track
          const videoTrack = self.stream.getVideoTracks()[0];
          if (videoTrack) {
            console.log('Student video track muted state (immediately after assignment):', videoTrack.muted);
            videoTrack.onunmute = () => console.log('Student video track ONUNMUTE event fired!');
            videoTrack.onmute = () => {
              console.log('Student video track ONMUTE event fired!');
              self.videoElement.muted=false;
            };
          }
        }, 1000);
        return true;
      } else if (response2.error) {
        this.showError(response2.error);
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
