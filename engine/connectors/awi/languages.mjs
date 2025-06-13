import ConnectorBase from '../../connector.mjs'
import { SERVERCOMMANDS } from '../../servercommands.mjs';
export { ConnectorLanguages as Connector }

class ConnectorLanguages extends ConnectorBase
{
	constructor( awi, config = {} )
	{
		super( awi, config );
		this.name = 'Languages';
		this.token = 'languages';
		this.className = 'ConnectorLanguages';
        this.group = 'awi';    
		this.version = '0.5';
        this.languagesPath = this.awi.configuration.getConfigurationPath() + '/languages';
	}
	async connect( options )
	{
	    super.connect( options );
        if ( options.languagesPath )
            this.languagesPath = options.languagesPath;
       return this.setConnected( true );
    }
    async registerEditor(args, basket, control)
    {
        this.editor = args.editor;
        this.userName = this.editor.userName;

        var data = {};
        data[ this.token ] = {
            self: this,
            version: this.version,
            commands: {
                getLanguageList: this.command_getLanguageList.bind(this),
                translateLanguage: this.command_translateLanguage.bind(this),
                saveLanguage: this.command_saveLanguage.bind(this),
                loadLanguage: this.command_loadLanguage.bind(this),
                deleteLanguage: this.command_deleteLanguage.bind(this),
            }
        }
        return this.newAnswer( data );
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
    async command( message, editor )
    {
        if ( this[ 'command_' + message.command ] )
            return this[ 'command_' + message.command ]( message.parameters, message, editor );
        return this.replyError( this.newError( 'awi:command-not-found', message.command ), message, editor );
    }

    // PROJECTS COMMANDS
    ////////////////////////////////////////////////////////////////////////////////////
    async command_getLanguageList( parameters, message, editor )
    {
        var filter = '*.txt';
        var languagePath = this.languagesPath + '/' + parameters.type;
        var answer = await this.awi.files.getDirectory( languagePath, { recursive: false, listDirectories: false, filters: filter, noStats: true } );
        if ( answer.isError() )
            return this.replyError( answer, message, editor );
        var files = answer.data;
        var languages = [];
        for ( var f = 0; f < files.length; f++ )
        {
            var file = files[ f ];
            languages.push( { name: file.name.substring( 0, file.name.length - 4 ) } );
        }
        return this.replySuccess( this.newAnswer( languages ), message, editor );
    }
    async command_loadLanguage( parameters, message, editor )
    {
        var languagePath = this.languagesPath + '/' + parameters.type + '/' + parameters.language + '.txt';
        if ( !this.awi.system.exists( languagePath ).isSuccess() )
            return this.replyError(this.newError( 'awi:language-not-found', parameters.language ), message, editor);
        // Load the language file
        var answer = await this.awi.files.loadText( languagePath );
        if ( answer.isError() )
            return this.replyError(answer, message, editor);
        return this.replySuccess(this.newAnswer( answer.data ), message, editor);
    }
    async command_saveLanguage( parameters, message, editor )
    {
        var languagePath = this.languagesPath + '/' + parameters.type + '/' + parameters.language + '.txt';
        var answer = await this.awi.files.saveText( languagePath, parameters.languageText );
        if ( answer.isError() )
            return this.replyError(answer, message, editor);
        return this.replySuccess(this.newAnswer( true ), message, editor);
    }
    async command_deleteLanguage( parameters, message, editor )
    {
        var languagePath = this.languagesPath + '/' + parameters.type + '/' + parameters.language + '.txt';
        if ( !this.awi.system.exists( languagePath ).isSuccess() )
            return this.replyError(this.newError( 'awi:language-not-found', parameters.language ), message, editor);
        var answer = await this.awi.files.delete( languagePath );
        if ( answer.isError() )
            return this.replyError(answer, message, editor );
        return this.replySuccess(this.newAnswer(true), message, editor);
    }
    async command_translateLanguage( parameters, message, editor )
    {
        var targetLanguagePath = this.languagesPath + '/' + parameters.type + '/' + parameters.targetLanguage + '.txt';
        var fromLanguageText = parameters.fromLanguageText;
        if ( !fromLanguageText )
        {
            var fromLanguagePath = this.languagesPath + '/' + parameters.type + '/' + parameters.fromLanguage + '.txt';
            if ( !this.awi.system.exists( fromLanguagePath ).isSuccess() )
                return this.replyError(this.newError( 'awi:language-not-found', parameters.fromLanguage ), message, editor);
            var answer = await this.handle_loadLanguage( { type: parameters.type, language: parameters.fromLanguage } );
            if ( answer.isError() )
                return this.replyError(answer, message, editor );
            fromLanguageText = answer.data;
        }
        if (!this.awi.translator)
            return this.replyError(this.newError( 'awi:translator-not-available' ), message, editor);
        var answer = await this.awi.translator.translate( { text: fromLanguageText, sourceLanguage: parameters.fromLanguage, targetLanguage: parameters.targetLanguage } );
        if ( answer.isError() )
            return this.replyError(answer, message, editor );
        var newLanguage = answer.data;
        var answer = await this.awi.files.saveText( targetLanguagePath, newLanguage );
        if ( answer.isError() ) 
            return this.replyError(answer, message, editor );
        return this.replySuccess(this.newAnswer(newLanguage), message, editor);
    }
}
