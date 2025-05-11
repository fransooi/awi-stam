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
* @file ClassroomManager.js
* @author FL (Francois Lionet)
* @version 0.5
*
* @short This component manages the classroom
* @description
* This class provides a default implementation of the StatusBar component.
* It extends the BaseComponent class and implements the necessary methods
* for handling status updates and temporary status messages.
*/
import BaseComponent, { MESSAGES } from '../utils/BaseComponent.js';
import { SOCKETMESSAGES } from './sidewindows/SocketSideWindow.js';
import { MENUCOMMANDS } from './MenuBar.js'
import * as mediasoupClient from 'mediasoup-client';

export const CLASSROOMCOMMANDS = {
  CREATE_CLASSROOM: 'CLASSROOM_CREATE',
  JOIN_CLASSROOM: 'CLASSROOM_JOIN',
  LEAVE_CLASSROOM: 'CLASSROOM_LEAVE',
  TEACHER_CONNECT: 'TEACHER_CONNECT',
  TEACHER_CONNECTED: 'TEACHER_CONNECTED',
  STUDENT_CONNECT: 'STUDENT_CONNECT',
  STUDENT_CONNECTED: 'STUDENT_CONNECTED',
  GET_CAMERA_SETTINGS: 'GET_CAMERA_SETTINGS',
};

class ClassroomManager extends BaseComponent {
  /**
   * Constructor
   * @param {string} parentId - ID of the parent component
   */
  constructor(parentId = null,containerId) {
    super('Classroom', parentId,containerId);      
    this.classroomName = null;
    this.classroom = null;

    this.messageMap[SOCKETMESSAGES.CONNECTED] = this.handleConnected;
    this.messageMap[SOCKETMESSAGES.DISCONNECTED] = this.handleDisconnected;
    this.messageMap[CLASSROOMCOMMANDS.CREATE_CLASSROOM] = this.handleCreateClassroom;
    this.messageMap[CLASSROOMCOMMANDS.JOIN_CLASSROOM] = this.handleJoinClassroom;
    this.messageMap[CLASSROOMCOMMANDS.LEAVE_CLASSROOM] = this.handleLeaveClassroom;
    this.messageMap[CLASSROOMCOMMANDS.TEACHER_CONNECT] = this.handleTeacherConnect;
    this.messageMap[CLASSROOMCOMMANDS.STUDENT_CONNECT] = this.handleStudentConnect;
    this.messageMap[CLASSROOMCOMMANDS.GET_CAMERA_SETTINGS] = this.handleGetCameraSettings;
  }

  async init(options = {}) {
    await super.init(options);
  }
  
  async destroy() {
    await super.destroy();
  }
  async handleConnected(data, senderId) {
  }

  async handleDisconnected(data, senderId) {
    
  }

  async handleCreateClassroom(data, senderId) {
    if (!this.classroomOpen)
    {
      var classroomInfo = await this.showCreateClassroomDialog();
      if (classroomInfo)
      {
        // Send CREATE_CLASSROOM command to AWI server via FileSystem
        var response = await this.root.fileSystem.createClassroom({classroomInfo});
        if (!response.error)
        {
          this.classroomId = response.classroomId;
          this.classroomInfo = classroomInfo;
          this.classroomName = classroomInfo.name;
          this.classroomOpen='teacher';
          await this.sendMessageTo('class:SideBar', MESSAGES.ADD_SIDE_WINDOW, { type: 'TeacherSideWindow', height: 200 });        
        }
        else
        {
          this.root.messageBar.showErrorMessage(response.error);
        }
      }
    }
  }

