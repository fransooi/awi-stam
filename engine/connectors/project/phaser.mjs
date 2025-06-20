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
* @file phaser.mjs
* @author FL (Francois Lionet)
* @version 0.5
*
* @short Phaser connector.
*
*/
import ConnectorProjectBase from './projectBase.mjs';
export { ConnectorPhaser as Connector }

class ConnectorPhaser extends ConnectorProjectBase
{
	constructor( awi, config = {} )
	{
		super( awi, config );
		this.name = 'Phaser';
		this.token = 'phaser';
		this.className = 'ConnectorPhaser';
        this.group = 'project';    
		this.version = '0.5';
	}
	async connect( options )
	{
		super.connect( options );
        return this.setConnected( true );
	}
}
