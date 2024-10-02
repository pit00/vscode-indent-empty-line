import * as vscode from "vscode";
import { Mutex } from "async-mutex";
import { Position } from "vscode";

export declare let previous_line_number_from_click: number | undefined;
export declare let lock: Mutex;

export function deactivate() {}
export function activate(context: vscode.ExtensionContext) {
    // Because we use await in our async functions, we need a mutex/lock to
    // prevent concurrent executions of any of our movement commands.
    // If we did not do so, then any fast key repeats cause bugs due to some
    // executions of our function invalidating the working assumptions of others
    // that are executing concurrently. Using a lock lets us not worry about that.
    if (!lock) {
        lock = new Mutex();
    }

    const name = `indent-empty-line.trigger`;
    const disposable = vscode.commands.registerCommand(name, async () => {
        // Get the cursor's current line and check if it is empty.
        const editor = vscode.window.activeTextEditor!;
        const cursorPos = editor.selection.start;
        const cursorLine = cursorPos.line;
        await executePrevIndent(editor, cursorPos, cursorLine);
    });
    context.subscriptions.push(disposable);
}

async function executePrevIndent(
    editor: vscode.TextEditor,
    cursorPos: Position,
    cursorLine: number
) {
    // First, wait to acquire the lock before doing anything.
    const releaseLock = await lock.acquire();
    try {
        let cursorLineText = editor.document.lineAt(cursorLine).text;
        
        // Find the prev line that is not empty or whitespace-only.
        let prevLine = cursorLine;
        var prevLineText;
        try {
            prevLineText = editor.document.lineAt(prevLine - 1).text;
            while (/\S/.test(prevLineText) === false) {
                prevLine = prevLine - 1;
                prevLineText = editor.document.lineAt(prevLine).text;
            }
        } catch (e) {
            prevLineText = "";
        }
        const prevLineIndent = prevLineText.match(/^\s*/)![0]!;
        
        // Figure out the indentation level of that prev line, and copy it here to the cursor line.
        if (cursorLineText === "") {
            editor.edit((edit) => {
                edit.insert(cursorPos, prevLineIndent);
            });
        }
        else{
            let spaces = cursorLineText.match(/^\s*/)![0]
            editor.edit((edit) => {
                edit.replace(new vscode.Range(cursorPos.line, 0, cursorPos.line, spaces.length), prevLineIndent)
            });
        }
        
    } finally {
        // Always release the lock at the end of this block.
        releaseLock();
    }
}

async function executeNextIndent(
    editor: vscode.TextEditor,
    cursorPos: Position,
    cursorLine: number
) {
    // First, wait to acquire the lock before doing anything.
    const releaseLock = await lock.acquire();
    try {
        let cursorLineText = editor.document.lineAt(cursorLine).text;
        if (cursorLineText === "") {
            // Find the next line that is not empty or whitespace-only.
            let nextLine = cursorLine;
            var nextLineText;
            try {
                nextLineText = editor.document.lineAt(nextLine).text;
                while (/\S/.test(nextLineText) === false) {
                    nextLine = nextLine + 1;
                    nextLineText = editor.document.lineAt(nextLine).text;
                }
            } catch (e) {
                nextLineText = "";
            }
            
            // Figure out the indentation level of that next line,
            // and copy it here to the cursor line.
            const nextLineIndent = nextLineText.match(/^\s*/)![0]!;
            editor.edit((edit) => {
                edit.insert(cursorPos, nextLineIndent);
            });
        }
    } finally {
        // Always release the lock at the end of this block.
        releaseLock();
    }
}
