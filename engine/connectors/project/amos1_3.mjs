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
* @file amos1_3.mjs
* @author FL (Francois Lionet)
* @version 0.5
*
* @short Amos 1.3 connector.
*
*/
import ConnectorProjectBase from './projectBase.mjs';
export { ConnectorAmos1_3 as Connector }

class ConnectorAmos1_3 extends ConnectorProjectBase
{
	constructor( awi, config = {} )
	{
		super( awi, config );
		this.name = 'Amos 1.3';
		this.token = 'amos1_3';
		this.className = 'ConnectorAmos1_3';
        this.group = 'project';    
		this.version = '0.5';
	}
	async connect( options )
	{
		super.connect( options );
        return this.setConnected( true );
	}
}
