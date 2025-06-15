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
        config.iceServers = config.iceServers || [];
        super( awi, config );
        this.name = 'Classroom Server';
        this.token = 'classroom';
        this.className = 'ConnectorClassroomServer';
        this.group = 'network';
        this.version = '0.5';
        this.editors = {};
        this.classrooms = {};
        this.classroomCount = 0;
        this.classroomUrl = 'http://192.168.1.66:3333/projects';
    }
        
    async connect( options )
    {
        super.connect( options );        
        this.loadClassrooms();
        return this.setConnected(true);
    }
    
    async quit(options)
    {
        this.endAllClassrooms();
        this.saveClassrooms();
        super.quit(options);
    }

    async registerEditor(args, basket, control)
    {
        this.editor = args.editor;
        this.userName = args.userName;

        var data = {};
        data[ this.token ] = {
            self: this,
            version: this.version,
            commands: {
                connectTeacher: this.command_connectTeacher.bind(this),
                disconnectTeacher: this.command_disconnectTeacher.bind(this),
                connectStudent: this.command_connectStudent.bind(this),
                disconnectStudent: this.command_disconnectStudent.bind(this),
                createClassroom: this.command_createClassroom.bind(this),
                endClassroom: this.command_endClassroom.bind(this),
                deleteClassroom: this.command_deleteClassroom.bind(this),
                joinClassroom: this.command_joinClassroom.bind(this),
                leaveClassroom: this.command_leaveClassroom.bind(this),
                getClassroomList: this.command_getClassroomList.bind(this),
                studentConnected: this.command_error.bind(this),
                studentDisconnected: this.command_error.bind(this),
                teacherConnected: this.command_error.bind(this),
                teacherDisconnected: this.command_error.bind(this),
            }
        }
        return this.newAnswer( data );
    }

    getMediasoup() {
        return this.awi.mediasoup;
    }
    getIceServers() {
        return this.config.iceServers;
    }
    async saveClassrooms() {
        var path = this.awi.configuration.getConfigurationPath() + '/classrooms.json';
        var classroomList = {};
        for (let classroomId in this.classrooms) {
            classroomList[classroomId]={
                classroomInfo: this.classrooms[classroomId].classroomInfo,
                teacherName: this.classrooms[classroomId].teacherName,
                created: this.classrooms[classroomId].created
            };
        }
        var answer = await this.awi.files.saveJSON(path, classroomList);
        if (!answer.isSuccess())
            this.awi.editor.print('Failed to save classrooms', { user: 'awi' });
    }
    async loadClassrooms() {
        var path = this.awi.configuration.getConfigurationPath() + '/classrooms.json';
        var answer = await this.awi.files.loadJSON(path);
        this.classrooms = {};
        if (answer.isSuccess()) {
            for (let classroomId in answer.data){
                this.classrooms[classroomId] = {
                    state: 'idle',
                    teacherState: 'idle',
                    teacherName: answer.data[classroomId].teacherName,
                    students: {},
                    signalingState: {},
                    created: answer.data[classroomId].created,
                    classroomInfo: answer.data[classroomId].classroomInfo,
                };
            }
        }
    }
    
    async command_error(parameters, message, editor) {
        return this.replyError(this.newError('awi:command-not-implemented', { user: this.userName }), message, editor);
    }

    async command_createClassroom(parameters, message, editor) {
        // Check that a classroom with the same title does not already exist
        for (let classroomId in this.classrooms) {
            if (this.classrooms[classroomId].classroomInfo.name.toLowerCase() === parameters.classroomInfo.name.toLowerCase()) {
                return this.replyError(this.newError('awi:classroom-already-exists', { name: parameters.classroomInfo.name }), message, editor);
            }
        }
        let classroomId = this.awi.utilities.getUniqueIdentifier(this.classrooms, 'classroom', '', this.classroomCount++);
        var classroomInfo = parameters.classroomInfo;
        var pos = classroomInfo.iconUrl.indexOf('/awi-templates/');
        if (pos > -1)
            classroomInfo.iconUrl = classroomInfo.iconUrl.substring(pos);
        const classroom = {
            editor,
            classroomId,
            teacherHandle: '',
            students: {},
            signalingState: {}, 
            created: Date.now(),
            state: 'idle',
            teacherState: 'idle',
            teacherName: '',
            classroomInfo: parameters.classroomInfo
        };
        this.awi.editor.print(`Created classroom ${classroomId}`, { user: 'awi' });
        classroom.classroomInfo.classroomId = classroomId;
        this.classrooms[classroomId] = classroom;
        this.saveClassrooms();
        return this.replySuccess(this.newAnswer({classroomId}), message, editor);
    }
    
    // Return the list of classrooms and their ID.
    async command_getClassroomList(parameters, message, editor) {
        const classroomList = [];
        for (let classroomId in this.classrooms)
            classroomList.push(this.classrooms[classroomId].classroomInfo);
        return this.replySuccess(this.newAnswer(classroomList), message, editor);
    }

    // Delete a classroom
    async command_deleteClassroom(parameters, message, editor) {
        const classroomId = parameters.classroomId;
        var classroom = this.classrooms[classroomId];
        if (!classroom) {
            return this.replyError(this.newError('awi:classroom-not-found', { classroomId }), message, editor);
        }
        if (classroom.state !== 'idle') {
            return this.replyError(this.newError('awi:classroom-not-idle', { classroomId }), message, editor);
        }
        this.classrooms[classroomId] = null;
        return this.replySuccess(this.newAnswer({ classroomId }), message, editor);
    }

    // Check classroom state. If either a teacher or a student is connected, the classroom is active.
    async command_checkClassroomState(parameters, message, editor) {
        const classroomId = parameters.classroomId;
        var classroom = this.classrooms[classroomId];
        if (!classroom) {
            return this.replyError(this.newError('awi:classroom-not-found', { classroomId }), message, editor);
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
        return this.replySuccess(this.newAnswer({ classroomId, state: classroom.state }), message, editor);
    }

    // Add a teacher or a student to an existing classroom
    async command_joinClassroom(parameters, message, editor)
    {
        const classroomId = parameters.classroomId;
        var classroom = this.classrooms[classroomId];
        if (!classroom) {
            return this.replyError(this.newError('awi:classroom-not-found', { classroomId }), message, editor);
        }
        // Add teacher to classroom
        if (parameters.type == 'teacher') {
            const teacherHandle = this.awi.utilities.getUniqueIdentifier(this.classrooms, 'teacher', '', this.classroomCount++);
            classroom.teacherHandle = teacherHandle;
            classroom.teacherName = parameters.displayName;
            classroom.teacherState = 'idle';
            this.command_checkClassroomState(parameters);
            return this.replySuccess(this.newAnswer({ classroomId, teacherHandle, teacherName: classroom.teacherName, classroomInfo: classroom.classroomInfo }), message, editor);
        }        
        // Add student to classroom
        const studentHandle = this.awi.utilities.getUniqueIdentifier(this.classrooms, 'student', '', this.classroomCount++);
        classroom.students[studentHandle] = {
            handle: studentHandle,
            studentName: parameters.displayName,
            state: 'idle'
        };
        this.command_checkClassroomState(parameters);
        return this.replySuccess(this.newAnswer({ classroomId, studentHandle, studentName: classroom.students[studentHandle].studentName, classroomInfo: classroom.classroomInfo }), message, editor);
    }
    async command_leaveClassroom(parameters, message, editor){
        const classroomId = parameters.classroomId;
        var classroom = this.classrooms[classroomId];
        if (!classroom) {
            return this.replyError(this.newError('awi:classroom-not-found', { classroomId }), message, editor);
        }
        // Remove teacher from classroom
        if (parameters.type == 'teacher' && classroom.teacherHandle) {
            this.command_disconnectTeacher(parameters);
            classroom.teacherHandle = '';
            classroom.teacherName = '';
            classroom.teacherState = 'idle';
            this.command_checkClassroomState(parameters);
            return this.replySuccess(this.newAnswer(true), message, editor);
        }
        // Remove student from classroom
        if (classroom.students[parameters.studentHandle]) {
            this.command_disconnectStudent(parameters);
            delete classroom.students[parameters.studentHandle];
            this.command_checkClassroomState(parameters);
            return this.replySuccess(this.newAnswer(true), message, editor);    
        }
        return this.replyError(this.newError('awi:student-not-found', { type: parameters.type }), message, editor);
    }

    async mediasoupInit(classroomId) {
        const mediasoup = this.getMediasoup();
        if (!mediasoup) {
            return this.newError('awi:mediasoup-not-initialized');
        }
        try {
            await mediasoup.createClassroomMediasoupRoom(classroomId);
            return this.newAnswer({ classroomId });
        } catch (err) {
            return this.newError('awi:mediasoup-error');
        }
    }

    async command_connectTeacher(parameters, message, editor) {
        const classroomId = parameters.classroomId;
        var classroom = this.classrooms[classroomId];
        if (!classroom) {
            return this.replyError(this.newError('awi:classroom-not-found', { classroomId }), message, editor);
        }
        const teacherHandle = parameters.teacherHandle;
        if (!teacherHandle) {
            return this.replyError(this.newError('awi:classroom-teacher-not-found', { classroomId }), message, editor);
        }
            
        var answer = await this.mediasoupInit(classroomId);
        if (answer.isError()) {
            return this.replyError(answer, message, editor);
        }
        const action = parameters.action.toLowerCase();
        const mediasoup = this.getMediasoup();
        switch (action) {
            case 'getrouterrtpcapabilities': {
                const room = await mediasoup.getClassroomMediasoupRoom(classroomId);
                if (!room) {
                    return this.replyError(this.newError('awi:classroom-not-found', { classroomId }), message, editor);
                }
                answer = this.replySuccess(this.newAnswer({ rtpCapabilities: room.router.rtpCapabilities, iceServers: this.getIceServers() }), message, editor);
                break;
            }
            case 'createtransport': {
                const transportParams = await mediasoup.createTeacherTransport(classroomId, teacherHandle, parameters.mediasoupOptions || {});
                classroom.transportParams = transportParams;
                classroom.teacherState = 'transportCreated';
                answer = this.replySuccess(this.newAnswer({ classroomId, teacherHandle, transportParams, iceServers: this.getIceServers() }), message, editor);
                break;
            }
            case 'connecttransport': {
                await mediasoup.connectTeacherTransport(classroomId, teacherHandle, parameters.dtlsParameters);
                classroom.teacherState = 'transportConnected';
                answer = this.replySuccess(this.newAnswer({ classroomId, teacherHandle, status: 'transport-connected' }), message, editor);
                break;
            }
            case 'produce': {
                const producerId = await mediasoup.createTeacherProducer(classroomId, teacherHandle, parameters.kind, parameters.rtpParameters);
                classroom.teacherState = 'active';
                answer = this.replySuccess(this.newAnswer({ classroomId, teacherHandle, producerId, teacherName: classroom.teacherName }), message, editor);
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
        const mediasoup = this.getMediasoup();
        var classroom = this.classrooms[classroomId];
        if (!classroom) {
            return this.replyError(this.newError('awi:classroom-not-found', { classroomId }), message, editor);
        }
        var answer = await this.mediasoupInit(classroomId);
        if (answer.isError()) {
            return this.replyError(answer, message, editor);
        }
        const studentHandle = parameters.studentHandle;
        if (!studentHandle) {
            return this.replyError(this.newError('awi:student-not-found', { classroomId }), message, editor);
        }
        const action = parameters.action.toLowerCase();
        switch (action) {
            case 'getrouterrtpcapabilities': {
                const room = await mediasoup.getClassroomMediasoupRoom(classroomId);
                answer = this.replySuccess(this.newAnswer({ rtpCapabilities: room.router.rtpCapabilities, iceServers: this.getIceServers() }), message, editor);
                break;
            }
            case 'createtransport': {
                const transportParams = await mediasoup.createStudentTransport(classroomId, studentHandle, parameters.mediasoupOptions || {});
                classroom.students[studentHandle].transportParams = transportParams;
                classroom.students[studentHandle].state = 'transportCreated';
                answer = this.replySuccess(this.newAnswer({ classroomId, studentHandle, transportParams, iceServers: this.getIceServers() }), message, editor);
                break;
            }
            case 'connecttransport': {
                await mediasoup.connectStudentTransport(classroomId, studentHandle, parameters.dtlsParameters);
                classroom.students[studentHandle].state = 'transportConnected';
                answer = this.replySuccess(this.newAnswer({ classroomId, studentHandle, status: 'transport-connected' }), message, editor);
                break;
            }
            case 'produce': {
                const producerId = await mediasoup.createStudentProducer(classroomId, studentHandle, parameters.kind, parameters.rtpParameters);
                classroom.students[studentHandle].state = 'active';
                answer = this.replySuccess(this.newAnswer({ classroomId, studentHandle, producerId, studentName: classroom.students[studentHandle].studentName }), message, editor);
                break;
            }
            case 'consume': {
                // Student wants to consume a teacher's stream
                const teacherHandle = parameters.teacherHandle || classroom.teacherHandle;
                const kinds = ['audio', 'video'];
                let consumerParams = {};
                let errors = {};
                if (parameters.kind) {
                    // If kind is specified, just try that one
                    try {
                        consumerParams[parameters.kind] = await mediasoup.createStudentConsumer(classroomId, studentHandle, teacherHandle, parameters.kind, parameters.rtpCapabilities);
                    } catch (err) {
                        errors[parameters.kind] = err.message;
                    }
                } else {
                    // Try both audio and video
                    for (const kind of kinds) {
                        try {
                            consumerParams[kind] = await mediasoup.createStudentConsumer(classroomId, studentHandle, teacherHandle, kind, parameters.rtpCapabilities);
                        } catch (err) {
                            errors[kind] = err.message;
                        }
                    }
                }
                if (Object.keys(consumerParams).length > 0) {
                    answer = this.replySuccess(this.newAnswer({ classroomId, studentHandle, consumerParams, studentName: classroom.students[studentHandle].studentName }), message, editor);
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
        const mediasoup = this.getMediasoup();
        var classroom = this.classrooms[classroomId];
        if (!classroom) {
            return this.replyError(this.newError('awi:classroom-not-found', { classroomId }), message, editor);
        }
        // Only disconnect if the student is not already idle
        const student = classroom.students[parameters.studentHandle];
        if (!student || student.state === 'idle') {
            return this.replySuccess(this.newAnswer({ classroomId, studentHandle: parameters.studentHandle }), message, editor);
        }
        // Disconnect student resources if initialized
        try {
            if (student.state === 'transportCreated' || student.state === 'transportConnected' || student.state === 'active') {
                await mediasoup.disconnectStudentTransport(classroomId, parameters.studentHandle);
            }
            student.state = 'idle';
            student.transportParams = null;
            this.command_checkClassroomState({ classroomId });
            return this.replySuccess(this.newAnswer({ classroomId, studentHandle: parameters.studentHandle }), message, editor);
        } catch (err) {
            return this.replyError(this.newError('awi:mediasoup-error', { error: err.message }), message, editor);
        }
    }

    async command_disconnectTeacher( parameters, message, editor )
    {
        const classroomId = parameters.classroomId;
        const mediasoup = this.getMediasoup();
        var classroom = this.classrooms[classroomId];
        if (!classroom) {
            return this.replyError(this.newError('awi:classroom-not-found', { classroomId }), message, editor);
        }
        // Only disconnect if the teacher is not already idle
        if (classroom.teacherState === 'idle') {
            return this.replySuccess(this.newAnswer({ classroomId, teacherHandle: classroom.teacherHandle }), message, editor);
        }
        // Disconnect teacher resources if initialized
        try {
            if (classroom.teacherState === 'transportCreated' || classroom.teacherState === 'transportConnected' || classroom.teacherState === 'active') {
                await mediasoup.disconnectTeacherTransport(classroomId, classroom.teacherHandle);
            }
            classroom.teacherState = 'idle';
            classroom.transportParams = null;
            this.command_checkClassroomState({ classroomId });
            return this.replySuccess(this.newAnswer({ classroomId, teacherHandle: classroom.teacherHandle }), message, editor);
        } catch (err) {
            return this.replyError(this.newError('awi:mediasoup-error', { error: err.message }), message, editor);
        }
    }

    async endAllClassrooms() {
        for (let classroomId in this.classrooms) {
            await this.command_endClassroom({ classroomId }, null, null);
        }
    }
    
    async command_endClassroom(parameters, message, editor) {
        const classroomId = parameters.classroomId;
        const mediasoup = this.getMediasoup();
        var classroom = this.classrooms[classroomId];
        if (!classroom) {
            return this.replyError(this.newError('awi:classroom-not-found', { classroomId }), message, editor);
        }
        if (classroom.state !== 'active') {
            return this.replyError(this.newError('awi:classroom-not-active', { classroomId }), message, editor);
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
            await mediasoup.endClassroom(classroomId);
            return this.replySuccess(this.newAnswer({ classroomId }), message, editor);
        } catch (err) {
            return this.replyError(this.newError('awi:mediasoup-error', { error: err.message }), message, editor);
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
