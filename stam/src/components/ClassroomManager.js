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
import { PROJECTMESSAGES } from './ProjectManager.js';
import { Dialog } from '../utils/Dialog.js';

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
        var response = await this.root.server.createClassroom({classroomInfo});
        if (response.error)
          this.root.messageBar.showErrorMessage(response.error);
      }
    }
  }

  async handleJoinClassroom(data, senderId) {
    var classroomList = await this.root.server.getClassroomList();
    if (!classroomList.error)
    {
      var response = await this.showJoinClassroomDialog(classroomList,this.root.userName);
      if (response)
      {
        if (response.classroomType == 'teacher')
        {
          if (this.teacherClassroomOpen)
            await this.handleTeacherLeaveClassroom();
          var response = await this.root.server.joinClassroom({
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
          var response = await this.root.server.joinClassroom({
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
    var classroomList = await this.root.server.getClassroomList();
    if (!classroomList.error)
    {
      var teacherClassroomList = classroomList.filter(classroom => classroom.createdBy == this.root.userName);
      var response = await this.showDeleteClassroomDialog(teacherClassroomList);
      if (response)
      {
        var response = await this.root.server.deleteClassroom({classroomId: response.classroomId});
        if (!response.error)
        {
          this.root.messageBar.showSuccessMessage(this.root.messages.getMessage('stam:classroom-deleted-successfully'));
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
      await this.root.server.leaveClassroom({
        classroomId: this.teacherClassroomId,
        teacherHandle: this.teacherHandle,
        type: 'teacher'
      });
      this.teacherClassroomOpen=false;
      this.teacherClassroomId = null;
      this.teacherClassroomInfo = null;
      this.teacherHandle = null;
      this.teacherName = null;
      if (!data.fromTeacher)
      await this.sendMessageTo('class:SideBar', MESSAGES.REMOVE_SIDE_WINDOW, { name: 'TeacherSideWindow' });
    }
  }

  async handleStudentLeaveClassroom(data, senderId) {
    if (this.studentClassroomOpen)
    {
      if (this.studentConnected)
        await this.handleStudentDisconnect();
      await this.root.server.leaveClassroom({
        classroomId: this.studentClassroomId,
        studentHandle: this.studentHandle,
        type: 'student'
      });
      this.studentClassroomOpen=false;
      this.studentClassroomId = null;
      this.studentClassroomInfo = null;
      this.studentHandle = null;
      this.studentName = null;
      if (!data.fromStudent)
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
      let response = await this.root.server.connectTeacher({
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
      response = await this.root.server.connectTeacher({
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
          const resp = await this.root.server.connectTeacher({
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
          const resp = await this.root.server.connectTeacher({
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
      await this.root.server.disconnectTeacher({
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
      let response = await this.root.server.connectStudent({
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
      response = await this.root.server.connectStudent({
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
          const resp = await this.root.server.connectStudent({
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
      response = await this.root.server.connectStudent({
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
      await this.root.server.disconnectStudent({
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
      title.textContent = this.root.messages.getMessage('stam:delete-classroom');
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
        title.textContent = info.title || info.name || this.root.messages.getMessage('stam:untitled-classroom');
        title.style = 'color:#eee;font-size:1.13em;font-weight:600;line-height:1.1;margin-bottom:2px;word-break:break-word;';
        infoCol.appendChild(title);
        // Description
        const desc = document.createElement('div');
        desc.textContent = info.description || this.root.messages.getMessage('stam:classroom-description');
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
      okBtn.textContent = this.root.messages.getMessage('stam:ok');
      okBtn.style = 'min-width:110px;font-size:1.08em;';
      // Cancel
      const cancelBtn = document.createElement('button');
      cancelBtn.textContent = this.root.messages.getMessage('stam:cancel');
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
      title.textContent = this.root.messages.getMessage('stam:join-classroom');
      title.style = 'color:#eee;margin-bottom:12px;';
      dialog.appendChild(title);

      // Display name input
      const nameRow = document.createElement('div');
      nameRow.style = 'margin-bottom:10px;display:flex;align-items:center;gap:8px;';
      const nameLabel = document.createElement('label');
      nameLabel.textContent = this.root.messages.getMessage('stam:display-name');
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
        title.textContent = info.title || info.name || this.root.messages.getMessage('stam:untitled-classroom');
        title.style = 'color:#eee;font-size:1.22em;font-weight:700;line-height:1.15;margin-bottom:3px;word-break:break-word;letter-spacing:0.01em;';
        infoCol.appendChild(title);
        // Description
        const desc = document.createElement('div');
        desc.textContent = info.description || this.root.messages.getMessage('stam:classroom-description');
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
      okTeacher.textContent = this.root.messages.getMessage('stam:join-as-teacher');
      okTeacher.style = 'min-width:110px;font-size:1.08em;';
      // Join as Student
      const okStudent = document.createElement('button');
      okStudent.textContent = this.root.messages.getMessage('stam:join-as-student');
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
    return new Promise(async (resolve) => {
      const messages = this.root.messages;
      const theme = this.root.preferences.getCurrentTheme();
      let loadedIcon = null; // Track the current icon (null means use default)
      const content = document.createElement('div');
      content.className = 'create-classroom-dialog';
      content.style.display = 'flex';
      content.style.flexDirection = 'column';
      content.style.gap = '0px';
      content.style.padding = '16px 24px';

      // Classroom name
      const nameGroup = document.createElement('div');
      nameGroup.className = 'form-group';
      nameGroup.innerHTML = `
        <label class="dialog-label">${messages.getMessage('stam:classroom-name')}</label>
        <input type="text" id="classroom-name" class="dialog-input" 
               placeholder="${messages.getMessage('stam:classroom-title-placeholder')}">
      `;

      // Description and Icon row
      const rowGroup = document.createElement('div');
      rowGroup.className = 'form-row';
      rowGroup.style.display = 'flex';
      rowGroup.style.gap = '0px';
      rowGroup.style.alignItems = 'flex-start';

      // Description textarea
      const descGroup = document.createElement('div');
      descGroup.className = 'form-group';
      descGroup.style.flex = '1';
      descGroup.innerHTML = `
        <label class="dialog-label">${messages.getMessage('stam:classroom-description')}</label>
        <textarea id="classroom-description" class="dialog-textarea" rows="7"
                  placeholder="${messages.getMessage('stam:classroom-description-placeholder')}"></textarea>
      `;

      // Icon group
      const iconGroup = document.createElement('div');
      iconGroup.className = 'form-group';
      iconGroup.style.display = 'flex';
      iconGroup.style.flexDirection = 'column';
      iconGroup.style.alignItems = 'center';
      iconGroup.style.gap = '0px';

      const iconLabel = document.createElement('label');
      iconLabel.className = 'dialog-label';
      iconLabel.textContent = messages.getMessage('stam:classroom-icon');

      const iconPreview = document.createElement('div');
      iconPreview.className = 'icon-preview';

      const iconPlaceholder = document.createElement('div');
      iconPlaceholder.className = 'icon-placeholder';
      iconPlaceholder.style.width = '96px';
      iconPlaceholder.style.height = '96px';
      iconPlaceholder.style.display = 'flex';
      iconPlaceholder.style.alignItems = 'center';
      iconPlaceholder.style.justifyContent = 'center';
      iconPlaceholder.style.background = 'var(--container-background)';
      iconPlaceholder.style.borderRadius = '8px';
      iconPlaceholder.style.overflow = 'hidden';
      iconPlaceholder.style.position = 'relative';
      iconPlaceholder.style.cursor = 'pointer';
      iconPlaceholder.style.transition = 'all 0.2s ease';
      
      // Add drop zone indicator
      const dropZoneOverlay = document.createElement('div');
      dropZoneOverlay.style.position = 'absolute';
      dropZoneOverlay.style.top = '0';
      dropZoneOverlay.style.left = '0';
      dropZoneOverlay.style.right = '0';
      dropZoneOverlay.style.bottom = '0';
      dropZoneOverlay.style.border = '2px dashed transparent';
      dropZoneOverlay.style.borderRadius = '6px';
      dropZoneOverlay.style.pointerEvents = 'none';
      dropZoneOverlay.style.transition = 'all 0.2s ease';
      iconPlaceholder.appendChild(dropZoneOverlay);
      
      // Drag and drop event handlers
      const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
        iconPlaceholder.style.transform = 'scale(1.03)';
        dropZoneOverlay.style.borderColor = 'var(--primary-color)';
        dropZoneOverlay.style.background = 'rgba(var(--primary-color-rgb), 0.1)';
      };
      
      const handleDragLeave = (e) => {
        e.preventDefault();
        e.stopPropagation();
        iconPlaceholder.style.transform = 'scale(1)';
        dropZoneOverlay.style.borderColor = 'transparent';
        dropZoneOverlay.style.background = 'transparent';
      };
      
      const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        handleDragLeave(e);
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
          const file = files[0];
          if (file.type.match('image.*')) {
            // Use the existing file input change handler
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(file);
            fileInput.files = dataTransfer.files;
            fileInput.dispatchEvent(new Event('change', { bubbles: true }));
          } else {
            this.root.messageBar.showErrorMessage(messages.getMessage('stam:invalid-image-type'));
          }
        }
      };
      
      // Add event listeners
      iconPlaceholder.addEventListener('dragover', handleDragOver);
      iconPlaceholder.addEventListener('dragleave', handleDragLeave);
      iconPlaceholder.addEventListener('drop', handleDrop);
      
      // Add title for better UX
      iconPlaceholder.title = messages.getMessage('stam:drag-drop-icon');

      // Function to set default icon
      const setDefaultIcon = (container) => {
        container.innerHTML = '';
        const defaultIcon = document.createElement('i');
        defaultIcon.className = 'fas fa-chalkboard-teacher';
        defaultIcon.style.fontSize = '32px';
        defaultIcon.style.color = 'var(--text-primary)';
        container.appendChild(defaultIcon);
        loadedIcon = null; // Reset loaded icon
      };
      
      // Set default icon initially
      setDefaultIcon(iconPlaceholder);

      const changeIconBtn = document.createElement('button');
      changeIconBtn.id = 'change-icon';
      changeIconBtn.className = 'secondary-button';
      changeIconBtn.style.marginTop = '8px';
      changeIconBtn.textContent = messages.getMessage('stam:classroom-choose');

      iconPreview.appendChild(iconPlaceholder);
      iconPreview.appendChild(changeIconBtn);

      iconGroup.appendChild(iconLabel);
      iconGroup.appendChild(iconPreview);

      // Project section
      const projectGroup = document.createElement('div');
      projectGroup.className = 'form-group';
      
      // Project section title
      const projectLabel = document.createElement('label');
      projectLabel.className = 'dialog-label';
      projectLabel.textContent = messages.getMessage('stam:classroom-project-name');
      projectGroup.appendChild(projectLabel);
      
      // Radio buttons container
      const radioContainer = document.createElement('div');
      radioContainer.style.display = 'flex';
      radioContainer.style.gap = '16px';
      radioContainer.style.marginBottom = '8px';
      radioContainer.style.alignItems = 'center'; // Align items vertically in the center
      
      // New project radio
      const newProjectDiv = document.createElement('div');
      const newProjectRadio = document.createElement('input');
      newProjectRadio.type = 'radio';
      newProjectRadio.id = 'project-type-new';
      newProjectRadio.name = 'project-type';
      newProjectRadio.checked = true; // Default selection
      const newProjectLabel = document.createElement('label');
      newProjectLabel.htmlFor = 'project-type-new';
      newProjectLabel.textContent = messages.getMessage('stam:classroom-project-new');
      newProjectLabel.style.cursor = 'pointer';
      // Style the radio button directly for better control
      newProjectRadio.style.marginRight = '10px';
      newProjectLabel.style.display = 'inline-flex';
      newProjectLabel.style.alignItems = 'center';
      newProjectLabel.style.whiteSpace = 'nowrap'; // Prevent text wrapping
      newProjectDiv.appendChild(newProjectRadio);
      newProjectDiv.appendChild(newProjectLabel);
      radioContainer.appendChild(newProjectDiv);
      
      // Existing project radio
      const existingProjectDiv = document.createElement('div');
      const existingProjectRadio = document.createElement('input');
      existingProjectRadio.type = 'radio';
      existingProjectRadio.id = 'project-type-existing';
      existingProjectRadio.name = 'project-type';
      const existingProjectLabel = document.createElement('label');
      existingProjectLabel.htmlFor = 'project-type-existing';
      existingProjectLabel.textContent = messages.getMessage('stam:classroom-project-existing');
      existingProjectLabel.style.cursor = 'pointer';
      // Style the radio button directly for better control
      existingProjectRadio.style.marginRight = '10px';
      existingProjectLabel.style.display = 'inline-flex';
      existingProjectLabel.style.alignItems = 'center';
      existingProjectLabel.style.whiteSpace = 'nowrap'; // Prevent text wrapping
      existingProjectDiv.appendChild(existingProjectRadio);
      existingProjectDiv.appendChild(existingProjectLabel);
      radioContainer.appendChild(existingProjectDiv);
      
      projectGroup.appendChild(radioContainer);
      
      // Project name input and choose button
      const projectSelection = document.createElement('div');
      projectSelection.className = 'project-selection';
      projectSelection.style.display = 'flex';
      projectSelection.style.gap = '8px';
      
      const projectNameInput = document.createElement('input');
      projectNameInput.type = 'text';
      projectNameInput.id = 'project-name';
      projectNameInput.className = 'dialog-input';
      projectNameInput.style.flex = '1';
      
      const chooseButton = document.createElement('button');
      chooseButton.id = 'choose-project';
      chooseButton.className = 'primary-button';
      chooseButton.textContent = messages.getMessage('stam:classroom-choose');
      
      projectSelection.appendChild(projectNameInput);
      projectSelection.appendChild(chooseButton);
      projectGroup.appendChild(projectSelection);

      // Global project checkbox
      const globalGroup = document.createElement('div');
      globalGroup.className = 'form-group';
      globalGroup.innerHTML = `
        <label class="checkbox-label" style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
          <input type="checkbox" id="global-project">
          ${messages.getMessage('stam:classroom-project-global')}
        </label>
      `;

      // Classroom URL
      const urlGroup = document.createElement('div');
      var classroomId = this.root.utilities.generateRandomString(3);
      urlGroup.className = 'form-group';
      urlGroup.innerHTML = `
        <label class="dialog-label">${messages.getMessage('stam:classroom-url')}</label>
        <div class="url-display" style="display: flex; gap: 8px;">
          <input type="text" id="classroom-url" class="dialog-input" 
                 value="${this.root.httpUrl}/classroom/${classroomId}" readonly style="flex: 1;">
          <button id="copy-url" class="secondary-button">
            ${messages.getMessage('stam:classroom-copy-url')}
          </button>
        </div>
      `;

      // Assemble the dialog content
      rowGroup.appendChild(descGroup);
      rowGroup.appendChild(iconGroup);
      
      content.appendChild(nameGroup);
      content.appendChild(rowGroup);
      content.appendChild(projectGroup);
      content.appendChild(globalGroup);
      content.appendChild(urlGroup);

      // Create and show the dialog
      let selectedProject = null;
      const dialog = new Dialog({
        title: messages.getMessage('stam:create-classroom'),
        content: content,
        theme: theme,
        buttons: [
          {
            label: messages.getMessage('stam:cancel'),
            className: 'secondary',
            onClick: () => { resolve(null); dialog.close(); }
          },
          {
            label: messages.getMessage('stam:create'),
            className: 'primary',
            onClick: () => {
              const name = document.getElementById('classroom-name').value.trim();
              const description = document.getElementById('classroom-description').value.trim();
              const isGlobal = document.getElementById('global-project').checked;
              
              if (!name) {
                this.root.messageBar.showErrorMessage(messages.getMessage('stam:classroom-title-required'));
                return false;
              }
              
              if (!selectedProject) {
                this.root.messageBar.showErrorMessage(messages.getMessage('stam:project-required'));
                return false;
              }
              selectedProject.projectName = projectNameInput.value;
              let iconUrl = loadedIcon || '';

              resolve({
                name,
                description,
                isGlobal,
                classroomUrl: document.getElementById('classroom-url').value,
                iconUrl: iconUrl,               
                createProject: document.getElementById('project-type-new').checked,
                project: selectedProject,
              });
              dialog.close();
            }
          }
        ]
      });
      
      // Add event listeners after dialog is created
      const chooseProjectBtn = content.querySelector('#choose-project');
      chooseProjectBtn.addEventListener('click', async () => {
        try {
          // Save current description to restore if needed
          const currentDescription = document.getElementById('classroom-description').value;
          const projectNameInput = document.getElementById('project-name');
          const isNewProject = document.getElementById('project-type-new').checked;
          
          // Request either template or project selection based on radio button
          const messageType = isNewProject ? PROJECTMESSAGES.CHOOSE_TEMPLATE : PROJECTMESSAGES.CHOOSE_PROJECT;
          selectedProject = await this.sendRequestTo('class:ProjectManager', messageType);
          
          if (selectedProject) {
            if (selectedProject.projectName)
              projectNameInput.value = selectedProject.projectName;
            else
              projectNameInput.value = selectedProject.name;
            document.getElementById('classroom-description').value = selectedProject.description;
            
            // Update icon if available
            if (selectedProject.iconUrl) {
              // Update icon preview using an img element
              const iconPreview = content.querySelector('.icon-preview .icon-placeholder');
              // Clear existing content
              iconPreview.innerHTML = '';
              // Create and append img element
              const img = document.createElement('img');
              img.src = selectedProject.iconUrl;
              img.alt = 'Classroom Icon';
              img.style = 'width: 100%; height: 100%; object-fit: contain;';
              img.onerror = function() { 
                // Fallback to default icon if loading fails
                setDefaultIcon(iconPreview);
              };
              iconPreview.appendChild(img);
              // Store the project icon URL
              loadedIcon = selectedProject.iconUrl;
            } else {
              // No icon in project, set default
              const iconPreview = content.querySelector('.icon-preview .icon-placeholder');
              setDefaultIcon(iconPreview);
            }
          }
        } catch (error) {
          console.error('Error selecting template:', error);
          this.root.messageBar.showErrorMessage(messages.getMessage('stam:error-loading-template'));
        }
      });
      
      // Copy URL button handler
      const copyUrlBtn = content.querySelector('#copy-url');
      copyUrlBtn.addEventListener('click', () => {
        const urlInput = document.getElementById('classroom-url');
        urlInput.select();
        document.execCommand('copy');
        
        // Show feedback
        const originalText = copyUrlBtn.textContent;
        copyUrlBtn.textContent = messages.getMessage('stam:classroom-copied');
        setTimeout(() => {
          copyUrlBtn.textContent = originalText;
        }, 2000);
      });
      
      // Create hidden file input for icon selection
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = 'image/*';
      fileInput.style.display = 'none';
      document.body.appendChild(fileInput);
      
      // Make fileInput accessible to drag and drop handlers
      iconPlaceholder.fileInput = fileInput;
      
      // Also allow clicking on the icon to open file picker
      iconPlaceholder.addEventListener('click', () => {
        fileInput.click();
      });
      
      // Handle icon change
      changeIconBtn.addEventListener('click', () => {
        // Trigger file selection dialog
        fileInput.click();
      });
      
      // Handle file selection
      fileInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (!file) return;
        
        // Check file type
        if (!file.type.match('image.*')) {
          this.root.messageBar.showErrorMessage(messages.getMessage('stam:invalid-image-type'));
          return;
        }
        
        // Check file size (max 2MB)
        const maxSize = 2 * 1024 * 1024; // 2MB
        if (file.size > maxSize) {
          this.root.messageBar.showErrorMessage(messages.getMessage('stam:image-too-large'));
          return;
        }
        
        // Create a FileReader to read the image file
        const reader = new FileReader();
        reader.onload = (e) => {
          const iconPreview = content.querySelector('.icon-preview .icon-placeholder');
          // Clear existing content
          iconPreview.innerHTML = '';
          // Create and append img element
          const img = document.createElement('img');
          img.src = e.target.result;
          img.alt = 'Classroom Icon';
          img.style = 'width: 100%; height: 100%; object-fit: contain;';
          img.onerror = () => { 
            // Fallback to default icon if loading fails
            setDefaultIcon(iconPreview);
            this.root.messageBar.showErrorMessage(messages.getMessage('stam:error-loading-image'));
          };
          iconPreview.appendChild(img);
          
          // Store the file data for later use when creating the classroom
          loadedIcon = e.target.result;
        };
        
        reader.onerror = () => {
          this.root.messageBar.showErrorMessage(messages.getMessage('stam:error-reading-file'));
        };
        
        reader.readAsDataURL(file);
      });
      
      // Open the dialog
      dialog.open();
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
      cameraLabel.textContent = this.root.messages.getMessage('stam:classroom-camera');
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
      micLabel.textContent = this.root.messages.getMessage('stam:classroom-microphone');
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
      outputLabel.textContent = this.root.messages.getMessage('stam:classroom-audio-output');
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
      cancelBtn.textContent = this.root.messages.getMessage('stam:cancel');
      cancelBtn.onclick = () => {
        document.body.removeChild(overlay);
        resolve(null);
      };
      // OK button
      const okBtn = document.createElement('button');
      okBtn.type = 'button';
      okBtn.textContent = this.root.messages.getMessage('stam:ok');
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
            opt.textContent = d.label || this.root.messages.getMessage('stam:classroom-camera') + ' ' + (cameraSelect.length + 1);
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
            opt.textContent = d.label || this.root.messages.getMessage('stam:classroom-microphone') + ' ' + (micSelect.length + 1);
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
            opt.textContent = d.label || this.root.messages.getMessage('stam:classroom-audio-output') + ' ' + (outputSelect.length + 1);
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

 