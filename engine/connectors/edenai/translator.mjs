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
*
* ----------------------------------------------------------------------------
* @file translator.js
* @author FL (Francois Lionet)
* @version 0.5
*
* @short Translator connector, translate text
*
*/
import ConnectorBase from '../../connector.mjs'
import axios from 'axios'
export { ConnectorTranslator as Connector }

class ConnectorTranslator extends ConnectorBase
{
	constructor( awi, options = {} )
	{
		super( awi, options );
		this.name = 'Translator';
		this.token = 'translator';
        this.group = 'edenai';
		this.classname = 'ConnectorTranslator';
		this.version = '0.5';

		this.cancelled = false;
		this.messageCount = 0;
        this.user = '';
        this.configuration = null;
	}
	async connect( options )
	{
		super.connect( options );
		return this.setConnected( true );
	}
    async registerEditor(args, basket, control)
    {
        this.editor = args.editor;
        this.userName = args.userName;

        var data = {};
        data[ this.token ] = {
            self: this,
            version: this.version,
            commands: {
                translate: this.command_translate.bind(this),
            }
        }
        return this.newAnswer( data );
    }
    async setUser( args, basket, control )
    {
        var { userName } = this.awi.getArgs( [ 'userName' ], args, basket, [ '' ] );
        if (!this.awi.configuration.getConfig(userName))
            return this.newError('user-not-found');
        if ( !this.user || userName != this.user )
        {
            var configAnswer = await this.awi.configuration.getToolConfiguration( 'edenai', 'chat' );
            if ( configAnswer.isError() )
                return configAnswer;
            this.user = userName;
            this.configuration = configAnswer.getValue();
        }
        return this.newAnswer( { translator: { config: this.configuration } } );
    }

	async command_translate( args, basket, control )
	{
		if ( !this.configuration )
            return this.newError('awi:user-not-connected' );

        var providers = [ 'xai', 'openai', 'google' ];
        var { text, sourceLanguage, targetLanguage } = this.awi.getArgs( 'text', 'sourceLanguage', 'targetLanguage', args, basket, [ '', '', '' ] );
        if ( !text || !sourceLanguage || !targetLanguage )
            return this.newError( 'awi:missing-argument', 'text, sourceLanguage, targetLanguage' );
        const data = {
            providers: providers.join( ',' ),
            text: text,
            source_language: sourceLanguage,
            target_language: targetLanguage,
        };
        var debug = this.awi.messages.format( `~{text}~
sourceLanguage: ~{sourceLanguage}~
targetLanguage: ~{targetLanguage}~
model: ~{providers}~`, {} );
        control.editor.print( debug.split( '\n' ), { user: 'completion' } );

		if ( !this.configuration )
            return this.newError( 'awi:configuration_not_found' );

        var answer;
        var self = this;
        var options = {
            method: "POST",
            url: "https://api.edenai.run/v2/translation/automatic_translation",
            headers: {
                authorization: 'Bearer ' + this.configuration.key
            },
            data: data,
        };

        axios.request( options )
            .then( function( response )  
            {
                for(var p = 0; p < providers.length; p++)
                {
                    if ( response[ providers[p] ] && ! response[ providers[p] ].error )
                    {
                        answer = self.newAnswer( response[ providers[p] ].text );
                        break;
                    }
                }
            } )
            .catch( function( err ) 
            {                    
                answer = self.newError( err );
            } );

        while( !answer )
            await new Promise( resolve => setTimeout( resolve, 1 ) );
		return answer;
	}
}
