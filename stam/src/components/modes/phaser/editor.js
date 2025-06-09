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
  constructor(container) {
    this.container = container;
    this.editorView = null;
  }

  // Prepare the container with appropriate styling
  prepareContainer() {
    // Create a styled container for the editor without the header
    this.container.innerHTML = `
      <div class="phaser-editor">
        <div id="phaser-editor-container" class="phaser-content"></div>
      </div>
    `;
  }
  
  // Return the parent element for the editor
  getEditorParent() {
    return document.getElementById('phaser-editor-container');
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
      multi: true
    };
  }

  // Store the editor view instance
  setEditorView(editorView) {
    this.editorView = editorView;
  }
}

export default PhaserEditor;
