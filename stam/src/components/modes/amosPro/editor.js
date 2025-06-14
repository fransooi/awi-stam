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
* @short AMOS Pro Editor component
*/
import { EditorView } from '@codemirror/view'

class AMOSProEditor {
  constructor(root) {
    this.root = root;
    this.container = null;
    this.editorView = null;
    this.className = 'AMOSProEditor'
  }

  // Destroy
  destroy() {
    this.container = null;
    this.editorView = null;
  }
  
  // Prepare the container with AMOS Pro-specific styling
  prepareContainer(container) {
    this.container = container;
    return container;    
  }
  
  // Return the parent element for the editor
  getEditorParent() {
    return document.getElementById('amospro-editor-container');
  }
  
  // Provide configuration for the main Editor component
  getConfig() {
    // Custom theme for AMOS Pro based on the image
    const amosProTheme = EditorView.theme({
      "&": {
        backgroundColor: "#008080", // Teal background
        color: "#FFFFFF", // White text
        fontFamily: "'Courier New', monospace",
        fontSize: "16px",
        height: "100%"
      },
      ".cm-content": {
        caretColor: "#FFFFFF"
      },
      ".cm-cursor": {
        borderLeftColor: "#FFFFFF",
        borderLeftWidth: "2px"
      },
      ".cm-line": {
        paddingLeft: "2em"
      },
      ".cm-gutters": {
        backgroundColor: "#006666", // Darker teal for gutters
        color: "#FFFF00", // Yellow line numbers
        border: "none"
      },
      ".cm-gutter.cm-lineNumbers .cm-gutterElement": {
        paddingLeft: "8px",
        paddingRight: "8px"
      },
      ".cm-keyword": {
        color: "#FFFF00" // Yellow for keywords
      },
      ".cm-string": {
        color: "#FFFFFF" // White for strings
      },
      ".cm-number": {
        color: "#FFFFFF" // White for numbers
      },
      ".cm-comment": {
        color: "#00FF00" // Green for comments
      }
    });
    
    return {
      extensions: [amosProTheme],
      initialDoc: 'REM AMOS Professional',
      multi: false,
      css: null,
      defaultFilename: this.root.messages.getMessage('stam:default-filename-amosPro')
    };
  }
  
  // Store the editor view instance
  setEditorView(editorView) {
    this.editorView = editorView;
  }
  
  // Mode-specific operations
  runProgram() {
    console.log('Running AMOS Pro program');
    // Implement AMOS Pro-specific run logic here
    alert('AMOS Pro program execution started');
  }
  
  debugProgram() {
    console.log('Debugging AMOS Pro program');
    // Implement AMOS Pro-specific debug logic here
    alert('AMOS Pro program debugging started');
  }
  
  showHelp() {
    console.log('Showing AMOS Pro help');
    // Implement AMOS Pro-specific help logic here
    alert('AMOS Pro Help:\n\nBasic commands:\nPRINT - Output text\nFOR/NEXT - Loop\nIF/THEN - Conditional\nGOTO - Jump to line\nGOSUB/RETURN - Subroutine\n\nAMOS Pro Extensions:\nAMOSPRO_TURBO - Speed up execution\nAMOSPRO_REQUEST - System requests\nAMOSPRO_MUSIC - Enhanced music commands');
  }
}

export default AMOSProEditor;
