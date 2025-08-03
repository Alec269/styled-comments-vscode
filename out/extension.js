"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
const vscode = require("vscode");
const commentStyles = [
    { symbol: '?', color: '#3498db' },
    { symbol: '*', color: '#2ecc71' },
    { symbol: '!', color: '#e74c3c' },
    { symbol: '@', color: '#f1c40f' },
    { symbol: 'TODO:', color: 'inherit', isBold: true, isLineOnly: true },
    { symbol: '$', color: '#9b59b6' },
    { symbol: '&', color: '#8b4513' },
    { symbol: '#', color: '#ff6b35' } // Orange
];
let decorationTypes = new Map();
let isEnabled = true;
function activate(context) {
    console.log('Styled Comments extension is now active');
    // Get initial configuration
    isEnabled = vscode.workspace.getConfiguration().get('styledComments.enabled', true);
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
            }
            else {
                clearDecorations();
            }
        }
        // Reinitialize decorations if editor font weight changes
        if (event.affectsConfiguration('editor.fontWeight')) {
            initializeDecorationTypes();
            if (isEnabled) {
                updateDecorations();
            }
        }
    });
    // Listen for document changes with throttling
    let timeout;
    const documentChangeListener = vscode.workspace.onDidChangeTextDocument(event => {
        if (isEnabled && event.document === vscode.window.activeTextEditor?.document) {
            if (timeout) {
                clearTimeout(timeout);
            }
            timeout = setTimeout(() => {
                updateDecorations();
            }, 100); // Throttle updates to avoid performance issues
        }
    });
    // Listen for active editor changes
    const activeEditorChangeListener = vscode.window.onDidChangeActiveTextEditor(() => {
        if (isEnabled) {
            setTimeout(() => {
                updateDecorations();
            }, 100); // Small delay to ensure editor is ready
        }
    });
    // Initial decoration update with delay
    setTimeout(() => {
        if (isEnabled) {
            updateDecorations();
        }
    }, 500);
    context.subscriptions.push(enableCommand, disableCommand, configurationChangeListener, documentChangeListener, activeEditorChangeListener);
}
exports.activate = activate;
function initializeDecorationTypes() {
    // Clear existing decoration types
    decorationTypes.forEach(decoration => decoration.dispose());
    decorationTypes.clear();
    // Get the current editor font weight from settings
    const editorConfig = vscode.workspace.getConfiguration('editor');
    const fontWeight = editorConfig.get('fontWeight', '400'); // Default to '400' if not set
    // Create new decoration types
    commentStyles.forEach(style => {
        const decorationType = vscode.window.createTextEditorDecorationType({
            color: style.color,
            fontWeight: style.isBold ? 'bold' : fontWeight.toString(),
            // Ensure consistent font rendering
            textDecoration: 'none',
            fontStyle: fontWeight // Explicitly set font style
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
    // Clear previous decorations
    decorationTypes.forEach(decoration => {
        activeEditor.setDecorations(decoration, []);
    });
    // Group ranges by decoration type
    const decorationRanges = new Map();
    commentStyles.forEach(style => {
        decorationRanges.set(style.symbol, []);
    });
    // Process each line
    for (let lineIndex = 0; lineIndex < document.lineCount; lineIndex++) {
        const line = document.lineAt(lineIndex);
        const lineText = line.text;
        const trimmedLine = lineText.trim();
        // Simple comment detection - look for common comment patterns
        let commentContent = '';
        let isComment = false;
        // Check for // comments
        const doubleSlashMatch = lineText.match(/^\s*\/\/\s*(.*)$/);
        if (doubleSlashMatch) {
            commentContent = doubleSlashMatch[1];
            isComment = true;
        }
        // Check for /* */ single line comments
        const blockCommentMatch = lineText.match(/^\s*\/\*\s*(.*?)\s*\*\/\s*$/);
        if (blockCommentMatch) {
            commentContent = blockCommentMatch[1];
            isComment = true;
        }
        // Check for # comments (Python, shell, etc.)
        const hashCommentMatch = lineText.match(/^\s*#\s*(.*)$/);
        if (hashCommentMatch) {
            commentContent = hashCommentMatch[1];
            isComment = true;
        }
        // Check for -- comments (SQL, Lua, etc.)
        const dashCommentMatch = lineText.match(/^\s*--\s*(.*)$/);
        if (dashCommentMatch) {
            commentContent = dashCommentMatch[1];
            isComment = true;
        }
        // Check for <!-- --> HTML comments
        const htmlCommentMatch = lineText.match(/^\s*<!--\s*(.*?)\s*-->\s*$/);
        if (htmlCommentMatch) {
            commentContent = htmlCommentMatch[1];
            isComment = true;
        }
        if (!isComment)
            continue;
        console.log(`Found comment on line ${lineIndex}: "${commentContent}"`);
        // Check each style symbol
        commentStyles.forEach(style => {
            if (style.symbol === 'TODO:') {
                // Special handling for TODO: - only make the TODO: part bold
                if (commentContent.toUpperCase().startsWith('TODO:')) {
                    const todoIndex = lineText.toUpperCase().indexOf('TODO:');
                    if (todoIndex !== -1) {
                        const range = new vscode.Range(new vscode.Position(lineIndex, todoIndex), new vscode.Position(lineIndex, todoIndex + 5) // "TODO:".length
                        );
                        decorationRanges.get(style.symbol)?.push(range);
                        console.log(`Added TODO decoration for line ${lineIndex}`);
                    }
                }
            }
            else {
                // Regular symbol checking
                if (commentContent.startsWith(style.symbol)) {
                    const range = new vscode.Range(new vscode.Position(lineIndex, 0), new vscode.Position(lineIndex, lineText.length));
                    decorationRanges.get(style.symbol)?.push(range);
                    console.log(`Added ${style.symbol} decoration for line ${lineIndex}`);
                }
            }
        });
    }
    // Apply decorations
    decorationRanges.forEach((ranges, symbol) => {
        const decorationType = decorationTypes.get(symbol);
        if (decorationType && ranges.length > 0) {
            activeEditor.setDecorations(decorationType, ranges);
            console.log(`Applied ${ranges.length} decorations for symbol: ${symbol}`);
        }
    });
}
function clearDecorations() {
    const activeEditor = vscode.window.activeTextEditor;
    if (!activeEditor)
        return;
    decorationTypes.forEach(decoration => {
        activeEditor.setDecorations(decoration, []);
    });
}
function deactivate() {
    // Clean up decoration types
    decorationTypes.forEach(decoration => decoration.dispose());
    decorationTypes.clear();
}
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map