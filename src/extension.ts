import * as vscode from 'vscode';

interface CommentStyle {
  symbol: string;
  color: string;
  isBold?: boolean;
  isLineOnly?: boolean; // for TODO: only the text should be bold, not the whole line
}

const commentStyles: CommentStyle[] = [
  { symbol: '?', color: '#3498db' },      // Blue
  { symbol: '*', color: '#2ecc71' },      // Lime green
  { symbol: '!', color: '#e74c3c' },      // Red
  { symbol: '@', color: '#f1c40f' },      // Yellow
  { symbol: 'TODO:', color: 'inherit', isBold: true, isLineOnly: true }, // Bold TODO
  { symbol: '$', color: '#9b59b6' },      // Purple
  { symbol: '&', color: '#8b4513' },      // Brown
  { symbol: '#', color: '#ff6b35' }       // Orange
];

let decorationTypes: Map<string, vscode.TextEditorDecorationType> = new Map();
let isEnabled = true;

export function activate(context: vscode.ExtensionContext) {
  console.log('Styled Comments extension is now active');

  // Initialize decoration types
  initializeDecorationTypes();

  // Register commands
  const enableCommand = vscode.commands.registerCommand('styledComments.enable', () => {
    isEnabled = true;
    vscode.workspace.getConfiguration().update('styledComments.enabled', true, true);
    updateDecorations();
  });

  const disableCommand = vscode.commands.registerCommand('styledComments.disable', () => {
    isEnabled = false;
    vscode.workspace.getConfiguration().update('styledComments.enabled', false, true);
    clearDecorations();
  });

  // Listen for configuration changes
  const configurationChangeListener = vscode.workspace.onDidChangeConfiguration(event => {
    if (event.affectsConfiguration('styledComments.enabled')) {
      isEnabled = vscode.workspace.getConfiguration().get('styledComments.enabled', true);
      if (isEnabled) {
        updateDecorations();
      } else {
        clearDecorations();
      }
    }
  });

  // Listen for document changes
  const documentChangeListener = vscode.workspace.onDidChangeTextDocument(event => {
    if (isEnabled && event.document === vscode.window.activeTextEditor?.document) {
      updateDecorations();
    }
  });

  // Listen for active editor changes
  const activeEditorChangeListener = vscode.window.onDidChangeActiveTextEditor(() => {
    if (isEnabled) {
      updateDecorations();
    }
  });

  // Initial decoration update
  if (isEnabled) {
    updateDecorations();
  }

  context.subscriptions.push(
    enableCommand,
    disableCommand,
    configurationChangeListener,
    documentChangeListener,
    activeEditorChangeListener
  );
}

function initializeDecorationTypes() {
  // Clear existing decoration types
  decorationTypes.forEach(decoration => decoration.dispose());
  decorationTypes.clear();

  // Create new decoration types
  commentStyles.forEach(style => {
    const decorationType = vscode.window.createTextEditorDecorationType({
      color: style.color,
      fontWeight: style.isBold ? 'bold' : 'normal'
    });
    decorationTypes.set(style.symbol, decorationType);
  });
}

function updateDecorations() {
  const activeEditor = vscode.window.activeTextEditor;
  if (!activeEditor || !isEnabled) {
    return;
  }

  const document = activeEditor.document;
  const text = document.getText();
  const lines = text.split('\n');

  // Clear previous decorations
  decorationTypes.forEach(decoration => {
    activeEditor.setDecorations(decoration, []);
  });

  // Group ranges by decoration type
  const decorationRanges: Map<string, vscode.Range[]> = new Map();
  commentStyles.forEach(style => {
    decorationRanges.set(style.symbol, []);
  });

  // Process each line
  lines.forEach((line, lineIndex) => {
    const trimmedLine = line.trim();
    
    // Check if line is a comment (supports //, /*, #, --, <!-- etc.)
    const commentPatterns = [
      /^\s*\/\/\s*(.*)$/,      // // comments
      /^\s*\/\*\s*(.*?)\s*\*\/$/,  // /* */ comments (single line)
      /^\s*\/\*\s*(.*)$/,      // /* comments (multi-line start)
      /^\s*\*\s*(.*)$/,        // * comments (multi-line middle)
      /^\s*#\s*(.*)$/,         // # comments (Python, shell, etc.)
      /^\s*--\s*(.*)$/,        // -- comments (SQL, Lua, etc.)
      /^\s*<!--\s*(.*?)\s*-->$/,   // <!-- --> comments (HTML)
      /^\s*<!--\s*(.*)$/,      // <!-- comments (HTML start)
    ];

    let commentContent = '';
    let commentStart = 0;
    let isComment = false;

    for (const pattern of commentPatterns) {
      const match = line.match(pattern);
      if (match) {
        commentContent = match[1] || '';
        commentStart = line.indexOf(match[0].trim());
        isComment = true;
        break;
      }
    }

    if (!isComment) return;

    // Check each style symbol
    commentStyles.forEach(style => {
      if (style.symbol === 'TODO:') {
        // Special handling for TODO: - only make the TODO: part bold
        const todoMatch = commentContent.match(/^TODO:\s*(.*)/i);
        if (todoMatch) {
          const todoStart = line.indexOf('TODO:');
          if (todoStart !== -1) {
            const range = new vscode.Range(
              new vscode.Position(lineIndex, todoStart),
              new vscode.Position(lineIndex, todoStart + 5) // "TODO:".length
            );
            decorationRanges.get(style.symbol)?.push(range);
          }
        }
      } else {
        // Regular symbol checking
        if (commentContent.startsWith(style.symbol)) {
          const symbolStart = line.indexOf(style.symbol, commentStart);
          if (symbolStart !== -1) {
            const range = new vscode.Range(
              new vscode.Position(lineIndex, 0),
              new vscode.Position(lineIndex, line.length)
            );
            decorationRanges.get(style.symbol)?.push(range);
          }
        }
      }
    });
  });

  // Apply decorations
  decorationRanges.forEach((ranges, symbol) => {
    const decorationType = decorationTypes.get(symbol);
    if (decorationType && ranges.length > 0) {
      activeEditor.setDecorations(decorationType, ranges);
    }
  });
}

function clearDecorations() {
  const activeEditor = vscode.window.activeTextEditor;
  if (!activeEditor) return;

  decorationTypes.forEach(decoration => {
    activeEditor.setDecorations(decoration, []);
  });
}

export function deactivate() {
  // Clean up decoration types
  decorationTypes.forEach(decoration => decoration.dispose());
  decorationTypes.clear();
}