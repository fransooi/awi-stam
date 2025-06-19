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
import { SOCKETMESSAGES } from './sidewindows/SocketSideWindow.js';
import { Dialog } from '../utils/Dialog.js';

export const MESSAGESCOMMANDS = {
  GET_MESSAGE: 'GET_MESSAGE',
  CHOOSE_LANGUAGE: 'CHOOSE_LANGUAGE',
  SET_LANGUAGE: 'SET_LANGUAGE',
  GET_AVAILABLE_LANGUAGES: 'GET_AVAILABLE_LANGUAGES',
  GET_TIMEZONE_INFORMATION: 'GET_TIMEZONE_INFORMATION',
  GET_COUNTRY_LIST: 'GET_COUNTRY_LIST',
  CLEAN_MESSAGE_LIST: 'CLEAN_MESSAGE_LIST'
};

class MessageManager extends BaseComponent {
  /**
   * Constructor
   * @param {string} parentId - ID of the parent component
   */
  constructor(parentId = null,containerId) {
    super('Messages', parentId,containerId);      
    this.currentLanguage = '';
    this.localLanguages = [{ code: 'en', name: 'English' }];
    this.messages = {};
    this.countryCodesToCountry = {};
    this.languageCodeToLanguage = {};
    this.english = {};
    this.messagesPath = '/messages';
    this.messageMap[MESSAGESCOMMANDS.GET_MESSAGE] = this.handleGetMessage;
    this.messageMap[MESSAGESCOMMANDS.SET_LANGUAGE] = this.handleSetLanguage;
    this.messageMap[MESSAGESCOMMANDS.CHOOSE_LANGUAGE] = this.handleChooseLanguage;
    this.messageMap[MESSAGESCOMMANDS.GET_AVAILABLE_LANGUAGES] = this.handleGetAvailableLanguages;
    this.messageMap[MESSAGESCOMMANDS.GET_TIMEZONE_INFORMATION] = this.handleTimezoneInformation;
    this.messageMap[MESSAGESCOMMANDS.GET_COUNTRY_LIST] = this.handleGetCountryList;
    this.messageMap[MESSAGESCOMMANDS.CLEAN_MESSAGE_LIST] = this.handleCleanMessageList;
  }

