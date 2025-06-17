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
import ConnectorProjectBase from './projectBase.mjs';
export { ConnectorSTOS as Connector }

class ConnectorSTOS extends ConnectorProjectBase
{
	constructor( awi, config = {} )
	{
		super( awi, config );
		this.name = 'STOS';
		this.token = 'stos';
		this.className = 'ConnectorSTOS';
        this.group = 'project';    
		this.version = '0.5';
	}
	async connect( options )
	{
		super.connect( options );
        return this.setConnected( true );
	}
}
