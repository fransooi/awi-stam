import ConnectorBase from '../../connector.mjs'
import { SERVERCOMMANDS } from '../../servercommands.mjs';
export { ConnectorProject as Connector }

class ConnectorProject extends ConnectorBase
{
	constructor( awi, config = {} )
	{
		super( awi, config );
		this.name = 'Project';
		this.token = 'project';
		this.className = 'ConnectorProject';
        this.group = 'project';    
		this.version = '0.5';
        this.projectsPath = '';
        this.serverUrl = 'http://localhost:3333';
        this.projectsUrl = 'http://localhost:3333/projects';
        this.runUrl = 'http://localhost:3333/projects';
        this.templatesUrl = 'http://localhost:3333/templates';
        this.templatesPath = this.awi.system.getEnginePath() + '/connectors/' + this.group;
        this.projects = {};
	}
	async connect( options )
	{
	    super.connect( options );
        if ( options.runUrl )
            this.runUrl = options.runUrl;
        if ( options.projectsUrl )
            this.projectsUrl = options.projectsUrl;
        if ( options.templatesUrl )
            this.templatesUrl = options.templatesUrl;
        if ( options.templatesPath )
            this.templatesPath = options.templatesPath;
        if ( options.projectPath )
            this.projectsPath = options.projectPath;
        else
        {
            var path = await this.awi.callParentConnector( 'http', 'getRootDirectory', {} );
            if ( path )
                this.projectsPath = path + '/projects';
            else
                this.projectsPath = this.awi.getEnginePath() + '/data/projects';
       }
       return this.setConnected( true );
    }