  async init(options = {}) {
    if (await super.init(options))
      return;

    // Load list of all languages
    var path = this.messagesPath + '/allcountries.json';
    var answer = await this.root.utilities.readFile( path, 'json' );
    if ( !answer.error )
    {
      this.languageCodeToLanguage = {};
      this.countryCodeToCountries = {};
      for ( var l = 0; l < answer.length; l++ )
      {
        var locale = answer[l]; 

        var country = locale.country;
        if (typeof country.countries == 'undefined')
          country.countries = [];
        if (country.iso_3166_1_alpha2 && !this.countryCodeToCountries[country.iso_3166_1_alpha2])
          this.countryCodeToCountries[country.iso_3166_1_alpha2] = country;

        var localeName = locale.locale;
        var localeCode = localeName.substring(0, localeName.indexOf('-'));
        if (!this.languageCodeToLanguage[localeCode])
          this.languageCodeToLanguage[localeCode] = locale.language;
        else
        {
          var sourceCountries = country.countries;
          var destCountries = this.languageCodeToLanguage[localeCode].countries;
          for (var c = 0; c < sourceCountries.length; c++)
            if (destCountries.findIndex( (country) => country.name == sourceCountries[c].name ) == -1)
              destCountries.push(sourceCountries[c]);            
        }
      }
    }

    // Load country annotations, converts CSV structure to object
    this.languageCodeToMainLanguage = {};
    var path = this.messagesPath + '/country_annotation.csv';
    var answer = await this.root.utilities.readFile(path, 'text');
    if ( !answer.error )
    {
      answer = answer.replace(/\r\n/g, '\n');
      answer = answer.replace(/\n\n/g, '\n');
      var list = answer.split('\n');
      for ( var l = 0; l < list.length; l++ )
      {
        var line = list[l].trim();
        if ( line=='' )
          continue;
        line = line.split(',');
        if ( line.length > 4 )
        {
          for ( var ll = 4; ll < line.length; ll++ )
            line[ 3 ]+=','+line[ ll ];
        }
        line.length = 4;
        var countryCode = line[0].toUpperCase();
        if ( countryCode == 'BE' )
          console.log();
        var languageName = line[3];
        languageName = languageName.replace(/"/g, '');
        var end = languageName.indexOf( ',' );
        if ( end == -1 )
          end = languageName.indexOf( ']' );
        languageName = languageName.substring(2, end - 1);
        var country = this.countryCodeToCountries[countryCode];
        if (country){
          country.mainLanguageName = languageName;
          for ( var ln=0; ln < country.languages.length; ln++)
          {
            var language = country.languages[ln];
            if (language.name.toLowerCase() == languageName.toLowerCase()){
              country.mainLanguageCode = language.iso_639_1;
              break;
            }
          }
        }
      }
    }

    // Load list of local languages
    var path = this.messagesPath + '/languages.json';
    var answer = await this.root.utilities.readFile( path, 'json' );
    if ( !answer.error )
    {
      this.localLanguages = answer;
    }
    await this.handleSetLanguage({ language: this.root.preferences.currentPrefs.language }, null);
    this.english = this.messages;
  }
  
  async destroy() {
    await super.destroy();
  }
  
  // Get a message
  async handleGetMessage(data, senderId) {
    return this.getMessage(data.key, data.variables);
  }

  async handleCleanMessageList(data, senderId) {    
    if (!this.messages)
      return this.root.showError( 'No message list to clean' );
    var language = data.language || this.root.preferences.currentPrefs.language;
    var saved = await this.root.server.cleanMessageList({ type: 'stam', srcPath: data.srcPath, language: language, messages: this.messages, text: this.currentText, save: false });
    if (!saved)
      return this.root.showError( 'Failed to clean message list' );
    if (saved.error)
      return this.root.showError( saved.error );
    this.messages = saved.cleanedMessages;
    this.currentText = saved.cleanedText;
    return true;
  }

  async handleChooseLanguage(currentPrefs = {}) {
    var previousLanguage = this.root.preferences.currentPrefs.language;
    var newLanguage = previousLanguage;
    var response = await this.showLanguageDialog(previousLanguage);    
    if (response)
    {
      if (response.localLanguage)
        newLanguage = response.localLanguage;
      else if (response.missingLanguage) {
        var answer = this.translateLanguage(response.missingLanguage);
        if (!answer.error)
        {
          var answer2 = await this.saveLocalLanguage(response.missingLanguage, answer);
          if (!answer2.error)
            newLanguage = response.missingLanguage;
          else
            this.root.alert.showError(answer2.error);
        }
        else
          this.root.alert.showError(answer.error);
      }

      if (newLanguage!=previousLanguage) {        
        this.root.preferences.handleSetLanguage({ language: newLanguage }, null);
      }
    }
    return true;
  }


  // Set the current language
  async handleSetLanguage(data, senderId) {
    if (data.language==this.currentLanguage)
      return true;
    var newMessages = await this.handleLoadLanguage(data, senderId);
    if (newMessages)
    {
      this.messages = newMessages.messages;
      this.currentText = newMessages.text;
      this.currentLanguage = data.language;
      return true;
    }
    return false;
  }
  async handleLoadLanguage(data, senderId) {
    var path = this.messagesPath + '/' + data.language + '.txt';
    var answer = await this.root.utilities.readFile( path );
    if ( !answer.error )
    {
      var messages = this.convertLanguageFile( answer + '\n' );
      return { messages: messages, text: answer };
    }
    return null;
  }
  convertLanguageFile(text) {
    text = text.replace(/\r\n/g, '\n');
    text = text.replace(/\n\n/g, '\n');
    var lines = text.split( '\n' );
    var messages = {};
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
        messages[ lines[l].substring(0,endId) ] = lines[l].substring(startText);
      }
    }
    return messages;
  }

  // Get server languages
  async handleGetServerLanguages(data, senderId) {
    if ( !await this.sendRequestTo( 'class:SocketSideWindow', SOCKETMESSAGES.ENSURE_CONNECTED, {}))
      return;

    var languageList = await this.root.server.getLanguageList({ type: 'stam' });
    if ( languageList )
    {
      for ( var l = 0; l < languageList.length; l++ )
        languageList[l] = { code: languageList[l], name: this.languageCodeToLanguage[languageList[l]] };
    }
    return languageList;  
  }

  // Load server language
  async loadServerLanguage(countryCode) {
    if ( !await this.sendRequestTo( 'class:SocketSideWindow', SOCKETMESSAGES.ENSURE_CONNECTED, {}))
      return;

    var language = await this.root.server.loadLanguage({ type: 'stam', language: countryCode });
    if ( language )
      return language;
    this.root.alert.showError(answer.error);
    return null;
  }

  // Translate language
  async translateLanguage(fromCountryCode, toCountryCode) {
    if ( !await this.sendRequestTo( 'class:SocketSideWindow', SOCKETMESSAGES.ENSURE_CONNECTED, {}))
      return;

    var path = this.messagesPath + '/' + fromCountryCode + '.txt';
    var fromLanguageText = await this.root.utilities.readFile( path, 'text' );
    if ( !fromLanguageText.error )
    {
      var language = await this.root.server.translateLanguage({ type: 'stam', fromLanguage: fromCountryCode, toLanguage: toCountryCode, fromLanguageText: fromLanguageText });
      if ( language )
        return language;
      this.root.alert.showError(language.error);
      return;
    }
    this.root.alert.showError(fromLanguageText.error);
    return null;
  }

  // Check if a language is available
  async isLanguageAvailable(language) {
    var path = this.messagesPath + '/' + language + '.txt';
    var answer = await this.root.utilities.readFile( path, { type: 'text' } );
    return !answer.error;
  }

  // Get the current country
  async handleTimezoneInformation() {
    var region;
    var city;
    var country;
    var countryCode;
    var timeZone;

    if (Intl) {
      timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      var tzArr = timeZone.split("/");
      region = tzArr[0];
      city = tzArr[tzArr.length - 1];
    }
    // Search for city in all languages
    var country = { name: 'Country not found' };
    for ( var countryCode in this.countryCodeToCountries)
      if ( this.countryCodeToCountries[countryCode].capital_name.toLowerCase() == city.toLowerCase() ){
        country = this.countryCodeToCountries[countryCode];
        break;
      }
    // Find language from country    
    return { region, city, country: country.name, countryCode, languageCode: country.mainLanguageCode, languageName: country.mainLanguageName };
  }

  handleGetCountryList() {
    return this.countryCodeToCountries;
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
  getMessagesStartingWith( prefix )
	{
    var messages = [];
    for ( var id in this.messages ){
      if ( id.indexOf( prefix ) == 0 )
        messages.push( id );
    }
    return messages;
	}
	format( prompt, variables={})
	{
    if ( !variables )
        return prompt;

    var count = 0;
    var start = prompt.lastIndexOf( '${' );
    while( start >= 0 )
    {
        var end = prompt.indexOf( '}', start );
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
                prompt = prompt.substring( 0, start ) + variables[ key ] + prompt.substring( end + 1 );
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

  async showLanguageDialog(currentLanguage='en')
  {
    var allLanguages = [];
    for ( var code in this.languageCodeToLanguage)
      allLanguages.push({code: code, name: this.languageCodeToLanguage[code].name});
    const serverLanguages =   await this.handleGetServerLanguages();
    const possibleLanguages = [...this.localLanguages, ...serverLanguages];
    const missingLanguages = [];
    for (var l=0; l<allLanguages.length; l++)
    {
      if (possibleLanguages.find(lang => lang.code === allLanguages[l].code))
        continue;
      missingLanguages.push({code: allLanguages[l].code, name: allLanguages[l].name});
    }

    // Get current theme
    let dialogClosed = false;
    let dialogAnswer = null;
    
    // Create dialog content container
    const content = document.createElement('div');
    content.className = 'language-dialog-content';

    // Create language selection
    const langGroup = document.createElement('div');
    langGroup.className = 'form-group';
    langGroup.innerHTML = `
      <label for="language-select">${this.root.messages.getMessage('stam:available-languages')}</label>
      <select id="language-select" class="form-control">
        ${possibleLanguages.map(lang => 
          `<option value="${lang.code}" ${currentLanguage === lang.code ? 'selected' : ''}>
            ${lang.name}
          </option>`
        ).join('')}
      </select>
    `;
    content.appendChild(langGroup);

    // Translatable languages with AWI
    const translatableLangGroup = document.createElement('div');
    translatableLangGroup.className = 'form-group';
    translatableLangGroup.innerHTML = `
      <label for="language-select">${this.root.messages.getMessage('stam:translatable-languages')}</label>
      <select id="language-select" class="form-control">
        ${missingLanguages.map(lang => 
          `<option value="${lang.code}" ${currentLanguage === lang.code ? 'selected' : ''}>
            ${lang.name}
          </option>`
        ).join('')}
      </select>
    `;
    content.appendChild(translatableLangGroup);

    // Create dialog buttons
    const buttons = [
      {
        label: this.root.messages.getMessage('stam:preferences-cancel'),
        className: 'btn-neutral',
        onClick: function(){
          dialog.close();
          dialogClosed = true;
          dialogAnswer = null;
        }
      },
      {
        label: this.root.messages.getMessage('stam:preferences-save'),
        className: 'btn-positive',
        onClick: () => {
          dialog.close();
          dialogClosed = true;
          dialogAnswer = {
            language: content.querySelector('#language-select').value
          };
        }
      }
    ];
    
    // Create and show the dialog
    const dialog = new Dialog({
      title: this.root.messages.getMessage('stam:language-dialog-title'),
      content: content,
      buttons: buttons,
      theme: this.root.preferences.getCurrentTheme()
    });

    // Show the dialog and return the promise
    dialog.open();

    return new Promise(async (resolve) => {
      while(true)
      {
        await this.root.utilities.sleep(10);
        if (dialogClosed)
          break;
      }
      resolve(dialogAnswer);
    });
  }
}

export default MessageManager;