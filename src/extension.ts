import * as vscode from 'vscode';

const AI_ENGINE_URL = process.env.NEUROFORGE_AI_URL || 'http://localhost:8000';

class NeuralCodeLensProvider implements vscode.CodeLensProvider {
    private _onDidChangeCodeLenses: vscode.EventEmitter<void> = new vscode.EventEmitter<void>();
    public readonly onDidChangeCodeLenses: vscode.Event<void> = this._onDidChangeCodeLenses.event;

    private lastScore: number | null = null;

    public setScore(score: number) {
        this.lastScore = score;
        this._onDidChangeCodeLenses.fire();
    }

    provideCodeLenses(document: vscode.TextDocument): vscode.CodeLens[] {
        const lenses: vscode.CodeLens[] = [];
        const topRange = new vscode.Range(0, 0, 0, 0);

        lenses.push(new vscode.CodeLens(topRange, {
            title: "$(zap) NeuroForge: Run Deep Analysis",
            command: "neuroforge.analyzeFile"
        }));

        if (this.lastScore !== null) {
            lenses.push(new vscode.CodeLens(topRange, {
                title: `$(verified) Intelligence Score: ${this.lastScore}%`,
                command: ""
            }));
        }

        return lenses;
    }
}

export async function activate(context: vscode.ExtensionContext) {
    const output = vscode.window.createOutputChannel('NeuroForge');
    const diagnosticCollection = vscode.languages.createDiagnosticCollection('neuroforge');
    const lensProvider = new NeuralCodeLensProvider();

    // --- Typing Time Tracking ---
    let typingTimer: NodeJS.Timeout | null = null;
    let isTyping = false;
    let activeTypingTimeMs = 0;
    const timeTrackerBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    timeTrackerBar.text = `$(watch) NeuroForge Time: 0s`;
    timeTrackerBar.tooltip = "Total active neural development time tracked by NeuroForge";
    timeTrackerBar.show();

    const typingDisposable = vscode.workspace.onDidChangeTextDocument(() => {
        if (!isTyping) isTyping = true;
        if (typingTimer) clearTimeout(typingTimer);
        typingTimer = setTimeout(() => { isTyping = false; }, 1500);
    });

    const typingInterval = setInterval(() => {
        if (isTyping) {
            activeTypingTimeMs += 1000;
            const seconds = Math.floor(activeTypingTimeMs / 1000);
            const minutes = Math.floor(seconds / 60);
            const remainSeconds = seconds % 60;
            timeTrackerBar.text = `$(watch) NeuroForge Time: ${minutes > 0 ? minutes + 'm ' : ''}${remainSeconds}s`;
        }
    }, 1000);

    const getFetch = () => {
        if (typeof (globalThis as any).fetch === 'function') return (globalThis as any).fetch as typeof fetch;
        throw new Error('Fetch API not available in this environment.');
    };

    // --- COMMAND: Analyze File ---
    const analyzeDisposable = vscode.commands.registerCommand('neuroforge.analyzeFile', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) return;

        const doc = editor.document;
        const code = doc.getText();
        if (!code.trim()) return;

        const language = doc.languageId;
        const status = vscode.window.setStatusBarMessage('$(sync~spin) NeuroForge deep-learning analysis in progress...');
        const fetchFn = getFetch();

        try {
            output.appendLine(`NeuroForge Request: Analyzing ${doc.fileName}...`);
            output.show(true);

            const res = await fetchFn(`${AI_ENGINE_URL}/analyze`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code, language, history: [] }),
            });

            if (!res.ok) throw new Error(`HTTP ${res.status}`);

            const data: any = await res.json();
            const metrics = data.metrics || {};
            const cleanCodeScore = metrics.clean_code_score ?? 100;

            lensProvider.setScore(cleanCodeScore);

            output.appendLine('\n--- NeuroForge Analysis Report ---');
            const weaknesses = data.weaknesses || [];
            weaknesses.forEach((w: any) => {
                output.appendLine(`[!] ${w.area} (${w.risk}): ${w.label} - ${w.message}`);
            });

            const suggestions = data.recommendations || data.suggestions || [];
            suggestions.forEach((s: any) => {
                output.appendLine(`[*] ${typeof s === 'string' ? s : (s.detail || s.title)}`);
            });

            diagnosticCollection.clear();
            const diagnostics: vscode.Diagnostic[] = [];

            weaknesses.forEach((w: any) => {
                const range = new vscode.Range(0, 0, 0, doc.lineAt(0).range.end.character);
                const diagnostic = new vscode.Diagnostic(
                    range,
                    `[NeuroForge] ${w.area}: ${w.message}`,
                    w.risk === 'High' ? vscode.DiagnosticSeverity.Error : vscode.DiagnosticSeverity.Warning
                );
                diagnostic.source = 'NeuroForge';
                diagnostics.push(diagnostic);
            });

            suggestions.forEach((s: any, idx: number) => {
                const line = Math.min(idx, doc.lineCount - 1);
                const range = doc.lineAt(line).range;
                const msg = typeof s === 'string' ? s : (s.detail || s.title);
                const diag = new vscode.Diagnostic(range, `[NeuroForge Suggestion] ${msg}`, vscode.DiagnosticSeverity.Information);
                diag.source = 'NeuroForge';
                diagnostics.push(diag);
            });

            diagnosticCollection.set(doc.uri, diagnostics);
            vscode.window.showInformationMessage(`NeuroForge: ${weaknesses.length} potential issues identified.`);

        } catch (err: any) {
            output.appendLine(`[ERROR] ${err.message}`);
        } finally {
            status.dispose();
        }
    });

    // --- COMMAND: Apply Neural Fix ---
    const applyFixDisposable = vscode.commands.registerCommand('neuroforge.applyFix', async (diagnostic: vscode.Diagnostic) => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) return;

        const doc = editor.document;
        const code = doc.getText();
        const fetchFn = getFetch();

        // Identify strategy
        let strategyId = 'refactor-entropy-reduction';
        if (diagnostic.message.includes('boundary')) strategyId = 'refactor-security-rigidity';
        if (diagnostic.message.includes('loop')) strategyId = 'refactor-entropy-reduction';

        vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "NeuroForge: Synthesizing Neural Patch...",
            cancellable: false
        }, async (progress) => {
            try {
                const res = await fetchFn(`${AI_ENGINE_URL}/refactor/apply`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ code, language: doc.languageId, strategy_id: strategyId }),
                });

                const result: any = await res.json();
                if (result.status === 'success' && result.refactored) {
                    const edit = new vscode.WorkspaceEdit();
                    edit.replace(doc.uri, new vscode.Range(0, 0, doc.lineCount, 0), result.refactored);
                    await vscode.workspace.applyEdit(edit);
                    vscode.window.showInformationMessage(`Neural Fix applied!`);
                    vscode.commands.executeCommand('neuroforge.analyzeFile');
                }
            } catch (e) {
                vscode.window.showErrorMessage("Neural link synthesis failed.");
            }
        });
    });

    const codeActionProvider = vscode.languages.registerCodeActionsProvider(
        ['javascript', 'typescript', 'python'],
        {
            provideCodeActions(document, range, context) {
                return context.diagnostics
                    .filter(d => d.source === 'NeuroForge')
                    .map(d => {
                        const a = new vscode.CodeAction('Resolve with NeuroForge AI', vscode.CodeActionKind.QuickFix);
                        a.command = { command: 'neuroforge.applyFix', title: 'Apply Fix', arguments: [d] };
                        a.diagnostics = [d];
                        a.isPreferred = true;
                        return a;
                    });
            }
        }
    );

    // --- COMMAND: Explain Code ---
    const explainDisposable = vscode.commands.registerCommand('neuroforge.explainCode', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) return;

        const selection = editor.selection;
        const code = selection.isEmpty ? editor.document.getText() : editor.document.getText(selection);
        const fetchFn = getFetch();

        const panel = vscode.window.createWebviewPanel(
            'neuroforgeExplain',
            'NeuroForge: Neural Explanation',
            vscode.ViewColumn.Beside,
            { enableScripts: true }
        );

        panel.webview.html = `
            <body style="background: #0d1117; color: #c9d1d9; font-family: sans-serif; padding: 20px;">
                <h1 style="color: #58a6ff;">$(sparkle) Neural Synthesis...</h1>
            </body>
        `;

        try {
            const res = await fetchFn(`${AI_ENGINE_URL}/explain`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code, language: editor.document.languageId }),
            });

            const data: any = await res.json();
            if (data.status === 'success') {
                // We would ideally use a markdown library here, but for simplicity:
                panel.webview.html = `
                    <style>
                        body { background: #02040a; color: #e6edf3; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif; line-height: 1.6; padding: 30px; }
                        h1, h2, h3 { color: #2f81f7; border-bottom: 1px solid #21262d; padding-bottom: 10px; }
                        code { background: #161b22; padding: 2px 4px; border-radius: 6px; }
                        pre { background: #161b22; padding: 16px; border-radius: 8px; overflow: auto; border: 1px solid #30363d; }
                        .badge { background: #238636; color: white; padding: 4px 8px; border-radius: 20px; font-size: 11px; font-weight: bold; text-transform: uppercase; }
                    </style>
                    <body>
                        <div style="margin-bottom: 20px;"><span class="badge">NeuroForge Prime Analysis</span></div>
                        ${data.explanation.replace(/\n/g, '<br>').replace(/```/g, '<pre>').replace(/`/g, '<code>')}
                    </body>
                `;
            } else {
                panel.webview.html = `<body>Error: ${data.message}</body>`;
            }
        } catch (e) {
            panel.webview.html = `<body>Connection failed to AI Engine.</body>`;
        }
    });

    context.subscriptions.push(
        analyzeDisposable,
        explainDisposable,
        applyFixDisposable,
        codeActionProvider,
        vscode.languages.registerCodeLensProvider(['javascript', 'typescript', 'python'], lensProvider),
        timeTrackerBar,
        typingDisposable
    );
}

export function deactivate() { }
