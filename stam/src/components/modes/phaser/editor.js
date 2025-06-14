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
* @short Phaser Editor component
*/
import { javascript } from '@codemirror/lang-javascript'
import { oneDark } from '@codemirror/theme-one-dark'
import { EditorState } from '@codemirror/state'

class PhaserEditor {
  constructor(root) {
    this.root = root;
    this.container = null;
    this.editorView = null;
    this.className = 'PhaserEditor';
  }

  // Destroy
  destroy() {
    this.container = null;
    this.editorView = null;
  }

  // Provide configuration for the main Editor component
  getConfig() {
    return {
      extensions: [
        javascript(),
        oneDark,
        EditorState.allowMultipleSelections.of(true)
      ],
      initialDoc: '// Phaser Editor',
      multi: true,
      css: null,
      defaultFilename: this.root.messages.getMessage('stam:default-filename-phaser')
    };
  }
  
  // Prepare the container for a new editor
  prepareContainer(container) {
    this.container = container;
    return container;    
  }
  
  // Store the editor view instance
  setEditorView(editorView) {
    this.editorView = editorView;
  }
}

export default PhaserEditor;
