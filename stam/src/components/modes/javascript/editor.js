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
* @short JavaScript Editor component
*/
import { javascript } from '@codemirror/lang-javascript'
import { oneDark } from '@codemirror/theme-one-dark'
import { EditorState } from '@codemirror/state'

class JavascriptEditor {
  constructor(root) {
    this.root = root;
    this.container = null;
    this.editorView = null;
    this.className = 'JavascriptEditor';
  }

  destroy() {
    this.container = null;
    this.editorView = null;
  }
  
  prepareContainer(container) {
    this.container = container;
    return container;    
  }
  
  getConfig() {
    return {
      extensions: [
        javascript(),
        oneDark,
        EditorState.allowMultipleSelections.of(true)
      ],
      initialDoc: '// Javascript',
      multi: true,
      css: null,
      defaultFilename: this.root.messages.getMessage('stam:default-filename-javascript')
    };
  }
  
  setEditorView(editorView) {
    this.editorView = editorView;
  }
}
export default JavascriptEditor;
