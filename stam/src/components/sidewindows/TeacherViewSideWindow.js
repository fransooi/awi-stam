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
    this.token = 'teacherView';
    this.connected = false;
    this.classroomId = '';
    this.classroomName = '';
    this.stream = null;
    this.error = null;
    this.volume = 100;
    this._volumePopup = null;
    this._volumePopupVisible = false;
    this._boundHandleVolumeOutsideClick = this.handleVolumeOutsideClick.bind(this);
    this.messageMap[CLASSROOMCOMMANDS.TEACHER_CONNECTED] = this.handleTeacherConnected;
    this.messageMap[CLASSROOMCOMMANDS.TEACHER_VIEW_CONNECT] = this.handleTeacherViewConnect;  
  }

  async init(options) {
    await super.init(options);
  }

  async destroy() {
    this.hideVolumePopup();

    // Stop the stream
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
      await this.sendRequestTo('class:ClassroomManager', CLASSROOMCOMMANDS.STUDENT_LEAVE_CLASSROOM, { classroomId: this.classroomId, fromStudent: true });
      this.studentHandle = null;
    }
    // Remove video element if present
    if (this.videoElement && this.videoElement.parentNode) {
      if (this.ResizeObserver) {
        if (this._videoResizeObserver)
          this._videoResizeObserver.disconnect();
        this._videoResizeObserver = null;
      } else {
        // Fallback for older browsers
        window.removeEventListener('resize', this.updateVideoHeight.bind(this));
      }
      this.videoElement.parentNode.removeChild(this.videoElement);
      this.videoElement = null;
    }
   await super.destroy();
  }

  async render(containerId) {
    await super.render(containerId);
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
    // Use ResizeObserver for content area resizing
    if (window.ResizeObserver) {
      this._videoResizeObserver = new ResizeObserver(this.updateVideoHeight.bind(this));
      this._videoResizeObserver.observe(this.content);
    } else {
      // Fallback for older browsers
      window.addEventListener('resize', this.updateVideoHeight.bind(this));
    }
    this.videoElement.addEventListener('loadedmetadata', this.updateVideoHeight.bind(this));
    // Add volume icon button (Font Awesome)
    var self = this;
    this.volumeButton = this.addIconButton({
      key: 'volume',
      iconName: 'fa-volume-up', 
      hint: 'Volume',
      onClick: () => self.handleVolumeClick()
    });    
    return this.container;
  }
  handleVolumeClick() {
    // Volume Popup Slider: Attach click handler only ---
    if (this._volumePopupVisible) {
      this.hideVolumePopup();
    } else {
      this.showVolumePopup();
    }
  }
  
  // Helper to update video height based on aspect ratio
  updateVideoHeight() {
    if (this.videoElement.videoWidth && this.videoElement.videoHeight) {
      const aspect = this.videoElement.videoWidth / this.videoElement.videoHeight;
      this.videoElement.style.height = `${this.videoElement.offsetWidth / aspect}px`;
    }
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

  showVolumePopup() {
    // Defensive: Remove any existing popup before creating a new one
    if (this._volumePopup) {
      this.hideVolumePopup();
    }
    this._volumePopup = document.createElement('div');
    this._volumePopup.className = 'side-window-volume-popup';
    this._volumePopup.innerHTML = `
      <input type="range" min="0" max="100" value="${this.volume}" class="side-window-volume-slider" orient="horizontal">
    `;
    // Position popup below the icon
    const rect = this.volumeButton.getBoundingClientRect();
    this._volumePopup.style.position = 'fixed';
    this._volumePopup.style.left = `${rect.left}px`;
    this._volumePopup.style.top = `${rect.bottom + 8}px`;
    this._volumePopup.style.zIndex = 2000;
    document.body.appendChild(this._volumePopup);
    this._volumePopupVisible = true;

    // Volume change logic
    const slider = this._volumePopup.querySelector('.side-window-volume-slider');
    slider.addEventListener('input', (e) => {
      this.volume = parseInt(e.target.value, 10);
      if (this.videoElement) {
        this.videoElement.volume = this.volume / 100;
      }
    });

    // Hide popup on outside click
    setTimeout(() => {
      document.addEventListener('mousedown', this.handleVolumeOutsideClick.bind(this));
    }, 0);
  }

  hideVolumePopup() {
    if (this._volumePopup) {
      // Remove the popup from DOM if it exists
      if (this._volumePopup.parentNode) {
        this._volumePopup.parentNode.removeChild(this._volumePopup);
      }
      this._volumePopup = null;
      this._volumePopupVisible = false;
      document.removeEventListener('mousedown', this.handleVolumeOutsideClick.bind(this));
    }
  }

  handleVolumeOutsideClick(e) {
    if (this._volumePopup && !this._volumePopup.contains(e.target)) {
      this.hideVolumePopup();
    }
  }
}

export default TeacherViewSideWindow;

