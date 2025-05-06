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

// Import MediasoupServer connector dynamically (AWI connector system)
let mediasoupServerConnector = null;
function getMediasoupServer(awi) {
    if (!mediasoupServerConnector) {
        mediasoupServerConnector = awi.getConnector('mediasoupServer');
    }
    return mediasoupServerConnector;
}

class ConnectorClassroomServer extends ConnectorBase
{
    constructor( awi, config = {} )
    {
        super( awi, config );
		this.name = 'Classroom Server';
		this.token = 'classroomServer';
		this.className = 'ConnectorClassroomServer';
		this.group = 'network';
		this.version = '0.5';
        this.editors = {};
        // Map of classroomId (teacher handle) -> classroom session object
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

    async command_connectTeacher(parameters, message, editor) {
        const teacherHandle = parameters.handle;
        let classroomId = this.awi.utilities.getUniqueIdentifier(this.classrooms, 'classroom', this.classroomCount++);
        if (!this.classrooms[classroomId]) {
            const classroom = {
                editor,
                classroomId,
                teacherHandle,
                students: {},
                signalingState: {},
                created: Date.now(),
                metadata: parameters.metadata || {},
            };
            this.classrooms[classroomId] = classroom;
            this.awi.awi.editor.print(`Created classroom ${classroomId}`, { user: 'awi' });
        } else {
            this.awi.awi.editor.print(`Classroom ${classroomId} already exists`, { user: 'awi' });
        }
        // --- Mediasoup integration: create mediasoup room and teacher transport ---
        try {
            const mediasoupServer = this.awi.awi.mediasoupServer;
            // Create mediasoup room and transport for teacher
            const transportParams = await mediasoupServer.createTeacherTransport(classroomId, teacherHandle, parameters.mediasoupOptions || {});
            // Reply with classroomId, teacherHandle, and mediasoup transport params
            this.replySuccess(this.newAnswer({ classroomId, teacherHandle, mediasoupTransport: transportParams }), message, editor);
        } catch (err) {
            this.replyError(this.newError('awi:mediasoup-error', { error: err.message }), message, editor);
        }
    }
    // Step 2: Teacher DTLS connect (called after initial transport creation)
    async command_connectTeacherTransport(parameters, message, editor) {
        const { classroomId, teacherHandle, dtlsParameters } = parameters;
        try {
            const mediasoupServer = this.awi.awi.mediasoupServer;
            await mediasoupServer.connectTeacherTransport(classroomId, teacherHandle, dtlsParameters);
            this.replySuccess(this.newAnswer({ classroomId, teacherHandle, status: 'dtls-connected' }), message, editor);
        } catch (err) {
            this.replyError(this.newError('awi:mediasoup-dtls-error', { error: err.message }), message, editor);
        }
    }

    // Step 3: Teacher creates a media producer (audio/video)
    async command_createTeacherProducer(parameters, message, editor) {
        const { classroomId, teacherHandle, kind, rtpParameters } = parameters;
        try {
            const mediasoupServer = this.awi.awi.mediasoupServer;
            const producerId = await mediasoupServer.createTeacherProducer(classroomId, teacherHandle, kind, rtpParameters);
            this.replySuccess(this.newAnswer({ classroomId, teacherHandle, producerId, kind }), message, editor);
        } catch (err) {
            this.replyError(this.newError('awi:mediasoup-producer-error', { error: err.message }), message, editor);
        }
    }

    async command_connectStudent( parameters, message, editor )
    {
        const studentHandle = this.awi.utilities.getUniqueIdentifier( this.classrooms, 'student', this.classroomCount++ );
        const classroomId = parameters.classroomId;
        if (this.classrooms[classroomId]) {
            this.classrooms[classroomId].students[studentHandle] = {
                handle: studentHandle,
                editor: editor,
                metadata: parameters.metadata || {}, // Any extra info
            };
            this.awi.awi.editor.print(`Student ${studentHandle} connected to classroom ${classroomId}`, { user: 'awi' });

            // Send studentConnected command to teacher
            this.classrooms[classroomId].editor.sendCommand({
                command: SERVERCOMMANDS.STUDENT_CONNECTED,
                parameters: {
                    classroomId: classroomId,
                    studentHandle: studentHandle,
                    metadata: student.metadata,
                },
            });
            // Send studentConnected command to all students
            for (let studentHandle in this.classrooms[classroomId].students) {
                var student = this.classrooms[classroomId].students[studentHandle];
                if (student.handle != studentHandle) {
                    student.editor.sendCommand({
                        command: SERVERCOMMANDS.STUDENT_CONNECTED,
                        parameters: {
                            classroomId: classroomId,
                            studentHandle: studentHandle,
                        },
                        metadata: student.metadata,
                    });
                }
            }
            this.replySuccess(this.newAnswer({ classroomId, studentHandle }), message, editor);
        } else {
            this.awi.awi.editor.print(`Classroom ${classroomId} not found`, { user: 'awi' });
            this.replyError(this.newError('awi:classroom-not-found', { classroomId }), message, editor);
        }
    }
    async command_disconnectStudent( parameters, message, editor )
    {
        const studentHandle = parameters.studentHandle;
        const classroomId = parameters.classroomId;
        if (this.classrooms[classroomId]) {
            if (this.classrooms[classroomId].students[studentHandle]) {
                delete this.classrooms[classroomId].students[studentHandle];
                this.awi.awi.editor.print(`Deleted student ${studentHandle} from classroom ${classroomId}`, { user: 'awi' });
                // Send studentDisconnected command to teacher
                this.classrooms[classroomId].editor.sendCommand({
                    command: SERVERCOMMANDS.STUDENT_DISCONNECTED,
                    parameters: {
                        classroomId: classroomId,
                        studentHandle: studentHandle,
                    },
                });
                // Send studentDisconnected command to all students
                for (let studentHandle in this.classrooms[classroomId].students) {
                    var student = this.classrooms[classroomId].students[studentHandle];
                    if (student.handle != studentHandle) {
                        student.editor.sendCommand({
                            command: SERVERCOMMANDS.STUDENT_DISCONNECTED,
                            parameters: {
                                classroomId: classroomId,
                                studentHandle: studentHandle,
                            },
                        });
                    }
                }
                this.replySuccess(this.newAnswer({ classroomId, studentHandle }), message, editor);
            } else {
                this.awi.awi.editor.print(`Student ${studentHandle} not found in classroom ${classroomId}`, { user: 'awi' });
                this.replyError(this.newError('awi:student-not-found', { studentHandle, classroomId }), message, editor);
            }
        } else {
            this.awi.awi.editor.print(`Classroom ${classroomId} not found`, { user: 'awi' });
            this.replyError(this.newError('awi:classroom-not-found', { classroomId }), message, editor);
        }
    }
    async command_disconnectTeacher( parameters, message, editor )
    {
        const teacherHandle = parameters.handle;
        const classroomId = teacherHandle;
        if (this.classrooms[classroomId]) {
            delete this.classrooms[classroomId];
            this.awi.awi.editor.print(`Deleted classroom ${classroomId}`, { user: 'awi' });
            this.replySuccess(this.newAnswer({ classroomId, status: 'deleted' }), message, editor);
        } else {
            this.awi.awi.editor.print(`Classroom ${classroomId} not found`, { user: 'awi' });
            this.replyError(this.newError('awi:classroom-not-found', { classroomId }), message, editor);
        }
    }
    replyError( error, message )
	{
		if ( message )
			this.reply( { error: error.getPrint() }, message );
		return error;
    }
    replySuccess( answer, message )
    {
        if ( message )
            this.reply( answer.data, message );
        return answer;
    }
}
