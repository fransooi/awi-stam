/** --------------------------------------------------------------------------
*
*            / \
*          / _ \               (°°)       Intelligent
*        / ___ \ [ \ [ \  [ \ [   ]       Programmable
*     _/ /   \ \_\  \/\ \/ /  |  | \      Personal
* (_)|____| |____|\__/\__/  [_| |_] \     Assistant
*
* This file is open-source under the conditions contained in the
* license file located at the root of this project.
* Please support the project: https://patreon.com/francoislionet
*
* ----------------------------------------------------------------------------
* @file classroomserver.mjs
* @author FL (Francois Lionet)
* @version 0.5
*
* @short Connector opening a WebRTC server on the machine
*        for classroom video sharing
*/
import ConnectorBase from '../../connector.mjs'
import { SERVERCOMMANDS } from '../../servercommands.mjs'
export { ConnectorClassroomServer as Connector }

class ConnectorClassroomServer extends ConnectorBase
{
    constructor( awi, config = {} )
    {
        // Add a default STUN server to the config if not already present
        if (!config.iceServers) {
            config.iceServers = [
                {
                    urls: "stun:stun.relay.metered.ca:80",
                },
                {
                    urls: "turn:standard.relay.metered.ca:80",
                    username: "b05e93cff4c3ef28d6c05744",
                    credential: "FTqh3rfbgLzkP31y",
                },
                {
                    urls: "turn:standard.relay.metered.ca:80?transport=tcp",
                    username: "b05e93cff4c3ef28d6c05744",
                    credential: "FTqh3rfbgLzkP31y",
                },
                {
                    urls: "turn:standard.relay.metered.ca:443",
                    username: "b05e93cff4c3ef28d6c05744",
                    credential: "FTqh3rfbgLzkP31y",
                },
                {
                    urls: "turns:standard.relay.metered.ca:443?transport=tcp",
                    username: "b05e93cff4c3ef28d6c05744",
                    credential: "FTqh3rfbgLzkP31y",
                },                
                /*
                { urls: 'stun:stun.l.google.com:19302' },
                {
                    urls: 'turn:openrelay.metered.ca:80',
                    username: 'b05e93cff4c3ef28d6c05744',
                    credentials: 'FTqh3rfbgLzkP31y'
                }
                */
            ];
        }
        super( awi, config );
        this.name = 'Classroom Server';
        this.token = 'classroomServer';
        this.className = 'ConnectorClassroomServer';
        this.group = 'network';
        this.version = '0.5';
        this.editors = {};
        this.classrooms = {};
        this.classroomCount = 0;
    }
        
    async connect( options )
    {
        super.connect( options );        
        return this.setConnected(true);
    }
    
    async quit(options)
    {
        super.quit(options);
    }

    getMediasoupServer() {
        return this.awi.mediasoupServer;
    }
    getIceServers() {
        return this.config && this.config.iceServers ? this.config.iceServers : [{ urls: 'stun:stun.l.google.com:19302' }];
    }
    
    async command_createClassroom(parameters, message, editor) {
        // Check that a classroom with the same title does not already exist
        for (let classroomId in this.classrooms) {
            if (this.classrooms[classroomId].classroomInfo.name.toLowerCase() === parameters.classroomInfo.name.toLowerCase()) {
                this.replyError(this.newError('awi:classroom-already-exists', { name: parameters.classroomInfo.name }), message, editor);
                return;
            }
        }
        let classroomId = this.awi.utilities.getUniqueIdentifier(this.classrooms, 'classroom', this.classroomCount++);
        const classroom = {
            editor,
            classroomId,
            teacherHandle: '',
            students: {},
            signalingState: {},
            created: Date.now(),
            state: 'idle',
            teacherState: 'idle',
            classroomInfo: parameters.classroomInfo
        };
        this.classrooms[classroomId] = classroom;
        this.awi.editor.print(`Created classroom ${classroomId}`, { user: 'awi' });
        this.replySuccess(this.newAnswer({ classroomId }), message, editor);
    }
    
    // Return the list of classrooms and their ID.
    async command_getClassroomList(parameters, message, editor) {
        const classrooms = Object.keys(this.classrooms).map(classroomId => {
            return {
                classroomId,
                classroomInfo: this.classrooms[classroomId].classroomInfo,
                state: this.classrooms[classroomId].state
            };
        });
        this.replySuccess(this.newAnswer({ classrooms  }), message, editor);
    }

