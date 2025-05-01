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
* @file c64.mjs
* @author FL (Francois Lionet)
* @version 0.5
*
* @short C64 connector.
*
*/
import ConnectorProject from './project.mjs'
import { SERVERCOMMANDS } from '../../servercommands.mjs';
export { ConnectorC64 as Connector }

class ConnectorC64 extends ConnectorProject
{
	constructor( awi, config = {} )
	{
		super( awi, config );
		this.name = 'C64';
		this.token = 'c64';
		this.className = 'ConnectorC64';
        this.group = 'project';    
		this.version = '0.5';

        this.commandMap = {};
        for ( var c in SERVERCOMMANDS ){
            if ( this[ 'command_' + SERVERCOMMANDS[ c ] ] )
                this.commandMap[ c ] = this[ 'command_' + SERVERCOMMANDS[ c ] ];
        }
	}
	async connect( options )
	{
		super.connect( options );
        return this.setConnected( true );
	}
}
