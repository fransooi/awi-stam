/** --------------------------------------------------------------------------
*
*            / \
*          / _ \              (°°)       Intelligent
*        / ___ \ [ \ [ \ [  ][   ]       Programmable
*     _/ /   \ \_\ \/\ \/ /  |  | \      Personal Assistant
* (_)|____| |____|\__/\__/ [_| |_] \    
*
* This file is open-source under the conditions contained in the
* license file located at the root of this project.
*
* ----------------------------------------------------------------------------
* @file configuration.mjs
* @author FL (Francois Lionet)
* @version 0.3
*
* @short Configuration management connector
*
*/
import ConnectorBase from '../../connector.mjs'
export { ConnectorConfiguration as Connector }

class ConnectorConfiguration extends ConnectorBase
{
	constructor( awi, config )
	{
		super( awi, config );
		this.name = 'Configuration';
		this.token = 'configuration';
		this.className = 'ConnectorConfiguration';
        this.group = 'awi';
		this.version = '0.5';

		this.user = '';
		this.configs = {};
		this.platform = 'win32';
        this.baskets = {};

        var self = this;
        if ( typeof config.configurationPath == 'undefined' )
            this.getConfigurationPath = function(){ return awi.system.getEnginePath() + '/configs' };
		else if ( typeof config.configurationPath == 'string' )
        {
            config.configurationPath = this.awi.system.denormalize( config.configurationPath );
			this.getConfigurationPath = function(){ return config.configurationPath };
        }
		else
        {
			this.getConfigurationPath = config.configurationPath;
        }
        if ( typeof config.dataPath == 'undefined' )
            this.getDataPath = function(){ return awi.engine.getEnginePath() + '/data' };
        else if ( typeof config.dataPath == 'string' )
        {
            config.dataPath = this.awi.system.denormalize( config.dataPath );
			this.getDataPath = function(){ return config.dataPath };
        }
		else
			this.getDataPath = config.dataPath;
	}
    async connect( options )
    {
		super.connect( options );
		this.platform = this.awi.system.getSystemInformation( 'platform' );
		var answer = await this.loadConfigs();
        return this.setConnected( answer.isSuccess() );
    }
	isUserLogged()
	{
		return this.user.length > 0;
	}
	getConfig( type )
	{
		if ( type == 'user' )
		{
			type = this.user;
			if ( type == '' )
				type = 'user-default';
		}
		else if ( type == 'persona' )
			type = 'persona-' + this.configs[ this.user ].persona;
		return this.configs[ type ];
	}
	getBasket( type )
	{
		if ( type == 'user' )
		{
			type = this.user;
			if ( type == '' )
				type = 'user-default';
		}
		if ( this.baskets[ type ] )
			return this.baskets[ type ];
		return {};
	}
    setBasket( type, basket )
    {
        if ( type == 'user' )
        {
            type = this.user;
            if ( type == '' )
                type = 'user-default';
        }
        this.baskets[ type ] = basket;
    }
    getConfigValue( type, name, defaultValue )
    {
        var config = this.getConfig( type );
        var dot = name.indexOf( '.' );
        while( dot >= 0 )
        {
            var left = name.substring( 0, dot );
            name = name.substring( dot + 1 );
            config = config[ left ];
            if ( typeof config == 'undefined' )
                return defaultValue;
            dot = name.indexOf( '.' );
        }
        if ( typeof config[ name ] == 'undefined' )
            return defaultValue;
        return config[ name ];
    }
    async getToolConfiguration( toolGroup, toolName )
    {
        if ( this.user == '' )
            return this.newError( 'awi:user-not-connected' );
        var config = this.getConfig( 'user' );
        var toolConfig = config.tools[ toolGroup + '-' + toolName ];
        if ( !toolConfig )
            return this.newError( 'awi:tool-config-not-found' );
        return this.newAnswer( toolConfig );
    }
    async createToolConfiguration( toolGroup, toolName, configuration )
    {
        if ( this.user == '' )
            return this.newError( 'awi:user-not-connected' );
        var config = this.getConfig( 'user' );
        config.tools[ toolGroup + '-' + toolName ] = configuration;
        return this.newAnswer( configuration );
    }
	getNewUserConfig()
	{
		return this.awi.utilities.copyObject( this.configs[ 'user-default' ] );
	}
	async setNewUserConfig( name, config )
	{
		if ( name != 'user' && name != 'system' )
		{
			this.configs[ name ] = config;
			var persona = await this.loadConfig( 'persona-' + config.persona );
			persona.prompts[ 'user' ] = '.(' + name + ') ';
			this.configs[ 'persona-' + config.persona ] = persona;
		}
	}
	checkUserConfig( name )
	{
		name = name.toLowerCase().trim();
		return this.configs[ name ];
	}
	getUserList()
	{
		var list = [];
		for ( var c in this.configs )
		{
			var config = this.configs[ c ];
			if ( typeof config.fullName != 'undefined' && config.fullName )
			{
				list.push( config );
			}
		}
		return list;
	}
	async saveConfigs( name )
	{
		var self = this;
		var user, personalities = [];
		if ( name )
		{
			name = name.toLowerCase();
			user = this.configs[ name ];
			if ( !user )
				return { success: false, error: 'user-unknow' };
			if ( this.configs[ 'persona-' + user.persona ] )
				personalities.push( { path: self.getConfigurationPath() + '/persona-' + user.persona, config: this.configs[ 'persona-' + user.persona ] } );
			await this.awi.files.saveHJSON( this.getConfigurationPath() + '/' + name + '.hjson', this.configs[ name ] );
			await this.awi.files.saveJSON( this.getConfigurationPath() + '/' + name + '.json', this.configs[ name ] );
			personalities.forEach(
				async function( element )
				{
					await self.awi.files.saveHJSON( element.path + '.hjson' , element.config );
					await self.awi.files.saveJSON( element.path + '.json', element.config );
				} );
		}
		else
		{
			for ( var type in this.configs )
			{
				await this.awi.files.saveHJSON(  this.getConfigurationPath() + '/' + type + '.hjson', this.configs[ type ] );
				await this.awi.files.saveJSON( this.getConfigurationPath() + '/' + type + '.json', this.configs[ type ] );
			}
		}
		return this.newAnswer( true );
	}
	async loadConfigs()
	{
		var answer = await this.awi.files.getDirectory( this.getConfigurationPath(), { recursive: false, filters: [ '*.hjson' ], listFiles: true, sorted: true } );
		if ( answer.isSuccess() )
		{
            var fileList = answer.getValue();
			for ( var f = 0; f < fileList.length; f++ )
			{
				var answer2 = await this.awi.files.loadHJSON( fileList[ f ].path );
				if ( answer2.isError() )
					break;
				var name = this.awi.system.parse( fileList[ f ].name ).name.toLowerCase();
				this.configs[ name ] = answer2.getValue();
			}
		}
		if ( !this.configs[ 'user' ] )
		{
			await this.loadConfig( 'system' );
			await this.loadConfig( 'user' );
		}
        answer.setValue( this.configs, 'object' );
		return answer;
	}
	async loadConfig( type, callback )
	{
		var { originalType, type } = this.getConfigTypes( type )
		if ( !this.configs[ type ] )
		{
			var answer = await this.awi.files.loadHJSON( this.getConfigurationPath() + '/' + type + '.hjson' );
            if ( answer.isSuccess() )
    			this.configs[ type ] = answer.getValue();
		}
		if ( !this.configs[ type ] )
		{
			switch ( originalType )
			{
				case 'system':
					this.configs[ 'system' ] =
					{
						prompts:
						{
							user: '. ',
							awi: '.. ',
							result: '.: ',
							root: '.....',
							question: '.. ',
							information: '.(oo) ',
							command: '.> ',
							warning: '.warning: ',
							error: '.error: ',
							code: '.code: ',
							debug1: '.:: ',
							debug2: '.:: ',
							debug3: '.:: ',
							verbose1: '. ',
							verbose2: '. ',
							verbose3: '. ',
						},
						commands:
						{
							win32:
							{
								image: {
									view: { command: 'explorer "{file}"', cwd: '', type: 'exec' },
									edit: { command: 'explorer "{file}"', cwd: '', type: 'exec' },
									run: { command: 'explorer "{file}"', cwd: '', type: 'exec' },
								},
								video: {
									view: { command: 'explorer "{file}"', cwd: '', type: 'exec' },
									edit: { command: 'explorer "{file}"', cwd: '', type: 'exec' },
									run: { command: 'explorer "{file}"', cwd: '', type: 'exec' },
								},
								sound: {
									view: { command: 'explorer "{file}"', cwd: '', type: 'exec' },
									edit: { command: 'explorer "{file}"', cwd: '', type: 'exec' },
									run: { command: 'explorer "{file}"', cwd: '', type: 'exec' },
								},
								document: {
									view: { command: 'explorer "{file}"', cwd: '', type: 'exec' },
									edit: { command: 'explorer "{file}"', cwd: '', type: 'exec' },
									run: { command: 'explorer "{file}"', cwd: '', type: 'exec' },
								},
								presentation: {
									view: { command: 'explorer "{file}"', cwd: '', type: 'exec' },
									edit: { command: 'explorer "{file}"', cwd: '', type: 'exec' },
									run: { command: 'explorer "{file}"', cwd: '', type: 'exec' },
								},
								source: {
									view: { command: 'code "{file}"', cwd: '', type: 'exec' },
									edit: { command: 'code "{file}"', cwd: '', type: 'exec' },
									run: { command: 'code "{file}"', cwd: '', type: 'exec' },
								},
								json: {
									view: { command: 'code "{file}"', cwd: '', type: 'exec' },
									edit: { command: 'code "{file}"', cwd: '', type: 'exec' },
									run: { command: 'code "{file}"', cwd: '', type: 'exec' },
								},
								html: {
									view: { command: 'explorer "{file}"', cwd: '', type: 'exec' },
									edit: { command: 'explorer "{file}"', cwd: '', type: 'exec' },
									run: { command: 'explorer "{file}"', cwd: '', type: 'exec' },
								},
								application: {
									view: { command: 'start {file}', cwd: '"{dir}"', type: 'exec' },
									edit: { command: 'start {file}', cwd: '"{dir}"', type: 'exec' },
									run: { command: 'start {file}', cwd: '"{dir}"', type: 'exec' },
								},
								aozaccessory: {
									view: { command: 'aoz {file}', cwd: '"{dir}"', type: 'exec' },
									edit: { command: 'aoz {file}', cwd: '"{dir}"', type: 'exec' },
									run: { command: 'aoz {file}', cwd: '"{dir}"', type: 'exec' },
								},
								file: {
									view: { command: 'explorer {file}', cwd: '', type: 'exec' },
									edit: { command: 'explorer {file}', cwd: '', type: 'exec' },
									run: { command: 'explorer {file}', cwd: '', type: 'exec' },
								}
							},
							macOS: {},
							linux: {},
							android: {},
							iPhone: {}
						},
					}
					break;
				case 'user':
					this.configs[ type ] =
					{
						firstName: '',
						lastName: '',
						fullName: '',
						userName: '',
						email:'',
						country: '',
						language: '',
						persona: 'awi',
						paths:
						{
							aoz: 'C:/AOZ_Studio'
						},
						directConnection: true,
						localServer: true,
						aiKey: '',
						isDegree: true,
						fix: 3,
						debug: 0,
						developperMode: true,
						verbose: 0,
						justify: 160,
						verbosePrompts:
						{
							verbose1: [ 'importer1', 'memory1' ],
							verbose2: [ 'importer2', 'memory2' ],
							verbose3: [ 'importer3', 'memory3' ]
						},
						debugPrompts:
						{
							debug1: [ 'bubble' ],
							debug2: [ 'bubble', 'parser' ],
							debug3: [ 'all' ]
						},
						takeNote:
						[
							'Please take note: you are talking to {userName}.',
							'\nNot more than 50 words in any response.'
						],
						paths: {
							win32: [],
							macOS: [],
							linux: [],
							android: [],
							iPhone: []
						},
                        tools: { }
					};
					for ( var p in this.configs[ type ].paths )
					{
						this.configs[ type ].paths[ p ] = {
							image: [],
							sound: [],
							video: [],
							music: [],
							json: [],
							document: [],
							presentation: [],
							source: [],
							application: [],
							aozaccessory: [],
							file: [] };
					}
					break;
				case 'persona':
					this.configs[ type ] =
					{
						name: 'Awi',
						character: 'awi',
						animations: false,
                        globalAction: 'Your name is Awi. You are a good assistant that knows a lot about technology and computers.',
						temperature: 0.1,
						prompts:
						{
							user: '',
							awi: '.(°°) ',
							result: '.(..) ',
							information: '.(oo) ',
							question: '?(°°) ',
							command: '>(°°)',
							root: '.[oo] ',
							warning: '.(OO) ',
							error: '.(**) ',
							code: '.{..} ',
							debug1: '.[??] ',
							debug2: '.[??] ',
							debug3: '.[??] ',
							verbose1: '.(oo) ',
							verbose2: '.(oo) ',
							verbose3: '.[oo] ',
						}
					};
					break;
				}
		}
		if ( callback )
			callback( this.configs[ type ] )
		return this.configs[ type ];
	}
	async getDefaultPaths()
	{
		var paths = {
			win32: {},
			darwin: {},
			linux: {},
			android: {},
			iOS: {}	};
		var userDir = this.awi.system.getSystemInformation( 'userDir' );
		var drives = this.awi.system.getSystemInformation( 'drives' );
		for ( var d = 0; d < drives.length; d++ )
			drives[ d ] = drives[ d ] + ':/';
		var platform = this.awi.system.getSystemInformation( 'platform' );
		switch ( platform )
		{
			case 'win32':
				paths.win32.image = [ userDir + '/Pictures' ];
				paths.win32.sound = [];
				paths.win32.video = [ userDir + '/Videos' ];
				paths.win32.music = [ userDir + '/Music' ];
				paths.win32.document = [ userDir + '/Documents' ];
				paths.win32.presentation = [ userDir + '/Documents' ];
				paths.win32.json = [];
				paths.win32.source = [];
				paths.win32.application = [ 'C:/Program Files', 'C:/Program Files (x86)' ];
				paths.win32.accessory = [ 'C:/AOZ_Studio/AOZ_Studio/aoz/app/aozacc' ];
				paths.win32.file = drives;
				break;
			case 'darwin':
				break;
			case 'linux':
				break;
			case 'android':
				break;
			case 'iOS':
				break;
		}
		return paths;
	}
	getPrompt( type )
	{
		type = ( typeof type == 'undefined' ? 'awi' : type );

		// Debug prompts
		if ( type == 'systemwarning' )
			return '* Warning: ';
		if ( type == 'systemerror' )
			return '* ERROR! ';
		if ( type.indexOf( 'debug' ) == 0 )
		{
			var level = parseInt( type.substring( 5 ) );
			if ( level > 0 && level <= 3 )
			{
				if ( level <= userConfig.debug )
				{
					return this.configs[ 'system' ].prompts[ type ];
				}
			}
		}
		if ( this.user == '' )
		{
			var prompt = this.configs.system.prompts[ type ];
			if ( prompt  )
				return prompt;
			return null;
		}

		// Try main prompts
		var userConfig = this.configs[ this.user ];
		var config = this.configs[ 'persona-' + userConfig.persona ];
		if ( config && config.prompts[ type ] )
			return config.prompts[ type ];

		if ( !this.configs[ type ] )
		{
			for ( var v = userConfig.verbose; v >= 1; v-- )
			{
				var found = userConfig.verbosePrompts[ 'verbose' + v ].find(
					function( element )
					{
						return element == type;
					} );
				if ( found )
					return config.prompts[ 'verbose' + v ];
			}

			if ( userConfig.debug > 0 )
			{
				var found = userConfig.debugPrompts[ 'debug' + userConfig.debug ].find(
					function( element )
					{
						return element == 'all' || element == type;
					} );
				if ( found )
					return this.configs[ 'system' ].prompts[ 'debug' + userConfig.debug ];
			}
			return null;
		}
		return null;
	}
	getConfigTypes( type )
	{
		var result = { originalType: type, type: '' };
		var pos = type.indexOf( '-' );
		if ( pos >= 0 )
			result.originalType = type.substring( 0, pos );
		if ( type == 'user' )
		{
			type = this.user;
			if ( type == '' )
				type = 'user-default';
		}
		else if ( type == 'persona' )
		{
			if ( this.configs[ this.user ] )
				type = 'persona-' + this.configs[ this.user ].persona;
			else
				type = 'persona-' + 'default';
		}
		result.type = type;
		return result;
	}
	getPersona( name )
	{
        var config = this.getConfig( name );
		return this.getConfig( 'persona-' + config.persona );
	}
	getUser()
	{ 
		return this.user;
	}
	getUserKey()
	{
		var config = this.getConfig( 'user' );
		if ( config )
			return config.aiKey;
		return '';
	}
	setVerbose( verbose )
	{
		this.getConfig( 'user' ).verbose = Math.max( Math.min( 3, verbose ), 1 );
	}
	getSystem()
	{
		return this.configs[ 'system' ];
	}
	getDebug()
	{
		return this.getConfig( 'user' ).debug;
	}
	setDebug( debug )
	{
		if ( this.getConfig( 'user' ).debug != debug )
		{
			if ( debug >= 0 && debug <= 3 )
				this.getConfig( 'user' ).debug = debug;
		}
	}

    // Exposed functions
    async setUser( args, basket, control )
	{
        var { userName } = this.awi.getArgs( 'userName', args, basket, [ '' ] );
        userName = userName.trim();
		var config = this.checkUserConfig( userName );
		if ( !config )
            return this.newError( 'user-not-found' );

        this.user = userName;
        var persona = this.getPersona( userName );
        return this.newAnswer( { 
            configuration: { 
                config: this.getConfig( userName ), 
                name: userName, 
                persona: await this.loadConfig( 'persona-' + persona ) } } );
	}
}
