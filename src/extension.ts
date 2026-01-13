// src/extension.ts
import * as vscode from 'vscode';

interface CommentStyle {
   symbol: string;
   color: string;
   isBold?: boolean;
   isLineOnly?: boolean;
}

interface CommentSyntax {
   line?: string[];
   block?: { start: string; end: string };
}

/* ---------- COMMENT STYLES ---------- */

const commentStyles: CommentStyle[] = [
   { symbol: '?', color: '#449edaff' },
   { symbol: '*', color: '#34c06eff' },
   { symbol: '!', color: '#ce5d50ff' },
   { symbol: '@', color: '#ccad31ff' },
   { symbol: 'TODO:', color: 'rgb(226, 202, 107)', isBold: true, isLineOnly: true },
   { symbol: '$', color: 'rgb(179, 117, 204)' },
   { symbol: '&', color: 'rgb(177, 97, 39)' },
   { symbol: '#', color: '#e67f59ff' },
   { symbol: '%', color: '#a9d676ff' },
   { symbol: '~', color: '#db89c7ff' },
   { symbol: '`', color: 'rgb(95, 102, 204)' },
   { symbol: '^', color: 'rgb(65, 180, 142)' }
];

/* ---------- LANGUAGE COMMENT SYNTAX ---------- */
/* Markdown intentionally excluded */

const commentSyntaxByLanguage: Record<string, CommentSyntax> = {
   javascript: { line: ['//'], block: { start: '/*', end: '*/' } },
   typescript: { line: ['//'], block: { start: '/*', end: '*/' } },
   c: { line: ['//'], block: { start: '/*', end: '*/' } },
   cpp: { line: ['//'], block: { start: '/*', end: '*/' } },
   rust: { line: ['//'], block: { start: '/*', end: '*/' } },
   python: { line: ['#'] },
   shellscript: { line: ['#'] },
   lua: { line: ['--'] },
   sql: { line: ['--'] },
   asm: { line: [';'] },
   nasm: { line: [';'] },
   gas: { line: ['#', ';'] },
   html: { line: ['<!--'] },
   llvm: { line: [';'] },
   plaintext: { line: ['#;'] }
};

/* ---------- STATE ---------- */

let decorationTypes = new Map<string, vscode.TextEditorDecorationType>();
let isEnabled = true;

/* ---------- ACTIVATE ---------- */

export function activate(context: vscode.ExtensionContext) {
   isEnabled = vscode.workspace.getConfiguration().get('styledComments.enabled', true);

   initializeDecorationTypes();

   context.subscriptions.push(
      vscode.commands.registerCommand('styledComments.enable', () => {
         isEnabled = true;
         vscode.workspace.getConfiguration().update('styledComments.enabled', true, true);
         updateDecorations();
      }),

      vscode.commands.registerCommand('styledComments.disable', () => {
         isEnabled = false;
         vscode.workspace.getConfiguration().update('styledComments.enabled', false, true);
         clearDecorations();
      }),

      vscode.workspace.onDidChangeConfiguration(e => {
         if (e.affectsConfiguration('styledComments.enabled')) {
            isEnabled = vscode.workspace.getConfiguration().get('styledComments.enabled', true);
            isEnabled ? updateDecorations() : clearDecorations();
         }
      }),

      vscode.workspace.onDidChangeTextDocument(e => {
         if (isEnabled && e.document === vscode.window.activeTextEditor?.document) {
            scheduleUpdate();
         }
      }),

      vscode.window.onDidChangeActiveTextEditor(() => {
         if (isEnabled) scheduleUpdate();
      })
   );

   scheduleUpdate();
}

/* ---------- DECORATIONS ---------- */

function initializeDecorationTypes() {
   decorationTypes.forEach(d => d.dispose());
   decorationTypes.clear();

   const fontWeight = vscode.workspace.getConfiguration('editor').get('fontWeight', '400');

   for (const style of commentStyles) {
      decorationTypes.set(
         style.symbol,
         vscode.window.createTextEditorDecorationType({
            color: style.color,
            fontWeight: style.isBold ? 'bold' : fontWeight.toString(),
            fontStyle: 'normal'
         })
      );
   }
}

let updateTimer: NodeJS.Timeout | undefined;
function scheduleUpdate() {
   clearTimeout(updateTimer);
   updateTimer = setTimeout(updateDecorations, 150);
}

function updateDecorations() {
   const editor = vscode.window.activeTextEditor;
   if (!editor || !isEnabled) return;

   const document = editor.document;

   /* Ignore Markdown entirely */
   if (document.languageId === 'markdown') return;

   const syntax = commentSyntaxByLanguage[document.languageId];
   if (!syntax) return;

   decorationTypes.forEach(d => editor.setDecorations(d, []));

   const ranges = new Map<string, vscode.Range[]>();
   commentStyles.forEach(s => ranges.set(s.symbol, []));

   let inBlockComment = false;

   for (let lineNum = 0; lineNum < document.lineCount; lineNum++) {
      const line = document.lineAt(lineNum);
      const text = line.text;

      let commentText: string | null = null;
      let commentStart = -1;

      /* ----- BLOCK COMMENTS ----- */
      if (syntax.block) {
         if (!inBlockComment && text.includes(syntax.block.start)) {
            inBlockComment = true;
            commentStart = text.indexOf(syntax.block.start) + syntax.block.start.length;
         }

         if (inBlockComment) {
            commentText = text.slice(commentStart >= 0 ? commentStart : 0);

            if (text.includes(syntax.block.end)) {
               inBlockComment = false;
            }
         }
      }

      /* ----- LINE COMMENTS ----- */
      if (!commentText && syntax.line) {
         for (const token of syntax.line) {
            const idx = text.indexOf(token);
            if (idx !== -1) {
               commentStart = idx + token.length;
               commentText = text.slice(commentStart);
               break;
            }
         }
      }

      if (!commentText) continue;

      /* Ignore pure block comment end */
      if (
         syntax.block &&
         text.trim() === syntax.block.end
      ) {
         continue;
      }

      for (const style of commentStyles) {
         if (style.symbol === 'TODO:') {
            const idx = commentText.toUpperCase().indexOf('TODO:');
            if (idx !== -1) {
               ranges.get(style.symbol)?.push(
                  new vscode.Range(
                     new vscode.Position(lineNum, commentStart + idx),
                     new vscode.Position(lineNum, commentStart + idx + 5)
                  )
               );
            }
         } else if (commentText.trimStart().startsWith(style.symbol)) {
            ranges.get(style.symbol)?.push(
               new vscode.Range(
                  new vscode.Position(lineNum, 0),
                  new vscode.Position(lineNum, text.length)
               )
            );
         }
      }
   }

   ranges.forEach((r, key) => {
      const deco = decorationTypes.get(key);
      if (deco && r.length) editor.setDecorations(deco, r);
   });
}

function clearDecorations() {
   const editor = vscode.window.activeTextEditor;
   if (!editor) return;
   decorationTypes.forEach(d => editor.setDecorations(d, []));
}

export function deactivate() {
   decorationTypes.forEach(d => d.dispose());
   decorationTypes.clear();
}
