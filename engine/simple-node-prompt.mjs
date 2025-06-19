/** --------------------------------------------------------------------------
*
*            / \
*          / _ \              (°°)       Intelligent
*        / ___ \ [ \ [ \ [  ][   ]       Programmable
*     _/ /   \ \_\ \/\ \/ /  |  | \      Personal
* (_)|____| |____|\__/\__/ [_| |_] \     Assistant
*
* This file is open-source under the conditions contained in the
* license file located at the root of this project.
*
* ----------------------------------------------------------------------------
* @file simple-node-prompt.js
* @author FL (Francois Lionet)
* @date first pushed on 10/11/2019
* @version 0.5
*
* @short Starts Awi as simple command line prompt
*
*/
import Awi from './awi.mjs';

async function startAwi( prompt, config )
{
	var basket = {};
	var awi = new Awi( null, config );
    var answer = await awi.connect( {} );
	if ( answer.isSuccess() )
	{
        if ( prompt )
        {
		    await awi.prompt.prompt( { prompt: prompt }, basket, { editor: awi.editor } );            
        }
	}
    else
    {
        console.log( error );
    }
}

// Returns the letter of the current drive (Windows only)
function getCurrentDriveLetter() {
    if (process.platform === 'win32') {
        const cwd = process.cwd();
        if (cwd && cwd.length > 1 && cwd[1] === ':') {
            return cwd[0].toUpperCase();
        }
    }
    return null;
}

function getArguments()
{
	//var driveLetter = getCurrentDriveLetter();
	var templatesPath = 'D:/Awi-Data/public/templates';
	var httpRootDirectory = 'D:/Awi-Data/public';
    var configurationPath = 'D:/Awi-Data/configs';
	var dataPath = 'D:/Awi-Data/data';
	var answer =
	{
		prompt: 'fran',
        elements:
        [
            { name: 'connectors/system/node', config: { priority: 100 }, options: {} },
            { name: 'connectors/system/files', config: { priority: 100 }, options: {} },
            { name: 'connectors/system/zip', config: { priority: 99 }, options: {} },
            { name: 'connectors/awi/messages', config: { priority: 99 }, options: {} },
            { name: 'connectors/awi/utilities', config: { priority: 99 }, options: {} },
            { name: 'connectors/awi/configuration', config: { priority: 99, configurationPath: configurationPath, dataPath: dataPath }, options: { } },
            { name: 'connectors/awi/time', config: { priority: 99  }, options: {} },
            { name: 'connectors/editor/editor', config: { priority: 99 }, options: { default: 'commandline', config: {} } },
            { name: 'connectors/network/websocketserver', config: { priority: 99 }, options: { 
				templatesPath: templatesPath,
                port: 1033
			} },
			{ name: 'connectors/network/httpserver', config: { priority: 98 }, options: {  
				port: 3333,
				rootDirectory: httpRootDirectory,
				enableHttps: false,
			} },
			{ name: 'connectors/network/classroomserver', config: { priority: 98 }, options: { iceServers: [
                {
                    urls: "stun:stun.relay.metered.ca:80",
                },
                {
                    urls: "turn:standard.relay.metered.ca:80",
                    username: "b05e93cff4c3ef28d6c05744",
                    credential: "FTqh3rfbgLzkP31y",
                },
                {
                    urls: "turn:standard.relay.metered.ca:80?transport=tcp",
                    username: "b05e93cff4c3ef28d6c05744",
                    credential: "FTqh3rfbgLzkP31y",
                },
                {
                    urls: "turn:standard.relay.metered.ca:443",
                    username: "b05e93cff4c3ef28d6c05744",
                    credential: "FTqh3rfbgLzkP31y",
                },
                {
                    urls: "turns:standard.relay.metered.ca:443?transport=tcp",
                    username: "b05e93cff4c3ef28d6c05744",
                    credential: "FTqh3rfbgLzkP31y",
                }
            ] } },
			{ name: 'connectors/network/mediasoupserver', config: { priority: 98 }, options: {} },
            { name: 'bubbles/awi/*', config: {}, options: {} },
            { name: 'souvenirs/awi/*', config: {}, options: {} },
            { name: 'memories/awi/*', config: {}, options: {} },
            { name: 'connectors/language/javascript', config: { priority: 98 }, options: {} },
            { name: 'connectors/awi/parser', config: { priority: 97 }, options: {} },
            { name: 'connectors/awi/persona', config: { priority: 96 }, options: {} },
            { name: 'connectors/awi/prompt', config: { priority: 95 }, options: {} },
            { name: 'connectors/edenai/chat', config: { priority: 94, key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiZmZjYzY2YzMtOTNmZi00YjYyLWIxNDgtY2FhZWJkNjhkZjIxIiwidHlwZSI6ImZyb250X2FwaV90b2tlbiJ9.Y73ATnBg_mMIZVj78A1Jf5RH-eCXfVPrihgqxSRT0R0'}, options: {} },
        ]
	};

	var error = false;
	var quit = false;
	for ( var a = 2; ( a < process.argv.length ) && !quit && !error; a++ )
	{
		var command = process.argv[ a ].toLowerCase();

		var pos;
		if( ( pos = command.indexOf( '--configurations=' ) ) >= 0 )
		{
			answer.config.configurations = command.substring( pos, command.length );
		}
		else if( ( pos = command.indexOf( '--engine=' ) ) >= 0 )
		{
			answer.config.engine = command.substring( pos, command.length );
		}
		else if( ( pos = command.indexOf( '--data=' ) ) >= 0 )
		{
			answer.config.data = command.substring( pos, command.length );
		}
		else if ( !error )
		{
			if ( answer.prompt.length > 0 )
				answer.prompt += ' ';
			answer.prompt += command;
		}
	}
	return { success: !error, data: answer };
};

var answer = getArguments();
if ( answer.success )
{
	startAwi( answer.data.prompt, answer.data );
}
