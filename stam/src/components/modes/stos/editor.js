// STOS Basic Editor component
import { EditorView } from '@codemirror/view'

class STOSEditor {
  constructor(root) {
    this.root = root;
    this.container = null;
    this.editorView = null;
    this.className = 'STOSEditor';
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
    const stosTheme = EditorView.theme({
      "&": {
        backgroundColor: "#0000AA",
        color: "#FFFFFF",
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
        backgroundColor: "#0000AA",
        color: "#FFFF00",
        border: "none"
      },
      ".cm-gutter.cm-lineNumbers .cm-gutterElement": {
        paddingLeft: "8px",
        paddingRight: "8px"
      }
    });
    
    return {
      extensions: [stosTheme],
      initialDoc: '10 REM STOS Basic',
      multi: false,
      css: null,
      defaultFilename: this.root.messages.getMessage('stam:default-filename-stos')
    };
  }
  
  setEditorView(editorView) {
    this.editorView = editorView;
  }  
}
export default STOSEditor;
