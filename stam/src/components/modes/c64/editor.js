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
* @file editor.js
* @author FL (Francois Lionet)
* @version 0.5
*
* @short Commodore 64 Editor component
*/
import { EditorView } from '@codemirror/view';

class C64Editor {
  constructor(root) {
    this.root = root;
    this.container = null;
    this.editorView = null;
    this.className = 'C64Editor';
  }

  // Destroy
  destroy() {
    this.container = null;
    this.editorView = null;
  }

  // Prepare the container with C64-specific styling
  prepareContainer(container) {
    this.container = container;
    return container;    
  }
  
  getConfig() {
    const c64Theme = EditorView.theme({
      "&": {
        backgroundColor: "#4040e0", // C64 blue background
        color: "#a0a0ff", // Light blue text
        fontFamily: "'C64 Pro Mono', 'C64 Pro', 'Courier New', monospace",
        fontSize: "16px",
        height: "100%"
      },
      ".cm-content": {
        caretColor: "#a0a0ff" // Light blue cursor
      },
      ".cm-cursor": {
        borderLeftColor: "#a0a0ff",
        borderLeftWidth: "2px"
      },
      ".cm-line": {
        paddingLeft: "2em"
      },
      ".cm-gutters": {
        backgroundColor: "#2020a0", // Darker blue for gutters
        color: "#8080ff", // Medium blue line numbers
        border: "none"
      },
      ".cm-gutter.cm-lineNumbers .cm-gutterElement": {
        paddingLeft: "8px",
        paddingRight: "8px"
      },
      ".cm-keyword": {
        color: "#ffffff" // White for keywords
      },
      ".cm-string": {
        color: "#ffff80" // Light yellow for strings
      },
      ".cm-number": {
        color: "#80ff80" // Light green for numbers
      },
      ".cm-comment": {
        color: "#ff8080" // Light red for comments
      }
    });
    
    return {
      extensions: [c64Theme],
      initialDoc: '10 REM COMMODORE 64 BASIC V2',
      multi: false,
      css: null,
      defaultFilename: this.root.messages.getMessage('stam:default-filename-c64')
    };
  }
  
  setEditorView(editorView) {
    this.editorView = editorView;
  }
}

export default C64Editor;
