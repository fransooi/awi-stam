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
    this._videoResizeObserver = null;
    this.token = 'teacher';
  }

  async init(options) {
    await super.init(options);
  }

  async destroy() {
    // Stop media tracks if active
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
      await this.sendRequestTo('class:ClassroomManager', CLASSROOMCOMMANDS.TEACHER_LEAVE_CLASSROOM, { classroomId: this.classroomId, fromTeacher: true });
      this.classroomId = null;
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
    // Remove any previously added custom buttons (for hot reload/dev)
    if (typeof this.clearCustomButtons === 'function') this.clearCustomButtons();

    // Add Connect/Disconnect icon button
    const connectIcon = this.connected ? 'fa-unlink' : 'fa-plug';
    this.connectBtn = this.addIconButton({
      key: 'connection',
      iconName: connectIcon,
      hint: this.connected ? 'Disconnect from camera and microphone' : 'Connect to camera and microphone',
      onClick: () => { this.handleConnectClick(); }
    });

    // Add setup icon button (Font Awesome)
    this.addIconButton({
      key: 'setup',
      iconName: 'fa-cog', 
      hint: 'Setup',
      onClick: () => this.handleSetupClick()
    });

    this.updateContent();
    return this.container;
  }

  // Helper to update video height based on aspect ratio
  updateVideoHeight() {
    if (this.videoElement.videoWidth && this.videoElement.videoHeight) {
      const aspect = this.videoElement.videoWidth / this.videoElement.videoHeight;
      this.videoElement.style.height = `${this.videoElement.offsetWidth / aspect}px`;
    }
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
    }
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
        this.updateIconButton({ key: 'connection', iconName: 'fa-plug', hint: 'Connect camera and microphone' }, () => { this.handleConnectClick(); });
        this.updateContent();
      }
      else
      {
        this.connected = true;
        this.stream = stream;
        this.updateIconButton({ key: 'connection', iconName: 'fa-unlink', hint: 'Disconnect camera and microphone' }, () => { this.handleDisconnectClick(); });
        this.updateContent();
      }
    } catch (err) {
      this.connected = false;
      this.stream = null;
      this.updateIconButton({ key: 'connection', iconName: 'fa-plug', hint: 'Connect camera and microphone' }, () => { this.handleConnectClick(); });
      this.updateContent();
    }
  }

  async handleDisconnectClick() {
    // Send request to ClassroomManager to stop mediasoup connection
    var answer = await this.sendRequestTo('class:ClassroomManager', CLASSROOMCOMMANDS.TEACHER_DISCONNECT, { stream: this.stream }); 
    this.connected = false;
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    this.updateIconButton({ key: 'connection', iconName: 'fa-plug', hint: 'Connect camera and microphone' }, () => { this.handleConnectClick(); });
    this.updateContent();
    if (answer.error)
      this.root.messageBar.showErrorMessage(answer.error);
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
