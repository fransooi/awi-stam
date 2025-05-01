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
* @file webrtcserver.mjs
* @author FL (Francois Lionet)
* @version 0.5
*
* @short Connector opening a WebRTC server on the machine
*        for classroom video sharing
*/
import ConnectorBase from '../../connector.mjs'
export { ConnectorWebRTCServer as Connector }

class ConnectorWebRTCServer extends ConnectorBase
{
    constructor( awi, config = {} )
    {
        super( awi, config );
		this.name = 'WebRTC Server';
		this.token = 'webrtcServer';
		this.className = 'ConnectorWebRTCServer';
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
}
