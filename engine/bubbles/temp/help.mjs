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
* @file bubble-help.js
* @author FL (Francois Lionet)
* @version 0.5
*
* @short Help command: provides help about the awi-engine
*
*/
import BubbleBase from '../../bubble.mjs'
export { BubbleHelp as Bubble }

class BubbleHelp extends BubbleBase
{
	constructor( awi, config = {} )
	{
		super( awi, config,
        {
            name: 'Help',
            token: 'help',
            className: 'BubbleHelp',
            group: 'awi',
            version: '0.5',
    
            action: 'provide help about using awi',
            inputs: [ { input: 'the desired topic', type: 'string', optional: true, default: '' } ],
            outputs: [ { helpTopic: 'help about the topic', type: 'string' } ],
            parser: {
                verb: [ 'help' ],
                input: [] },
            select: [ [ 'verb' ] ]
        } );
		this.properties.editables =
		[
			{ name: 'welcome', type: 'text', content: `
Hello Awi help.
===============
1. Start any line with . to talk to Awi.
2. Type your question with or without command, Awi will answer.
3. Refine your questions until satisfied.
4. Press <ESCAPE> to erase the last prompt and go up in the conversation.
[wait]
Awi can do many things such as:
- Answer to general questions
- Refine a subject deeper and deeper
- Find files and assets, import them for you
- Perform calculations and conversions
- Find mails from descriptions and extract data from them
- Copy, rename files on your computer with your authorisation
- Help you fix problems in software or hardware
etc.
[wait]
Such actions are called commands. As in a command line, you can
directly call a command with it's name.
Example, once the awi prompt is open after the initial ".awi",
.find mypic*.png
..searching...
...<path>
...<path>
...<path>
.
You can ask help for the list of commands.
[wait]
Once a conversation has performed a bubble, and the result is the one
you expected (example, you found this kind of "blue" assets in your asset
directory), you can convert the conversation into a new command that will
be integrated to the list of commands. In the process "blue" will become
a parameter. Ask for info on the subject by typing "help commands".
[wait]
You can also transpile the conversation into any language of your choice,
Aoz only for the moment, and it will become a function that, in our case,
will look for assets of a certain color.

Do you need help on a certain subject? If yes, just type ".help subject".
` 				},
			{ name: 'commands', type: 'text', content: `
Awi list of commands.
---------------------
This list is destined to grow.

Commands may or may not call Awi for a response.

.play filename.mp4/mp3/wav/ogg: Plays the given file.
.calc <expression>: Calculates the result of a expression locally.
.hex <expression>: Displays the hexadecimal version of the expression.
.bin <expression>: Displays the binary version of the expression.
.run <application>: Launch an AOZ Application/accessory in the AOZ Viewer.
.find <file_name>: Locate a file in the Magic Drive and display its path
.import <file_name>: Same as above and adds the file in the resource folder.
.code <description>: Creates a procedure from the instructions.
.image <description>: Creates an image from the description.
.data <query>: Create Data segments with the result of the query.
.array <query>: Creates an array containing the elements from the query.
.prompt <fuzzy prompt>: Refines a prompt by asking the AI the best prompt.
.help displays that help (or an empty prompt).
` 				}
		]
	}
	async play( args, basket, control )
	{
		await super.play( args, basket, control );
		var text = this.findEditable( args.input );
		if ( !text )
			text = this.findEditable( 'welcome' );
		text = text.content.split( '\r\n' ).join( '\n' ).split( '\n' )
		control.editor.print( text, { user: 'awi' } );
		return { success: true, helpTopic: text };
	}
	async playback( args, basket, control )
	{
		super.playback( args, basket, control );
	}
}