    // Check classroom state. If either a teacher or a student is connected, the classroom is active.
    async command_checkClassroomState(parameters, message, editor) {
        const classroomId = parameters.classroomId;
        var classroom = this.classrooms[classroomId];
        if (!classroom) {
            this.replyError(this.newError('awi:classroom-not-found', { classroomId }), message, editor);
            return;
        }
        // Determine classroom state based on all participant states
        const teacherState = classroom.teacherState;
        const studentStates = Object.values(classroom.students).map(student => student.state);
        if (teacherState === 'active' || studentStates.includes('active')) {
            classroom.state = 'active';
        } else if (
            teacherState === 'transportCreated' || teacherState === 'transportConnected' ||
            studentStates.includes('transportCreated') || studentStates.includes('transportConnected')
        ) {
            classroom.state = 'connecting';
        } else {
            classroom.state = 'idle';
        }
        this.replySuccess(this.newAnswer({ classroomId, state: classroom.state }), message, editor);
    }

    // Add a student to an existing classroom
    async command_joinClassroom(parameters, message, editor)
    {
        const classroomId = parameters.classroomId;
        var classroom = this.classrooms[classroomId];
        if (!classroom) {
            return this.replyError(this.newError('awi:classroom-not-found', { classroomId }), message, editor);
        }
        // Add student to classroom
        const studentHandle = parameters.studentHandle || this.awi.utilities.getUniqueIdentifier(this.classrooms, 'student', this.classroomCount++);
        classroom.students[studentHandle] = {
            handle: studentHandle,
            state: 'idle'
        };
        return this.replySuccess(this.newAnswer({ classroomId, studentHandle, classroomInfo: classroom.classroomInfo }), message, editor);
    }

    async mediasoupInit(classroomId) {
        const mediasoupServer = this.getMediasoupServer();
        if (!mediasoupServer) {
            return this.newError('awi:mediasoup-not-initialized');
        }
        try {
            await mediasoupServer.createClassroomMediasoupRoom(classroomId);
            return this.newAnswer({ classroomId });
        } catch (err) {
            return this.newError('awi:mediasoup-error');
        }
    }

    async command_connectTeacher(parameters, message, editor) {
        const classroomId = parameters.classroomId;
        var classroom = this.classrooms[classroomId];
        if (!classroom) {
            this.replyError(this.newError('awi:classroom-not-found', { classroomId }), message, editor);
            return;
        }
            
        var answer = await this.mediasoupInit(classroomId);
        if (answer.isError()) {
            return this.replyError(answer, message, editor);
        }
        const action = parameters.action.toLowerCase();
        const mediasoupServer = this.getMediasoupServer();
        switch (action) {
            case 'getrouterrtpcapabilities': {
                const room = await mediasoupServer.getClassroomMediasoupRoom(classroomId);
                if (!room) {
                    return this.replyError(this.newError('awi:classroom-not-found', { classroomId }), message, editor);
                }
                answer = this.replySuccess(this.newAnswer({ rtpCapabilities: room.router.rtpCapabilities, iceServers: this.getIceServers() }), message, editor);
                break;
            }
            case 'createtransport': {
                const teacherHandle = parameters.teacherHandle || this.awi.utilities.getUniqueIdentifier(this.classrooms, 'teacher', this.classroomCount++);
                classroom.teacherHandle = teacherHandle;
                const transportParams = await mediasoupServer.createTeacherTransport(classroomId, teacherHandle, parameters.mediasoupOptions || {});
                classroom.transportParams = transportParams;
                classroom.teacherState = 'transportCreated';
                answer = this.replySuccess(this.newAnswer({ classroomId, teacherHandle, transportParams, iceServers: this.getIceServers() }), message, editor);
                break;
            }
            case 'connecttransport': {
                const teacherHandle = parameters.teacherHandle;
                await mediasoupServer.connectTeacherTransport(classroomId, teacherHandle, parameters.dtlsParameters);
                classroom.teacherState = 'transportConnected';
                answer = this.replySuccess(this.newAnswer({ classroomId, teacherHandle, status: 'transport-connected' }), message, editor);
                break;
            }
            case 'produce': {
                const teacherHandle = parameters.teacherHandle;
                // Only allow produce if transport is connected
                //if (classroom.teacherState !== 'transportConnected') {
                //    answer = this.replyError(this.newError('awi:produce-before-transport-connected', { state: classroom.teacherState }), message, editor);
                //    break;
                //}                
                const producerId = await mediasoupServer.createTeacherProducer(classroomId, teacherHandle, parameters.kind, parameters.rtpParameters);
                classroom.teacherState = 'active';
                answer = this.replySuccess(this.newAnswer({ classroomId, teacherHandle, producerId }), message, editor);
                break;
            }
            default: {
                answer = this.replyError(this.newError('awi:unknown-mediasoup-action', { action: parameters.action }), message, editor);
            }
        }
        this.command_checkClassroomState({ classroomId });
        return answer;
    }

