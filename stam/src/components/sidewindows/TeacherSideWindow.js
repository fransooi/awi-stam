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
* @file TeacherSideWindow.js
* @author FL (Francois Lionet)
* @version 0.5
*
* @short Teacher side window implementation
*/
import SideWindow from './SideWindow.js';
import { CLASSROOMCOMMANDS } from '../ClassroomManager.js';
class TeacherSideWindow extends SideWindow {
  constructor(parentId, containerId, initialHeight = 200) {
    super('Teacher', 'Teacher', parentId, containerId, initialHeight);
    this.connected = false;
    this.stream = null;
    this.videoElement = null;
    this.connectButton = null;
    this.setupButton = null;
    // Settings properties
    this.cameraSettings = {
      selectedCameraId: '',
      selectedMicId: '',
      selectedOutputId: '',
      speakerOn: true,
      volume: 1.0 // 0.0 - 1.0
    };
  }

  async init(options) {
    await super.init(options);
  }

  async destroy() {
    // Stop media tracks if active
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    // Remove video element if present
    if (this.videoElement && this.videoElement.parentNode) {
      this.videoElement.parentNode.removeChild(this.videoElement);
      this.videoElement = null;
    }
    await super.destroy();
  }

  async render(containerId) {
    await super.render(containerId);
    // Remove any previously added custom buttons (for hot reload/dev)
    if (typeof this.clearCustomButtons === 'function') this.clearCustomButtons();

    // Add "Connect" text button
    // Store reference to the connect/disconnect button
    this.connectBtn = this.addTextButton({
      text: this.connected ? 'Disconnect' : 'Connect',
      hint: this.connected ? 'Disconnect from camera and microphone' : 'Connect to camera and microphone',
      onClick: () => {
        if (this.connected) {
          this.handleDisconnectClick();
        } else {
          this.handleConnectClick();
        }
      },
      id: 'teacher-connect-btn'
    });

    // Add setup icon button (Font Awesome)
    this.addIconButton({
      iconName: 'fa-cog', // use 'fa-cog' for settings icon
      hint: 'Setup',
      onClick: () => this.handleSetupClick()
    });

    this.updateContent();
    return this.container;
  }

  updateContent() {
    if (!this.content) return;
    // Remove scrollbars and ensure content fills window
    this.content.innerHTML = '';
    this.content.className = 'side-window-content';
    if (!this.connected) {
      // Not connected: show connecting video
      this.videoElement = document.createElement('video');
      this.videoElement.className = 'side-window-video';
      this.videoElement.autoplay = true;
      this.videoElement.playsInline = true;
      this.videoElement.controls = false;
      this.videoElement.style.background = 'black';
      this.videoElement.style.width = '100%';
      this.videoElement.style.height = 'auto';
      this.videoElement.src = '/connecting.mp4';
      this.videoElement.loop = true;
      this.videoElement.muted = true;
      this.videoElement.play();
      this.content.appendChild(this.videoElement);
    } else if (this.stream) {
      // Connected: show video
      this.videoElement = document.createElement('video');
      this.videoElement.className = 'side-window-video';
      this.videoElement.autoplay = true;
      this.videoElement.muted = !this.cameraSettings.speakerOn;
      this.videoElement.playsInline = true;
      this.videoElement.srcObject = this.stream;
      this.videoElement.style.background = 'black';
      this.videoElement.style.display = 'block';
      this.videoElement.style.width = '100%';
      this.videoElement.style.height = 'auto';
      // Volume
      this.videoElement.volume = this.cameraSettings.volume;
      // Try to set sinkId for output selection (if supported)
      if (this.cameraSettings.selectedOutputId && typeof this.videoElement.sinkId !== 'undefined') {
        this.videoElement.setSinkId(this.cameraSettings.selectedOutputId).catch(() => {});
      }
      // Helper to update video height based on aspect ratio
      const updateVideoHeight = () => {
        if (this.videoElement.videoWidth && this.videoElement.videoHeight) {
          const aspect = this.videoElement.videoWidth / this.videoElement.videoHeight;
          this.videoElement.style.height = `${this.videoElement.offsetWidth / aspect}px`;
        }
      };
      // Use ResizeObserver for content area resizing
      if (window.ResizeObserver) {
        this._videoResizeObserver = new ResizeObserver(updateVideoHeight);
        this._videoResizeObserver.observe(this.content);
      } else {
        // Fallback for older browsers
        window.addEventListener('resize', updateVideoHeight);
      }
      this.videoElement.addEventListener('loadedmetadata', updateVideoHeight);
      this.content.appendChild(this.videoElement);
    }
  }

