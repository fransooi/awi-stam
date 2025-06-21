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
        this.userName = args.userName;

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
                cleanMessageList: this.command_cleanMessageList.bind(this),
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
    async command_cleanMessageList( parameters, message, editor )
    {
        var allFiles =[];
        var self = this;
        async function loadAllFiles( srcPath )
        {                        
            if ( self.awi.system.exists( srcPath ).isError() )
                return;
            var files = await self.awi.files.getDirectory( srcPath, { recursive: true, listFiles: true, listDirectories: false, filters: [ '*.js', '*.mjs' ], noStats: true } );
            if ( files.isError() )
                return;
            allFiles = files.data;
            for ( var f = 0; f < allFiles.length; f++ )
            {
                var file = allFiles[ f ];
                var answer = await self.awi.files.loadText( file.path );
                if ( answer.isError() )
                    continue;
                file.content = answer.data;
            }
            return allFiles;
        }
        function isKeyUsedInContent( content, key )
        {
            if ( !content || !key )
                return false;
            var startId = content.indexOf(key);
            while ( startId >= 0 && startId < content.length )
            {
              var c = content.charAt(startId + key.length);
              if ( c != '-' )
                return true;
              startId = content.indexOf(key, startId + key.length);
            }
            return false;
        }

        // Load all project files
        var allFiles = await loadAllFiles(parameters.srcPath);
        if ( !allFiles )
            return this.replyError('awi:dev-project-not-found', message, editor);

        // Check all file
        var cleanedMessages = {};
        for ( var key in parameters.messages )
        {
            for (var f = 0; f < allFiles.length; f++)
            {
                var file = allFiles[ f ];
                if ( isKeyUsedInContent( file.content, key ) ) {
                    cleanedMessages[ key ] = parameters.messages[ key ];
                    break;
                }
            }
        }

        // Sort
        var cleanedMessagesSort = [];
        for (var m in cleanedMessages)
            cleanedMessagesSort.push({ key: m, value: cleanedMessages[m] });
        cleanedMessagesSort.sort(function(a, b) { return a.key.localeCompare(b.key); });

        // Convert back to messages
        var cleanedMessages = {};
        for (var i = 0; i < cleanedMessagesSort.length; i++)
            cleanedMessages[cleanedMessagesSort[i].key] = cleanedMessagesSort[i].value;

        // Set system messages
        var version = cleanedMessages['stam:aaa-c-language-version'] || '1.0.0';
        var versionNumber = version.split('.');
        versionNumber = versionNumber.map(function (v) { return parseInt(v); });
        versionNumber[2]++;
        cleanedMessages[ 'stam:aaa-c-language-version' ] = versionNumber.join('.');
        cleanedMessages[ 'stam:aaa-d-language-date' ] = new Date().toISOString();
        
        // Convert back to text
        var cleanedText = '';
        for (var key in cleanedMessages) {
            var text = key;
            while (text.length < 59)
                text += ' ';
            text += ' ' + cleanedMessages[key];
            cleanedText += text + '\n';
        }

        // If save flag-> save on server
        if ( parameters.save )
        {
            var languagePath = this.languagesPath + '/' + parameters.type + '/' + parameters.language + '.txt';
            var answer = await this.awi.files.saveText( languagePath, cleanedText );
            if ( answer.isError() )
                return this.replyError(answer, message, editor);

            // Also save in project
            if (parameters.languageFilesPath)
            {
                var languageFilePath = parameters.languageFilesPath + '/' + parameters.language + '.txt' ;
                var answer = await this.awi.files.saveText( languageFilePath, cleanedText );
                if ( answer.isError() )
                    return this.replyError(answer, message, editor);
            }
        }

        return this.replySuccess( this.newAnswer( { cleanedMessages, cleanedText } ), message, editor );
    }
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