    async command_connectStudent(parameters, message, editor) {
        const classroomId = parameters.classroomId;
        const mediasoupServer = this.getMediasoupServer();
        var classroom = this.classrooms[classroomId];
        if (!classroom) {
            return this.replyError(this.newError('awi:classroom-not-found', { classroomId }), message, editor);
        }
        var answer = await this.mediasoupInit(classroomId);
        if (answer.isError()) {
            return this.replyError(answer, message, editor);
        }
        const action = parameters.action.toLowerCase();
        switch (action) {
            case 'getrouterrtpcapabilities': {
                const room = await mediasoupServer.getClassroomMediasoupRoom(classroomId);
                answer = this.replySuccess(this.newAnswer({ rtpCapabilities: room.router.rtpCapabilities, iceServers: this.getIceServers() }), message, editor);
                break;
            }
            case 'createtransport': {
                const studentHandle = parameters.studentHandle || this.awi.utilities.getUniqueIdentifier(this.classrooms, 'student', this.classroomCount++);
                const transportParams = await mediasoupServer.createStudentTransport(classroomId, studentHandle, parameters.mediasoupOptions || {});
                classroom.students[studentHandle].transportParams = transportParams;
                classroom.students[studentHandle].state = 'transportCreated';
                answer = this.replySuccess(this.newAnswer({ classroomId, studentHandle, transportParams, iceServers: this.getIceServers() }), message, editor);
                break;
            }
            case 'connecttransport': {
                const studentHandle = parameters.studentHandle;
                await mediasoupServer.connectStudentTransport(classroomId, studentHandle, parameters.dtlsParameters);
                classroom.students[studentHandle].state = 'transportConnected';
                this.replySuccess(this.newAnswer({ classroomId, studentHandle, status: 'transport-connected' }), message, editor);
                break;
            }
            case 'produce': {
                const studentHandle = parameters.studentHandle;
                // Only allow produce if transport is connected
                //if (classroom.students[studentHandle].state !== 'transportConnected') {
                //    answer = this.replyError(this.newError('awi:produce-before-transport-connected', { state: classroom.students[studentHandle].state }), message, editor);
                //    break;
                //}                
                const producerId = await mediasoupServer.createStudentProducer(classroomId, studentHandle, parameters.kind, parameters.rtpParameters);
                classroom.students[studentHandle].state = 'active';
                answer = this.replySuccess(this.newAnswer({ classroomId, studentHandle, producerId }), message, editor);
                break;
            }
            case 'consume': {
                // Student wants to consume a teacher's stream
                const studentHandle = parameters.studentHandle;
                const teacherHandle = parameters.teacherHandle || classroom.teacherHandle;
                const kinds = ['audio', 'video'];
                let consumerParams = {};
                let errors = {};
                if (parameters.kind) {
                    // If kind is specified, just try that one
                    try {
                        consumerParams[parameters.kind] = await mediasoupServer.createStudentConsumer(classroomId, studentHandle, teacherHandle, parameters.kind, parameters.rtpCapabilities);
                    } catch (err) {
                        errors[parameters.kind] = err.message;
                    }
                } else {
                    // Try both audio and video
                    for (const kind of kinds) {
                        try {
                            consumerParams[kind] = await mediasoupServer.createStudentConsumer(classroomId, studentHandle, teacherHandle, kind, parameters.rtpCapabilities);
                        } catch (err) {
                            errors[kind] = err.message;
                        }
                    }
                }
                if (Object.keys(consumerParams).length > 0) {
                    answer = this.replySuccess(this.newAnswer({ classroomId, studentHandle, consumerParams }), message, editor);
                } else {
                    answer = this.replyError(this.newError('awi:consume-error', { error: errors }), message, editor);
                }
                break;
            }
            default: {
                answer = this.replyError(this.newError('awi:unknown-mediasoup-action', { action: parameters.action }), message, editor);
            }
        }
        this.command_checkClassroomState({ classroomId });
        return answer;
    }
    async command_disconnectStudent(parameters, message, editor) {
        const classroomId = parameters.classroomId;
        const mediasoupServer = this.getMediasoupServer();
        var classroom = this.classrooms[classroomId];
        if (!classroom) {
            this.replyError(this.newError('awi:classroom-not-found', { classroomId }), message, editor);
            return;
        }
        // Only disconnect if the student is not already idle
        const student = classroom.students[parameters.studentHandle];
        if (!student || student.state === 'idle') {
            this.replySuccess(this.newAnswer({ classroomId, studentHandle: parameters.studentHandle }), message, editor);
            return;
        }
        // Disconnect student resources if initialized
        try {
            if (student.state === 'transportCreated' || student.state === 'transportConnected' || student.state === 'active') {
                await mediasoupServer.disconnectStudentTransport(classroomId, parameters.studentHandle);
            }
            student.state = 'idle';
            student.transportParams = null;
            this.command_checkClassroomState({ classroomId });
            this.replySuccess(this.newAnswer({ classroomId, studentHandle: parameters.studentHandle }), message, editor);
        } catch (err) {
            this.replyError(this.newError('awi:mediasoup-error', { error: err.message }), message, editor);
        }
    }

