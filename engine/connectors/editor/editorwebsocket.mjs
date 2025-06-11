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
* @file editorwebsocket.mjs
* @author FL (Francois Lionet)
* @version 0.5
*
* @short Web-Socket based editor 
*
*/
import EditorBase from './editorbase.mjs';
export { EditorWebSocket as Editor }
import { SERVERCOMMANDS } from '../../servercommands.mjs'
class EditorWebSocket extends EditorBase
{
	constructor( awi, config = {} )
	{
		super( awi, config );
		this.className = 'EditorWebSocket';
        this.handle = config.handle;
        this.parent = config.parent;
        this.version = this.parent.version;
        this.connection = config.connection;
        this.lastMessage = config.lastMessage;
        this.lastMessage.handle = this.handle;

        this.lastLine = '';
        this.inputEnabled = true;
        this.reroute = undefined;
        this.basket = {};
        this.toPrint = [];
        this.toPrintClean = [];
        this.toReply = {};
        this.callbacks = {};
        this.templatesUrl = config.templatesUrl;
        this.projectsUrl = config.projectsUrl;
        this.runUrl = config.runUrl;
        this.accounts = {};
        
        // Find all languages available in this server
        this.languageMode='';
        this.connectors=null;
        this.lastMode = '';
	}
    async connect(options, message)
    {
        super.connect( options );
        var answer = await this.loadAccounts();
        if (!answer.isSuccess())
            return this.replyError( answer, message );
        if ( !this.connectors )
        {
            var answer = await this.awi.callConnectors( [ 'registerEditor', '*', { editor: this } ] );
            if ( !answer.isSuccess() )
                return this.replyError( this.newError( 'awi:cannot-register-editor', { value: options.accountInfo.userName } ), message );
            this.connectors=answer.data;
        }
        var answer = await this.command_checkPassword({userName: options.accountInfo.userName, password: options.password});
        if (!answer.isSuccess())
        {
            if (options.accountInfo.createAccount)
            {
                answer = await this.createServerAccount({accountInfo: options.accountInfo, password: options.password});
                if (answer.isSuccess())
                    answer = await this.command_checkPassword({userName: options.accountInfo.userName, password: options.password});
            }
            if (!answer.isSuccess())
                return this.replyError( answer, message );
        }
        this.replySuccess(this.newAnswer({userName: answer.data.accountInfo.userName, handle: this.handle, connectToAwi: answer.data.accountInfo.connectToAwi, key: answer.data.accountInfo.key}), message );
        this.waitForInput();
        return true;
    }
    async createServerAccount( parameters )
    {
        if ( this.accounts[ parameters.accountInfo.userName ] )
            return this.newError( 'awi:account-already-exist', { value: parameters.accountInfo.userName } );
        this.accounts[ parameters.accountInfo.userName ] = parameters.accountInfo;
        this.accounts[ parameters.accountInfo.userName ].password = parameters.password;
        var answer = await this.saveAccounts();
        if (!answer.isSuccess())
            return this.newError( 'awi:error-when-creating-user', { value: parameters.accountInfo.userName } );
        return this.newAnswer( { userName: parameters.accountInfo.userName } );
    }
    async saveAccounts()
    {
        var path = this.awi.awi.configuration.getConfigurationPath();
        var json = JSON.stringify( this.accounts );
        var jsonEncrypted = this.awi.awi.utilities.encrypt( json );
        return await this.awi.files.saveText( path + '/accounts.dat', jsonEncrypted );
    }
    async loadAccounts()
    {
        var path = this.awi.awi.configuration.getConfigurationPath() + '/accounts.dat';
        var answer = this.awi.files.exists( path );
        if (answer.isError())
            return this.newAnswer(true);
        var jsonEncrypted = await this.awi.files.loadText( path );
        if (!jsonEncrypted.isSuccess())
            return this.newError( 'awi:error-when-loading-accounts' );
        var json = this.awi.utilities.decrypt( jsonEncrypted.data );
        try 
        {
            this.accounts = JSON.parse( json );
        }
        catch( e )
        {
            return this.newError( 'awi:error-when-loading-accounts' );
        }
        return this.newAnswer(true);
    }
    addDataToReply( name, data )
    {
        this.toReply[ name ] = data;
    }
	waitForInput( options = {} )
	{
		super.waitForInput( options );
		if (this.toPrint.length > 0 || !this.awi.utilities.isObjectEmpty(this.toReply))
		{
            var message = {
                text: this.toPrint.join(''),
                textClean: this.toPrintClean.join('\n'),
                lastLine: this.lastLine
            };
            if ( this.toReply )
                for( var p in this.toReply )
                    message[ p ] = this.toReply[ p ];
			this.sendMessage( SERVERCOMMANDS.PROMPT, message );
			this.toPrint = [];
			this.toPrintClean = [];
            this.toReply = {};
		}
	}
	print( text, options = {} )
	{
        return super.print( text, options );
	}
    reply( parameters, lastMessage=null  )
	{
        var message = {
            handle: lastMessage ? lastMessage.handle : this.lastMessage.handle,
            responseTo: lastMessage ? lastMessage.command : this.lastMessage.command,            
            callbackId: lastMessage ? lastMessage.id : this.lastMessage.id,
            id: this.awi.utilities.getUniqueIdentifier( {}, 'message', 0 ),
            parameters: parameters
        };
        var text = 'REPLY  : "' + message.responseTo + '" to user: ' + this.userName;
        var params = '';
        for ( var key in parameters )
            params += '.        ' + key + ': ' + parameters[ key ].toString().substring( 0, 60 ) + ', \n';
        if ( params )
            text += '\n' + params;
        this.awi.awi.editor.print( text, { user: 'awi' } );

		this.connection.send( JSON.stringify( message ) );
	}
	sendMessage( command, parameters, callback )
	{
        var message = {
            handle: this.handle,
            command: command, 
            parameters: parameters,
            id: this.awi.utilities.getUniqueIdentifier( {}, 'message', 0 )
        };
        if ( callback )
        {
            message.callbackId = this.awi.utilities.getUniqueIdentifier( this.callbacks, 'awi', 0 );
            this.callbacks[ message.callbackId ] = callback;
        }
        var text = 'MESSAGE: "' + command + '" to user: ' + this.userName;
        var params = '';
        for ( var key in parameters )
            params += '.        ' + key + ': ' + parameters[ key ].toString().substring( 0, 60 ) + ', \n';
        if ( params )
            text += '\n' + params;
        this.awi.awi.editor.print( text, { user: 'awi' } );

		this.connection.send( JSON.stringify( message ) );
	}
    onMessage( message )
    {
        this.lastMessage = message;
        if ( message.callbackId )
        {
            var callback = this.callbacks[ message.callbackId ];
            if ( callback )
            {
                this.callbacks[ message.callbackId ] = undefined;
                callback( message );
                return;
            }
        }
        var errorParameters = { error: 'awi:socket-command-not-found' };
        try
        {
            var userName = message.parameters.userName || this.userName;
            var text = 'COMMAND: "' + message.command + '" from user: ' + userName;
            var parameters = '';
            for ( var key in message.parameters )
                parameters += '.        ' + key + ': ' + message.parameters[ key ].toString().substring( 0, 60 ) + ', \n';
            if ( parameters )
                text += '\n' + parameters;
            if ( this[ 'command_' + message.command ] )
            {
                this.awi.awi.editor.print( text, { user: 'awi' } );
                return this[ 'command_' + message.command ]( message.parameters, message );
            }
            else
            {
                this.awi.awi.editor.print( text, { user: 'awi' } );
                var column = message.command.indexOf( ':' );
                if ( column > 0 )
                {
                    var connector = message.command.substring( 0, column );
                    if ( this.connectors[ connector ] )
                    {
                        var command = message.command.substring( column + 1 );
                        if ( this.connectors[ connector ].commands[ command ] )
                            return this.connectors[ connector ].commands[ command ]( message.parameters, message, this );
                        return this.replyError( this.newError( 'awi:command-not-found', { value: parameters.command } ), message );
                    }
                }
            }
            return this.replyError( this.newError( 'awi:command-not-found', { value: parameters.command } ), message );
        } 
        catch( e ) 
        { 
            errorParameters.error = 'awi:socket-error-processing-command';
            errorParameters.catchedError = e;
        }
        var text = this.awi.messages.getMessage( errorParameters.error, { command: message.command } );
        this.awi.awi.editor.print( text, { user: 'awi' } );
        this.reply( errorParameters );
    }

