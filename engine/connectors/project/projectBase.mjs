/** --------------------------------------------------------------------------
*
*            / \
*          / _ \              (°°)       Intelligent
*        / ___ \ [ \ [ \ [  ][   ]       Programmable
*     _/ /   \ \_\ \/\ \/ /  |  | \      Personal Assistant
* (_)|____| |____|\__/\__/ [_| |_] \     link:
*
* This file is open-source under the conditions contained in the
* license file located at the root of this project.
* Please support the project: https://patreon.com/francoislionet
*
* ----------------------------------------------------------------------------
* @file stos.mjs
* @author FL (Francois Lionet)
* @version 0.5
*
* @short STOS connector.
*
*/
import ConnectorBase from '../../connector.mjs'
import { SERVERCOMMANDS } from '../../servercommands.mjs';
export default class ConnectorProjectBase extends ConnectorBase
{
	constructor( awi, config = {} )
	{
		super( awi, config );
		this.className = 'ProjectBase';
        this.group = 'project';    
		this.version = '0.5';
	}
	async connect( options )
	{
		super.connect( options );
        return this.setConnected( true );
	}
    replyError( error, message, editor )
    {
        if ( editor )
            editor.reply( { error: error.getPrint() }, message );
        return error;
    }
    replySuccess( answer, message, editor )
    {
        if ( editor )
            editor.reply( answer.data, message );
        return answer;
    }
	async command_runProject( parameters, message, editor )
	{
		return this.replySuccess(this.newAnswer({}), message, editor);
	}
	async command_stopProject( parameters, message, editor )
	{
		return this.replySuccess(this.newAnswer({}), message, editor);
	}
	async command_debugProject( parameters, message, editor )
	{
		return this.replySuccess(this.newAnswer({}), message, editor);
	}
	async command_compileProject( parameters, message, editor )
	{
		return this.replySuccess(this.newAnswer({}), message, editor);
	}
	async command_testProject( parameters, message, editor )
	{
		return this.replySuccess(this.newAnswer({}), message, editor);
	}
	async command_shareProject( parameters, message, editor )
	{
		return this.replySuccess(this.newAnswer({}), message, editor);
	}
	async command_helpProject( parameters, message, editor )
	{
		return this.replySuccess(this.newAnswer({}), message, editor);
	}
	async command_formatCode( parameters, message, editor )
	{
		return this.replySuccess(this.newAnswer([]), message, editor);
	}
	async command_testCode( parameters, message, editor )
	{
		return this.replySuccess(this.newAnswer({}), message, editor);
	}
}
