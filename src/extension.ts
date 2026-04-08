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
   block?: {
      start: string;
      end: string
   } [];
}

// ---------- STATE ---------- //
interface ExtensionState {
   decorationTypes: Map<string, vscode.TextEditorDecorationType>;
   isEnabled: boolean;
   markdownHighlightsEnabled: boolean;
   updateTimer: NodeJS.Timeout | undefined;
}

// ---------- MD Pattern ---------- //
interface MarkdownPattern {
   key: string;
   regex: RegExp;
   color: string;
   fontStyle?: string;
   fontWeight?: string;
}

// ---------- *Comment Decorator styles* ---------- //

const commentStyles: CommentStyle[] = [
   { symbol: '?', color: '#449edaff' },
   { symbol: '*', color: '#34c06eff' },
   { symbol: '!', color: '#ce5d50ff' },
   { symbol: '@', color: '#ccad31ff' },
   { symbol: 'TODO:', color: '#e2ca6b', isBold: true },
   { symbol: '$', color: '#b375cc' },
   { symbol: '&', color: '#b16127' },
   { symbol: '#', color: '#e67f59ff' },
   { symbol: '%', color: '#a9d676ff' },
   { symbol: '~', color: '#db89c7ff' },
   { symbol: '`', color: '#5f66cc' },
   { symbol: '^', color: '#41b48e' }
];

// ---------- *MarkDown Delimiter* Patterns ---------- //


