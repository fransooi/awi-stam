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

class TeacherSideWindow extends SideWindow {
  constructor(parentId, containerId, initialHeight = 200) {
    super('Teacher', 'Teacher', parentId, containerId, initialHeight);
    this.connected = false;
    this.stream = null;
    this.videoElement = null;
    this.connectButton = null;
    this.setupButton = null;
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
    this._removeCustomButtons();

    // Get the controls element (same as TVSideWindow)
    const controlsElement = this.header.querySelector('.side-window-controls');
    if (controlsElement) {
      // Create a container for teacher buttons
      const teacherContainer = document.createElement('div');
      teacherContainer.className = 'teacher-titlebar-container flex items-center space-x-2 mr-2';

      // Connect button styled as a minimal flat button
      this.connectButton = document.createElement('button');
      this.connectButton.className = 'teacher-connect-btn px-2 py-1 rounded bg-transparent text-white text-xs focus:outline-none border-none shadow-none hover:bg-gray-700';
      this.connectButton.innerText = 'Connect';
      this.connectButton.title = 'Connect to camera and microphone';
      this.connectButton.style.background = 'transparent';
      this.connectButton.addEventListener('click', () => this.handleConnectClick());
      teacherContainer.appendChild(this.connectButton);

      // Setup button as a Font Awesome icon
      this.setupButton = document.createElement('button');
        this.setupButton.className = 'teacher-setup-btn px-2 py-1 rounded bg-transparent text-white hover:text-gray-200 text-xs focus:outline-none border-none shadow-none';
      this.setupButton.innerHTML = '<i class="fas fa-cog" style="color:white"></i>';
      this.setupButton.title = 'Setup';
      this.setupButton.style.background = 'transparent';
      this.setupButton.addEventListener('click', () => this.handleSetupClick());
      teacherContainer.appendChild(this.setupButton);

      // Insert the teacherContainer before the standard controls (enlarge/toggle/close)
      const enlargeButton = controlsElement.querySelector('.side-window-enlarge');
      if (enlargeButton) {
        controlsElement.insertBefore(teacherContainer, enlargeButton);
      } else {
        controlsElement.insertBefore(teacherContainer, controlsElement.firstChild);
      }

      this.teacherContainer = teacherContainer;
    }
    this.updateContent();
    return this.container;
  }

  updateContent() {
    if (!this.content) return;
    // Remove scrollbars and ensure content fills window
    this.content.innerHTML = '';
    this.content.className = 'flex flex-col items-center justify-center w-full h-full overflow-hidden bg-black';
    if (!this.connected) {
      // Not connected: show message
      const msg = document.createElement('div');
      msg.className = 'text-center text-gray-500 mt-8';
      msg.innerText = 'Not connected';
      this.content.appendChild(msg);
    } else if (this.stream) {
      // Connected: show video
      this.videoElement = document.createElement('video');
      this.videoElement.className = 'w-full h-full object-cover rounded border-none outline-none m-0 p-0';
      this.videoElement.autoplay = true;
      this.videoElement.muted = true;
      this.videoElement.playsInline = true;
      this.videoElement.srcObject = this.stream;
      this.videoElement.style.background = 'black';
      this.videoElement.style.display = 'block';
      this.content.appendChild(this.videoElement);
    }
  }

  async handleConnectClick() {
    // Request camera and microphone
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      this.stream = stream;
      this.connected = true;
      this.updateContent();
      // Future: here we would initiate WebRTC connection to AWI server using this.stream
    } catch (err) {
      this.connected = false;
      this.stream = null;
      this.updateContent();
      alert('Could not access camera/microphone: ' + err.message);
    }
  }

  handleSetupClick() {
    // Placeholder for future setup dialog
    alert('Setup dialog not implemented yet.');
  }

  _removeCustomButtons() {
    // Remove the teacherContainer if present
    if (this.teacherContainer && this.teacherContainer.parentNode) {
      this.teacherContainer.parentNode.removeChild(this.teacherContainer);
      this.teacherContainer = null;
    }
    this.connectButton = null;
    this.setupButton = null;
  }
}


export default TeacherSideWindow;
