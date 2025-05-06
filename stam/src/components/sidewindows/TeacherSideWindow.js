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
    // Settings properties
    this.selectedCameraId = '';
    this.selectedMicId = '';
    this.selectedOutputId = '';
    this.speakerOn = true;
    this.volume = 1.0; // 0.0 - 1.0
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
      // Not connected: show message
      const msg = document.createElement('div');
      msg.className = 'side-window-placeholder';
      msg.innerText = 'Not connected';
      this.content.appendChild(msg);
    } else if (this.stream) {
      // Connected: show video
      this.videoElement = document.createElement('video');
      this.videoElement.className = 'side-window-video';
      this.videoElement.autoplay = true;
      this.videoElement.muted = !this.speakerOn;
      this.videoElement.playsInline = true;
      this.videoElement.srcObject = this.stream;
      this.videoElement.style.background = 'black';
      this.videoElement.style.display = 'block';
      this.videoElement.style.width = '100%';
      this.videoElement.style.height = 'auto';
      // Volume
      this.videoElement.volume = this.volume;
      // Try to set sinkId for output selection (if supported)
      if (this.selectedOutputId && typeof this.videoElement.sinkId !== 'undefined') {
        this.videoElement.setSinkId(this.selectedOutputId).catch(() => {});
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
    // Request camera and microphone with selected device IDs if set
    try {
      const constraints = {
        video: this.selectedCameraId ? { deviceId: { exact: this.selectedCameraId } } : true,
        audio: this.selectedMicId ? { deviceId: { exact: this.selectedMicId } } : true
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.stream = stream;
      this.connected = true;
      this.updateContent();
      // Update button text and handler
      if (this.connectBtn) {
        this.connectBtn.textContent = 'Disconnect';
        this.connectBtn.title = 'Disconnect from camera and microphone';
        // Remove previous click handlers
        this.connectBtn.replaceWith(this.connectBtn.cloneNode(true));
        this.connectBtn = document.getElementById('teacher-connect-btn');
        this.connectBtn.onclick = () => this.handleDisconnectClick();
      }
      // Future: here we would initiate WebRTC connection to AWI server using this.stream
    } catch (err) {
      this.connected = false;
      this.stream = null;
      this.updateContent();
      alert('Could not access camera/microphone: ' + err.message);
      if (this.connectBtn) {
        this.connectBtn.textContent = 'Connect';
        this.connectBtn.title = 'Connect to camera and microphone';
        this.connectBtn.onclick = () => this.handleConnectClick();
      }
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

  async showSettingsDialog() {
    // Remove any previous dialog
    let oldDialog = document.getElementById('teacher-settings-dialog');
    if (oldDialog) oldDialog.parentNode.removeChild(oldDialog);

    // Create overlay
    const overlay = document.createElement('div');
    overlay.id = 'teacher-settings-dialog';
    overlay.className = 'playlist-dialog'; // Reuse modal CSS
    overlay.style.zIndex = 2000;

    // Dialog content
    const dialog = document.createElement('div');
    dialog.className = 'playlist-dialog-content';
    dialog.style.maxWidth = '400px';

    // Dialog header
    const header = document.createElement('div');
    header.className = 'playlist-dialog-header';
    header.style.display = 'flex';
    header.style.justifyContent = 'space-between';
    header.style.alignItems = 'center';
    header.innerHTML = '<span>Settings</span>';
    // Close button
    const closeBtn = document.createElement('button');
    closeBtn.className = 'playlist-dialog-close';
    closeBtn.innerHTML = '&times;';
    closeBtn.onclick = () => document.body.removeChild(overlay);
    header.appendChild(closeBtn);
    dialog.appendChild(header);

    // Form
    const form = document.createElement('form');
    form.style.display = 'flex';
    form.style.flexDirection = 'column';
    form.style.gap = '14px';
    form.onsubmit = e => { e.preventDefault(); };

    // Camera select
    const cameraGroup = document.createElement('div');
    const cameraLabel = document.createElement('label');
    cameraLabel.textContent = 'Camera:';
    cameraLabel.htmlFor = 'settings-camera';
    const cameraSelect = document.createElement('select');
    cameraSelect.id = 'settings-camera';
    cameraSelect.style.width = '100%';
    cameraGroup.appendChild(cameraLabel);
    cameraGroup.appendChild(cameraSelect);
    form.appendChild(cameraGroup);

    // Microphone select
    const micGroup = document.createElement('div');
    const micLabel = document.createElement('label');
    micLabel.textContent = 'Microphone:';
    micLabel.htmlFor = 'settings-mic';
    const micSelect = document.createElement('select');
    micSelect.id = 'settings-mic';
    micSelect.style.width = '100%';
    micGroup.appendChild(micLabel);
    micGroup.appendChild(micSelect);
    form.appendChild(micGroup);

    // Output select
    const outputGroup = document.createElement('div');
    const outputLabel = document.createElement('label');
    outputLabel.textContent = 'Audio Output:';
    outputLabel.htmlFor = 'settings-output';
    const outputSelect = document.createElement('select');
    outputSelect.id = 'settings-output';
    outputSelect.style.width = '100%';
    outputGroup.appendChild(outputLabel);
    outputGroup.appendChild(outputSelect);
    form.appendChild(outputGroup);

    // Speaker ON/OFF and volume
    const soundGroup = document.createElement('div');
    soundGroup.style.display = 'flex';
    soundGroup.style.alignItems = 'center';
    soundGroup.style.gap = '10px';
    // Speaker checkbox
    const speakerCheckbox = document.createElement('input');
    speakerCheckbox.type = 'checkbox';
    speakerCheckbox.id = 'settings-speaker';
    speakerCheckbox.style.marginRight = '6px';
    // Speaker icon
    const speakerIcon = document.createElement('span');
    speakerIcon.innerHTML = '<i class="fa fa-volume-up"></i>';
    speakerIcon.style.fontSize = '18px';
    speakerIcon.style.marginRight = '4px';
    // Volume slider
    const volumeSlider = document.createElement('input');
    volumeSlider.type = 'range';
    volumeSlider.min = '0';
    volumeSlider.max = '100';
    volumeSlider.value = '100';
    volumeSlider.style.flex = '1';
    volumeSlider.id = 'settings-volume';
    // Enable/disable slider based on checkbox
    speakerCheckbox.onchange = () => {
      volumeSlider.disabled = !speakerCheckbox.checked;
      speakerIcon.innerHTML = speakerCheckbox.checked ? '<i class="fa fa-volume-up"></i>' : '<i class="fa fa-volume-off"></i>';
    };
    soundGroup.appendChild(speakerCheckbox);
    soundGroup.appendChild(speakerIcon);
    soundGroup.appendChild(volumeSlider);
    form.appendChild(soundGroup);

    // Buttons
    const buttonRow = document.createElement('div');
    buttonRow.className = 'playlist-dialog-buttons';
    // Cancel button
    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.textContent = 'Cancel';
    cancelBtn.onclick = () => document.body.removeChild(overlay);
    // OK button
    const okBtn = document.createElement('button');
    okBtn.type = 'button';
    okBtn.textContent = 'OK';
    okBtn.style.backgroundColor = '#3b82f6';
    okBtn.style.color = '#fff';
    okBtn.onclick = () => {
      // Save settings here as needed
      this.selectedCameraId = cameraSelect.value;
      this.selectedMicId = micSelect.value;
      this.selectedOutputId = outputSelect.value;
      this.speakerOn = speakerCheckbox.checked;
      this.volume = parseInt(volumeSlider.value, 10) / 100;
      document.body.removeChild(overlay);
      // If connected, re-acquire stream if camera/mic changed
      if (this.connected) {
        this.handleConnectClick();
      }
      // If video element exists, update audio output and volume
      if (this.videoElement) {
        this.videoElement.muted = !this.speakerOn;
        this.videoElement.volume = this.volume;
        if (this.selectedOutputId && typeof this.videoElement.sinkId !== 'undefined') {
          this.videoElement.setSinkId(this.selectedOutputId).catch(() => {});
        }
      }
    };
    buttonRow.appendChild(cancelBtn);
    buttonRow.appendChild(okBtn);
    form.appendChild(buttonRow);

    dialog.appendChild(form);
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    // Helper: populate device selects
    const populateDevices = () => {
      navigator.mediaDevices.enumerateDevices().then(devices => {
        // Cameras
        cameraSelect.innerHTML = '';
        let foundCamera = false;
        devices.filter(d => d.kind === 'videoinput').forEach(d => {
          const opt = document.createElement('option');
          opt.value = d.deviceId;
          opt.textContent = d.label || 'Camera ' + (cameraSelect.length + 1);
          if (d.deviceId === this.selectedCameraId) {
            opt.selected = true;
            foundCamera = true;
          }
          cameraSelect.appendChild(opt);
        });
        if (!foundCamera && cameraSelect.options.length > 0) cameraSelect.options[0].selected = true;
        // Microphones
        micSelect.innerHTML = '';
        let foundMic = false;
        devices.filter(d => d.kind === 'audioinput').forEach(d => {
          const opt = document.createElement('option');
          opt.value = d.deviceId;
          opt.textContent = d.label || 'Microphone ' + (micSelect.length + 1);
          if (d.deviceId === this.selectedMicId) {
            opt.selected = true;
            foundMic = true;
          }
          micSelect.appendChild(opt);
        });
        if (!foundMic && micSelect.options.length > 0) micSelect.options[0].selected = true;
        // Outputs (audiooutput)
        outputSelect.innerHTML = '';
        let foundOutput = false;
        devices.filter(d => d.kind === 'audiooutput').forEach(d => {
          const opt = document.createElement('option');
          opt.value = d.deviceId;
          opt.textContent = d.label || 'Speaker ' + (outputSelect.length + 1);
          if (d.deviceId === this.selectedOutputId) {
            opt.selected = true;
            foundOutput = true;
          }
          outputSelect.appendChild(opt);
        });
        if (!foundOutput && outputSelect.options.length > 0) outputSelect.options[0].selected = true;
      });
      // Speaker and volume
      speakerCheckbox.checked = this.speakerOn;
      volumeSlider.value = Math.round((this.volume || 1.0) * 100);
      volumeSlider.disabled = !this.speakerOn;
      speakerIcon.innerHTML = this.speakerOn ? '<i class="fa fa-volume-up"></i>' : '<i class="fa fa-volume-off"></i>';
    };
    populateDevices();
  }

  handleSetupClick() {
    this.showSettingsDialog();
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
    layoutInfo.selectedCameraId = this.selectedCameraId;
    layoutInfo.selectedMicId = this.selectedMicId;
    layoutInfo.selectedOutputId = this.selectedOutputId;
    layoutInfo.speakerOn = this.speakerOn;
    layoutInfo.volume = this.volume;
    return layoutInfo;
  }

  /**
   * Override applyLayout to restore settings
   */
  async applyLayout(layoutInfo) {
    if (layoutInfo.selectedCameraId !== undefined) this.selectedCameraId = layoutInfo.selectedCameraId;
    if (layoutInfo.selectedMicId !== undefined) this.selectedMicId = layoutInfo.selectedMicId;
    if (layoutInfo.selectedOutputId !== undefined) this.selectedOutputId = layoutInfo.selectedOutputId;
    if (layoutInfo.speakerOn !== undefined) this.speakerOn = layoutInfo.speakerOn;
    if (layoutInfo.volume !== undefined) this.volume = layoutInfo.volume;
    await super.applyLayout(layoutInfo);
    // If connected, update stream and UI
    if (this.connected) {
      await this.handleConnectClick();
    }
  }
}

export default TeacherSideWindow;