    // AWI commands
	async command_prompt( parameters, message )
	{
        var answer;
		
        this.promptMessage = message;
        var basket = this.awi.configuration.getBasket( 'user' );
		if ( this.inputEnabled )
		{
			if ( this.reroute )
				answer = await this.reroute( { prompt: parameters.prompt }, basket, { editor: this } );
			else
				answer = await this.awi.prompt.prompt( { prompt: parameters.prompt }, basket, { editor: this } );
            this.awi.configuration.setBasket( 'user', answer.getValue() );
		}
		else
		{
			this.toAsk.push( { parameters, message } );
            if ( !this.handleAsk )
            {
                var self = this;
				this.handleAsk = setInterval(
					function()
					{
						if ( self.inputEnabled && self.toAsk.length > 0 )
						{
                            var params = self.toAsk.pop();
                            self.command_prompt( { prompt: params.parameters }, params.message );
						}
                        if ( self.toAsk.length == 0 )
                        {
                            clearInterval( self.handleAsk );
                            self.handleAsk = null;
                        }
					}, 100 );
			}
		}
	}
    async command_createAwiAccount( parameters, message )
    {
        var config = this.awi.configuration.checkUserConfig( parameters.accountInfo.userName );
        if ( config )
            return this.replyError( this.newError( 'awi:account-already-exist', { value: parameters.accountInfo.userName } ) );

	    config = this.awi.configuration.getNewUserConfig();
	    config.firstName = parameters.accountInfo.firstName;
	    config.lastName = parameters.accountInfo.lastName;
	    config.fullName = parameters.accountInfo.firstName + ' ' + parameters.accountInfo.lastName;
        config.userName = parameters.accountInfo.userName;
        config.email = parameters.accountInfo.email;
        config.country = parameters.accountInfo.country;
        config.language = parameters.accountInfo.language;
        await this.awi.configuration.setNewUserConfig( config.userName.toLowerCase(), config );
        var answer = await this.awi.configuration.saveConfigs();
        if ( answer.isSuccess() )
            return this.replySuccess( this.newAnswer( { userName: parameters.accountInfo.userName } ), message );
        return this.replyError( this.newError( 'awi:error-when-creating-user', { value: parameters.accountInfo.userName } ), message );
    }
    async command_loginAwi( parameters, message )
    {
        var answer = await this.awi.callConnectors( [ 'setUser', '*', { userName: parameters.userName } ], {}, { editor: this } );
        if ( answer.isSuccess() )
        {
            this.awi.editor.print( [
                '<BR>', 
                'awi:user-changed:iwa', 
                '------------------------------------------------------------------' ],
                    { user: 'information', 
                    userName: parameters.userName,
                    newLine: true, prompt: false } );
            this.command_prompt( {
                prompt: 'Hello Awi... Could you first say hello to the user ' + 
                parameters.userName + ' then invent a funny joke about programming chores?'
            } );
            return this.replySuccess( answer, message );
        }
        return this.replyError( this.newError( 'awi:error-when-logging-in', { value: parameters.userName } ), message );
    }
    async command_checkPassword( parameters, message )
    {
        // Stupid check for the moment
        var accountInfo = this.accounts[parameters.userName];
        if (!accountInfo)
            return this.replyError( this.newError( 'awi:account-not-found', { value: parameters.userName } ), message );
        if (accountInfo.password != parameters.password)
            return this.replyError( this.newError( 'awi:wrong-password', { value: parameters.userName } ), message );
        this.userName = parameters.userName;
        return this.replySuccess( this.newAnswer( { accountInfo } ), message );
    }
}
