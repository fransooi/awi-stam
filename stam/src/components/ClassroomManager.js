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
  CREATE_CLASSROOM: 'CREATE_CLASSROOM',
  JOIN_CLASSROOM: 'JOIN_CLASSROOM',
  DELETE_CLASSROOM: 'DELETE_CLASSROOM',
  LEAVE_CLASSROOM: 'LEAVE_CLASSROOM',
  TEACHER_LEAVE_CLASSROOM: 'TEACHER_LEAVE_CLASSROOM',
  STUDENT_LEAVE_CLASSROOM: 'STUDENT_LEAVE_CLASSROOM',
  TEACHER_CONNECT: 'TEACHER_CONNECT',
  TEACHER_DISCONNECT: 'TEACHER_DISCONNECT',
  TEACHER_CONNECTED: 'TEACHER_CONNECTED',
  TEACHER_DISCONNECTED: 'TEACHER_DISCONNECTED',
  STUDENT_CONNECT: 'STUDENT_CONNECT',
  STUDENT_CONNECTED: 'STUDENT_CONNECTED',
  STUDENT_DISCONNECT: 'STUDENT_DISCONNECT',
  STUDENT_DISCONNECTED: 'STUDENT_DISCONNECTED',
  GET_CAMERA_SETTINGS: 'GET_CAMERA_SETTINGS',
  TEACHER_VIEW_CONNECT: 'TEACHER_VIEW_CONNECT',
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
    this.messageMap[CLASSROOMCOMMANDS.DELETE_CLASSROOM] = this.handleDeleteClassroom;
    this.messageMap[CLASSROOMCOMMANDS.LEAVE_CLASSROOM] = this.handleLeaveClassroom;
    this.messageMap[CLASSROOMCOMMANDS.TEACHER_LEAVE_CLASSROOM] = this.handleTeacherLeaveClassroom;
    this.messageMap[CLASSROOMCOMMANDS.STUDENT_LEAVE_CLASSROOM] = this.handleStudentLeaveClassroom;
    this.messageMap[CLASSROOMCOMMANDS.TEACHER_CONNECT] = this.handleTeacherConnect;
    this.messageMap[CLASSROOMCOMMANDS.TEACHER_DISCONNECT] = this.handleTeacherDisconnect;
    this.messageMap[CLASSROOMCOMMANDS.STUDENT_CONNECT] = this.handleStudentConnect;
    this.messageMap[CLASSROOMCOMMANDS.STUDENT_DISCONNECT] = this.handleStudentDisconnect;
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
    if (!this.teacherClassroomOpen)
    {
      var classroomInfo = await this.showCreateClassroomDialog();
      if (classroomInfo)
      {
        // Send CREATE_CLASSROOM command to AWI server via FileSystem
        var response = await this.root.fileSystem.createClassroom({classroomInfo});
        if (response.error)
          this.root.messageBar.showErrorMessage(response.error);
      }
    }
  }

  async handleJoinClassroom(data, senderId) {
    var classroomList = await this.root.fileSystem.getClassroomList();
    if (!classroomList.error)
    {
      var response = await this.showJoinClassroomDialog(classroomList,this.root.userName);
      if (response)
      {
        if (response.classroomType == 'teacher')
        {
          if (this.teacherClassroomOpen)
            await this.handleTeacherLeaveClassroom();
          // Send JOIN_CLASSROOM command to AWI server via FileSystem
          var response = await this.root.fileSystem.joinClassroom({
            type: 'teacher', 
            classroomId: response.classroomId, 
            displayName: response.displayName });
          if (!response.error)
          {
            this.teacherClassroomOpen=true;
            this.teacherClassroomId = response.classroomId;
            this.teacherClassroomInfo = response.classroomInfo;
            this.teacherHandle = response.teacherHandle;
            this.teacherName = response.teacherName;
            this.sendMessageTo('class:SideBar', MESSAGES.ADD_SIDE_WINDOW, { type: 'TeacherSideWindow', height: 400 }); 
          }
          else
          {
            this.root.messageBar.showErrorMessage(response.error);
          }
        }
        else{
          if (this.studentClassroomOpen)
            await this.handleStudentLeaveClassroom();
          // Send JOIN_CLASSROOM command to AWI server via FileSystem
          var response = await this.root.fileSystem.joinClassroom({
            type: 'student', 
            classroomId: response.classroomId, 
            displayName: response.displayName});
          if (!response.error)
          {
            this.studentClassroomOpen=true;
            this.studentClassroomId = response.classroomId;
            this.studentClassroomInfo = response.classroomInfo;
            this.studentHandle = response.studentHandle;
            this.studentName = response.studentName;
            await this.sendMessageTo('class:SideBar', MESSAGES.ADD_SIDE_WINDOW, { type: 'TeacherViewSideWindow', height: 400 }); 
            if (this.teacherConnected)
              await this.sendMessageTo('class:TeacherViewSideWindow', CLASSROOMCOMMANDS.TEACHER_VIEW_CONNECT, { classroomId: this.studentClassroomId, studentHandle: this.studentHandle });
          }
          else
          {
            this.root.messageBar.showErrorMessage(response.error);
          }
        }
      }        
    }
    else
    {
      this.root.messageBar.showErrorMessage(response.error);
    }
  }
  async handleDeleteClassroom(data, senderId) {
    if (this.teacherClassroomOpen)
      await this.handleTeacherLeaveClassroom();
    if (this.studentClassroomOpen)
      await this.handleStudentLeaveClassroom();
    var classroomList = await this.root.fileSystem.getClassroomList();
    if (!classroomList.error)
    {
      var teacherClassroomList = classroomList.filter(classroom => classroom.createdBy == this.root.userName);
      var response = await this.showDeleteClassroomDialog(teacherClassroomList);
      if (response)
      {
        // Send DELETE_CLASSROOM command to AWI server via FileSystem
        var response = await this.root.fileSystem.deleteClassroom({classroomId: response.classroomId});
        if (!response.error)
        {
          this.root.messageBar.showSuccessMessage('Classroom deleted successfully');
        }
        else
        {
          this.root.messageBar.showErrorMessage(response.error);
        }
      }
    }
    else
    {
      this.root.messageBar.showErrorMessage(response.error);
    }
  }
  async handleLeaveClassroom(data,senderId){
    await this.handleTeacherLeaveClassroom(data,senderId);
    await this.handleStudentLeaveClassroom(data,senderId);
  }
  async handleTeacherLeaveClassroom(data, senderId) {
    if (this.teacherClassroomOpen)
    {
      if (this.teacherConnected)
        await this.handleTeacherDisconnect();
      await this.root.fileSystem.leaveClassroom({
        classroomId: this.teacherClassroomId,
        teacherHandle: this.teacherHandle,
        type: 'teacher'
      });
      this.teacherClassroomOpen=false;
      this.teacherClassroomId = null;
      this.teacherClassroomInfo = null;
      this.teacherHandle = null;
      this.teacherName = null;
      await this.sendMessageTo('class:SideBar', MESSAGES.REMOVE_SIDE_WINDOW, { name: 'TeacherSideWindow' });
    }
  }

  async handleStudentLeaveClassroom(data, senderId) {
    if (this.studentClassroomOpen)
    {
      if (this.studentConnected)
        await this.handleStudentDisconnect();
      await this.root.fileSystem.leaveClassroom({
        classroomId: this.studentClassroomId,
        studentHandle: this.studentHandle,
        type: 'student'
      });
      this.studentClassroomOpen=false;
      this.studentClassroomId = null;
      this.studentClassroomInfo = null;
      this.studentHandle = null;
      this.studentName = null;
      await this.sendMessageTo('class:SideBar', MESSAGES.REMOVE_SIDE_WINDOW, { name: 'TeacherViewSideWindow' });
    }
  }

  async handleTeacherConnect(data, senderId) {
    if (!this.teacherClassroomOpen)
        return { error: 'No classroom open.' };
    if (this.teacherConnected) {
      await this.handleTeacherDisconnect();
    }
    var classroomId = this.teacherClassroomId;
    try {
      // 1. Create mediasoup Device
      this.mediasoupDevice = new mediasoupClient.Device();
      // 2. Get router RTP capabilities from backend
      let response = await this.root.fileSystem.connectTeacher({
        action: 'getRouterRtpCapabilities',
        classroomId: classroomId,
        teacherHandle: this.teacherHandle
      });
      if (response.error) throw new Error(response.error);
      const rtpCapabilities = response.rtpCapabilities;
      const iceServers = response.iceServers || [{ urls: 'stun:stun.l.google.com:19302' }];
      // 3. Load Device
      await this.mediasoupDevice.load({ routerRtpCapabilities: rtpCapabilities });
      // 4. Create transport on backend
      response = await this.root.fileSystem.connectTeacher({
        action: 'createTransport',
        classroomId: classroomId,
        teacherHandle: this.teacherHandle
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
            classroomId: classroomId,
            teacherHandle: this.teacherHandle,
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
            classroomId: classroomId,
            teacherHandle: this.teacherHandle,
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
      this.teacherHandle = teacherHandle;
      this.broadcast(CLASSROOMCOMMANDS.TEACHER_CONNECTED, { classroomId: classroomId, teacherHandle: this.teacherHandle });
      return true;
    } catch (err) {
      return { error: err.message };
    }
  }

  async handleTeacherDisconnect(data, senderId) {
    if (this.teacherConnected)
    {
      await this.root.fileSystem.disconnectTeacher({
        classroomId: this.teacherClassroomId,
        teacherHandle: this.teacherHandle
      });
      this.teacherConnected = false;
      this.teacherStream = null;
      this.broadcast(CLASSROOMCOMMANDS.TEACHER_DISCONNECTED, { classroomId: this.teacherClassroomId, teacherHandle: this.teacherHandle });
    }
  }

  async handleStudentConnect(data, senderId) {
    // Connect as a student using only the provided classroomId
    const classroomId = this.studentClassroomId;
    if (!classroomId)
      return { error: 'No classroomId provided.' };
    if (!this.studentHandle)
      return { error: 'No studentHandle provided.' };
    try {
      // 1. Create mediasoup Device
      const device = new mediasoupClient.Device();
      // 2. Get router RTP capabilities from AWI server
      let response = await this.root.fileSystem.connectStudent({
        action: 'getRouterRtpCapabilities',
        classroomId,
        studentHandle: this.studentHandle
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
        studentHandle: this.studentHandle
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
            studentHandle: this.studentHandle,
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
        studentHandle: this.studentHandle,
        rtpCapabilities
      });
      if (response.error) throw new Error(response.error);
      const { consumerParams } = response;
      if (!consumerParams || (typeof consumerParams !== 'object')) {
        throw new Error('No consumer parameters received');
      }
      // 8. Consume audio/video tracks
      const tracks = [];
      for (const kind of ['audio', 'video']) {
        const params = consumerParams[kind];
        if (params) {
          const { id, producerId, kind, rtpParameters } = params;
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
      this.studentStream = stream;
      return { stream };
    } catch (err) {
      return { error: err.message || 'Error connecting as student.' };
    }
  }

  async handleStudentDisconnect(data, senderId) {
    if (this.studentConnected)
    {
      await this.root.fileSystem.disconnectStudent({
        classroomId: this.studentClassroomId,
        studentHandle: this.studentHandle
      });
      this.studentConnected = false;
      this.studentStream = null;
      this.broadcast(CLASSROOMCOMMANDS.STUDENT_DISCONNECTED, { classroomId: this.studentClassroomId, studentHandle: this.studentHandle });
    }
  }

  async getLayoutInfo() {
    const layoutInfo = await super.getLayoutInfo();
    return layoutInfo;
  }

  async applyLayout(layout) {
    await super.applyLayout(layout);
  }

  async showDeleteClassroomDialog(classroomInfoList) {
    return new Promise((resolve) => {
      // Overlay
      const overlay = document.createElement('div');
      overlay.className = 'classroom-dialog-overlay';
      overlay.style = `position:fixed;top:0;left:0;width:100vw;height:100vh;z-index:10000;background:rgba(0,0,0,0.25);display:flex;align-items:center;justify-content:center;`;

      // Dialog
      const dialog = document.createElement('div');
      dialog.className = 'classroom-dialog';
      dialog.style = `background:#23232a;max-width:640px;width:96vw;padding:26px 32px 18px 32px;border-radius:5px;box-shadow:0 4px 8px rgba(0,0,0,0.32);font-family:sans-serif;position:relative;border:1px solid #444;color:#eee;`;
      overlay.appendChild(dialog);
      dialog.hide = function() { overlay.style.display = 'none'; };
      dialog.show = function() { overlay.style.display = 'flex'; };
      overlay.style.display = 'flex';

      // Title
      const title = document.createElement('h2');
      title.textContent = 'Delete a Classroom';
      title.style = 'color:#eee;margin-bottom:12px;';
      dialog.appendChild(title);

      // Scrollable classroom list
      const listContainer = document.createElement('div');
      listContainer.style = 'max-height:260px;overflow-y:auto;margin-bottom:12px;border:1px solid #333;border-radius:4px;background:#19191e;';
      dialog.appendChild(listContainer);

      // Helper for classroom icon
      function classroomIcon(iconUrl) {
        const img = document.createElement('img');
        img.src = iconUrl || '/classroom.png?v=' + Date.now();
        img.alt = 'Icon';
        img.onerror = function(){ this.src='/classroom.png?v=' + Date.now(); };
        img.style = 'width:48px;height:48px;object-fit:cover;border-radius:8px;background:#222;border:1px solid #444;';
        return img;
      }

      // Selection state
      let selectedIdx = -1;
      let selectedClassroom = null;
      // Render classroom list
      classroomInfoList.forEach((info, idx) => {
        const item = document.createElement('div');
        item.className = 'classroom-list-item';
        item.style = 'display:flex;align-items:flex-start;gap:14px;padding:10px 14px;cursor:pointer;border-bottom:1px solid #29293a;transition:background 0.18s;';
        if (idx === classroomInfoList.length-1) item.style += 'border-bottom:none;';
        // Icon
        const icon = classroomIcon(info.iconUrl);
        item.appendChild(icon);
        // Info
        const infoCol = document.createElement('div');
        infoCol.style = 'flex:1 1 0;min-width:0;';
        // Title
        const title = document.createElement('div');
        title.textContent = info.title || info.name || 'Untitled classroom';
        title.style = 'color:#eee;font-size:1.13em;font-weight:600;line-height:1.1;margin-bottom:2px;word-break:break-word;';
        infoCol.appendChild(title);
        // Description
        const desc = document.createElement('div');
        desc.textContent = info.description || '';
        desc.style = 'color:#bbb;font-size:0.97em;line-height:1.2;white-space:pre-line;word-break:break-word;';
        infoCol.appendChild(desc);
        item.appendChild(infoCol);
        // Select logic
        item.onclick = () => {
          // Unselect all
          [...listContainer.children].forEach(c => c.style.background = 'transparent');
          item.style.background = '#2a3a5a';
          selectedIdx = idx;
          selectedClassroom = info;
          updateOkButton();
        };
        // Double-click = select and simulate OK
        item.ondblclick = () => {
          selectedIdx = idx;
          selectedClassroom = info;
          updateOkButton();
          okBtn.click();
        };
        listContainer.appendChild(item);
      });

      // --- Buttons ---
      const btnRow = document.createElement('div');
      btnRow.style = 'display:flex;justify-content:flex-end;gap:14px;margin-top:10px;';
      // OK
      const okBtn = document.createElement('button');
      okBtn.textContent = 'OK';
      okBtn.style = 'min-width:110px;font-size:1.08em;';
      // Cancel
      const cancelBtn = document.createElement('button');
      cancelBtn.textContent = 'Cancel';
      cancelBtn.style = 'min-width:80px;font-size:1.08em;';
      btnRow.appendChild(cancelBtn);
      btnRow.appendChild(okBtn);
      dialog.appendChild(btnRow);

      // --- Button logic ---
      function updateOkButton() {
        if (selectedClassroom) {
          okBtn.disabled = false;
          okBtn.style.opacity = '1';
        } else {
          okBtn.disabled = true;
          okBtn.style.opacity = '0.6';
        }
      }
      // Cancel action
      cancelBtn.onclick = () => {
        document.body.removeChild(overlay);
        resolve(null);
      };
      // OK action
      okBtn.onclick = () => {
        if (!selectedClassroom) return;
        document.body.removeChild(overlay);
        resolve({ classroomId: selectedClassroom.id });
      };
      // Keyboard: Enter/ESC
      dialog.onkeydown = (e) => {
        if (e.key === 'Escape') { cancelBtn.click(); }
        if (e.key === 'Enter' && okBtn.disabled === false) okBtn.click();
      };
      // Add to DOM
      document.body.appendChild(overlay);
      // Initial state
      updateOkButton();
    });
  }
  async showJoinClassroomDialog(classroomInfoList, userName) {
    return new Promise((resolve) => {
      // Overlay
      const overlay = document.createElement('div');
      overlay.className = 'classroom-dialog-overlay';
      overlay.style = `position:fixed;top:0;left:0;width:100vw;height:100vh;z-index:10000;background:rgba(0,0,0,0.25);display:flex;align-items:center;justify-content:center;`;

      // Dialog
      const dialog = document.createElement('div');
      dialog.className = 'classroom-dialog';
      dialog.style = `background:#23232a;max-width:640px;width:96vw;padding:26px 32px 18px 32px;border-radius:5px;box-shadow:0 4px 8px rgba(0,0,0,0.32);font-family:sans-serif;position:relative;border:1px solid #444;color:#eee;`;
      overlay.appendChild(dialog);
      dialog.hide = function() { overlay.style.display = 'none'; };
      dialog.show = function() { overlay.style.display = 'flex'; };
      overlay.style.display = 'flex';

      // Title
      const title = document.createElement('h2');
      title.textContent = 'Join a Classroom';
      title.style = 'color:#eee;margin-bottom:12px;';
      dialog.appendChild(title);

      // Display name input
      const nameRow = document.createElement('div');
      nameRow.style = 'margin-bottom:10px;display:flex;align-items:center;gap:8px;';
      const nameLabel = document.createElement('label');
      nameLabel.textContent = 'Display name:';
      nameLabel.style = 'min-width:110px;color:#eee;';
      nameLabel.htmlFor = 'join-classroom-displayname';
      nameRow.appendChild(nameLabel);
      const nameInput = document.createElement('input');
      nameInput.type = 'text';
      nameInput.id = 'join-classroom-displayname';
      nameInput.value = userName || '';
      nameInput.style = 'flex:1 1 0;padding:5px 10px;font-size:1.08em;background:#222;border:1px solid #444;color:#eee;border-radius:3px;';
      nameRow.appendChild(nameInput);
      dialog.appendChild(nameRow);

      // Scrollable classroom list
      const listContainer = document.createElement('div');
      listContainer.style = 'max-height:260px;overflow-y:auto;margin-bottom:12px;border:1px solid #333;border-radius:4px;background:#19191e;';
      dialog.appendChild(listContainer);

      // Helper for classroom icon
      function classroomIcon(iconUrl) {
        const img = document.createElement('img');
        img.src = iconUrl || '/classroom.png?v=' + Date.now();
        img.alt = 'Icon';
        img.onerror = function(){ this.src='/classroom.png?v=' + Date.now(); };
        img.style = 'width:48px;height:48px;object-fit:cover;border-radius:8px;background:#222;border:1px solid #444;';
        return img;
      }

      // Selection state
      let selectedIdx = -1;
      let selectedClassroom = null;
      // Render classroom list
      classroomInfoList.forEach((info, idx) => {
        const item = document.createElement('div');
        item.className = 'classroom-list-item';
        item.style = `
          display: flex;
          align-items: stretch;
          gap: 18px;
          padding: 0 0 0 0;
          margin: 0 0 8px 0;
          background: #23233a;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.09);
          cursor: pointer;
          transition: background 0.18s, box-shadow 0.18s;
          border: 1.5px solid #2d2d46;
          min-height: 104px;
          overflow: hidden;
        `;
        item.onmouseover = () => {
          item.style.background = '#2a3452';
          item.style.boxShadow = '0 4px 16px rgba(40,70,150,0.11)';
        };
        item.onmouseout = () => {
          item.style.background = '#23233a';
          item.style.boxShadow = '0 2px 8px rgba(0,0,0,0.09)';
        };
        // Icon
        const icon = classroomIcon(info.iconUrl);
        icon.style.width = '104px';
        icon.style.height = '104px';
        icon.style.objectFit = 'cover';
        icon.style.borderRadius = '12px 0 0 12px';
        icon.style.background = '#222';
        icon.style.border = 'none';
        icon.style.flex = '0 0 104px';
        icon.style.alignSelf = 'stretch';
        icon.style.display = 'block';
        item.appendChild(icon);
        // Info
        const infoCol = document.createElement('div');
        infoCol.style = 'flex:1 1 0;min-width:0;padding:16px 18px;display:flex;flex-direction:column;justify-content:center;';
        // Title
        const title = document.createElement('div');
        title.textContent = info.title || info.name || 'Untitled classroom';
        title.style = 'color:#eee;font-size:1.22em;font-weight:700;line-height:1.15;margin-bottom:3px;word-break:break-word;letter-spacing:0.01em;';
        infoCol.appendChild(title);
        // Description
        const desc = document.createElement('div');
        desc.textContent = info.description || '';
        desc.style = 'color:#bbb;font-size:1.01em;line-height:1.23;white-space:pre-line;word-break:break-word;margin-bottom:2px;';
        infoCol.appendChild(desc);
        // Creator
        const creator = document.createElement('div');
        creator.textContent = info.createdBy ? `Created by: ${info.createdBy}` : '';
        creator.style = 'color:#8ea0c4;font-size:0.97em;margin-top:2px;';
        infoCol.appendChild(creator);
        item.appendChild(infoCol);

        // Select logic
        item.onclick = () => {
          // Unselect all
          [...listContainer.children].forEach(c => c.style.background = 'transparent');
          item.style.background = '#2a3a5a';
          selectedIdx = idx;
          selectedClassroom = info;
          updateJoinButtons();
        };
        // Double-click = join as student if allowed
        item.ondblclick = () => {
          if (canJoinStudent()) okStudent.click();
        };
        listContainer.appendChild(item);
      });

      // --- Buttons ---
      const btnRow = document.createElement('div');
      btnRow.style = 'display:flex;justify-content:flex-end;gap:14px;margin-top:10px;';
      // Join as Teacher
      const okTeacher = document.createElement('button');
      okTeacher.textContent = 'Join as Teacher';
      okTeacher.style = 'min-width:110px;font-size:1.08em;';
      // Join as Student
      const okStudent = document.createElement('button');
      okStudent.textContent = 'Join as Student';
      okStudent.style = 'min-width:110px;font-size:1.08em;';
      // Cancel
      const cancelBtn = document.createElement('button');
      cancelBtn.textContent = 'Cancel';
      cancelBtn.style = 'min-width:80px;font-size:1.08em;';
      btnRow.appendChild(cancelBtn);
      btnRow.appendChild(okTeacher);
      btnRow.appendChild(okStudent);
      dialog.appendChild(btnRow);

      // --- Button logic ---
      function canJoinTeacher() {
        return selectedClassroom && selectedClassroom.createdBy === userName;
      }
      function canJoinStudent() {
        return true;
      }
      function updateJoinButtons() {
        if (!selectedClassroom) {
          okTeacher.disabled = true; okTeacher.style.opacity = '0.6';
          okStudent.disabled = true; okStudent.style.opacity = '0.6';
          return;
        }
        // Only creator can join as teacher
        if (canJoinTeacher()) {
          okTeacher.disabled = false; okTeacher.style.opacity = '1';
        } else {
          okTeacher.disabled = true; okTeacher.style.opacity = '0.6';
        }
        // Only non-creator can join as student
        if (canJoinStudent()) {
          okStudent.disabled = false; okStudent.style.opacity = '1';
        } else {
          okStudent.disabled = true; okStudent.style.opacity = '0.6';
        }
      }
      nameInput.oninput = updateJoinButtons;

      // Cancel action
      cancelBtn.onclick = () => {
        document.body.removeChild(overlay);
        resolve(null);
      };
      // Join as Teacher
      okTeacher.onclick = () => {
        if (!canJoinTeacher()) return;
        document.body.removeChild(overlay);
        resolve({
          classroomType: 'teacher',
          classroomId: selectedClassroom.classroomId,
          displayName: nameInput.value
        });
      };
      // Join as Student
      okStudent.onclick = () => {
        if (!canJoinStudent()) return;
        document.body.removeChild(overlay);
        resolve({
          classroomType: 'student',
          classroomId: selectedClassroom.classroomId,
          displayName: nameInput.value
        });
      };
      // Keyboard: Enter/ESC
      dialog.onkeydown = (e) => {
        if (e.key === 'Escape') { cancelBtn.click(); }
        if (e.key === 'Enter') {
          if (canJoinTeacher() && document.activeElement === okTeacher) okTeacher.click();
          else if (canJoinStudent() && document.activeElement === okStudent) okStudent.click();
        }
      };
      // Focus management
      setTimeout(() => { nameInput.focus(); }, 100);
      // Add to DOM
      document.body.appendChild(overlay);
      // Initial state
      updateJoinButtons();
    });
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
          iconUrl: iconFile || iconPreview.src,
          takeControl: controlCheckbox.checked,
          mode: modeSelect.value,
          projectType: radioNew.checked ? 'new' : 'load',
          projectName: selectedProjectName,
          projectGlobal: globalCheckbox.checked,
          url: urlInput.value,
          createdBy: this.root.userName
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

 