  async handleConnectClick() {
    if (!this.cameraSettings.selectedCameraId || !this.cameraSettings.selectedMicId)
    {
      var settings = await this.sendRequestTo('class:ClassroomManager', 'GET_CAMERA_SETTINGS', this.cameraSettings);
      if ( settings )
        this.cameraSettings = settings;
    }
    if (!this.cameraSettings.selectedCameraId || !this.cameraSettings.selectedMicId)
      return;

    // Request camera and microphone with selected device IDs if set
    try {
      const constraints = {
        video: this.cameraSettings.selectedCameraId ? { deviceId: { exact: this.cameraSettings.selectedCameraId } } : true,
        audio: this.cameraSettings.selectedMicId ? { deviceId: { exact: this.cameraSettings.selectedMicId } } : true
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      // Send request to ClassroomManager to start mediasoup connection
      var answer = await this.sendRequestTo('class:ClassroomManager', CLASSROOMCOMMANDS.TEACHER_CONNECT, { stream }); 
      if (answer.error)
      {
        this.connected = false;
        this.stream = null;
        this.updateContent();
        alert('Could not access camera/microphone: ' + answer.error);
      }
      else
      {
        const videoTrack = stream.getVideoTracks()[0];
        console.log('Teacher video enabled:', videoTrack.enabled, 'readyState:', videoTrack.readyState);
        this.connected = true;
        this.stream = stream;
        this.updateContent();
      }
    } catch (err) {
      this.connected = false;
      this.stream = null;
      this.updateContent();
      alert('Could not access camera/microphone: ' + err.message);
    }
  }

  handleDisconnectClick() {
    // Stop media tracks if active
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    this.connected = false;
    this.updateContent();
    // Update button text and handler
    if (this.connectBtn) {
      this.connectBtn.textContent = 'Connect';
      this.connectBtn.title = 'Connect to camera and microphone';
      // Remove previous click handlers
      this.connectBtn.replaceWith(this.connectBtn.cloneNode(true));
      this.connectBtn = document.getElementById('teacher-connect-btn');
      this.connectBtn.onclick = () => this.handleConnectClick();
    }
  }

  async handleSetupClick() {
    var settings = await this.sendRequestTo('class:ClassroomManager', 'GET_CAMERA_SETTINGS', this.cameraSettings);
    if ( settings )
      this.cameraSettings = settings;
  }

  _removeCustomButtons() {
    // No longer needed, as buttons are managed via SideWindow's clearCustomButtons
    this.connectButton = null;
    this.setupButton = null;
  }
  /**
   * Override getLayoutInfo to persist settings
   */
  async getLayoutInfo() {
    const layoutInfo = await super.getLayoutInfo();
    layoutInfo.selectedCameraId = this.cameraSettings.selectedCameraId;
    layoutInfo.selectedMicId = this.cameraSettings.selectedMicId;
    layoutInfo.selectedOutputId = this.cameraSettings.selectedOutputId;
    layoutInfo.speakerOn = this.cameraSettings.speakerOn;
    layoutInfo.volume = this.cameraSettings.volume;
    return layoutInfo;
  }

  /**
   * Override applyLayout to restore settings
   */
  async applyLayout(layoutInfo) {
    if (layoutInfo.selectedCameraId !== undefined) this.cameraSettings.selectedCameraId = layoutInfo.selectedCameraId;
    if (layoutInfo.selectedMicId !== undefined) this.cameraSettings.selectedMicId = layoutInfo.selectedMicId;
    if (layoutInfo.selectedOutputId !== undefined) this.cameraSettings.selectedOutputId = layoutInfo.selectedOutputId;
    if (layoutInfo.speakerOn !== undefined) this.cameraSettings.speakerOn = layoutInfo.speakerOn;
    if (layoutInfo.volume !== undefined) this.cameraSettings.volume = layoutInfo.volume;
    await super.applyLayout(layoutInfo);
    // If connected, update stream and UI
    if (this.connected) {
      await this.handleConnectClick();
    }
  }
}

export default TeacherSideWindow;
