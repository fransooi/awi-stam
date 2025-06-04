/** --------------------------------------------------------------------------  
*   ______ _______ _______ _______   _ 
*  / _____|_______|_______|_______) | |   
* ( (____     _    _______ _  _  _  | |
*  \____ \   | |  |  ___  | ||_|| | |_|
*  _____) )  | |  | |   | | |   | |  _
* (______/   |_|  |_|   |_|_|   |_| |_|   The Multi-Editor
*
* This file is open-source under the conditions contained in the
* license file located at the root of this project.
*
* ----------------------------------------------------------------------------
* @file MessageManager.js
* @author FL (Francois Lionet)
* @version 0.5
*
* @short This component manages the messages and languages
* @description
* 
*/
import BaseComponent, { MESSAGES } from '../utils/BaseComponent.js';

export const MESSAGESCOMMANDS = {
  GET_MESSAGE: 'GET_MESSAGE',
  SET_LANGUAGE: 'SET_LANGUAGE',
  GET_AVAILABLE_LANGUAGES: 'GET_AVAILABLE_LANGUAGES',
};

class MessageManager extends BaseComponent {
  /**
   * Constructor
   * @param {string} parentId - ID of the parent component
   */
  constructor(parentId = null,containerId) {
    super('Messages', parentId,containerId);      
    this.currentLanguage = '';
    this.messages = {};
    this.countries = {};
    this.english = {};
    this.messagesPath = '/messages';
    this.messageMap[MESSAGESCOMMANDS.GET_MESSAGE] = this.handleGetMessage;
    this.messageMap[MESSAGESCOMMANDS.SET_LANGUAGE] = this.handleSetLanguage;
    this.messageMap[MESSAGESCOMMANDS.GET_AVAILABLE_LANGUAGES] = this.handleGetAvailableLanguages;
  }

  async init(options = {}) {
    if (await super.init(options))
      return;
    // Load list of countries
    var path = this.messagesPath + '/countries.csv';
    var answer = await this.root.utilities.readFile( path, 'text' );
    if ( !answer.error )
    {
      answer = answer.replace(/\r\n/g, '\n');
      answer = answer.replace(/\n\n/g, '\n');
      var countries = answer.split('\n');
      for ( var l = 0; l < countries.length; l++ )
      {
        var country = countries[l].trim();
        if ( country != '' )
        {
          country = country.replace(/"/g, '');
          var entry = country.split(',');
          this.countries[entry[0]] = entry[1];
        }
      }
    }
    await this.handleSetLanguage({ language: 'en' }, null);
    this.english = this.messages;
  }
  
  async destroy() {
    await super.destroy();
  }
  
  // Get a message
  async handleGetMessage(data, senderId) {
    return this.getMessage(data.key, data.variables);
  }

  // Set the current language
  async handleSetLanguage(data, senderId) {
    if (data.language==this.currentLanguage)
      return true;

    // Load texts
    var path = this.messagesPath + '/' + data.language + '.txt';
    var answer = await this.root.utilities.readFile( path, 'text' );
    if ( !answer.error )
    {
      answer = answer.replace(/\r\n/g, '\n');
      answer = answer.replace(/\n\n/g, '\n');
      var lines = answer.split( '\n' );
      this.messages = {};
      for ( var l = 0; l < lines.length; l++ )
      {
        lines[l] = lines[l].trim();
        if ( lines[l] != '' && lines[l].substring(0, 2)!= '//' ){
          var endId = 0;
          while ( lines[l].charCodeAt(endId) > 32 )
            endId++;
          var startText = endId;
          while ( lines[l].charCodeAt(startText) <= 32 )
            startText++;
          this.messages[ lines[l].substring(0,endId) ] = lines[l].substring(startText);
        }
      }
      this.currentLanguage = data.language;
      return true;
    }
    return false;
  }

  // Get the list of local languages
  async handleGetAvailableLanguages(data, senderId) {
    var languages = [];
    for ( var language in this.countries )
      if ( await this.isLanguageAvailable(language) )
        languages.push({language: language, country: this.countries[language]});
    return languages;
  }

  // Check if a language is available
  async isLanguageAvailable(language) {
    var path = this.messagesPath + '/' + language + '.txt';
    var answer = await this.root.utilities.readFile( path, { type: 'text' } );
    return !answer.error;
  }

  // Get layout info
  async getLayoutInfo() {
    const layoutInfo = await super.getLayoutInfo();
    layoutInfo.language = this.language;
    return layoutInfo;
  }

  async applyLayout(layout) {
    await super.applyLayout(layout);
    if ( layout.language && layout.language!=this.language)
      await this.handleSetLanguage({ language: layout.language }, null);
  }

  // Get a message
  getMessage( id, variables = {} )
	{
    var notFound = false;
    if ( id.indexOf( 'stam:' ) < 0 )
        return this.format( id, variables );

		var message = this.messages[id];
    if ( !message )
    {
        notFound = true;
        variables.id = id.substring( 5 );
        message = this.messages['stam:message-not-found'];
    }  
    return this.format( message, variables );
	}
	format( prompt, variables={})
	{
    if ( !variables )
        return prompt;

    var count = 0;
    var start = prompt.lastIndexOf( '~{' );
    while( start >= 0 )
    {
        var end = prompt.indexOf( '}~', start );
        if ( end >= start )
        {
            var key = prompt.substring( start + 2, end );
            var current = variables;
            var dot = key.indexOf( '.' );
            while ( dot >= 0 )
            {
                var left = key.substring( 0, dot );
                var key = key.substring( dot + 1 );
                current = current[ left ];
                if ( typeof current == 'undefined' )
                    break;
            }
            if ( current && typeof current[ key ] != 'undefined' )
                prompt = prompt.substring( 0, start ) + variables[ key ] + prompt.substring( end + 2 );
            else
                prompt = prompt.substring( 0, start ) + 'ERROR! missing: ' + key + '!' + prompt.substring( end + 2 );
        }
        start = prompt.lastIndexOf( '~{' );
        count++;
        if ( count > 100 )
        {
            prompt = 'ERROR! bad format: ' + prompt + '!';
            break;
        }
    }
		return prompt;
	}
  formatBin( number, digits )
  {
      var result = Math.floor( number ).toString( 2 );
      for ( var l = result.length; l < digits; l++ )
          result = '0' + result;
      return result;
  }
  formatHex( number, digits )
  {
      var result = Math.floor( number ).toString( 16 );
      for ( var l = result.length; l < digits; l++ )
          result = '0' + result;
      return result;
  }
  formatFloat( number, fix )
  {
      return this.awi.utilities.floatToString( number, fix );
  }
  formatNumber( number, fix )
  {
      if ( number - Math.floor( number ) != 0 )
          return this.awi.utilities.floatToString( value, fix );
      return '' + number;
  }
}

export default MessageManager;
 