    async registerEditor(args, basket, control)
    {
        this.editor = args.editor;
        this.userName = args.userName;
        this.templatesUrl = this.editor.templatesUrl || this.templatesUrl;
        this.projectsUrl = this.editor.projectsUrl || this.projectsUrl;
        this.runUrl = this.editor.runUrl || this.runUrl;

        var data = {};
        data[ this.token ] = {
            self: this,
            version: this.version,
            commands: {
                getProjectList: this.command_getProjectList.bind(this),
                getTemplates: this.command_getTemplates.bind(this),
                newProject: this.command_newProject.bind(this),
                openProject: this.command_openProject.bind(this),
                closeProject: this.command_closeProject.bind(this),
                renameProject: this.command_renameProject.bind(this),
                deleteProject: this.command_deleteProject.bind(this),
                downloadProject: this.command_downloadProject.bind(this),
                newFile: this.command_newFile.bind(this),
                loadFile: this.command_loadFile.bind(this),
                saveFile: this.command_saveFile.bind(this),
                renameFile: this.command_renameFile.bind(this),
                deleteFile: this.command_deleteFile.bind(this),
                moveFile: this.command_moveFile.bind(this),
                createFolder: this.command_createFolder.bind(this),
                deleteFolder: this.command_deleteFolder.bind(this),
                renameFolder: this.command_renameFolder.bind(this),
                copyFolder: this.command_copyFolder.bind(this),
                moveFolder: this.command_moveFolder.bind(this),
                compileProject: this.command_compileProject.bind(this),
                runProject: this.command_runProject.bind(this),
                stopProject: this.command_stopProject.bind(this),
                debugProject: this.command_debugProject.bind(this),
                testProject: this.command_testProject.bind(this),
                shareProject: this.command_shareProject.bind(this),
                helpProject: this.command_helpProject.bind(this),
                testCode: this.command_testCode.bind(this),
                formatCode: this.command_formatCode.bind(this),
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
    updateTree( newFiles, oldFiles, parentFiles )
    {
        for ( var nf = 0; nf < newFiles.length; nf++ )
        {
            var file = newFiles[ nf ];
            var found = false;
            for ( var of = 0; of < oldFiles.length; of++ )
            {
                var oldFile = oldFiles[ of ];
                if ( oldFile.name === file.name )
                {
                    if (file.isDirectory && oldFile.isDirectory)
                    {
                        var tempFiles = [];
                        this.updateTree( file.files, oldFile.files, tempFiles );
                        oldFile.files = tempFiles;
                        parentFiles.push( oldFile );
                        found = true;
                    } else if (file.isDirectory == oldFile.isDirectory)
                    {
                        parentFiles.push( oldFile );
                        found = true;
                    }
                    break;
                }
            }
            if ( !found )
            {
                if (file.isDirectory && file.name == '.project')
                    continue;
                var newf = { 
                    name: file.name,
                    size: file.size,
                    modified: false,
                    isDirectory: file.isDirectory,
                    path: file.relativePath
                };
                if ( file.isDirectory )
                {
                    newf.files = [];
                    parentFiles.push( newf );
                    var tempFiles = [];
                    this.updateTree( file.files, [], tempFiles );
                    newf.files = tempFiles;
                }
                else
                {
                    newf.mime = this.awi.utilities.getMimeType( newf.name );
                    parentFiles.push( newf );
                }
            }
        }
    }
    async updateFileTree(project, projectHandle)
    {
        // If from another platform, enforce reload of the whole tree
        if ( !this.awi.system.checkPathFormat( project.path ) )
        {
            if ( !projectHandle )
                return this.newError( 'awi:illegal-project-format' );
            project.path = this.projectsPath + '/' + this.userName + '/' + this.token + '/' + projectHandle;
            project.files = [];
        }
        // Update URL
        if (projectHandle)
        {
            project.url = this.projectsUrl + '/' + this.userName + '/' + project.type + '/' + projectHandle;
            project.runUrl = this.runUrl + '/' + this.userName + '/' + project.type + '/' + projectHandle;
        }
        var answer = await this.awi.files.getDirectory( project.path, { recursive: true, filters: '*.*', noStats: true, noPaths: true } );
        if ( answer.isError() )
            return answer;
        var newFiles = [];
        this.updateTree( answer.data, project.files, newFiles );
        project.files = newFiles;
        return this.newAnswer( newFiles );
    }
    findFile( project, path )
    {
        function find( parent, path )
        {
            for ( var f = 0; f < parent.files.length; f++ )
            {
                var file = parent.files[f];
                if ( file.path == path )
                    return file;
                if ( file.isDirectory )
                {
                    var found = find( file, path );
                    if ( found )
                        return found;
                }
            }
            return null;
        }
        return find( project, path );
    }
    findFileParent( project, path )
    {
        function find( parent, path )
        {
            for ( var f = 0; f < parent.files.length; f++ )
            {
                var file = parent.files[f];
                if ( file.path == path )
                    return parent;
                if ( file.isDirectory )
                {
                    var found = find( file, path );
                    if ( found )
                        return found;
                }
            }
            return null;
        }
        return find( project, path );
    }
    findFolder( project, path )
    {
        function find( parent, path )
        {
            for ( var f = 0; f < parent.files.length; f++ )
            {
                var file = parent.files[f];
                if ( file.path == path && file.isDirectory )
                    return parent;
                if ( file.isDirectory )
                {
                    var found = find( file, path );
                    if ( found )
                        return found;
                }
            }
            return null;
        }
        return find( project, path );
    }

    async command( message, editor )
    {
        if ( this[ 'command_' + message.command ] )
            return this[ 'command_' + message.command ]( message.parameters, message, editor );
        return this.replyError( this.newError( 'awi:command-not-found', message.command ), message, editor );
    }
    convertToFilename( name )
    {
        return name.replace( /[^a-zA-Z0-9]/g, '_' );
    }

    // PROJECTS COMMANDS
    ////////////////////////////////////////////////////////////////////////////////////
    async command_getTemplates( parameters, message, editor )
    {
        var templatesPath = this.templatesPath + '/' + parameters.mode + '/templates';
        var filter = parameters.filter ? parameters.filter : '*.*';
        var answer = await this.awi.files.getDirectory( templatesPath, { recursive: false, listDirectories: true, filters: filter, noStats: true } );
        if ( answer.isError() )
            return this.replyError( answer, message, editor );
        var folders = answer.data;
        var templates = [];
        for ( var f = 0; f < folders.length; f++ )
        {
            var folder = folders[ f ];
            var description = 'No description';
            var iconUrl = null;
            answer = await this.awi.files.loadIfExist( folder.path + '/description.md', { encoding: 'utf8' } );
            if ( answer.isSuccess() )
                description = answer.data;
            answer = await this.awi.system.exists( folder.path + '/thumbnail.png' );
			if ( answer.isSuccess() )
				iconUrl = this.templatesUrl + '/' + parameters.mode + '/templates/' + folder.name + '/thumbnail.png';
			else
				iconUrl = this.templatesUrl + '/default-thumbnail.png';
            templates.push( { name: folder.name, description: description, iconUrl: iconUrl } );
        }
        return this.replySuccess( this.newAnswer( templates ), message, editor );
    }
    async command_getProjectList( parameters, message, editor )
    {
        var projectsPath = this.projectsPath + '/' + this.userName + '/' + parameters.mode;
        var filter = parameters.filter ? parameters.filter : '*.*';
        var answer = await this.awi.system.exists( projectsPath );
        if ( answer.isError() )
            return this.replySuccess( this.newAnswer( [] ), message, editor );
        answer = await this.awi.files.getDirectory( projectsPath, { recursive: false, listDirectories: true, filters: filter, noStats: true } );
        if ( answer.isError() )
            return this.replyError( answer, message, editor );
        var folders = answer.data;
        var projects = [];
        for ( var f = 0; f < folders.length; f++ )
        {
            var folder = folders[ f ];
            var description = 'No description';
            var iconUrl;
            while( true )
            {
                answer = await this.awi.files.loadIfExist( folder.path + '/readme.md', { encoding: 'utf8' } );
                if ( answer.isSuccess() )
                    description = answer.data;
                answer = await this.awi.system.exists( folder.path + '/thumbnail.png' );
                if ( answer.isSuccess() )
                    iconUrl = this.projectsUrl + '/' + this.userName + '/' + parameters.mode + '/' + folder.name + '/thumbnail.png';
                else
                    iconUrl = this.templatesUrl + '/default-thumbnail.png';
                // Load the project.json file
                answer = await this.awi.files.loadJSON( folder.path + '/.project/project.json' );
                if ( answer.isError() )
                    break;
                var project = answer.data;
                var projectInfo = { 
                    name: project.name, 
                    handle: project.handle,
                    url: this.projectsUrl + '/' + this.userName + '/' + parameters.mode + '/' + project.handle,
                    description: description, 
                    iconUrl: iconUrl,
                    type: project.type,
                    files: []
                };
                if ( parameters.includeFiles )
                {
                    answer = await this.updateFileTree( project, project.handle );
                    if ( answer.isError() )
                        break;
                    projectInfo.files = project.files;
                }
                projects.push( projectInfo );
                break;
            }
        }
        return this.replySuccess( this.newAnswer( projects ), message, editor );
    }
    async command_newProject( parameters, message, editor )
    {
        // Create the directory
        var projectHandle = this.awi.utilities.getUniqueIdentifier({}, this.convertToFilename( parameters.name ), 'DDhhmmss' );
        var projectPath = this.projectsPath + '/' + this.userName + '/' + parameters.mode + '/' + projectHandle;
        if ( this.awi.system.exists( projectPath ).isSuccess() )
        {
            if ( !parameters.overwrite )
                return this.replyError(this.newError( 'awi:project-exists', parameters.name ), message, editor );
            await this.awi.files.deleteDirectory( projectPath, { keepRoot: true, recursive: true } );
        }
        var answer = await this.awi.files.createDirectories( projectPath );
        if ( answer.isError() )
            return this.replyError(answer, message, editor );

        // Create the .project directory
        answer = await this.awi.files.createDirectories( projectPath + '/.project' );
        if ( answer.isError() )
            return this.replyError(answer, message, editor );
        
        // Load the template...
        if ( parameters.template )
        {
            var templatesPath = this.templatesPath + '/' + parameters.mode + '/templates/' + parameters.template;
            if ( this.awi.system.exists( templatesPath ).isSuccess() ){
                // Copy all files from template to project
                answer = await this.awi.files.copyDirectory( templatesPath, projectPath );
                if ( answer.isError() )
                    return this.replyError(answer, message, editor );
            }
            else        
                return this.replyError(this.newError( 'awi:template-not-found', parameters.template ), message, editor );
        }

        // Create project
        var project = {
            name: parameters.name,
            handle: projectHandle,
            path: projectPath,
            url: this.projectsUrl + '/' + this.userName + '/' + parameters.mode + '/' + projectHandle,
            template: parameters.template,
            type: parameters.mode,
            runUrl: this.runUrl + '/' + this.userName + '/' + parameters.mode + '/' + projectHandle,
            files: []
        }
        // Save project configuration
        answer = await this.awi.files.saveJSON( projectPath + '/.project/project.json', project );
        if ( answer.isError() )
            return this.replyError(answer, message, editor );
        // Update file tree to add project.json
        answer = await this.updateFileTree( project );
        if ( answer.isError() )
            return this.replyError(answer, message, editor );
        // Save updated project.json
        answer = await this.awi.files.saveJSON( projectPath + '/.project/project.json', project );
        if ( answer.isError() )
            return this.replyError(answer, message, editor );
        // Set as opened project
        this.projects[ projectHandle ] = project;
        // Returns the project
        var projectToSend = this.awi.utilities.copyObject( project );
        projectToSend.path = '';
        return this.replySuccess(this.newAnswer( projectToSend ), message, editor);
    }
    async command_openProject( parameters, message, editor )
    {
        var projectHandle = parameters.handle;
        if (!projectHandle)
            return this.replyError(this.newError( 'awi:project-not-open', { value: parameters.name ? parameters.name : parameters.handle } ), message, editor);
        if ( this.projects[ projectHandle ] )
            return this.replyError(this.newError( 'awi:project-already-open', { value: parameters.name ? parameters.name : projectHandle } ), message, editor);
        var projectPath = this.projectsPath + '/' + this.userName + '/' + parameters.mode + '/' + projectHandle;
        if ( !this.awi.system.exists( projectPath ).isSuccess() )
            return this.replyError(this.newError( 'awi:project-not-found', { value: parameters.name ? parameters.name : projectHandle } ), message, editor);
        // Load the project.json file
        var answer = await this.awi.files.loadJSON( projectPath + '/.project/project.json' );
        if ( answer.isError() )
            return this.replyError(answer, message, editor);
        // Update file tree to current files
        var project = answer.data;  
        answer = await this.updateFileTree( project, projectHandle );
        if ( answer.isError() )
            return this.replyError(answer, message, editor);
        // Set as opened project
        this.projects[ projectHandle ] = project;
        // Returns the project
        var projectToSend = this.awi.utilities.copyObject( project );
        projectToSend.path = '';
        // Find the project connector
        this.projectConnector = this.awi.getConnectorByToken( project.type );
        if ( !this.projectConnector )
            return this.replyError(this.newError( 'awi:project-not-found', { value: parameters.name ? parameters.name : projectHandle } ), message, editor);
        return this.replySuccess(this.newAnswer( projectToSend ), message, editor);
    }
    async command_closeProject( parameters, message, editor )
    {
        // Make sure the project is open
        var projectHandle = parameters.handle;
        if (!projectHandle)
            return this.replyError(this.newError( 'awi:project-not-open', { value: parameters.name ? parameters.name : parameters.handle } ), message, editor);
        var project = this.projects[ projectHandle ];
        if ( !project )
            return this.replyError(this.newError( 'awi:project-not-open', { value: parameters.name ? parameters.name : projectHandle } ), message, editor);
        // Save project
        var answer = await this.command_saveProject( { handle: projectHandle } );
        if ( answer.isError() )
            return this.replyError(answer, message, editor );
        // Reset project
        delete this.projects[ projectHandle ];
        this.projectConnector = null;
        return this.replySuccess(this.newAnswer( true ), message, editor);
    }
    async command_saveProject( parameters, message, editor )
    {
        // Make sur a project is open
        var projectHandle = parameters.handle;
        if (!projectHandle)
            return this.replyError(this.newError( 'awi:project-not-open', { value: parameters.name ? parameters.name : parameters.handle } ), message, editor);
        var project = this.projects[ projectHandle ];
        if ( !project )
            return this.replyError(this.newError( 'awi:project-not-open', { value: parameters.name ? parameters.name : projectHandle } ), message, editor);

        var projectPath = this.projectsPath + '/' + this.userName + '/' + project.type + '/' + projectHandle;
        var answer = await this.awi.files.saveJSON( projectPath + '/.project/project.json', project );
        if ( answer.isError() )
            return this.replyError(answer, message, editor );
        return this.replySuccess(this.newAnswer(true), message, editor);
    }
    async command_renameProject(parameters, message, editor)
    {
        // Make sur the project is open
        var projectHandle = parameters.handle;
        if (!projectHandle)
            return this.replyError(this.newError( 'awi:project-not-open', { value: parameters.name ? parameters.name : parameters.handle } ), message, editor);
        var project = this.projects[ projectHandle ];
        if ( !project )
            return this.replyError(this.newError( 'awi:project-not-open', { value: parameters.name ? parameters.name : projectHandle } ), message, editor);
        
        // Rename project without changing handle
        project.name = parameters.newName;
        var projectConfigPath = this.projectsPath + '/' + this.userName + '/' + project.type + '/' + projectHandle + '/.project/project.json';
        var answer = await this.awi.files.loadJSON( projectConfigPath );
        if ( answer.isError() )
            return this.replyError(answer, message, editor);
        var newProject = answer.data;
        newProject.name = parameters.newName;
        newProject.files = [];
        answer = await this.updateFileTree( newProject, projectHandle );
        if ( answer.isError() )
            return this.replyError(answer, message, editor);
        answer = await this.awi.files.saveJSON( projectConfigPath, newProject );
        if ( answer.isError() )
            return this.replyError(answer, message, editor);
        return this.replySuccess(this.newAnswer(true), message, editor);
    }
    async command_downloadProject( parameters, message, editor )
    {
        // Make sure the project is open
        var projectHandle = parameters.handle;
        if (!projectHandle)
            return this.replyError(this.newError( 'awi:project-not-open', { value: parameters.name ? parameters.name : parameters.handle } ), message, editor);
        var project = this.projects[ projectHandle ];
        if ( !project )
            return this.replyError(this.newError( 'awi:project-not-open', { value: parameters.name ? parameters.name : parameters.handle } ), message, editor);
        // Save project
        var answer = await this.command_saveProject( { handle: projectHandle } );
        if ( answer.isError() )
            return this.replyError(answer, message, editor );

        // Zip the project directory        
        var answer  = await this.awi.zip.zipDirectory( project.path, null, { recursive: true } );
        if ( answer.isError() )
            return this.replyError(answer, message, editor );
        return this.replySuccess(answer, message, editor);
    }
    async command_deleteProject( parameters, message, editor )
    {
        if (!parameters.handle)
            return this.replyError(this.newError( 'awi:project-not-open', { value: parameters.name ? parameters.name : parameters.handle } ), message, editor);
        // If project is open, close it
        var projectHandle = parameters.handle;
        if ( this.projects[ projectHandle ] ){
            var answer = await this.command_closeProject( { handle: projectHandle } );
            if ( answer.isError() )
                return this.replyError(answer, message, editor );
        }
        // Delete project directory
        var projectPath = this.projectsPath + '/' + this.userName + '/' + parameters.mode + '/' + projectHandle;
        var answer = await this.awi.files.deleteDirectory( projectPath, { keepRoot: false, recursive: true } );
        if ( answer.isError() )
            return this.replyError(answer, message, editor );
        return this.replySuccess(this.newAnswer( true ), message, editor);
    }

    async command_runProject(parameters, message, editor){
        // Project exists?
        if ( !parameters.handle || !this.projects[ parameters.handle ] )
            return this.replyError(this.newError( 'awi:project-not-open', parameters.handle ), message, editor );
        // Run project
        var answer = await this.projectConnector.command_runProject(parameters);
        if ( answer.isError() )
            return this.replyError(answer, message, editor);
        return this.replySuccess(answer, message, editor);
    }
    async command_stopProject(parameters, message, editor){
        // Project exists?
        if ( !parameters.handle || !this.projects[ parameters.handle ] )
            return this.replyError(this.newError( 'awi:project-not-open', parameters.handle ), message, editor );
        // Run project
        var answer = await this.projectConnector.command_stopProject(parameters);
        if ( answer.isError() )
            return this.replyError(answer, message, editor);
        return this.replySuccess(answer, message, editor);
    }
    async command_debugProject(parameters, message, editor){
        // Project exists?
        if ( !parameters.handle || !this.projects[ parameters.handle ] )
            return this.replyError(this.newError( 'awi:project-not-open', parameters.handle ), message, editor );
        // Debug project
        var answer = await this.projectConnector.command_debugProject(parameters);
        if ( answer.isError() )
            return this.replyError(answer, message, editor);
        return this.replySuccess(answer, message, editor);
    }
    async command_testProject(parameters, message, editor){
        // Project exists?
        if ( !parameters.handle || !this.projects[ parameters.handle ] )
            return this.replyError(this.newError( 'awi:project-not-open', parameters.handle ), message, editor );
        // Test code
        var answer = await this.projectConnector.command_testProject(parameters);
        if ( answer.isError() )
            return this.replyError(answer, message, editor);
        return this.replySuccess(answer, message, editor);
    }    
    async command_compileProject(parameters, message, editor){
        // Project exists?
        if ( !parameters.handle || !this.projects[ parameters.handle ] )
            return this.replyError(this.newError( 'awi:project-not-open', parameters.handle ), message, editor );
        // Compile project
        var answer = await this.projectConnector.command_compileProject(parameters);
        if ( answer.isError() )
            return this.replyError(answer, message, editor);
        return this.replySuccess(answer, message, editor);
    }
    async command_shareProject(parameters, message, editor){
        // Project exists?
        if ( !parameters.handle || !this.projects[ parameters.handle ] )
            return this.replyError(this.newError( 'awi:project-not-open', parameters.handle ), message, editor );
        // Share project
        var answer = await this.projectConnector.command_shareProject(parameters);
        if ( answer.isError() )
            return this.replyError(answer, message, editor);
        return this.replySuccess(answer, message, editor);
    }
    async command_helpProject(parameters, message, editor){
        // Project exists?
        if ( !parameters.handle || !this.projects[ parameters.handle ] )
            return this.replyError(this.newError( 'awi:project-not-open', parameters.handle ), message, editor );
        // Help project
        var answer = await this.projectConnector.command_helpProject(parameters);
        if ( answer.isError() )
            return this.replyError(answer, message, editor);
        return this.replySuccess(answer, message, editor);
    }
    async command_testCode(parameters, message, editor){
        // Project exists?
        if ( !parameters.handle || !this.projects[ parameters.handle ] )
            return this.replyError(this.newError( 'awi:project-not-open', parameters.handle ), message, editor );
        // Test code
        var answer = await this.projectConnector.command_testCode(parameters);
        if ( answer.isError() )
            return this.replyError(answer, message, editor);
        return this.replySuccess(answer, message, editor);
    }
    async command_formatCode(parameters, message, editor){
        // Project exists?
        if ( !parameters.handle || !this.projects[ parameters.handle ] )
            return this.replyError(this.newError( 'awi:project-not-open', parameters.handle ), message, editor );
        // Format code
        var answer = await this.projectConnector.command_formatCode(parameters);
        if ( answer.isError() )
            return this.replyError(answer, message, editor);
        return this.replySuccess(answer, message, editor);
    }

    // FILE COMMANDS 
    //////////////////////////////////////////////////////////////////////////////
    async command_newFile( parameters, message, editor )
    {
        // Project exists?
        if ( !parameters.handle || !this.projects[ parameters.handle ] )
            return this.replyError(this.newError( 'awi:project-not-open', parameters.handle ), message, editor );
        
        // Create the file
        var project = this.projects[ parameters.handle ];
        if ( !this.findFile( project, parameters.path ) )
        {
            var content = parameters.content;
            var state;
            if ( parameters.state ) {
                var state = this.awi.utilities.JSONParse(parameters.state);
                if (state.isError())
                    return this.replyError(state, message, editor);
                state = state.data;
                content = state.doc;
                var statePath = this.projects[ parameters.handle ].path + '/.project/' + this.convertToFilename( parameters.path ) + '.state';
                answer = await this.awi.system.writeFile( statePath, parameters.state, { encoding: 'utf8' } );
                if ( answer.isError() )
                    return this.replyError(answer, message, editor );
            }            
            var path = this.projects[ parameters.handle ].path + '/' + parameters.path;
            var answer = await this.awi.system.writeFile( path, content, { encoding: 'utf8' } );
            if ( answer.isError() )
                return this.replyError(answer, message, editor );
            var answer = await this.updateFileTree( project );
            if ( answer.isError() )
                return this.replyError(answer, message, editor );
            return this.replySuccess(this.newAnswer( true ), message, editor);
        }
        return this.replyError(this.newError( 'awi:file-exists', parameters.path ), message, editor);
    }
    async command_loadFile( parameters, message, editor )
    {
        // Project exists?
        if ( !parameters.handle || !this.projects[ parameters.handle ] )
            return this.replyError(this.newError( 'awi:project-not-open', parameters.handle ), message, editor );
        
        // Load the file
        var file = this.findFile( this.projects[ parameters.handle ], parameters.path );
        if ( file )
        {
            var response = this.awi.utilities.copyObject( file );
            var path = this.projects[ parameters.handle ].path + '/' + parameters.path;
            var answer = await this.awi.system.readFile( path, { encoding: 'utf8' } );
            if ( answer.isError() )
                return this.replyError(answer, message, editor );
            var content = answer.data;
            var statePath = this.projects[ parameters.handle ].path + '/.project/' + this.convertToFilename( parameters.path ) + '.state';
            var stateAnswer = await this.awi.system.readFile( statePath, { encoding: 'utf8' } );
            if ( stateAnswer.isSuccess() )
                response.state = stateAnswer.data;
            else
                response.content = content;
            return this.replySuccess(this.newAnswer(response), message, editor);
        }
        return this.replyError(this.newError( 'awi:file-not-found', parameters.path ), message, editor);
    }
    async command_saveFile( parameters, message, editor )
    {
        // Project exists?
        if ( !parameters.handle || !this.projects[ parameters.handle ] )
            return this.replyError(this.newError( 'awi:project-not-open', parameters.handle ), message, editor );
        
        // Save the file
        var file = this.findFile( this.projects[ parameters.handle ], parameters.path );
        if ( file )
        {
            var path = this.projects[ parameters.handle ].path + '/' + parameters.path;
            var state = this.awi.utilities.JSONParse(parameters.state);
            if (state.isError())
                return this.replyError(state, message, editor);
            state = state.data;
            var answer = await this.awi.system.writeFile( path, state.doc, { encoding: 'utf8' } );
            if ( answer.isError() )
                return this.replyError(answer, message, editor);
            var statePath = this.projects[ parameters.handle ].path + '/.project/' + this.convertToFilename( parameters.path ) + '.state';
            var stateAnswer = await this.awi.system.writeFile( statePath, JSON.stringify(state), { encoding: 'utf8' } );
            if ( stateAnswer.isError() )
                return this.replyError(stateAnswer, message, editor);
            var answer = await this.updateFileTree( this.projects[ parameters.handle ] );
            if ( answer.isError() )
                return this.replyError(answer, message, editor);
            return this.replySuccess(this.newAnswer(true), message, editor);
        }
        return this.command_newFile( parameters, message, editor );
    }
    async command_renameFile( parameters, message, editor )
    {
        // Project exists?
        if ( !parameters.handle || !this.projects[ parameters.handle ] )
            return this.replyError(this.newError( 'awi:project-not-open', parameters.handle ), message, editor );
        
        // Find the file in the tree
        var file = this.findFile( this.projects[ parameters.handle ], parameters.path );
        if ( file )
        {
            // Rename the file
            var newName = this.awi.system.basename( parameters.newPath );
            var newPath = this.awi.system.dirname( parameters.newPath ) + '/' + newName;
            var answer = await this.awi.system.rename( file.path, newPath );
            if ( answer.isError() )
                return this.replyError(answer, message, editor );
            var oldStatePath = this.projects[ parameters.handle ].path + '/.project/' + this.convertToFilename( parameters.path ) + '.state';
            var newStatePath = this.projects[ parameters.handle ].path + '/.project/' + this.convertToFilename( parameters.newPath ) + '.state';
            await this.awi.system.rename( oldStatePath, newStatePath );
            // Update file tree
            file.name = newName;
            file.path = newPath;
            return this.replySuccess(this.newAnswer(true), message, editor);
        }
        return this.replyError(this.newError( 'awi:file-not-found', parameters.path ), message, editor );
    }
    async command_deleteFile( parameters, message, editor )
    {
        // Project exists?
        if ( !parameters.handle || !this.projects[ parameters.handle ] )
            return this.replyError(this.newError( 'awi:project-not-open', parameters.handle ), message, editor );
        
        // Delete the file
        var file = this.findFile( this.projects[ parameters.handle ], parameters.path );
        if ( file )
        {
            var answer = await this.awi.system.delete( file.path );
            if ( answer.isError() )
                return this.replyError(answer, message, editor );
            var statePath = this.projects[ parameters.handle ].path + '/.project/' + this.convertToFilename( parameters.path ) + '.state';
            await this.awi.system.delete( statePath );
            answer = await this.updateFileTree( this.projects[ parameters.handle ] );
            if ( answer.isError() )
                return this.replyError(answer, message, editor );
            return this.replySuccess(this.newAnswer( true ), message, editor);
        }
        return this.replyError(this.newError( 'awi:file-not-found', parameters.path ), message, editor );
    }
    async command_moveFile( parameters, message, editor )
    {
        // Project exists?
        if ( !parameters.handle || !this.projects[ parameters.handle ] )
            return this.replyError(this.newError( 'awi:project-not-open', parameters.handle ), message, editor );
    
        // Find the file in the tree
        var file = this.findFile( this.projects[ parameters.handle ], parameters.path );
        if ( file )
        {
            var answer = await this.copyFile( file.path, parameters.newPath );
            if ( answer.isError() )
                return this.replyError(answer, message, editor );
            var statePath = this.projects[ parameters.handle ].path + '/.project/' + this.convertToFilename( parameters.path ) + '.state';
            var newStatePath = this.projects[ parameters.handle ].path + '/.project/' + this.convertToFilename( parameters.newPath ) + '.state';
            await this.awi.system.copy( statePath, newStatePath );
            answer = await this.deleteFile( file.path );
            if ( answer.isError() )
                return this.replyError(answer, message, editor );
            await this.deleteFile( statePath );
            answer = await this.updateFileTree( this.projects[ parameters.handle ] );
            if ( answer.isError() )
                return this.replyError(answer, message, editor );
            return this.replySuccess(this.newAnswer( true ), message, editor);
        }
        return this.replyError(this.newError( 'awi:file-not-found', parameters.path ), message, editor );
    }
    async command_createFolder( parameters, message, editor )
    {
        // Project exists?
        if ( !parameters.handle || !this.projects[ parameters.handle ] )
            return this.replyError(this.newError( 'awi:project-not-open', parameters.handle ), message, editor );
        
        // Create the folder
        var folder = this.findFolder( this.projects[ parameters.handle ], parameters.path );
        if ( !folder )
        {
            var folderPath = this.projectsPath + '/' + this.userName + '/' + parameters.mode + '/' + parameters.handle + '/' + parameters.path;
            var answer = await this.awi.system.mkdir( folderPath );
            if ( answer.isError() )
                return this.replyError(answer, message, editor );
            // Update file tree
            answer = await this.updateFileTree( this.projects[ parameters.handle ] );
            if ( answer.isError() )
                return this.replyError(answer, message, editor );
            return this.replySuccess(this.newAnswer( this.projects[ parameters.handle ] ), message, editor);
        }
        return this.replyError(this.newError( 'awi:folder-exists', parameters.path ), message, editor);
    }
    async command_deleteFolder( parameters, message, editor )
    {
        // Project exists?
        if ( !parameters.handle || !this.projects[ parameters.handle ] )
            return this.replyError(this.newError( 'awi:project-not-open', parameters.handle ), message, editor );
        
        // Delete the folder
        var folder = this.findFolder( parameters.path );
        if ( folder )
        {
            // Delete folder
            var answer = await this.awi.files.deleteDirectory( folder.path, { keepRoot: false, recursive: true } );
            if ( answer.isError() )
                return this.replyError(answer, message, editor );
            // Delete state files
            var statePath = this.projects[ parameters.handle ].path + '/.project/';
            var stateFilter = this.convertToFilename( parameters.path ) + '_*.state';
            var answer = await this.awi.files.getDirectory( statePath, { recursive: false, filters: stateFilter, noStats: true, noPaths: false } );
            if ( answer.isError() )
                return answer;
            var stateFiles = answer.getValue();
            for ( var f = 0; f < stateFiles.length; f++ )
                await this.awi.system.delete( stateFiles[ f ].path );
            // Update file tree
            answer = await this.updateFileTree( this.projects[ parameters.handle ] );
            if ( answer.isError() )
                return this.replyError(answer, message, editor );
            return this.replySuccess(this.newAnswer( this.projects[ parameters.handle ] ), message, editor);
        }
        return this.replyError(this.newError( 'awi:folder-not-found', { value: parameters.path } ), message, editor );
    }
    async command_renameFolder( parameters, message, editor )
    {
        // Project exists?
        if ( !parameters.handle || !this.projects[ parameters.handle ] )
            return this.replyError(this.newError( 'awi:project-not-open', parameters.handle ), message, editor );
        
        // Find the folder in the tree
        var folder = this.findFolder( parameters.path );
        if ( folder )
        {
            // Rename folder
            var newPath = this.awi.system.dirname( parameters.newPath ) + '/' + this.awi.system.basename( parameters.newPath );
            var answer = await this.awi.system.rename( folder.path, newPath );
            if ( answer.isError() )
                return this.replyError(answer, message, editor);
            // Rename state files
            var statePath = this.projects[ parameters.handle ].path + '/.project/';
            var stateFilter = this.convertToFilename( parameters.path ) + '_*.state';
            var answer = await this.awi.files.getDirectory( statePath, { recursive: false, filters: stateFilter, noStats: true, noPaths: false } );
            if ( answer.isError() )
                return answer;
            var stateFiles = answer.getValue();
            for ( var f = 0; f < stateFiles.length; f++ )
                await this.awi.system.rename( stateFiles[ f ].path, statePath + this.convertToFilename( parameters.newPath ) + '_*.state' );
            // Update file tree
            answer = await this.updateFileTree( this.projects[ parameters.handle ] );
            if ( answer.isError() )
                return this.replyError(answer, message, editor );
            return this.replySuccess(this.newAnswer( this.projects[ parameters.handle ] ), message, editor);
        }
        return this.replyError(this.newError( 'awi:folder-not-found', parameters.path ), message, editor );
    }
    async command_copyFolder( parameters, message, editor )
    {
        // Project exists?
        if ( !parameters.handle || !this.projects[ parameters.handle ] )
            return this.replyError(this.newError( 'awi:project-not-open', parameters.handle ), message, editor );
        
        // Copy the folder
        var folder = this.findFolder( parameters.path );
        if ( folder )
        {
            // Copy the folder
            var newPath = this.projectsPath + '/' + this.userName + '/' + parameters.mode + '/' + parameters.handle + '/' + parameters.newPath;
            var answer = await this.awi.files.copyDirectory( folder.path, newPath );
            if ( answer.isError() )
                return this.replyError(answer, message, editor );
            // Copy state files
            var statePath = this.projects[ parameters.handle ].path + '/.project/';
            var stateFilter = this.convertToFilename( parameters.path ) + '_*.state';
            var answer = await this.awi.files.getDirectory( statePath, { recursive: false, filters: stateFilter, noStats: true, noPaths: false } );
            if ( answer.isError() )
                return answer;
            var stateFiles = answer.getValue();
            for ( var f = 0; f < stateFiles.length; f++ )
                await this.awi.system.copy( stateFiles[ f ].path, statePath + this.convertToFilename( parameters.newPath ) + '_*.state' );
            // Update file tree
            answer = await this.updateFileTree( this.projects[ parameters.handle ] );
            if ( answer.isError() )
                return this.replyError(answer, message, editor );
            return this.replySuccess(this.newAnswer( this.projects[ parameters.handle ] ), message, editor);
        }
        return this.replyError(this.newError( 'awi:folder-not-found', parameters.path ), message, editor);
    }
    async command_moveFolder( parameters, message, editor )
    {
        // Project exists?
        if ( !parameters.handle || !this.projects[ parameters.handle ] )
            return this.replyError(this.newError( 'awi:project-not-open', parameters.handle ), message, editor );
        
        // Move the folder
        var answer = this.copyFolder( parameters );
        if ( answer.isError() )
            return this.replyError(answer, message, editor );
        answer = this.deleteFolder( parameters );
        if ( answer.isError() )
            return this.replyError(answer, message, editor );
        // Rename the state files
        var statePath = this.projects[ parameters.handle ].path + '/.project/';
        var stateFilter = this.convertToFilename( parameters.path ) + '_*.state';
        var answer = await this.awi.files.getDirectory( statePath, { recursive: false, filters: stateFilter, noStats: true, noPaths: false } );
        if ( answer.isError() )
            return answer;
        var stateFiles = answer.getValue();
        for ( var f = 0; f < stateFiles.length; f++ )
            await this.awi.system.rename( stateFiles[ f ].path, statePath + this.convertToFilename( parameters.newPath ) + '_*.state' );
        // Update file tree
        answer = await this.updateFileTree( this.projects[ parameters.handle ] );
        if ( answer.isError() )
            return this.replyError(answer, message, editor );
        return this.replySuccess(this.newAnswer( this.projects[ parameters.handle ] ), message, editor);
    }
}
