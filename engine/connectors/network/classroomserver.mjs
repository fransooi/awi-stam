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
            classroomInfo: parameters.classroomInfo
        };
        this.classrooms[classroomId] = classroom;
        this.awi.editor.print(`Created classroom ${classroomId}`, { user: 'awi' });
        this.replySuccess(this.newAnswer({ classroomId }), message, editor);
    }
    
    // Add a student to an existing classroom
    async command_joinClassroom(parameters, message, editor)
    {
        
    }

    // Handles mediasoup signaling actions for teacher real-time streaming
    async command_connectTeacher(parameters, message, editor) {
        const classroomId = parameters.classroomId;
        var classroom = this.classrooms[classroomId];
        if (!classroom) {
            this.replyError(this.newError('awi:classroom-not-found', { classroomId }), message, editor);
            return;
        }
        const mediasoupServer = this.awi.mediasoupServer;
        try {
            switch (parameters.action) {
                case 'getRouterRtpCapabilities': {
                    // Return RTP capabilities for the classroom's mediasoup router
                    const room = await mediasoupServer.createClassroomMediasoupRoom(classroomId);
                    this.replySuccess(this.newAnswer({ rtpCapabilities: room.router.rtpCapabilities }), message, editor);
                    break;
                }
                case 'createTransport': {
                    // Create a WebRTC transport for the teacher
                    const teacherHandle = parameters.teacherHandle || this.awi.utilities.getUniqueIdentifier(this.classrooms, 'teacher', this.classroomCount++);
                    classroom.teacherHandle = teacherHandle;
                    const transportParams = await mediasoupServer.createTeacherTransport(classroomId, teacherHandle, parameters.mediasoupOptions || {});
                    classroom.transportParams = transportParams;
                    this.replySuccess(this.newAnswer({ classroomId, teacherHandle, transportParams }), message, editor);
                    break;
                }
                case 'connectTransport': {
                    // Connect the teacher's transport with DTLS parameters
                    const teacherHandle = parameters.teacherHandle;
                    await mediasoupServer.connectTeacherTransport(classroomId, teacherHandle, parameters.dtlsParameters);
                    this.replySuccess(this.newAnswer({ classroomId, teacherHandle, status: 'transport-connected' }), message, editor);
                    break;
                }
                case 'produce': {
                    // Create a producer for the teacher's media
                    const teacherHandle = parameters.teacherHandle;
                    const producerId = await mediasoupServer.createTeacherProducer(classroomId, teacherHandle, parameters.kind, parameters.rtpParameters);
                    this.replySuccess(this.newAnswer({ classroomId, teacherHandle, producerId }), message, editor);
                    break;
                }
                default: {
                    this.replyError(this.newError('awi:unknown-mediasoup-action', { action: parameters.action }), message, editor);
                }
            }
        } catch (err) {
            this.replyError(this.newError('awi:mediasoup-error', { error: err.message }), message, editor);
        }
    }
    async command_disconnectTeacher( parameters, message, editor )
    {
    }

    async command_connectStudent( parameters, message, editor )
    {
    }
    async command_disconnectStudent( parameters, message, editor )
    {
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
