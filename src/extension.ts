import * as vscode from 'vscode';

const AI_ENGINE_URL = process.env.NEUROFORGE_AI_URL || 'http://localhost:8000';
let typingInterval: NodeJS.Timeout | null = null;

export async function activate(context: vscode.ExtensionContext) {
    const output = vscode.window.createOutputChannel('NeuroForge');
    const diagnosticCollection = vscode.languages.createDiagnosticCollection('neuroforge');

    // --- Typing Time Tracking ---
    let typingTimer: NodeJS.Timeout | null = null;
    let isTyping = false;
    let activeTypingTimeMs = 0;
    let typingInterval: NodeJS.Timeout | null = null;
    const timeTrackerBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    timeTrackerBar.text = `$(watch) NeuroForge Time: 0s`;
    timeTrackerBar.show();

    const typingDisposable = vscode.workspace.onDidChangeTextDocument(() => {
        if (!isTyping) {
            isTyping = true;
        }

        if (typingTimer) clearTimeout(typingTimer);

        typingTimer = setTimeout(() => {
            isTyping = false;
        }, 1500); // 1.5s pause means typing stopped
    });

    // Update the counter every second if typing
    typingInterval = setInterval(() => {
        if (isTyping) {
            activeTypingTimeMs += 1000;
            const seconds = Math.floor(activeTypingTimeMs / 1000);
            const minutes = Math.floor(seconds / 60);
            const remainSeconds = seconds % 60;
            timeTrackerBar.text = `$(watch) NeuroForge Time: ${minutes > 0 ? minutes + 'm ' : ''}${remainSeconds}s`;
        }
    }, 1000);
    // ----------------------------

    const getFetch = () => {
        if (typeof (globalThis as any).fetch === 'function') {
            return (globalThis as any).fetch as typeof fetch;
        }
        throw new Error('Fetch API not available in this environment.');
    };

    const disposable = vscode.commands.registerCommand('neuroforge.analyzeFile', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showWarningMessage('No active editor to analyze.');
            return;
        }

        const doc = editor.document;
        const code = doc.getText();
        if (!code.trim()) {
            vscode.window.showWarningMessage('Current file is empty; nothing to analyze.');
            return;
        }

        const language = doc.languageId || 'javascript';

        const status = vscode.window.setStatusBarMessage('$(sync~spin) NeuroForge analyzing code, weaknesses, and suggestions...');
        const fetchFn = getFetch();

        try {
            output.appendLine(`NeuroForge Request: Analyzing ${doc.fileName}...`);
            output.show(true);

            // POST directly to the AI Engine for full results
            const res = await fetchFn(`${AI_ENGINE_URL}/analyze`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code, language, history: [] }),
            });

            if (!res.ok) {
                const body = await res.text();
                throw new Error(`HTTP ${res.status}: ${body}`);
            }

            const data: any = await res.json();
            const metrics = data.metrics || {};
            const cleanCodeScore = metrics.clean_code_score ?? 'N/A';
            const logicComplexity = metrics.logic_complexity ?? 'N/A';
            const exceptionHandling = metrics.exception_handling ?? 'N/A';

            output.appendLine('\n--- NeuroForge Analysis Report ---');

            // 1. Weak Areas
            const weaknesses = data.weaknesses || [];
            if (weaknesses.length > 0) {
                output.appendLine(`\n[!] CRITICAL WEAK AREAS DETECTED:`);
                weaknesses.forEach((w: any) => {
                    output.appendLine(`  - ${w.area} (${w.risk} risk): ${w.label}`);
                    output.appendLine(`    > ${w.message}`);
                });
            } else {
                output.appendLine(`\n[+] No structural weak areas detected.`);
            }

            // 2. Suggestions
            const suggestions = data.recommendations || data.suggestions || [];
            if (suggestions.length > 0) {
                output.appendLine(`\n[*] INTELLIGENT SUGGESTIONS:`);
                suggestions.forEach((s: any) => {
                    output.appendLine(`  - ${typeof s === 'string' ? s : JSON.stringify(s)}`);
                });
            }

            // 3. Metrics
            if (data.metrics) {
                output.appendLine(`\n[~] CODEBASE METRICS:`);
                output.appendLine(`  - Clean Code Score: ${cleanCodeScore}${cleanCodeScore !== 'N/A' ? '%' : ''}`);
                output.appendLine(`  - Logic Complexity: ${logicComplexity}`);
                output.appendLine(`  - Exception Guards: ${exceptionHandling}`);
            }

            // 4. Time Analysis
            const totalSeconds = Math.floor(activeTypingTimeMs / 1000);
            output.appendLine(`\n[~] TYPING TIME ANALYSIS:`);
            output.appendLine(`  - Active Developer Time: ${totalSeconds} seconds.`);
            if (totalSeconds > 0 && logicComplexity !== 'N/A' && typeof logicComplexity === 'number') {
                const complexityRatio = (logicComplexity || 1) / totalSeconds;
                output.appendLine(`  - Complexity Generated per Second: ${complexityRatio.toFixed(3)}`);
            }

            // --- INLINE DIAGNOSTICS ---
            diagnosticCollection.clear();
            const diagnostics: vscode.Diagnostic[] = [];

            // Map weaknesses to the first line (or full file context) so the dev sees it visually
            if (weaknesses.length > 0) {
                weaknesses.forEach((w: any) => {
                    const range = new vscode.Range(new vscode.Position(0, 0), doc.lineAt(0).range.end);
                    const diagnostic = new vscode.Diagnostic(
                        range,
                        `[NeuroForge Weakness] ${w.area}: ${w.message}`,
                        w.risk === 'High' ? vscode.DiagnosticSeverity.Error : vscode.DiagnosticSeverity.Warning
                    );
                    diagnostic.source = 'NeuroForge';
                    diagnostics.push(diagnostic);
                });
            }

            // Map intelligent suggestions as Info/Hint squiggles
            if (suggestions.length > 0) {
                suggestions.forEach((s: any, index: number) => {
                    // Spread them slightly down the first few lines if possible, or just line 0
                    const line = Math.min(index, doc.lineCount > 0 ? doc.lineCount - 1 : 0);
                    const lineRange = doc.lineAt(line).range;
                    const range = new vscode.Range(new vscode.Position(line, 0), lineRange.end);
                    const diagnostic = new vscode.Diagnostic(
                        range,
                        `[NeuroForge Suggestion] ${typeof s === 'string' ? s : JSON.stringify(s)}`,
                        vscode.DiagnosticSeverity.Information
                    );
                    diagnostic.source = 'NeuroForge';
                    diagnostics.push(diagnostic);
                });
            }

            // Push all diagnostics to the current document mapped by URI
            diagnosticCollection.set(doc.uri, diagnostics);
            // --------------------------

            vscode.window.showInformationMessage('NeuroForge visual analysis complete! Check the Output panel and inline warnings.');

        } catch (err: any) {
            output.appendLine(`\n[ERROR] Analysis failed: ${err.message || err}`);
            vscode.window.showErrorMessage(`NeuroForge analysis failed. See Output panel.`);
        } finally {
            status.dispose();
        }
    });

    const workspaceDisposable = vscode.commands.registerCommand('neuroforge.analyzeWorkspace', async () => {
        if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length === 0) {
            vscode.window.showWarningMessage('No active workspace found to analyze.');
            return;
        }

        const fetchFn = getFetch();
        const status = vscode.window.setStatusBarMessage('$(sync~spin) NeuroForge mapping entire workspace...');
        output.show(true);
        output.appendLine(`NeuroForge Request: Scanning Entire Workspace...`);

        try {
            // Find all valid code files in the workspace (up to a limit to prevent memory issues)
            const files = await vscode.workspace.findFiles('**/*.{ts,tsx,js,jsx,py,cs,cpp,h,hpp,rs}', '**/node_modules/**', 100);
            if (files.length === 0) {
                vscode.window.showInformationMessage('No supported code files found in the workspace.');
                return;
            }

            let combinedCode = '';
            for (const file of files) {
                const doc = await vscode.workspace.openTextDocument(file);
                const code = doc.getText();
                combinedCode += `\n// File: ${file.fsPath}\n` + code;

                if (combinedCode.length > 300000) {
                    combinedCode = combinedCode.substring(0, 300000); // 300kb safe hard-limit for AI Engine
                    break;
                }
            }

            output.appendLine(`Sending ${files.length} context files to AI Engine...`);

            // Send concatenated workspace content to AI Engine
            const res = await fetchFn(`${AI_ENGINE_URL}/analyze`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code: combinedCode, language: 'javascript', history: [] }),
            });

            if (!res.ok) {
                const body = await res.text();
                throw new Error(`HTTP ${res.status}: ${body}`);
            }

            const data: any = await res.json();

            output.appendLine('\n--- NeuroForge Full Workspace Report ---');

            // 1. Weak Areas
            const weaknesses = data.weaknesses || [];
            if (weaknesses.length > 0) {
                output.appendLine(`\n[!] CRITICAL WEAK AREAS IN WORKSPACE:`);
                weaknesses.forEach((w: any) => {
                    output.appendLine(`  - ${w.area} (${w.risk} risk): ${w.label}`);
                    output.appendLine(`    > ${w.message}`);
                });
            } else {
                output.appendLine(`\n[+] Workspace structural integrity is optimal.`);
            }

            // 2. Suggestions
            const suggestions = data.recommendations || data.suggestions || [];
            if (suggestions.length > 0) {
                output.appendLine(`\n[*] INTELLIGENT WORKSPACE SUGGESTIONS:`);
                suggestions.forEach((s: any) => {
                    output.appendLine(`  - ${typeof s === 'string' ? s : JSON.stringify(s)}`);
                });
            }

            // 3. Metrics
            if (data.metrics) {
                const globalMetrics = data.metrics || {};
                const projectScore = globalMetrics.clean_code_score ?? 'N/A';
                output.appendLine(`\n[~] GLOBAL METRICS:`);
                output.appendLine(`  - Core Project Clean Code Score: ${projectScore}${projectScore !== 'N/A' ? '%' : ''}`);
            }

            vscode.window.showInformationMessage('NeuroForge visual workspace analysis complete! Check Output panel.');

        } catch (err: any) {
            output.appendLine(`\n[ERROR] Workspace analysis failed: ${err.message || err}`);
            vscode.window.showErrorMessage(`NeuroForge Workspace analysis failed.`);
        } finally {
            status.dispose();
        }
    });

    context.subscriptions.push(disposable, workspaceDisposable, timeTrackerBar, typingDisposable);
}

export function deactivate() {
    if (typingInterval) {
        clearInterval(typingInterval);
    }
}