  async handleTeacherConnect(data, senderId) {
    // If already connected, disconnect first (optional: implement disconnect logic)
    if (this.teacherConnected) {
      // Optionally disconnect previous session here
      this.teacherConnected = false;
    }
    try {
      // 1. Create mediasoup Device
      this.mediasoupDevice = new mediasoupClient.Device();
      // 2. Get router RTP capabilities from backend
      let response = await this.root.fileSystem.connectTeacher({
        action: 'getRouterRtpCapabilities',
        classroomId: this.classroomId
      });
      if (response.error) throw new Error(response.error);
      const rtpCapabilities = response.rtpCapabilities;
      const iceServers = response.iceServers || [{ urls: 'stun:stun.l.google.com:19302' }];
      // 3. Load Device
      await this.mediasoupDevice.load({ routerRtpCapabilities: rtpCapabilities });
      // 4. Create transport on backend
      response = await this.root.fileSystem.connectTeacher({
        action: 'createTransport',
        classroomId: this.classroomId
      });
      if (response.error) throw new Error(response.error);
      const { transportParams, teacherHandle, iceServers: transportIceServers } = response;
      // Use the iceServers from transport response if present, else fallback
      const effectiveIceServers = transportIceServers || iceServers;
      // 5. Create send transport on client
      this.sendTransport = this.mediasoupDevice.createSendTransport({ ...transportParams, iceServers: effectiveIceServers });
      // 6. Wire up DTLS connect event
      this.sendTransport.on('connect', async ({ dtlsParameters }, callback, errback) => {
        try {
          const resp = await this.root.fileSystem.connectTeacher({
            action: 'connectTransport',
            classroomId: this.classroomId,
            teacherHandle,
            dtlsParameters
          });
          if (resp.error) throw new Error(resp.error);
          callback();
        } catch (err) {
          errback(err);
        }
      });
      // 7. Wire up produce event
      this.sendTransport.on('produce', async ({ kind, rtpParameters }, callback, errback) => {
        try {
          const resp = await this.root.fileSystem.connectTeacher({
            action: 'produce',
            classroomId: this.classroomId,
            teacherHandle,
            kind,
            rtpParameters
          });
          if (resp.error) throw new Error(resp.error);
          callback({ id: resp.producerId });
        } catch (err) {
          errback(err);
        }
      });
      // 8. Produce audio/video tracks
      for (const track of data.stream.getTracks()) {
        var answer = await this.sendTransport.produce({ track });
        console.log('Teacher produce answer:', answer);
      }
      this.teacherConnected = true;
      this.teacherStream = data.stream;
      // 9. Notify TeacherSideWindow of success
      const sideWindowAnswer = await this.sendRequestTo('class:RightBar', MESSAGES.ADD_SIDE_WINDOW, { type: 'TeacherViewSideWindow', height: 200 });
      if (!sideWindowAnswer.error) {
        this.broadcast(CLASSROOMCOMMANDS.TEACHER_CONNECTED, { classroomId: this.classroomId });
        return true;
      } else {
        return false;
      }
    } catch (err) {
      console.error('Error in handleTeacherConnect:', err);
      return false;
    }
  }

  async handleJoinClassroom(data, senderId) {
    var classroomId = data.classroomId;
    if (!classroomId) {
      return { error: 'No classroomId provided.' };
    }
    let response = await this.root.fileSystem.joinClassroom({
      classroomId: classroomId
    });
    if (response.error) {
      return { error: response.error };
    }
    //this.classroomInfo = response.classroomInfo;
    //this.classroomName = response.classroomInfo.name;
    //await this.sendMessageTo('class:RightBar', MESSAGES.ADD_SIDE_WINDOW, { type: 'StudentSideWindow', height: 400 });
    return { classroomInfo: response.classroomInfo, studentHandle: response.studentHandle };
  }

