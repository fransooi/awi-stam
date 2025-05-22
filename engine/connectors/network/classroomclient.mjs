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
* @file classroomclient.mjs
* @author FL (Francois Lionet)
* @version 0.5
*
* @short Connector to connect to root classroom server
*/
import ConnectorBase from '../../connector.mjs'
import { SERVERCOMMANDS } from '../../servercommands.mjs'
export { ConnectorClassroomClient as Connector }

class ConnectorClassroomClient extends ConnectorBase
{
    constructor( awi, config = {} )
    {
        super( awi, config );
        this.name = 'Classroom Client';
        this.token = 'classroom';
        this.className = 'ConnectorClassroomClient';
        this.group = 'network';
        this.version = '0.5';
        this.editors = {};
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

    async registerEditor(args, basket, control)
    {
        if ( this. awi.awi.classroom && this.awi.awi.classroom.className == 'ConnectorClassroomServer' ) 
        {
            this.editor = args.editor;
            this.userName = this.editor.userName;
    
            var data = {};
            data[ this.token ] = {
                self: this,
                version: this.version,
                commands: {
                    connectTeacher: this.command_callClassroom.bind(this, 'command_connectTeacher'),
                    disconnectTeacher: this.command_callClassroom.bind(this, 'command_disconnectTeacher'),
                    connectStudent: this.command_callClassroom.bind(this, 'command_connectStudent'),
                    disconnectStudent: this.command_callClassroom.bind(this, 'command_disconnectStudent'),
                    createClassroom: this.command_callClassroom.bind(this, 'command_createClassroom'),
                    endClassroom: this.command_callClassroom.bind(this, 'command_endClassroom'),
                    deleteClassroom: this.command_callClassroom.bind(this, 'command_deleteClassroom'),
                    joinClassroom: this.command_callClassroom.bind(this, 'command_joinClassroom'),
                    leaveClassroom: this.command_callClassroom.bind(this, 'command_leaveClassroom'),
                    getClassroomList: this.command_callClassroom.bind(this, 'command_getClassroomList'),
                    studentConnected: this.command_callClassroom.bind(this, 'command_studentConnected'),
                    studentDisconnected: this.command_callClassroom.bind(this, 'command_studentDisconnected'),
                    teacherConnected: this.command_callClassroom.bind(this, 'command_teacherConnected'),
                    teacherDisconnected: this.command_callClassroom.bind(this, 'command_teacherDisconnected'),
                }
            }
            return this.newAnswer( data );
        }
    }
    async command_callClassroom( command, parameters, message )
    {
        if ( this.awi.awi.classroom[command] ) 
            return await this.awi.awi.classroom[command]( parameters, message, this.editor );
        return this.replyError( this.newError( 'awi:classroom-command-not-found', { value: command } ), message, this.editor );
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