    async command_disconnectTeacher( parameters, message, editor )
    {
        const classroomId = parameters.classroomId;
        const mediasoupServer = this.getMediasoupServer();
        var classroom = this.classrooms[classroomId];
        if (!classroom) {
            this.replyError(this.newError('awi:classroom-not-found', { classroomId }), message, editor);
            return;
        }
        // Only disconnect if the teacher is not already idle
        if (classroom.teacherState === 'idle') {
            this.replySuccess(this.newAnswer({ classroomId, teacherHandle: classroom.teacherHandle }), message, editor);
            return;
        }
        // Disconnect teacher resources if initialized
        try {
            if (classroom.teacherState === 'transportCreated' || classroom.teacherState === 'transportConnected' || classroom.teacherState === 'active') {
                await mediasoupServer.disconnectTeacherTransport(classroomId, classroom.teacherHandle);
            }
            classroom.teacherState = 'idle';
            classroom.transportParams = null;
            this.command_checkClassroomState({ classroomId });
            this.replySuccess(this.newAnswer({ classroomId, teacherHandle: classroom.teacherHandle }), message, editor);
        } catch (err) {
            this.replyError(this.newError('awi:mediasoup-error', { error: err.message }), message, editor);
        }
    }

    async command_endClassroom(parameters, message, editor) {
        const classroomId = parameters.classroomId;
        const mediasoupServer = this.getMediasoupServer();
        var classroom = this.classrooms[classroomId];
        if (!classroom) {
            this.replyError(this.newError('awi:classroom-not-found', { classroomId }), message, editor);
            return;
        }
        if (classroom.state !== 'active') {
            this.replyError(this.newError('awi:classroom-not-active', { classroomId }), message, editor);
            return;
        }
        try {
            // Disconnect teacher if not idle
            if (classroom.teacherState !== 'idle') {
                await this.command_disconnectTeacher({ classroomId }, null, editor);
            }
            // Disconnect all students (loop)
            for (const studentHandle of Object.keys(classroom.students)) {
                if (classroom.students[studentHandle].state !== 'idle') {
                    await this.command_disconnectStudent({ classroomId, studentHandle }, null, editor);
                }
            }
            // Now end the mediasoup classroom
            await mediasoupServer.endClassroom(classroomId);
            this.replySuccess(this.newAnswer({ classroomId }), message, editor);
        } catch (err) {
            this.replyError(this.newError('awi:mediasoup-error', { error: err.message }), message, editor);
        }
    }
    replyError( error, message, editor )
	{
		if ( message )
			editor.reply( { error: error.getPrint() }, message );
		return error;
    }
    replySuccess( answer, message, editor )
    {
        if ( message )
            editor.reply( answer.data, message );
        return answer;
    }
}
