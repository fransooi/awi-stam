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
* @file Utilities.js
* @author FL (Francois Lionet)
* @version 0.5
*
* @short Helper functions for STAM application
* @description
* This class provides utility functions that can be used across the application.
* It is instantiated in StamApp and accessible through the component tree.
*/
export default class Utilities {
  constructor() {
    //console.log('Utilities initialized');
  }

  /**
   * Deep copy an object recursively
   * 
   * @param {Object} source - The source object to copy
   * @returns {Object} - A new object with the same properties
   */
  copyObject(source) {
    // Handle null or undefined
    if (source === null || source === undefined) {
      return source;
    }

    // Handle primitive types (string, number, boolean)
    if (typeof source !== 'object') {
      return source;
    }

    // Handle Date objects
    if (source instanceof Date) {
      return new Date(source.getTime());
    }

    // Handle Array objects
    if (Array.isArray(source)) {
      return source.map(item => this.copyObject(item));
    }

    // Handle regular objects
    const copy = {};
    for (const key in source) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        copy[key] = this.copyObject(source[key]);
      }
    }
    
    return copy;
  }

  /**
   * Format a date to a string
   * 
   * @param {Date} date - The date to format
   * @param {string} format - The format to use (default: 'YYYY-MM-DD HH:mm:ss')
   * @returns {string} - The formatted date
   */
	formatDate(date, format = 'YYYY-MM-DD hh:mm:ss') {		
		const d = date || new Date(date);    
		const year = String(d.getFullYear());	
		const month = String(d.getMonth() + 1).padStart(2, '0');
		const day = String(d.getDate()).padStart(2, '0');
		const hours = String(d.getHours()).padStart(2, '0');
		const minutes = String(d.getMinutes()).padStart(2, '0');
		const seconds = String(d.getSeconds()).padStart(2, '0');
		return format
			.replace('YYYY', year)
			.replace('MM', month)
			.replace('DD', day)
			.replace('hh', hours)
			.replace('mm', minutes)
			.replace('ss', seconds);
	}


  /**
   * Generate a unique identifier
   * 
   * @param {Object} toCheck - Object to check for existing IDs
   * @param {string} root - Root of the ID (default: '')
   * @param {number} count - Counter for the ID (default: 0)
   * @param {string} timeString - Time string format (default: '')
   * @param {number} nNumbers - Number of random numbers (default: 3)
   * @param {number} nLetters - Number of random letters (default: 3)
   * @returns {string} - A unique ID
   */
  getUniqueIdentifier( toCheck = {}, root = 'id', timeString = '', count = 0, nNumbers = 3, nLetters = 3 )
	{
		let id;
		do
		{
			id = root;
			if ( timeString )
        id += '_' + this.formatDate( new Date(), timeString );
      id += ( count ? '_' + count : '' );
			let numbers = '';
			for ( let n = 0; n < nNumbers; n++ )
				numbers += String.fromCharCode( 48 + Math.floor( Math.random() * 10 ) );
			id += '_' + numbers;
			let letters = '';
			for ( let n = 0; n < nLetters; n++ )
				letters += String.fromCharCode( 65 + Math.floor( Math.random() * 26 ) );
			id += letters;
      if ( id.length == 0 )
        break;
		} while( toCheck[ id ] );
		return id;
	}
  /**
   * Debounce a function
   * 
   * @param {Function} func - The function to debounce
   * @param {number} wait - The debounce time in milliseconds
   * @returns {Function} - The debounced function
   */
  debounce(func, wait) {
    let timeout;
    
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  /**
   * Check if an object is empty
   * 
   * @param {Object} obj - The object to check
   * @returns {boolean} - True if the object is empty
   */
  isEmptyObject(obj) {
    return obj && Object.keys(obj).length === 0 && obj.constructor === Object;
  }

  /**
     * Save data to localStorage
     * @param {string} name - Name of the data
     * @param {string} data - Data to save
     * @returns {Promise<boolean>} - Promise that resolves with success status
     */
  saveStorage(name, data) {     
    try {
        localStorage.setItem(name, data);
        return true;
      }
    catch(error) {
        console.error('Error saving :' + name, error);
        return false;
      };
  }

  /**
   * Load a saved layout
   */
  loadStorage(name) {
    try {
      const data = localStorage.getItem(name);
      if (!data) return null;
      return data;
    } catch (error) {
      return null;
    }
  }

  /**
   * Sleep for a specified amount of time
   * 
   * @param {number} ms - The time to sleep in milliseconds
   * @returns {Promise<void>} - A promise that resolves after the specified time
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  } 

  getURLParameters() {
    const urlParams = new URLSearchParams(window.location.search);
    const params = {};
    urlParams.forEach((value, key) => {
      params[key] = value;
    });
    return params;
  }

  getFileNameFromPath(path) {
    if ( path.indexOf('/') == -1 )
      return path;
    if ( path.indexOf('/') == 0)
      path = path.substring(1);
    const parts = path.split('/');
    return parts[parts.length - 1];
  }

  // Read a file from the public directory with HTTP
  async readFile(path, type = 'text') {
    try {
      const response = await fetch(path);
      if (!response.ok) {
        return { error: 'stam:file-not-found' };
      }
      if ( type === 'text' )
        return await response.text();
      else if ( type === 'json' )
        return await response.json();
      return await response.arrayBuffer();
    } catch (error) {
      return { error: 'stam:file-not-found' };
    }
  }
  // Get the file list inside the public directory with HTTP
  async getPublicDirectoryFiles(path) {
    try {
      const response = await fetch(path);
      if (!response.ok) {
        return { error: 'stam:file-not-found' };
      }
      return await response.json();
    } catch (error) {
      return { error: 'stam:file-not-found' };
    }
  }

  /**
   * Compresses a buffer into a ZIP file or returns a ZIP buffer
   * @param {Uint8Array|ArrayBuffer} buffer - The buffer to compress
   * @param {string} [zipPath=null] - Path to save the ZIP file, or null to return buffer
   * @param {Object} [options={}] - Compression options
   * @param {string} [options.filename='file.bin'] - Filename to use in the ZIP
   * @param {number} [options.level=6] - Compression level (1-9)
   * @returns {Promise<Uint8Array|boolean>} - ZIP buffer or true if saved to file
   */
  async zipBuffer(buffer, zipPath = null, options = {}) {
    try {
      const { filename = 'file.bin', level = 6 } = options;
      const data = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
      
      // Create ZIP with the file
      const zipped = fflate.zipSync({
        [filename]: data
      }, {
        level: Math.min(9, Math.max(1, level))
      });

      if (zipPath) {
        // In browser, we can't directly save to filesystem, so we'll trigger download
        const blob = new Blob([zipped], { type: 'application/zip' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = zipPath.endsWith('.zip') ? zipPath : `${zipPath}.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        return true;
      }
      
      return zipped;
    } catch (error) {
      console.error('Error compressing buffer:', error);
      throw error;
    }
  }

  /**
   * Compresses a string to a base64-encoded ZIP file
   * @param {string} string - The string to compress
   * @param {Object} [options={}] - Compression options
   * @param {string} [options.filename='text.txt'] - Filename to use in the ZIP
   * @param {number} [options.level=6] - Compression level (1-9)
   * @returns {Promise<string>} - Base64-encoded ZIP file
   */
  async zipStringToBase64String(string, options = {}) {
    try {
      const { filename = 'text.txt', level = 6 } = options;
      const buffer = fflate.strToU8(string);
      const zipped = fflate.zipSync({
        [filename]: buffer
      }, {
        level: Math.min(9, Math.max(1, level))
      });
      
      return fflate.strFromU8(zipped, true); // true for base64
    } catch (error) {
      console.error('Error compressing string to base64:', error);
      throw error;
    }
  }

  /**
   * Extracts a ZIP 
   * @param {base64String containing zip buffer|Buffer with zip file} zipBufferOrBase64 -
   * @param {Object} [options={ extractToString: false }] - Extraction options
   * @returns {Promise<Object>} - Extracted files as { filename: Uint8Array }
   */
  /**
   * Checks if a buffer contains binary data by analyzing its content
   * @private
   * @param {Uint8Array} buffer - The buffer to check
   * @returns {boolean} - True if the buffer likely contains binary data
   */
  isLikelyBinary(buffer) {
    // Check first 1000 bytes (or entire buffer if smaller)
    const bytesToCheck = Math.min(1000, buffer.length);
    if (bytesToCheck === 0) return false;
    
    let suspiciousBytes = 0;
    const totalBytes = bytesToCheck;
    
    // Common binary file signatures (first few bytes)
    const binarySignatures = [
      [0x89, 0x50, 0x4E, 0x47], // PNG
      [0xFF, 0xD8, 0xFF],       // JPEG
      [0x47, 0x49, 0x46, 0x38], // GIF
      [0x42, 0x4D],             // BMP
      [0x50, 0x4B, 0x03, 0x04], // ZIP
      [0x1F, 0x8B, 0x08],       // GZIP
      [0x25, 0x50, 0x44, 0x46], // PDF
      [0x7F, 0x45, 0x4C, 0x46]  // ELF (executable)
    ];
    
    // Check for binary signatures
    for (const signature of binarySignatures) {
      let match = true;
      for (let i = 0; i < signature.length; i++) {
        if (buffer[i] !== signature[i]) {
          match = false;
          break;
        }
      }
      if (match) return true;
    }
    
    // Check for binary content patterns
    for (let i = 0; i < bytesToCheck; i++) {
      const byte = buffer[i];
      
      // Null bytes are a strong indicator of binary content
      if (byte === 0) return true;
      
      // Check for non-printable ASCII (except common whitespace)
      if (byte < 32 && byte !== 0x09 && byte !== 0x0A && byte !== 0x0D && byte !== 0x0C) {
        suspiciousBytes++;
      }
    }
    
    // If more than 10% of the checked bytes are suspicious, consider it binary
    return (suspiciousBytes / totalBytes) > 0.1;
  }

  /**
   * Converts a buffer to a string if it contains text, otherwise returns as is
   * @private
   * @param {Uint8Array} buffer - The buffer to convert
   * @returns {string|Uint8Array} - The converted string or original buffer
   */
  bufferToTextIfPossible(buffer) {
    if (this.isLikelyBinary(buffer)) {
      return buffer;
    }
    
    try {
      const textDecoder = new TextDecoder('utf-8', { fatal: true });
      return textDecoder.decode(buffer);
    } catch (e) {
      // If UTF-8 decoding fails, try with 'latin1' (which never fails)
      try {
        const textDecoder = new TextDecoder('latin1');
        const decoded = textDecoder.decode(buffer);
        // If the string contains too many replacement characters, it's probably binary
        const replacementCount = (decoded.match(/\uFFFD/g) || []).length;
        if (replacementCount / decoded.length > 0.1) {
          return buffer;
        }
        return decoded;
      } catch (e) {
        return buffer;
      }
    }
  }

  convertStringToArrayBuffer( str )
  {
    var lookup = window.base64Lookup;
    if ( !lookup )
    {
      var chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
      lookup = new Uint8Array(256);
      for ( var i = 0; i < chars.length; i++ )
      {
        lookup[ chars.charCodeAt( i ) ] = i;
      }
      window.base64Lookup = lookup;
    }

    var bufferLength = str.length * 0.75, len = str.length, i, p = 0, encoded1, encoded2, encoded3, encoded4;
    if ( str[ str.length - 1 ] === "=")
    {
      bufferLength--;
      if ( str[ str.length - 2 ] === "=")
      {
        bufferLength--;
      }
    }

    var arraybuffer = new ArrayBuffer( bufferLength ),
    bytes = new Uint8Array( arraybuffer );

    for ( i = 0; i < len; i += 4 )
    {
      encoded1 = lookup[str.charCodeAt(i)];
      encoded2 = lookup[str.charCodeAt(i+1)];
      encoded3 = lookup[str.charCodeAt(i+2)];
      encoded4 = lookup[str.charCodeAt(i+3)];

      bytes[p++] = (encoded1 << 2) | (encoded2 >> 4);
      bytes[p++] = ((encoded2 & 15) << 4) | (encoded3 >> 2);
      bytes[p++] = ((encoded3 & 3) << 6) | (encoded4 & 63);
    }
    return arraybuffer;
  }
  convertArrayBufferToString( arrayBuffer )
  {
    var chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    var bytes = new Uint8Array( arrayBuffer ), i, len = bytes.length, base64 = "";

    for (i = 0; i < len; i+=3)
    {
      base64 += chars[bytes[i] >> 2];
      base64 += chars[((bytes[i] & 3) << 4) | (bytes[i + 1] >> 4)];
      base64 += chars[((bytes[i + 1] & 15) << 2) | (bytes[i + 2] >> 6)];
      base64 += chars[bytes[i + 2] & 63];
    }

    if ((len % 3) === 2)
    {
      base64 = base64.substring(0, base64.length - 1) + "=";
    }
    else if (len % 3 === 1)
    {
      base64 = base64.substring(0, base64.length - 2) + "==";
    }
    return base64;
  }

  /**
   * Extracts a ZIP file from either a base64 string or a buffer
   * @param {string|Uint8Array|ArrayBuffer} zipBufferOrBase64 - The ZIP data as base64 string or buffer
   * @param {Object} [options={}] - Extraction options
   * @param {boolean} [options.extractToString=false] - Whether to convert text files to strings
   * @returns {Promise<Object>} - Extracted files as { filename: Uint8Array|string }
   */
  async unzipToBufferOrBase64(zipBufferOrBase64, options = {}) {
    try {
      const { extractToString = false } = options;
      
      // Convert input to Uint8Array
      let buffer;
      if (typeof zipBufferOrBase64 === 'string') {
        // Handle base64 string
        buffer = fflate.strToU8(zipBufferOrBase64, true);
      } else if (zipBufferOrBase64 instanceof Uint8Array) {
        // Already in the right format
        buffer = zipBufferOrBase64;
      } else if (zipBufferOrBase64 instanceof ArrayBuffer) {
        // Convert from ArrayBuffer
        buffer = new Uint8Array(zipBufferOrBase64);
      } else {
        throw new Error('Invalid input: expected base64 string, Uint8Array, or ArrayBuffer');
      }
      
      // Unzip the data
      const unzipped = fflate.unzipSync(buffer);
      const result = {};
      
      // Process each file in the ZIP
      for (const [filename, fileData] of Object.entries(unzipped)) {
        if (extractToString) {
          result[filename] = this.bufferToTextIfPossible(fileData);
        } else {
          result[filename] = fileData;
        }
      }
      
      return result;
    } catch (error) {
      console.error('Error extracting ZIP:', error);
      throw error;
    }
  }
}
