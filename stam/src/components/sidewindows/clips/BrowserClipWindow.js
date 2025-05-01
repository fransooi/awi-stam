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
* @file BrowserClipWindow.js
* @author FL (Francois Lionet)
* @version 0.5
*
* @short Browser clip window implementation
*/
import ClipWindow from './ClipWindow.js';

class BrowserClipWindow extends ClipWindow {
  constructor(initialUrl = '') {
    super('browser', 'Browser', initialUrl || 'about:blank');
  }
  
  /**
   * Process the URL before setting it to the iframe
   * @param {string} url - The URL to process
   * @returns {string} - The processed URL
   */
  processUrl(url) {
    // For a generic browser, we just return the URL as is
    return url;
  }
  
  /**
   * Get the placeholder text for the URL input
   * @returns {string} - The placeholder text
   */
  getUrlPlaceholder() {
    return 'https://example.com';
  }
  
  /**
   * Get the help text for the URL input
   * @returns {string} - The help text HTML
   */
  getUrlHelpText() {
    return 'Enter any web URL';
  }
}

export default BrowserClipWindow;