  async handleStudentConnect(data, senderId) {
    // Connect as a student using only the provided classroomId
    const classroomId = data.classroomId;
    if (!classroomId) {
      return { error: 'No classroomId provided.' };
    }
    const studentHandle = data.studentHandle;
    if (!studentHandle) {
      return { error: 'No studentHandle provided.' };
    }
    try {
      // 1. Create mediasoup Device
      const device = new mediasoupClient.Device();
      // 2. Get router RTP capabilities from AWI server
      let response = await this.root.fileSystem.connectStudent({
        action: 'getRouterRtpCapabilities',
        classroomId,
        studentHandle
      });
      if (response.error) throw new Error(response.error);
      const rtpCapabilities = response.rtpCapabilities;
      const iceServers = response.iceServers || [{ urls: 'stun:stun.l.google.com:19302' }];
      // 3. Load Device
      await device.load({ routerRtpCapabilities: rtpCapabilities });
      // 4. Create transport on backend
      response = await this.root.fileSystem.connectStudent({
        action: 'createTransport',
        classroomId,
        studentHandle
      });
      if (response.error) throw new Error(response.error);
      const { id, iceParameters, iceCandidates, dtlsParameters } = response.transportParams;
      const transportIceServers = response.iceServers;
      const effectiveIceServers = transportIceServers || iceServers;
      // 5. Create receive transport in client
      const recvTransport = device.createRecvTransport({
        id,
        iceParameters,
        iceCandidates,
        dtlsParameters,
        iceServers: effectiveIceServers
      });
      // 6. Wire up DTLS connect event
      recvTransport.on('connect', async ({ dtlsParameters }, callback, errback) => {
        try {
          const resp = await this.root.fileSystem.connectStudent({
            action: 'connectTransport',
            classroomId,
            studentHandle,
            dtlsParameters
          });
          if (resp.error) throw new Error(resp.error);
          callback();
        } catch (err) {
          errback(err);
        }
      });
      // 7. Get teacher's producer info from server
      response = await this.root.fileSystem.connectStudent({
        action: 'consume',
        classroomId,
        studentHandle,
        rtpCapabilities
      });
      if (response.error) throw new Error(response.error);
      const { consumerParams } = response;
      if (!consumerParams || (typeof consumerParams !== 'object')) {
        throw new Error('No consumer parameters received');
      }
      // 8. Consume audio/video tracks
      //const consumer = await recvTransport.consume(consumerParams);
      //await consumer.resume();
      //const stream = new MediaStream([consumer.track]);
      //return { stream };
      const tracks = [];
      for (const kind of ['audio', 'video']) {
        const params = consumerParams[kind];
        if (params) {
          const { id, producerId, kind, rtpParameters } = params;
          //const { consumer, track } 
          var consumer= await recvTransport.consume({
            id,
            producerId,
            kind,
            rtpParameters
          });
          await consumer.resume();
          var track = consumer.track;
          tracks.push(track);
        }
      }
      if (!tracks.length) throw new Error('No tracks received from teacher');
      // 9. Create MediaStream from all tracks (audio/video)
      const stream = new MediaStream(tracks);
      return { stream };
    } catch (err) {
      return { error: err.message || 'Error connecting as student.' };
    }
  }

async handleLeaveClassroom(data, senderId) {
    if (this.classroomOpen)
    {
      if (this.classroomOpen=='teacher')
        await this.sendMessageTo('class:SideBar', MESSAGES.REMOVE_SIDE_WINDOW, { type: 'TeacherSideWindow', height: 400 });
      else
        await this.sendMessageTo('class:RightBar', MESSAGES.REMOVE_SIDE_WINDOW, { type: 'StudentSideWindow', height: 400 });
      this.classroomOpen=false;
    }
  }

  async getLayoutInfo() {
    const layoutInfo = await super.getLayoutInfo();
    return layoutInfo;
  }

  async applyLayout(layout) {
    await super.applyLayout(layout);
  }