const markdownPatterns: MarkdownPattern[] = [
   {
      key: 'md_bold',
      regex: /\*\*(.+?)\*\*/g,
      color: '#d19a66',
      fontWeight: 'bold'
   },
   {
      key: 'md_italic',
      regex: /(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g,
      color: '#bc78bb',
      fontStyle: 'italic'
   },
   {
      key: 'md_code',
      regex: /`([^`]+)`/g,
      color: '#94c379'
   }
];

/* ---------- Doxygen Tags To Ignore ---------- */

const doxygenTags = [
   '@param', '@return', '@returns', '@brief', '@file', '@author', '@date',
   '@version', '@class', '@struct', '@enum', '@var', '@def', '@typedef',
   '@see', '@note', '@warning', '@deprecated', '@throw', '@throws',
   '@exception', '@pre', '@post', '@invariant', '@code', '@endcode',
   '@example', '@since', '@todo', '@bug', '@test', '@namespace',
   '\\param', '\\return', '\\returns', '\\brief', '\\file', '\\author'
];

/* ---------- Lang specific Comment Syntax ---------- */

const commentSyntaxByLanguage: Record<string, CommentSyntax> = {
   javascript: { line: ['//'], block: [{ start: '/*', end: '*/' }] },
   typescript: { line: ['//'], block: [{ start: '/*', end: '*/' }] },
   javascriptreact: { line: ['//'], block: [{ start: '/*', end: '*/' }] },
   typescriptreact: { line: ['//'], block: [{ start: '/*', end: '*/' }] },
   dart: { line: ['//'], block: [{ start: '/*', end: '*/' }] },
   csharp: { line: ['//'], block: [{ start: '/*', end: '*/' }] },
   java: { line: ['//'], block: [{ start: '/*', end: '*/' }] },
   go: { line: ['//'], block: [{ start: '/*', end: '*/' }] },
   groovy: { line: ['//'], block: [{ start: '/*', end: '*/' }] },
   //
   c: { line: ['//'], block: [{ start: '/*', end: '*/' }] },
   cpp: { line: ['//'], block: [{ start: '/*', end: '*/' }] },
   asm: { line: [';'] },
   nasm: { line: [';'] },
   llvm: { line: [';'] },
   gas: { line: ['#', ';'] },
   rust: { line: ['//'], block: [{ start: '/*', end: '*/' }] },
   zig: { line: ['//'] },
   odin: { line: ['//'] },
   //
   powershell: { line: ['#'] },
   shellscript: { line: ['#'] },
   //
   python: { line: ['#'] },
   cmake: { line: ['#'] },
   lua: { line: ['--'] },
   jsonc: { line: ['//'] },
   //
   sql: { line: ['--'] },
   html: { block: [{ start: '<!--', end: '-->' }] },
   php: {
      line: ["//"], block: [
         { start: '/*', end: '*/' },
         { start: '<!--', end: '-->' }
      ]
   },
   css: { block: [{ start: '/*', end: '*/' }] },
   plaintext: { line: ['#;'] },
};
// Markdown intentionally excluded 




/* ---------- ACTIVATE ---------- */

/// Basically the `main()` function of a *vscode extension*

export function activate(context: vscode.ExtensionContext) {

   const eState: ExtensionState = {
      decorationTypes: new Map(),
      isEnabled: true,
      markdownHighlightsEnabled: true,
      updateTimer: undefined
   };

   initializeDecorationTypes(eState);
   // get feature activation statuses
   eState.isEnabled = vscode.workspace.getConfiguration().get('styledComments.enabled', true);
   eState.markdownHighlightsEnabled = vscode.workspace.getConfiguration().get('styledComments.markdownHighlights', true);


   context.subscriptions.push(
      vscode.commands.registerCommand('styledComments.enable', () => {
         eState.isEnabled = true;
         vscode.workspace.getConfiguration().update('styledComments.enabled', true, true);
         updateDecorations(eState);
      }),

      vscode.commands.registerCommand('styledComments.disable', () => {
         eState.isEnabled = false;
         vscode.workspace.getConfiguration().update('styledComments.enabled', false, true);
         clearDecorations(eState);
      }),

      vscode.workspace.onDidChangeConfiguration(e => {
         if (e.affectsConfiguration('styledComments.enabled')) {
            eState.isEnabled = vscode.workspace.getConfiguration().get('styledComments.enabled', true);
            eState.isEnabled ? updateDecorations(eState) : clearDecorations(eState);
         }
         if (e.affectsConfiguration('styledComments.markdownHighlights')) {
            eState.markdownHighlightsEnabled = vscode.workspace.getConfiguration().get('styledComments.markdownHighlights', true);
            updateDecorations(eState);
         }
      }),

      vscode.workspace.onDidChangeTextDocument(e => {
         if (eState.isEnabled && e.document === vscode.window.activeTextEditor?.document) {
            scheduleUpdate(eState);
         }
      }),

      vscode.window.onDidChangeActiveTextEditor(() => {
         if (eState.isEnabled) {
            scheduleUpdate(eState);
         }
      })
   );

   scheduleUpdate(eState);
}

/* ---------- DECORATIONS ---------- */

function initializeDecorationTypes(eState: ExtensionState) {
   eState.decorationTypes.forEach((val, key) => val.dispose()); // removing decoration styles on screen
   eState.decorationTypes.clear();

   // get the user's fontWeight, else assume 400
   const fontWeight = vscode.workspace.getConfiguration('editor').get('fontWeight', '400');




   // define comment decoration types
   for (const style of commentStyles) {
      eState.decorationTypes.set(
         style.symbol,
         vscode.window.createTextEditorDecorationType({
            color: style.color,
            fontWeight: style.isBold ? 'bold' : fontWeight.toString(),
            fontStyle: 'normal',
         })
      );
   }

   // Define Markdown-like inline decoration types 
   for (const pattern of markdownPatterns) {
      eState.decorationTypes.set(
         pattern.key,
         vscode.window.createTextEditorDecorationType({
            color: pattern.color,
            fontWeight: pattern.fontWeight ?? 'normal',
            fontStyle: pattern.fontStyle ?? 'normal'
         })
      );
   }
} //^ initializeDecorationTypes()


function scheduleUpdate(eState: ExtensionState) {
   // here we clear any existing schedules
   clearTimeout(eState.updateTimer);
   /// ad new one with a delay. [*debouncing*]
   eState.updateTimer = setTimeout(() => updateDecorations(eState), 150);
}

// 
function isDoxygenComment(commentText: string): boolean {
   const trimmed = commentText.trim();
   const startsWith = (tag: string) => trimmed.startsWith(tag);
   ///`some()` = returns true if one item satisfies condition
   return doxygenTags.some(startsWith);;
}

/* 
   Returns true if the comment text (after the comment token) starts with
   one of the styled-comment symbols, meaning markdown patterns are allowed. 
*/
function hasStyledSymbol(commentText: string): boolean {
   const trimmedTxt = commentText.trimStart();
   const startsWithSymbol = /^[^a-zA-Z0-9\s]/.test(trimmedTxt);
   return (trimmedTxt.length > 0 && startsWithSymbol);
}

function updateDecorations(eState: ExtensionState) {
   const editor = vscode.window.activeTextEditor;

   if (!editor || !eState.isEnabled) {
      return;
   }
   const document = editor.document;

   /* Ignore Markdown entirely */
   if (document.languageId === 'markdown') {
      return;
   }

   const syntax = commentSyntaxByLanguage[document.languageId];
   if (!syntax) {
      return;
   }

   eState.decorationTypes.forEach(d => editor.setDecorations(d, []));

   const ranges = new Map<string, vscode.Range[]>();
   commentStyles.forEach(s => ranges.set(s.symbol, []));
   markdownPatterns.forEach(p => ranges.set(p.key, []));

   let inBlockComment = false;
   let inDoxygenBlock = false;
   let activeBlockEnd: string | null = null;

   for (let lineNum = 0; lineNum < document.lineCount; lineNum++) {
      const line = document.lineAt(lineNum);
      const text = line.text;

      let commentText: string | null = null;
      let commentStart = -1;

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

      /* ----- BLOCK COMMENTS ----- */
      if (syntax.block) {
         if (!inBlockComment) {
            for (const blockSyntax of syntax.block) {
               if (text.includes(blockSyntax.start)) {
                  const blockStartIdx = text.indexOf(blockSyntax.start);
                  const afterStart = text.slice(blockStartIdx + blockSyntax.start.length);
                  if (afterStart.startsWith('*') || afterStart.startsWith('!')) {
                     inDoxygenBlock = true;
                  }
                  inBlockComment = true;
                  activeBlockEnd = blockSyntax.end;
                  commentStart = blockStartIdx + blockSyntax.start.length;
                  break;
               }
            }
         }

         if (inBlockComment && activeBlockEnd) {
            if (inDoxygenBlock) {
               if (text.includes(activeBlockEnd)) {
                  inBlockComment = false;
                  inDoxygenBlock = false;
                  activeBlockEnd = null;
                  commentStart = -1;
               }
               continue;
            }

            if (commentStart === -1) {
               commentStart = 0;
            }

            commentText = text.slice(commentStart);

            if (text.includes(activeBlockEnd)) {
               inBlockComment = false;
               activeBlockEnd = null;
               commentStart = -1;
            }
         }
      }

      if (!commentText) {
         continue;
      }

      /* Ignore pure block comment end */
      if (syntax.block && syntax.block.some(b => text.trim() === b.end)) {
         continue;
      }

      /* ----- STYLED SYMBOL RANGES ----- */
      for (const style of commentStyles) {
         if (style.symbol === 'TODO:') {
            const idx = commentText.toUpperCase().indexOf('TODO:');
            if (idx !== -1 && commentStart >= 0) {
               ranges.get(style.symbol)?.push(
                  new vscode.Range(
                     new vscode.Position(lineNum, commentStart + idx),
                     new vscode.Position(lineNum, commentStart + idx + 5)
                  )
               );
            }
         } else if (commentText.trimStart().startsWith(style.symbol)) {
            const startPos = commentStart >= 0 ? commentStart : 0;

            if (eState.markdownHighlightsEnabled) {
               // Collect all md match spans on this line
               const mdSpans: { start: number; end: number }[] = [];
               for (const pattern of markdownPatterns) {
                  pattern.regex.lastIndex = 0;
                  let m: RegExpExecArray | null;
                  while ((m = pattern.regex.exec(commentText)) !== null) {
                     mdSpans.push({
                        start: startPos + m.index,
                        end: startPos + m.index + m[0].length
                     });
                  }
               }
               mdSpans.sort((a, b) => a.start - b.start);

               // Fill gaps between md spans with the symbol color
               let cursor = startPos;
               for (const span of mdSpans) {
                  if (cursor < span.start) {
                     ranges.get(style.symbol)?.push(new vscode.Range(
                        new vscode.Position(lineNum, cursor),
                        new vscode.Position(lineNum, span.start)
                     ));
                  }
                  cursor = span.end;
               }
               if (cursor < text.length) {
                  ranges.get(style.symbol)?.push(new vscode.Range(
                     new vscode.Position(lineNum, cursor),
                     new vscode.Position(lineNum, text.length)
                  ));
               }
            } else {
               // md highlights off — just color the whole line
               ranges.get(style.symbol)?.push(new vscode.Range(
                  new vscode.Position(lineNum, startPos),
                  new vscode.Position(lineNum, text.length)
               ));
            }
         }
      }

      /* ----- MARKDOWN-LIKE INLINE RANGES ----- */
      if (eState.markdownHighlightsEnabled && hasStyledSymbol(commentText)) {
         const baseOffset = commentStart >= 0 ? commentStart : 0;

         for (const pattern of markdownPatterns) {
            pattern.regex.lastIndex = 0;
            let match: RegExpExecArray | null;

            while ((match = pattern.regex.exec(commentText)) !== null) {
               let start: number;
               let end: number;

               if (pattern.key === 'md_bold') {
                  start = baseOffset + match.index + 2;
                  end = baseOffset + match.index + match[0].length - 2;
               } else if (pattern.key === 'md_italic') {
                  start = baseOffset + match.index + 1;
                  end = baseOffset + match.index + match[0].length - 1;
               } else {
                  // md_code: color the whole `stuff` including backticks
                  start = baseOffset + match.index;
                  end = baseOffset + match.index + match[0].length;
               }

               ranges.get(pattern.key)?.push(
                  new vscode.Range(
                     new vscode.Position(lineNum, start),
                     new vscode.Position(lineNum, end)
                  )
               );
            }
         }
      }
   }

   ranges.forEach((r, key) => {
      const deco = eState.decorationTypes.get(key);

      if (deco && r.length) {
         editor.setDecorations(deco, r);
      }
   });
}

function clearDecorations(eState: ExtensionState) {
   const editor = vscode.window.activeTextEditor;

   if (!editor) {
      return;
   }
   eState.decorationTypes.forEach(val => editor.setDecorations(val, []));
}

export function deactivate() { }