  /**
   * Show the Create Classroom dialog and collect user input.
   * @returns {Promise<object|null>} Resolves with dialog data or null if cancelled
   */
  async showCreateClassroomDialog() {
    return new Promise((resolve) => {
      // Create dialog overlay
      const overlay = document.createElement('div');
      overlay.className = 'classroom-dialog-overlay';
      overlay.style = `position:fixed;top:0;left:0;width:100vw;height:100vh;z-index:10000;background:rgba(0,0,0,0.25);display:flex;align-items:center;justify-content:center;`;

      // Dialog container
      const dialog = document.createElement('div');
      dialog.className = 'classroom-dialog';
      dialog.style = `background:#2a2a2a;max-width:660px;width:98vw;padding:24px 32px 16px 32px;border-radius:4px;box-shadow:0 4px 8px rgba(0,0,0,0.3);font-family:sans-serif;position:relative;border:1px solid #444;color:#eee;`;
      overlay.appendChild(dialog);

      // Add show/hide methods to dialog for overlay
      dialog.hide = function() { overlay.style.display = 'none'; };
      dialog.show = function() { overlay.style.display = 'flex'; };
      // Show initially
      overlay.style.display = 'flex';

      // Title
      const title = document.createElement('h2');
      title.textContent = 'Create Classroom';
      title.style = 'color:#eee;margin-bottom:10px;';
      dialog.appendChild(title);

      // --- Classroom Title ---
      const titleLabel = document.createElement('label');
      titleLabel.textContent = 'Classroom Title:';
      titleLabel.htmlFor = 'classroom-title-input';
      titleLabel.style = 'color:#eee;';
      dialog.appendChild(titleLabel);
      const titleInput = document.createElement('input');
      titleInput.type = 'text';
      titleInput.id = 'classroom-title-input';
      titleInput.value = 'New classroom';
      titleInput.style = 'width:100%;margin-bottom:10px;display:block;font-size:1.1em;padding:4px 8px;background:#222;border:1px solid #444;color:#eee;border-radius:3px;';
      dialog.appendChild(titleInput);

      // --- Description + Icon Row ---
      const descIconRow = document.createElement('div');
      descIconRow.style = 'display:flex;flex-direction:row;align-items:flex-start;gap:16px;width:100%;margin-bottom:14px;height:180px;min-height:180px;';
      dialog.appendChild(descIconRow);

      // Description area (left)
      const descCol = document.createElement('div');
      descCol.style = 'flex:2 1 0;min-width:260px;';
      descIconRow.appendChild(descCol);
      const descLabel = document.createElement('label');
      descLabel.textContent = 'Description:';
      descLabel.htmlFor = 'classroom-desc-input';
      descLabel.style = 'color:#eee;';
      descCol.appendChild(descLabel);
      const descInput = document.createElement('textarea');
      descInput.id = 'classroom-desc-input';
      descInput.rows = 7;
      descInput.placeholder = 'Enter a description for the classroom';
      descInput.value = 'Enter a description for the classroom';
      descInput.style = 'width:100%;height:172px;min-width:260px;flex:2 1 0;display:block;font-size:1em;padding:8px 10px;background:#222;border:1px solid #444;color:#eee;border-radius:3px;resize:both;';
      descCol.appendChild(descInput);

      // Icon + Choose (right)
      const iconCol = document.createElement('div');
      iconCol.style = 'flex:1 1 0;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;min-width:150px;height:172px;';
      descIconRow.appendChild(iconCol);
      const iconLabel = document.createElement('label');
      iconLabel.textContent = 'Classroom Icon:';
      iconLabel.style = 'color:#eee;margin-bottom:6px;';
      iconCol.appendChild(iconLabel);
      const iconPreview = document.createElement('img');
      iconPreview.src = '/classroom.png?v=' + Date.now(); // Force reload, avoid cache
      iconPreview.alt = 'Classroom Icon';
      iconPreview.onerror = function(){ this.src='/classroom.png?v=' + Date.now(); }; // Always show default if error
      iconPreview.style = 'width:128px;height:128px;object-fit:contain;border:1px solid #666;border-radius:8px;background:#181818;margin-bottom:8px;';
      iconPreview.draggable = false;
      iconCol.appendChild(iconPreview);
      let iconFile = null;
      let iconChangedByUser = false;
      // Upload button
      const uploadBtn = document.createElement('button');
      uploadBtn.textContent = 'Choose';
      uploadBtn.style = 'margin:0 auto 0 auto;width:90px;height:36px;padding:6px 0;background:#333;color:#eee;border:1px solid #444;border-radius:4px;cursor:pointer;';
      iconCol.appendChild(uploadBtn);
      // Hidden file input
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = '.png,.jpg,.jpeg,image/png,image/jpeg';
      fileInput.style = 'display:none;';
      iconCol.appendChild(fileInput);
      uploadBtn.onclick = () => fileInput.click();
      fileInput.onchange = (e) => {
        if (fileInput.files && fileInput.files[0]) {
          const file = fileInput.files[0];
          if (!file.type.match(/image\/(png|jpeg)/)) return;
          const reader = new FileReader();
          reader.onload = (ev) => {
            iconPreview.src = ev.target.result;
            iconFile = file;
            iconChangedByUser = true;
          };
          reader.readAsDataURL(file);
        }
      };
      // Drag and drop
      iconPreview.ondragover = (e) => { e.preventDefault(); iconPreview.style.borderColor = '#007bff'; };
      iconPreview.ondragleave = (e) => { iconPreview.style.borderColor = '#666'; };
      iconPreview.ondrop = (e) => {
        e.preventDefault();
        iconPreview.style.borderColor = '#666';
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
          const file = e.dataTransfer.files[0];
          if (!file.type.match(/image\/(png|jpeg)/)) return;
          const reader = new FileReader();
          reader.onload = (ev) => {
            iconPreview.src = ev.target.result;
            iconFile = file;
            iconChangedByUser = true;
          };
          reader.readAsDataURL(file);
        }
      };

      // --- Project Title ---
      const projectTitleLabel = document.createElement('label');
      projectTitleLabel.textContent = 'Classroom Project:';
      projectTitleLabel.style = 'color:#eee;display:block;margin-top:16px;margin-bottom:4px;margin-top:8px;';
      dialog.appendChild(projectTitleLabel);
      // --- Mode/Project Section ---
      const projectSection = document.createElement('div');
      projectSection.style = 'border:1px solid #333;padding:10px 15px 10px 15px;margin-bottom:12px;border-radius:7px;background:#232323;display:flex;flex-direction:column;gap:2px;';
      dialog.appendChild(projectSection);
      // Mode combo
      // Mode row (label + select)
      const modeRow = document.createElement('div');
      modeRow.style = 'display:flex;flex-direction:row;align-items:center;gap:8px;margin-bottom:4px;';
      const modeLabel = document.createElement('label');
      modeLabel.textContent = 'Mode:';
      modeRow.appendChild(modeLabel);
      const modeSelect = document.createElement('select');
      modeSelect.style = 'min-width:120px;font-size:1em;';
      const modes = this.root.possibleModes || [];
      for (const mode of modes) {
        const opt = document.createElement('option');
        opt.value = mode.value;
        opt.textContent = mode.text;
        if (mode.value === this.root.currentMode) opt.selected = true;
        modeSelect.appendChild(opt);
      }
      modeRow.appendChild(modeSelect);
      projectSection.appendChild(modeRow);
      // Radio buttons for new/load project
      const radioRow1 = document.createElement('div');
      radioRow1.style = 'display:flex;flex-direction:row;align-items:center;margin-bottom:2px;';
      const radioNew = document.createElement('input');
      radioNew.type = 'radio';
      radioNew.name = 'project-type';
      radioNew.id = 'radio-new';
      radioNew.checked = true;
      const radioNewLabel = document.createElement('label');
      radioNewLabel.htmlFor = 'radio-new';
      radioNewLabel.textContent = ' Create a new project';
      radioNewLabel.style = 'margin-left:6px;';
      radioRow1.appendChild(radioNew);
      radioRow1.appendChild(radioNewLabel);
      projectSection.appendChild(radioRow1);
      const radioRow2 = document.createElement('div');
      radioRow2.style = 'display:flex;flex-direction:row;align-items:center;margin-bottom:8px;';
      const radioLoad = document.createElement('input');
      radioLoad.type = 'radio';
      radioLoad.name = 'project-type';
      radioLoad.id = 'radio-load';
      radioLoad.style = 'margin-left:0px;';
      const radioLoadLabel = document.createElement('label');
      radioLoadLabel.htmlFor = 'radio-load';
      radioLoadLabel.textContent = ' Load an existing project';
      radioLoadLabel.style = 'margin-left:6px;';
      radioRow2.appendChild(radioLoad);
      radioRow2.appendChild(radioLoadLabel);
      projectSection.appendChild(radioRow2);
      // Project name row with Choose button
      const projectNameRow = document.createElement('div');
      projectNameRow.style = 'display:flex;flex-direction:row;align-items:center;margin-top:6px;margin-bottom:2px;justify-content:space-between;';
      const projectNameLabel = document.createElement('span');
      projectNameLabel.textContent = 'Project name:';
      projectNameLabel.style = 'font-size:1em;font-weight:bold;margin-right:8px;';
      const projectNameValue = document.createElement('span');
      projectNameValue.textContent = 'None';
      projectNameValue.style = 'font-size:1em;font-weight:normal;flex-grow:1;text-align:left;';
      projectNameRow.appendChild(projectNameLabel);
      projectNameRow.appendChild(projectNameValue);
      // Choose button
      const chooseBtn = document.createElement('button');
      chooseBtn.textContent = 'Choose';
      chooseBtn.style = 'margin-left:18px;margin-bottom:0px;align-self:center;';
      projectNameRow.appendChild(chooseBtn);
      projectSection.appendChild(projectNameRow);
      // Project icon update logic
      let projectIconUrl = '';
      let selectedProjectName = '';
      let projectTemplate = [];
      let projectList = [];

      // --- Take Control Checkbox (inside project area) ---
      const controlDiv = document.createElement('div');
      controlDiv.style = 'margin-bottom:6px;margin-top:10px;';
      const controlCheckbox = document.createElement('input');
      controlCheckbox.type = 'checkbox';
      controlCheckbox.id = 'take-control-checkbox';
      controlCheckbox.checked = true;
      controlDiv.appendChild(controlCheckbox);
      const controlLabel = document.createElement('label');
      controlLabel.htmlFor = 'take-control-checkbox';
      controlLabel.textContent = ' Take control of student editors';
      controlDiv.appendChild(controlLabel);
      projectSection.appendChild(controlDiv);
      // --- Project Global Checkbox (inside project area) ---
      const globalDiv = document.createElement('div');
      globalDiv.style = 'margin-bottom:6px;';
      const globalCheckbox = document.createElement('input');
      globalCheckbox.type = 'checkbox';
      globalCheckbox.id = 'project-global-checkbox';
      globalCheckbox.checked = false;
      globalDiv.appendChild(globalCheckbox);
      const globalLabel = document.createElement('label');
      globalLabel.htmlFor = 'project-global-checkbox';
      globalLabel.textContent = ' Project global to all students';
      globalDiv.appendChild(globalLabel);
      projectSection.appendChild(globalDiv);
      // Choose button logic
      chooseBtn.onclick = async () => {
        if (radioNew.checked) {
          // Get templates
          // Hide dialog while waiting for response
          dialog.hide();
          projectTemplate = await this.root.project.sendRequestTo(this.root.project.componentId, 'PROJECT_GET_TEMPLATE', {});
          dialog.show();
          // For now, just pick the first template (mockup)
          if (projectTemplate) {
            selectedProjectName = projectTemplate.projectName;
            projectNameValue.textContent = selectedProjectName;
            if (!iconChangedByUser && projectTemplate.iconUrl) {
              iconPreview.src = projectTemplate.iconUrl;
              projectIconUrl = projectTemplate.iconUrl;
            }
          }
        } else {
          // Get project list
          projectList = await this.root.project.sendRequestTo(this.root.project.componentId, 'PROJECT_GET_PROJECT', {});
          if (projectList && projectList.length > 0) {
            // Hide dialog while waiting for response
            dialog.hide();
            selectedProjectName = projectList[0].name || projectList[0].title || projectList[0];
            dialog.show();
            projectNameValue.textContent = selectedProjectName;
            if (!iconChangedByUser && projectList[0].iconUrl) {
              iconPreview.src = projectList[0].iconUrl;
              projectIconUrl = projectList[0].iconUrl;
            }
          }
        }
      };


      // --- URL Section ---
      const urlDiv = document.createElement('div');
      urlDiv.style = 'margin-bottom:12px;display:flex;align-items:center;gap:8px;';
      const urlLabel = document.createElement('label');
      urlLabel.textContent = 'Classroom URL:';
      urlDiv.appendChild(urlLabel);
      const urlInput = document.createElement('input');
      urlInput.type = 'text';
      urlInput.readOnly = true;
      urlInput.value = window.location.origin + '/?classroom=XXXX';
      urlInput.style = 'flex:1 1 0;width:100%;margin-left:8px;background:#222;border:1px solid #444;color:#eee;border-radius:3px;padding:4px 8px;';
      urlDiv.appendChild(urlInput);
      // Copy button
      const copyBtn = document.createElement('button');
      copyBtn.textContent = 'Copy';
      copyBtn.style = 'margin-left:4px;padding:4px 10px;font-size:0.95em;background:#333;color:#eee;border:1px solid #444;border-radius:4px;cursor:pointer;';
      copyBtn.onclick = () => {
        navigator.clipboard.writeText(urlInput.value).then(() => {
          const oldText = copyBtn.textContent;
          copyBtn.textContent = 'Copied!';
          setTimeout(() => { copyBtn.textContent = oldText; }, 1000);
        });
      };
      urlDiv.appendChild(copyBtn);
      dialog.appendChild(urlDiv);

      // --- OK/Cancel Buttons ---
      const btnRow = document.createElement('div');
      btnRow.style = 'display:flex;justify-content:flex-end;gap:16px;margin-top:10px;';
      const okBtn = document.createElement('button');
      okBtn.textContent = 'OK';
      okBtn.style = 'min-width:80px;font-size:1.1em;';
      const cancelBtn = document.createElement('button');
      cancelBtn.textContent = 'Cancel';
      cancelBtn.style = 'min-width:80px;font-size:1.1em;';
      btnRow.appendChild(cancelBtn);
      btnRow.appendChild(okBtn);
      dialog.appendChild(btnRow);

      // --- Button Actions ---
      cancelBtn.onclick = () => {
        document.body.removeChild(overlay);
        resolve(null);
      };
      okBtn.onclick = () => {
        // Collect all data
        const data = {
          name: titleInput.value,
          description: descInput.value,
          icon: iconFile || iconPreview.src,
          takeControl: controlCheckbox.checked,
          mode: modeSelect.value,
          projectType: radioNew.checked ? 'new' : 'load',
          projectName: selectedProjectName,
          projectGlobal: globalCheckbox.checked,
          url: urlInput.value
        };
        document.body.removeChild(overlay);
        resolve(data);
      };
      // Show dialog
      document.body.appendChild(overlay);
      titleInput.focus();
    });
  }

  async handleGetCameraSettings(data, senderId) {
    return await this.showCameraSettingsDialog(data);  
  }

  async showCameraSettingsDialog(data = {}) {
    // Remove any previous dialog
    let oldDialog = document.getElementById('teacher-camera-settings-dialog');
    if (oldDialog) oldDialog.parentNode.removeChild(oldDialog);

    // Extract preset values from data
    const presetCameraId = data.selectedCameraId || '';
    const presetMicId = data.selectedMicId || '';
    const presetOutputId = data.selectedOutputId || '';
    const presetSpeakerOn = data.speakerOn !== undefined ? data.speakerOn : true;
    const presetVolume = data.volume !== undefined ? data.volume : 1.0;

    return new Promise((resolve) => {
      // Create overlay
      const overlay = document.createElement('div');
      overlay.id = 'teacher-camera-settings-dialog';
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
      closeBtn.onclick = () => {
        document.body.removeChild(overlay);
        resolve(null);
      };
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
      volumeSlider.value = Math.round((presetVolume || 1.0) * 100);
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
      cancelBtn.onclick = () => {
        document.body.removeChild(overlay);
        resolve(null);
      };
      // OK button
      const okBtn = document.createElement('button');
      okBtn.type = 'button';
      okBtn.textContent = 'OK';
      okBtn.style.backgroundColor = '#3b82f6';
      okBtn.style.color = '#fff';
      okBtn.onclick = () => {
        const result = {
          selectedCameraId: cameraSelect.value,
          selectedMicId: micSelect.value,
          selectedOutputId: outputSelect.value,
          speakerOn: speakerCheckbox.checked,
          volume: parseInt(volumeSlider.value, 10) / 100,
        };
        document.body.removeChild(overlay);
        resolve(result);
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
            if (opt.value === presetCameraId) {
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
            if (opt.value === presetMicId) {
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
            if (opt.value === presetOutputId) {
              opt.selected = true;
              foundOutput = true;
            }
            outputSelect.appendChild(opt);
          });
          if (!foundOutput && outputSelect.options.length > 0) outputSelect.options[0].selected = true;
        });
        // Speaker and volume
        speakerCheckbox.checked = presetSpeakerOn;
        volumeSlider.value = Math.round((presetVolume || 1.0) * 100);
        volumeSlider.disabled = !presetSpeakerOn;
        speakerIcon.innerHTML = presetSpeakerOn ? '<i class="fa fa-volume-up"></i>' : '<i class="fa fa-volume-off"></i>';
      };
      populateDevices();
    });
  }


}
export default ClassroomManager;

 