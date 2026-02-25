"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const riskIntelligenceFeature_1 = require("./features/riskIntelligenceFeature");
const DEFAULT_AI_ENGINE_URL = 'http://127.0.0.1:8000';
function getAiEngineUrl() {
    const configured = vscode.workspace.getConfiguration('neuroforge').get('aiEngineUrl');
    const envUrl = process.env.NEUROFORGE_AI_URL;
    return (configured || envUrl || DEFAULT_AI_ENGINE_URL).replace(/\/+$/, '');
}
function toErrorMessage(err) {
    if (err instanceof Error)
        return err.message;
    return String(err);
}
function getInterviewLoadingHtml() {
    return `
    <!DOCTYPE html><html><head><style>
        body { background: #02040a; color: #c9d1d9; display: flex; align-items: center; justify-content: center; height: 100vh; font-family: sans-serif; }
        .pulse { width: 60px; height: 60px; border-radius: 50%; background: #2f81f7; animation: pulse 1.2s infinite ease-in-out; margin: 0 auto 20px; }
        @keyframes pulse { 0%,100%{transform:scale(1);opacity:1} 50%{transform:scale(1.4);opacity:0.5} }
        .text { text-align: center; }
    </style></head><body>
        <div class="text"><div class="pulse"></div><p>NeuroForge is analyzing your code...</p><p style="color:#8b949e;font-size:12px;">Generating elite interview questions</p></div>
    </body></html>`;
}
function getInterviewHtml(questions) {
    const questionItems = questions.map((q, i) => `
        <div class="question-block" id="q${i}" data-question="${q.replace(/"/g, '&quot;')}">
            <div class="q-num">Q${i + 1} <span class="q-badge">Neural Challenge</span></div>
            <div class="q-text">${q}</div>
            <textarea class="answer-box" id="ans${i}" placeholder="Type your architectural answer here..."></textarea>
            <button class="submit-btn" onclick="submitAnswer(${i})">$(send) Submit to Neural Evaluator</button>
            <div class="feedback-box" id="fb${i}" style="display:none;"></div>
        </div>`).join('');
    return `
    <!DOCTYPE html><html lang="en">
    <head><meta charset="UTF-8">
    <style>
        * { box-sizing: border-box; }
        body { background: #010409; color: #e6edf3; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; padding: 30px; max-width: 800px; margin: 0 auto; line-height: 1.6; }
        h1 { font-size: 20px; color: #2f81f7; border-bottom: 1px solid #21262d; padding-bottom: 12px; margin-bottom: 28px; letter-spacing: -0.5px; }
        .header-sub { font-size: 12px; color: #8b949e; margin-top: -20px; margin-bottom: 28px; }
        .question-block { background: #0d1117; border: 1px solid #30363d; border-radius: 12px; padding: 24px; margin-bottom: 24px; }
        .q-num { font-size: 11px; color: #8b949e; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px; }
        .q-badge { background: #21262d; border: 1px solid #30363d; color: #bc8cff; padding: 2px 8px; border-radius: 10px; font-size: 9px; margin-left: 8px; }
        .q-text { font-size: 16px; font-weight: 600; color: #e6edf3; margin-bottom: 16px; }
        .answer-box { width: 100%; background: #161b22; color: #e6edf3; border: 1px solid #30363d; border-radius: 8px; padding: 12px; font-size: 13px; font-family: inherit; resize: vertical; min-height: 100px; outline: none; transition: border-color 0.2s; }
        .answer-box:focus { border-color: #2f81f7; }
        .submit-btn { background: #238636; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; margin-top: 12px; font-size: 13px; font-weight: 600; transition: background 0.15s; }
        .submit-btn:hover { background: #2ea043; }
        .submit-btn:disabled { background: #21262d; color: #8b949e; cursor: not-allowed; }
        .feedback-box { margin-top: 16px; padding: 16px; border-radius: 8px; border: 1px solid #30363d; }
        .fb-score { font-size: 28px; font-weight: 700; }
        .fb-status { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px; }
        .fb-critique { font-size: 13px; color: #c9d1d9; }
        .status-Elite { color: #3fb950; }
        .status-Strong { color: #58a6ff; }
        .status-Acceptable { color: #e3b341; }
        .status-Needs { color: #f85149; }
        .status-Critical { color: #da3633; }
        .score-bar-bg { background: #21262d; height: 4px; border-radius: 2px; margin: 8px 0; }
        .score-bar-fill { height: 100%; border-radius: 2px; background: linear-gradient(90deg, #2f81f7, #3fb950); transition: width 1s; }
    </style></head>
    <body>
        <h1>⚡ NeuroForge Elite Interview Mode</h1>
        <p class="header-sub">Questions are generated from a deep analysis of your code's architecture, security posture, and behavioral patterns. Answer as you would in a Staff-level engineering interview.</p>
        ${questionItems}
        <script>
            const vscode = acquireVsCodeApi();
            function submitAnswer(idx) {
                const qEl = document.getElementById('q' + idx);
                const question = qEl.dataset.question;
                const answer = document.getElementById('ans' + idx).value.trim();
                if (!answer) return;
                const btn = qEl.querySelector('button');
                btn.disabled = true;
                btn.textContent = 'Evaluating...';
                vscode.postMessage({ command: 'submitAnswer', question, answer });
            }
            window.addEventListener('message', (event) => {
                const msg = event.data;
                if (msg.command === 'feedback') {
                    const fb = msg.data;
                    // Find the button that was last clicked
                    const btns = document.querySelectorAll('.submit-btn');
                    btns.forEach((btn, idx) => {
                        if (btn.disabled && btn.textContent === 'Evaluating...') {
                            btn.textContent = '✓ Evaluated';
                            const fbBox = document.getElementById('fb' + idx);
                            const statusKey = (fb.status || 'Strong').split(' ')[0];
                            fbBox.innerHTML = \`
                                <div class="fb-status status-\${statusKey}">\${fb.status || 'Strong'}</div>
                                <div class="fb-score">\${fb.score}<span style="font-size:16px;color:#8b949e;">/100</span></div>
                                <div class="score-bar-bg"><div class="score-bar-fill" style="width:\${fb.score}%"></div></div>
                                <div class="fb-critique">\${fb.critique || ''}</div>
                            \`;
                            fbBox.style.display = 'block';
                        }
                    });
                }
            });
        </script>
    </body></html>`;
}
class NeuralCodeLensProvider {
    constructor() {
        this._onDidChangeCodeLenses = new vscode.EventEmitter();
        this.onDidChangeCodeLenses = this._onDidChangeCodeLenses.event;
        this.lastScore = null;
    }
    setScore(score) {
        this.lastScore = score;
        this._onDidChangeCodeLenses.fire();
    }
    provideCodeLenses(document) {
        const lenses = [];
        const topRange = new vscode.Range(0, 0, 0, 0);
        lenses.push(new vscode.CodeLens(topRange, {
            title: "$(zap) Analyze",
            command: "neuroforge.analyzeFile",
            tooltip: "Run NeuroForge deep analysis on this file"
        }));
        lenses.push(new vscode.CodeLens(topRange, {
            title: "$(comment-discussion) Explain",
            command: "neuroforge.explainCode",
            tooltip: "Get an architectural explanation of this code"
        }));
        lenses.push(new vscode.CodeLens(topRange, {
            title: "$(mortar-board) Interview Mode",
            command: "neuroforge.interviewMode",
            tooltip: "Start an elite AI-powered interview session"
        }));
        if (this.lastScore !== null) {
            const color = this.lastScore >= 80 ? '🟢' : this.lastScore >= 50 ? '🟡' : '🔴';
            lenses.push(new vscode.CodeLens(topRange, {
                title: `${color} Score: ${this.lastScore}%`,
                command: ""
            }));
        }
        return lenses;
    }
}
class NeuralSidebarProvider {
    constructor(_extensionUri) {
        this._extensionUri = _extensionUri;
    }
    resolveWebviewView(webviewView, context, _token) {
        this._view = webviewView;
        webviewView.webview.options = { enableScripts: true };
        webviewView.webview.onDidReceiveMessage(data => {
            switch (data.command) {
                case 'analyze':
                    vscode.commands.executeCommand('neuroforge.analyzeFile');
                    break;
                case 'dna':
                    vscode.commands.executeCommand('neuroforge.showNeuralDNA');
                    break;
                case 'explain':
                    vscode.commands.executeCommand('neuroforge.explainCode');
                    break;
            }
        });
        this.updateView();
    }
    updateView(data) {
        if (!this._view)
            return;
        this._view.webview.html = this._getHtmlForWebview(data);
    }
    _getHtmlForWebview(data) {
        const score = data?.metrics?.clean_code_score ?? '---';
        const weaknesses = data?.weaknesses || [];
        const dominantTrait = data?.behavior?.dominant_trait || 'Run Analysis to Begin';
        const skills = data?.skills || [];
        const perfIndex = data?.behavior?.performance_index ?? 0;
        const scoreColor = score === '---' ? '#8b949e'
            : score >= 80 ? '#3fb950'
                : score >= 50 ? '#e3b341'
                    : '#f85149';
        const issuesHtml = weaknesses.slice(0, 4).map((w) => `
            <div class="issue ${w.risk === 'High' ? 'high' : 'med'}">
                <div class="issue-label">${w.risk}</div>
                <div class="issue-title">${w.label}</div>
            </div>`).join('');
        const skillsHtml = skills.length
            ? skills.map((s) => `<span class="skill-tag">${s}</span>`).join('')
            : '<span style="color:#8b949e;font-size:11px;">Run analysis to detect skills...</span>';
        return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <style>
                    * { box-sizing: border-box; }
                    body { background: transparent; color: #e6edf3; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; padding: 12px; margin: 0; }
                    .card { background: rgba(255,255,255,0.04); border-radius: 8px; padding: 14px; margin-bottom: 10px; border: 1px solid rgba(255,255,255,0.08); }
                    .score-ring { font-size: 38px; font-weight: 700; color: ${scoreColor}; text-align: center; line-height: 1; padding: 10px 0 5px; }
                    .score-sub { font-size: 10px; color: #8b949e; text-align: center; letter-spacing: 1px; text-transform: uppercase; }
                    .label { font-size: 9px; color: #8b949e; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 5px; }
                    .trait { color: #bc8cff; font-weight: 600; font-size: 13px; margin-top: 3px; }
                    .perf { float: right; font-size: 12px; color: #3fb950; font-weight: bold; }
                    .issue { border-left: 2px solid #f85149; padding: 5px 8px; margin-top: 8px; font-size: 11px; border-radius: 0 4px 4px 0; background: rgba(248,81,73,0.07); }
                    .issue.med { border-color: #e3b341; background: rgba(227,179,65,0.07); }
                    .issue-label { font-size: 9px; text-transform: uppercase; letter-spacing: 1px; color: #8b949e; }
                    .issue-title { font-weight: 600; margin-top: 1px; }
                    .skill-tag { background: rgba(47,129,247,0.15); border: 1px solid rgba(47,129,247,0.3); color: #58a6ff; padding: 2px 8px; border-radius: 10px; font-size: 10px; display: inline-block; margin: 2px; }
                    .btn { background: #238636; color: white; border: none; padding: 7px 10px; width: 100%; border-radius: 4px; cursor: pointer; margin-top: 6px; font-size: 12px; font-weight: 600; transition: background 0.15s; }
                    .btn:hover { background: #2ea043; }
                    .btn-ghost { background: rgba(255,255,255,0.06); }
                    .btn-ghost:hover { background: rgba(255,255,255,0.12); }
                    .divider { border: none; border-top: 1px solid rgba(255,255,255,0.08); margin: 8px 0; }
                </style>
            </head>
            <body>
                <div class="card">
                    <div class="perf">${perfIndex}% PX</div>
                    <div class="score-ring">${score}${score !== '---' ? '' : ''}</div>
                    <div class="score-sub">Intelligence Score</div>
                    <hr class="divider">
                    <div class="label">Neural Archetype</div>
                    <div class="trait">${dominantTrait}</div>
                </div>

                <div class="card">
                    <div class="label">Hotspots — ${weaknesses.length} issue${weaknesses.length !== 1 ? 's' : ''}</div>
                    ${issuesHtml || '<div style="color:#8b949e;font-size:11px;margin-top:6px;">No critical issues detected</div>'}
                    ${weaknesses.length > 4 ? `<div style="font-size:10px;color:#8b949e;margin-top:6px;">+ ${weaknesses.length - 4} more</div>` : ''}
                </div>

                <div class="card">
                    <div class="label">Detected Skills</div>
                    <div style="margin-top: 6px;">${skillsHtml}</div>
                </div>

                <button class="btn" id="btn-analyze">$(zap) Re-Analyze File</button>
                <button class="btn btn-ghost" id="btn-dna">$(beaker) Digital Twin DNA</button>
                <button class="btn btn-ghost" id="btn-explain">$(comment-discussion) Explain This Code</button>

                <script>
                    const vscode = acquireVsCodeApi();
                    document.getElementById('btn-analyze').addEventListener('click', () => vscode.postMessage({ command: 'analyze' }));
                    document.getElementById('btn-dna').addEventListener('click', () => vscode.postMessage({ command: 'dna' }));
                    document.getElementById('btn-explain').addEventListener('click', () => vscode.postMessage({ command: 'explain' }));
                </script>
            </body>
            </html>
        `;
    }
}
NeuralSidebarProvider.viewType = 'neuroforge.sidebar';
class NeuralChatProvider {
    constructor(_extensionUri) {
        this._extensionUri = _extensionUri;
    }
    resolveWebviewView(webviewView, context, _token) {
        this._view = webviewView;
        webviewView.webview.options = { enableScripts: true };
        webviewView.webview.onDidReceiveMessage(async (data) => {
            if (data.command === 'sendMessage') {
                const editor = vscode.window.activeTextEditor;
                if (!editor) {
                    this._view?.webview.postMessage({ command: 'receiveMessage', text: 'Please open a file to start chatting.', sender: 'ai' });
                    return;
                }
                const code = editor.document.getText();
                const language = editor.document.languageId;
                // Show loading
                this._view?.webview.postMessage({ command: 'loading' });
                try {
                    const fetchFn = (typeof globalThis.fetch === 'function') ? globalThis.fetch : null;
                    if (!fetchFn)
                        throw new Error("Fetch API unavailable.");
                    const res = await fetchFn(`${getAiEngineUrl()}/chat`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ message: data.text, code, language }),
                    });
                    const responseData = await res.json();
                    if (responseData.status === 'success') {
                        this._view?.webview.postMessage({ command: 'receiveMessage', text: responseData.response, sender: 'ai' });
                    }
                    else {
                        this._view?.webview.postMessage({ command: 'receiveMessage', text: `Error: ${responseData.message}`, sender: 'ai' });
                    }
                }
                catch (err) {
                    this._view?.webview.postMessage({ command: 'receiveMessage', text: `Failed to connect to Neural Engine: ${err.message}`, sender: 'ai' });
                }
            }
        });
        this._view.webview.html = this._getHtmlForWebview();
    }
    _getHtmlForWebview() {
        return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <style>
                    body { background: #02040a; color: #e6edf3; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; padding: 16px; display: flex; flex-direction: column; height: 100vh; box-sizing: border-box; }
                    #chat-box { flex-grow: 1; overflow-y: auto; padding-bottom: 20px; display: flex; flex-direction: column; gap: 12px; }
                    .message { padding: 10px 14px; border-radius: 8px; max-width: 90%; font-size: 13px; line-height: 1.5; word-break: break-word; }
                    .msg-ai { background: #0d1117; border: 1px solid #30363d; align-self: flex-start; color: #c9d1d9; }
                    .msg-human { background: #2f81f7; color: #ffffff; align-self: flex-end; }
                    .input-area { margin-top: auto; display: flex; gap: 8px; padding-top: 10px; border-top: 1px solid #30363d; }
                    .input-box { flex-grow: 1; background: #0d1117; color: #c9d1d9; border: 1px solid #30363d; border-radius: 4px; padding: 8px 12px; font-size: 13px; outline: none; }
                    .input-box:focus { border-color: #2f81f7; }
                    .send-btn { background: #238636; color: white; border: none; padding: 8px 14px; border-radius: 4px; cursor: pointer; font-size: 13px; }
                    pre { background: #161b22; padding: 12px; border-radius: 6px; overflow-x: auto; border: 1px solid #30363d; }
                    code { font-family: "JetBrains Mono", monospace; }
                    .loading { font-size: 12px; color: #8b949e; align-self: flex-start; display: none; }
                </style>
                <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
            </head>
            <body>
                <div id="chat-box">
                    <div class="message msg-ai">Hello. I am NeuroForge Copilot. Ask me anything about your active code file.</div>
                </div>
                <div class="loading" id="loading-indicator">Synthesizing...</div>
                <div class="input-area">
                    <input type="text" id="chat-input" class="input-box" placeholder="Ask NeuroForge..." />
                    <button id="send-btn" class="send-btn">Send</button>
                </div>
                <script>
                    const vscode = acquireVsCodeApi();
                    const chatBox = document.getElementById('chat-box');
                    const chatInput = document.getElementById('chat-input');
                    const sendBtn = document.getElementById('send-btn');
                    const loadingIndicator = document.getElementById('loading-indicator');

                    function addMessage(text, sender) {
                        const msgDiv = document.createElement('div');
                        msgDiv.className = 'message ' + (sender === 'ai' ? 'msg-ai' : 'msg-human');
                        if (sender === 'ai') {
                            msgDiv.innerHTML = marked.parse(text);
                        } else {
                            msgDiv.textContent = text;
                        }
                        chatBox.appendChild(msgDiv);
                        chatBox.scrollTop = chatBox.scrollHeight;
                    }

                    function sendMessage() {
                        const text = chatInput.value.trim();
                        if (!text) return;
                        addMessage(text, 'human');
                        vscode.postMessage({ command: 'sendMessage', text });
                        chatInput.value = '';
                    }

                    sendBtn.addEventListener('click', sendMessage);
                    chatInput.addEventListener('keypress', (e) => {
                        if (e.key === 'Enter') sendMessage();
                    });

                    window.addEventListener('message', event => {
                        const msg = event.data;
                        if (msg.command === 'receiveMessage') {
                            loadingIndicator.style.display = 'none';
                            addMessage(msg.text, msg.sender);
                        } else if (msg.command === 'loading') {
                            loadingIndicator.style.display = 'block';
                            chatBox.scrollTop = chatBox.scrollHeight;
                        }
                    });
                </script>
            </body>
            </html>
        `;
    }
}
NeuralChatProvider.viewType = 'neuroforge.chat';
async function activate(context) {
    const output = vscode.window.createOutputChannel('NeuroForge');
    const diagnosticCollection = vscode.languages.createDiagnosticCollection('neuroforge');
    const lensProvider = new NeuralCodeLensProvider();
    const riskIntelligence = new riskIntelligenceFeature_1.RiskIntelligenceFeature();
    const currentDiagnostics = [];
    // --- DECORATION STYLES ---
    const criticalSecurityDecoration = vscode.window.createTextEditorDecorationType({
        backgroundColor: 'rgba(218, 54, 51, 0.2)', // Glowing red background
        isWholeLine: true,
        border: '1px solid rgba(218, 54, 51, 0.6)',
        overviewRulerColor: 'rgba(218, 54, 51, 0.8)',
        overviewRulerLane: vscode.OverviewRulerLane.Right,
        after: {
            contentText: ' ⚠️ NEURAL SECURITY VULNERABILITY',
            color: 'rgba(218, 54, 51, 0.8)',
            margin: '0 0 0 10px',
            fontStyle: 'italic',
            fontWeight: 'bold'
        }
    });
    const highSecurityDecoration = vscode.window.createTextEditorDecorationType({
        backgroundColor: 'rgba(227, 179, 65, 0.15)', // Glowing yellow background
        isWholeLine: true,
        overviewRulerColor: 'rgba(227, 179, 65, 0.8)',
        overviewRulerLane: vscode.OverviewRulerLane.Right,
    });
    const sidebarProvider = new NeuralSidebarProvider(context.extensionUri);
    context.subscriptions.push(vscode.window.registerWebviewViewProvider(NeuralSidebarProvider.viewType, sidebarProvider));
    riskIntelligence.register(context);
    context.subscriptions.push(riskIntelligence);
    // --- Status Bar: NeuroForge Quick Access ---
    const analyzeBtn = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 1000);
    analyzeBtn.text = `$(zap) NeuroForge`;
    analyzeBtn.tooltip = 'Run NeuroForge Deep Analysis on active file';
    analyzeBtn.command = 'neuroforge.analyzeFile';
    analyzeBtn.backgroundColor = new vscode.ThemeColor('statusBarItem.prominentBackground');
    analyzeBtn.show();
    // --- Typing Time Tracking ---
    let typingTimer = null;
    let isTyping = false;
    let activeTypingTimeMs = 0;
    const timeTrackerBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    timeTrackerBar.text = `$(watch) NeuroForge Time: 0s`;
    timeTrackerBar.tooltip = "Total active neural development time tracked by NeuroForge";
    timeTrackerBar.show();
    const typingDisposable = vscode.workspace.onDidChangeTextDocument(() => {
        if (!isTyping)
            isTyping = true;
        if (typingTimer)
            clearTimeout(typingTimer);
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
        if (typeof globalThis.fetch === 'function')
            return globalThis.fetch;
        throw new Error('Fetch API not available in this environment.');
    };
    const checkHealth = async () => {
        const fetchFn = getFetch();
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 4000);
        const engineUrl = getAiEngineUrl();
        try {
            const res = await fetchFn(`${engineUrl}/health`, { signal: controller.signal });
            clearTimeout(timeout);
            if (!res.ok)
                throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            vscode.window.showInformationMessage(`NeuroForge engine: ${data.status ?? 'online'} · ML: ${data.ml_available ? 'on' : 'off'} · Uptime: ${data.uptime_seconds ?? 0}s`);
        }
        catch (e) {
            const msg = toErrorMessage(e);
            output.appendLine(`[ERROR] Engine health check failed at ${engineUrl}/health`);
            output.appendLine(`[ERROR] ${msg}`);
            vscode.window.showErrorMessage(`NeuroForge engine unreachable at ${engineUrl}: ${msg}`);
        }
    };
    // --- Auto-Analyze on Save ---
    const autoAnalyzeDisposable = vscode.workspace.onDidSaveTextDocument((doc) => {
        const supportedLangs = ['python', 'javascript', 'typescript', 'javascriptreact', 'typescriptreact'];
        if (supportedLangs.includes(doc.languageId)) {
            const editor = vscode.window.activeTextEditor;
            if (editor && editor.document.uri.toString() === doc.uri.toString()) {
                vscode.commands.executeCommand('neuroforge.analyzeFile');
            }
        }
    });
    // --- COMMAND: Analyze File ---
    const analyzeDisposable = vscode.commands.registerCommand('neuroforge.analyzeFile', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor)
            return;
        const doc = editor.document;
        const code = doc.getText();
        if (!code.trim())
            return;
        const language = doc.languageId;
        const status = vscode.window.setStatusBarMessage('$(sync~spin) NeuroForge deep-learning analysis in progress...');
        const fetchFn = getFetch();
        const engineUrl = getAiEngineUrl();
        try {
            output.appendLine(`NeuroForge Request: Analyzing ${doc.fileName}...`);
            output.show(true);
            const res = await fetchFn(`${engineUrl}/analyze`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code, language, history: [] }),
            });
            if (!res.ok)
                throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            const metrics = data.metrics || {};
            const cleanCodeScore = metrics.clean_code_score ?? 100;
            lensProvider.setScore(cleanCodeScore);
            output.appendLine('\n--- NeuroForge Analysis Report ---');
            const weaknesses = data.weaknesses || [];
            weaknesses.forEach((w) => {
                output.appendLine(`[!] ${w.area} (${w.risk}): ${w.label} - ${w.message}`);
            });
            const suggestions = data.recommendations || data.suggestions || [];
            suggestions.forEach((s) => {
                output.appendLine(`[*] ${typeof s === 'string' ? s : (s.detail || s.title)}`);
            });
            diagnosticCollection.clear();
            const diagnostics = [];
            weaknesses.forEach((w) => {
                const range = new vscode.Range(0, 0, 0, doc.lineAt(0).range.end.character);
                const diagnostic = new vscode.Diagnostic(range, `[NeuroForge] ${w.area}: ${w.message}`, w.risk === 'High' ? vscode.DiagnosticSeverity.Error : vscode.DiagnosticSeverity.Warning);
                diagnostic.source = 'NeuroForge';
                diagnostics.push(diagnostic);
            });
            suggestions.forEach((s, idx) => {
                const line = Math.min(idx, doc.lineCount - 1);
                const range = doc.lineAt(line).range;
                const msg = typeof s === 'string' ? s : (s.detail || s.title);
                const diag = new vscode.Diagnostic(range, `[NeuroForge Suggestion] ${msg}`, vscode.DiagnosticSeverity.Information);
                diag.source = 'NeuroForge';
                diagnostics.push(diag);
            });
            diagnosticCollection.set(doc.uri, diagnostics);
            // --- Apply Security Decorations ---
            const secVulnerabilities = data.security?.vulnerabilities || [];
            if (secVulnerabilities.length > 0 && editor) {
                const codeLines = code.split('\n');
                const criticalRanges = [];
                const highRanges = [];
                secVulnerabilities.forEach((v) => {
                    // Primitive matching logic for MVP visual appeal
                    let matchedLine = 0;
                    if (v.type.includes('Injection')) {
                        matchedLine = codeLines.findIndex(l => l.includes('execute') || l.includes('system'));
                    }
                    else if (v.type.includes('Key Exposure')) {
                        matchedLine = codeLines.findIndex(l => l.includes('BEGIN') && l.includes('KEY'));
                    }
                    else if (v.type.includes('Leak') || v.type.includes('Secret')) {
                        matchedLine = codeLines.findIndex(l => l.includes('secret') || l.includes('password') || l.includes('api_key') || l.includes('://'));
                    }
                    if (matchedLine !== -1 && matchedLine >= 0) {
                        const range = doc.lineAt(matchedLine).range;
                        if (v.severity === 'Critical') {
                            criticalRanges.push(range);
                        }
                        else {
                            highRanges.push(range);
                        }
                    }
                });
                editor.setDecorations(criticalSecurityDecoration, criticalRanges);
                editor.setDecorations(highSecurityDecoration, highRanges);
            }
            sidebarProvider.updateView(data);
            vscode.window.showInformationMessage(`NeuroForge: ${weaknesses.length} potential issues identified.`);
        }
        catch (err) {
            const msg = toErrorMessage(err);
            output.appendLine(`[ERROR] Analysis failed at ${engineUrl}/analyze`);
            output.appendLine(`[ERROR] ${msg}`);
            output.appendLine(`[HINT] Start AI engine: cd ai-engine && python main.py`);
            output.appendLine(`[HINT] Or set VS Code setting neuroforge.aiEngineUrl if engine runs elsewhere.`);
            vscode.window.showErrorMessage(`NeuroForge analysis failed: ${msg}`);
        }
        finally {
            status.dispose();
        }
    });
    // --- COMMAND: Apply Neural Fix ---
    const applyFixDisposable = vscode.commands.registerCommand('neuroforge.applyFix', async (diagnostic) => {
        const editor = vscode.window.activeTextEditor;
        if (!editor)
            return;
        const doc = editor.document;
        const code = doc.getText();
        const fetchFn = getFetch();
        // Identify strategy
        let strategyId = 'refactor-entropy-reduction';
        if (diagnostic.message.includes('boundary') || diagnostic.message.includes('security'))
            strategyId = 'refactor-security-rigidity';
        if (diagnostic.message.includes('loop') || diagnostic.message.includes('nest'))
            strategyId = 'refactor-entropy-reduction';
        vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "NeuroForge: Computing Neural Patch Preview...",
            cancellable: false
        }, async () => {
            try {
                // Step 1: Get preview diff
                const previewRes = await fetchFn(`${getAiEngineUrl()}/refactor/preview`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ code, language: doc.languageId, strategy_id: strategyId }),
                });
                const preview = await previewRes.json();
                if (preview.status === 'no_change') {
                    vscode.window.showInformationMessage('NeuroForge: No structural changes needed for this patch.');
                    return;
                }
                if (preview.status !== 'success') {
                    vscode.window.showWarningMessage(`Preview failed: ${preview.message || 'Unknown error'}`);
                    return;
                }
                // Step 2: Ask user to confirm
                const linesChanged = preview.lines_changed ?? 0;
                const confirm = await vscode.window.showInformationMessage(`Neural Patch Preview: ${linesChanged} line${linesChanged !== 1 ? 's' : ''} will change. Apply?`, { modal: false }, 'Apply Patch', 'Cancel');
                if (confirm !== 'Apply Patch')
                    return;
                // Step 3: Apply the actual patch
                const res = await fetchFn(`${getAiEngineUrl()}/refactor/apply`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ code, language: doc.languageId, strategy_id: strategyId }),
                });
                const result = await res.json();
                if (result.status === 'success' && result.refactored) {
                    const edit = new vscode.WorkspaceEdit();
                    edit.replace(doc.uri, new vscode.Range(0, 0, doc.lineCount, 0), result.refactored);
                    await vscode.workspace.applyEdit(edit);
                    vscode.window.showInformationMessage(`✓ Neural Patch applied — ${linesChanged} lines transformed.`);
                    vscode.commands.executeCommand('neuroforge.analyzeFile');
                }
                else {
                    vscode.window.showErrorMessage(`Patch failed: ${result.message || 'Unknown error'}`);
                }
            }
            catch (e) {
                vscode.window.showErrorMessage(`Neural link synthesis failed: ${e.message}`);
            }
        });
    });
    const codeActionProvider = vscode.languages.registerCodeActionsProvider(['javascript', 'typescript', 'python'], {
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
    });
    // --- COMMAND: Explain Code ---
    const explainDisposable = vscode.commands.registerCommand('neuroforge.explainCode', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor)
            return;
        const selection = editor.selection;
        const code = selection.isEmpty ? editor.document.getText() : editor.document.getText(selection);
        const fetchFn = getFetch();
        const panel = vscode.window.createWebviewPanel('neuroforgeExplain', 'NeuroForge: Neural Explanation', vscode.ViewColumn.Beside, { enableScripts: true });
        panel.webview.html = `
            <body style="background: #0d1117; color: #c9d1d9; font-family: sans-serif; padding: 20px;">
                <h1 style="color: #58a6ff;">$(sparkle) Neural Synthesis...</h1>
            </body>
        `;
        try {
            const res = await fetchFn(`${getAiEngineUrl()}/explain`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code, language: editor.document.languageId }),
            });
            const data = await res.json();
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
            }
            else {
                panel.webview.html = `<body>Error: ${data.message}</body>`;
            }
        }
        catch (e) {
            panel.webview.html = `<body>Connection failed to AI Engine.</body>`;
        }
    });
    // --- COMMAND: Show Neural DNA ---
    const dnaDisposable = vscode.commands.registerCommand('neuroforge.showNeuralDNA', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor)
            return;
        const code = editor.document.getText();
        const fetchFn = getFetch();
        const panel = vscode.window.createWebviewPanel('neuroforgeDNA', 'NeuroForge: Digital Twin DNA', vscode.ViewColumn.Two, { enableScripts: true });
        try {
            const res = await fetchFn(`${getAiEngineUrl()}/analyze/dna`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code, language: editor.document.languageId }),
            });
            const data = await res.json();
            if (data.status === 'success') {
                const dna = data.dna;
                const behavior = data.behavior || {};
                const traits = behavior.traits || [];
                panel.webview.html = `
                    <style>
                        body { background: #010409; color: #e6edf3; font-family: "Segoe UI", Roboto, Helvetica, Arial, sans-serif; padding: 30px; }
                        .container { max-width: 600px; margin: 0 auto; }
                        .dna-card { background: #0d1117; border: 1px solid #30363d; border-radius: 12px; padding: 24px; margin-bottom: 24px; }
                        .dna-stat { margin-bottom: 20px; }
                        .dna-label { font-size: 10px; color: #8b949e; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 4px; }
                        .dna-value { font-size: 16px; color: #58a6ff; font-weight: 600; }
                        .dna-bar-bg { background: #161b22; height: 4px; border-radius: 2px; margin-top: 8px; }
                        .dna-bar-fill { background: linear-gradient(90deg, #2f81f7, #bc8cff); height: 100%; border-radius: 2px; }
                        h1 { font-size: 16px; border-bottom: 1px solid #30363d; padding-bottom: 12px; margin-bottom: 24px; color: #bc8cff; display: flex; align-items: center; gap: 8px; font-weight: 400; }
                        .trait-tag { background: #161b22; border: 1px solid #30363d; color: #d0d7de; padding: 4px 12px; border-radius: 20px; font-size: 12px; display: inline-block; margin: 4px; }
                        .profile-header { display: flex; align-items: flex-end; justify-content: space-between; margin-bottom: 24px; }
                        .performance-ring { font-size: 24px; color: #3fb950; font-weight: bold; }
                    </style>
                    <body>
                        <div class="container">
                            <div class="profile-header">
                                <h1>$(dna) NEURAL_SYSTEM_DNA</h1>
                                <div class="performance-ring">${behavior.performance_index || 0}% PX</div>
                            </div>
                            
                            <div class="dna-card">
                                <div class="dna-stat">
                                    <div class="dna-label">Primary Behavioral Archetype</div>
                                    <div class="dna-value" style="color: #aff5b4;">${behavior.dominant_trait || 'Neural Core'}</div>
                                </div>
                                <div class="dna-stat">
                                    <div class="dna-label">Architecture Preference</div>
                                    <div class="dna-value">${dna.architecture_bias}</div>
                                </div>
                            </div>

                            <div class="dna-card">
                                <div class="dna-label">Cognitive Load & Efficiency</div>
                                <div class="dna-stat">
                                    <div style="display: flex; justify-content: space-between; font-size: 12px; margin-top: 10px;">
                                        <span>Optimization</span><span>${dna.optimization_score}%</span>
                                    </div>
                                    <div class="dna-bar-bg"><div class="dna-bar-fill" style="width: ${dna.optimization_score}%"></div></div>
                                </div>
                                <div class="dna-stat">
                                    <div style="display: flex; justify-content: space-between; font-size: 12px;">
                                        <span>Logic Discipline</span><span>${dna.discipline_index}%</span>
                                    </div>
                                    <div class="dna-bar-bg"><div class="dna-bar-fill" style="width: ${dna.discipline_index}%"></div></div>
                                </div>
                                <div class="dna-stat">
                                    <div style="display: flex; justify-content: space-between; font-size: 12px;">
                                        <span>Neural Maturity</span><span>${dna.maturity_score}%</span>
                                    </div>
                                    <div class="dna-bar-bg"><div class="dna-bar-fill" style="width: ${dna.maturity_score}%"></div></div>
                                </div>
                            </div>

                            <div style="margin-top: 20px;">
                                <div class="dna-label">Detected Intellectual Traits</div>
                                <div style="margin-top: 10px;">
                                    ${traits.map((t) => `<span class="trait-tag">${t}</span>`).join('')}
                                    <span class="trait-tag" style="border-color: #238636; color: #3fb950;">Neural sync active</span>
                                </div>
                            </div>
                        </div>
                    </body>
                `;
            }
        }
        catch (e) {
            panel.webview.html = `<body>Logic link failed. Environment unstable.</body>`;
        }
    });
    // --- COMMAND: Interview Mode ---
    const interviewDisposable = vscode.commands.registerCommand('neuroforge.interviewMode', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showWarningMessage('Open a file to start Interview Mode.');
            return;
        }
        const code = editor.document.getText();
        const language = editor.document.languageId;
        const fetchFn = getFetch();
        const panel = vscode.window.createWebviewPanel('neuroforgeInterview', 'NeuroForge: Elite Interview Mode', vscode.ViewColumn.One, { enableScripts: true, retainContextWhenHidden: true });
        panel.webview.html = getInterviewLoadingHtml();
        try {
            // Run full analysis to get context
            const analysisRes = await fetchFn(`${getAiEngineUrl()}/analyze`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code, language, history: [] }),
            });
            const analysisData = await analysisRes.json();
            const questions = analysisData?.interview_readiness?.suggested_questions || [
                'How would you improve the architecture of this code?',
                'What security concerns do you see in this codebase?',
                'How would you scale this code for 10x traffic?',
            ];
            panel.webview.html = getInterviewHtml(questions);
            panel.webview.onDidReceiveMessage(async (msg) => {
                if (msg.command === 'submitAnswer') {
                    const { question, answer } = msg;
                    try {
                        const fbRes = await fetchFn(`${getAiEngineUrl()}/interview/feedback`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ question, answer }),
                        });
                        const fb = await fbRes.json();
                        panel.webview.postMessage({ command: 'feedback', data: fb });
                    }
                    catch (e) {
                        panel.webview.postMessage({ command: 'feedback', data: { score: 50, status: 'Acceptable', critique: 'Neural bridge unstable. Evaluation incomplete.' } });
                    }
                }
            });
        }
        catch (e) {
            panel.webview.html = `<body style="background:#02040a;color:#e6edf3;padding:30px;">Failed to start Interview Mode: ${e.message}</body>`;
        }
    });
    // --- COMMAND: Analyze Workspace (per-file diagnostics) ---
    const workspaceDisposable = vscode.commands.registerCommand('neuroforge.analyzeWorkspace', async () => {
        if (!vscode.workspace.workspaceFolders) {
            vscode.window.showWarningMessage('No workspace open.');
            return;
        }
        const fetchFn = getFetch();
        output.show(true);
        output.appendLine('\n━━━ NeuroForge Workspace Scan ━━━');
        const files = await vscode.workspace.findFiles('**/*.{ts,tsx,js,jsx,py}', '**/node_modules/**', 40);
        const fileResults = [];
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: `NeuroForge: Scanning ${files.length} files...`,
            cancellable: false
        }, async (progress) => {
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                progress.report({ message: `${i + 1}/${files.length}: ${file.path.split('/').pop()}`, increment: 100 / files.length });
                try {
                    const doc = await vscode.workspace.openTextDocument(file);
                    const code = doc.getText();
                    if (!code.trim() || code.length > 60000)
                        continue;
                    const res = await fetchFn(`${getAiEngineUrl()}/analyze`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ code, language: doc.languageId, history: [] }),
                    });
                    const data = await res.json();
                    const weaknesses = data.weaknesses || [];
                    const score = data.metrics?.clean_code_score ?? 100;
                    fileResults.push({ path: file.fsPath, score, issues: weaknesses.length });
                    // Apply per-file diagnostics
                    if (weaknesses.length > 0) {
                        const diags = weaknesses.map((w) => {
                            const r = new vscode.Range(0, 0, 0, doc.lineAt(0).range.end.character);
                            const d = new vscode.Diagnostic(r, `[NeuroForge] ${w.area}: ${w.message}`, w.risk === 'High' ? vscode.DiagnosticSeverity.Error : vscode.DiagnosticSeverity.Warning);
                            d.source = 'NeuroForge';
                            return d;
                        });
                        diagnosticCollection.set(file, diags);
                        output.appendLine(`  [!] ${file.path.split('/').pop()} — Score: ${score}%  Issues: ${weaknesses.length}`);
                    }
                    else {
                        output.appendLine(`  [✓] ${file.path.split('/').pop()} — Score: ${score}%  Clean`);
                    }
                }
                catch { /* skip file */ }
            }
        });
        const avgScore = fileResults.length
            ? Math.round(fileResults.reduce((a, b) => a + b.score, 0) / fileResults.length)
            : 0;
        const totalIssues = fileResults.reduce((a, b) => a + b.issues, 0);
        output.appendLine(`\n━━━ Workspace Report ━━━`);
        output.appendLine(`  Files Scanned : ${fileResults.length}`);
        output.appendLine(`  Avg Score     : ${avgScore}%`);
        output.appendLine(`  Total Issues  : ${totalIssues}`);
        vscode.window.showInformationMessage(`Workspace scan complete. ${fileResults.length} files — Avg score: ${avgScore}% — ${totalIssues} issue${totalIssues !== 1 ? 's' : ''}.`);
    });
    // --- COMMAND: Neural Heatmap ---
    const heatmapDisposable = vscode.commands.registerCommand('neuroforge.showHeatmap', async () => {
        const fetchFn = getFetch();
        const files = await vscode.workspace.findFiles('**/*.{ts,tsx,js,jsx,py}', '**/node_modules/**', 30);
        const panel = vscode.window.createWebviewPanel('neuroforgeHeatmap', 'NeuroForge: Neural Complexity Heatmap', vscode.ViewColumn.Two, { enableScripts: true });
        panel.webview.html = `<body style="background:#02040a;color:#e6edf3;padding:30px;font-family:sans-serif;"><p>🔥 Scanning workspace for complexity hotspots...</p></body>`;
        const fileData = [];
        for (const file of files) {
            try {
                const doc = await vscode.workspace.openTextDocument(file);
                const code = doc.getText();
                if (!code.trim() || code.length > 50000)
                    continue;
                const res = await fetchFn(`${getAiEngineUrl()}/analyze`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ code, language: doc.languageId, history: [] }),
                });
                const data = await res.json();
                fileData.push({
                    name: file.path.split('/').pop() || file.path,
                    score: data.metrics?.clean_code_score ?? 100,
                    issues: (data.weaknesses || []).length,
                    complexity: data.metrics?.logic_complexity ?? 0
                });
            }
            catch { /* skip */ }
        }
        fileData.sort((a, b) => a.score - b.score); // Worst first
        const cellsHtml = fileData.map(f => {
            const heat = Math.max(0, 100 - f.score);
            const r = Math.round(heat * 2.4);
            const g = Math.round((100 - heat) * 2.0);
            const bg = `rgb(${r},${g},30)`;
            return `<div class="cell" style="background:${bg};" title="${f.name} | Score: ${f.score}% | Issues: ${f.issues} | Complexity: ${f.complexity}">
                <div class="cell-name">${f.name}</div>
                <div class="cell-score">${f.score}%</div>
                ${f.issues > 0 ? `<div class="cell-badge">${f.issues}</div>` : ''}
            </div>`;
        }).join('');
        panel.webview.html = `
            <!DOCTYPE html><html><head><meta charset="UTF-8">
            <style>
                body { background: #010409; color: #e6edf3; font-family: -apple-system,"Segoe UI",sans-serif; padding: 20px; }
                h1 { font-size: 18px; color: #2f81f7; border-bottom: 1px solid #21262d; padding-bottom: 10px; }
                .legend { display: flex; gap: 8px; align-items: center; margin-bottom: 20px; font-size: 11px; color: #8b949e; }
                .legend-bar { height: 8px; width: 120px; background: linear-gradient(90deg, rgb(0,200,30), rgb(255,100,30), rgb(240,10,30)); border-radius: 4px; }
                .grid { display: flex; flex-wrap: wrap; gap: 8px; }
                .cell { border-radius: 8px; padding: 12px; width: 140px; min-height: 70px; position: relative; cursor: default; transition: transform 0.1s; border: 1px solid rgba(255,255,255,0.1); }
                .cell:hover { transform: scale(1.03); }
                .cell-name { font-size: 11px; font-weight: 600; word-break: break-all; margin-bottom: 4px; color: rgba(255,255,255,0.9); }
                .cell-score { font-size: 20px; font-weight: 700; color: white; }
                .cell-badge { position: absolute; top: 8px; right: 8px; background: rgba(0,0,0,0.5); border-radius: 10px; padding: 2px 6px; font-size: 10px; font-weight: bold; }
                .empty { color: #8b949e; font-size: 14px; }
            </style></head>
            <body>
                <h1>🔥 Neural Complexity Heatmap</h1>
                <div class="legend">
                    <span>High Quality</span>
                    <div class="legend-bar"></div>
                    <span>Critical Debt</span>
                    &nbsp;|&nbsp; <b>${fileData.length}</b> files scanned
                </div>
                <div class="grid">
                    ${cellsHtml || '<p class="empty">No files found to analyze.</p>'}
                </div>
            </body></html>`;
    });
    // --- COMMAND: Generate Tests ---
    const generateTestsDisposable = vscode.commands.registerCommand('neuroforge.generateTests', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor || !editor.document.getText().trim())
            return;
        const doc = editor.document;
        const code = doc.getText();
        const fetchFn = getFetch();
        vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "NeuroForge: Generating Unit Tests...",
            cancellable: false
        }, async () => {
            try {
                const res = await fetchFn(`${getAiEngineUrl()}/generate/tests`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ code, language: doc.languageId, history: [] }),
                });
                const data = await res.json();
                if (data.status === 'success' && data.tests) {
                    const newDoc = await vscode.workspace.openTextDocument({ content: data.tests, language: doc.languageId });
                    await vscode.window.showTextDocument(newDoc);
                    vscode.window.showInformationMessage("Neural Tests Generated!");
                }
                else {
                    vscode.window.showErrorMessage(`Failed to generate tests: ${data.message || 'Unknown error'}`);
                }
            }
            catch (e) {
                vscode.window.showErrorMessage(`Neural link failed: ${e.message}`);
            }
        });
    });
    // --- COMMAND: Generate Docs ---
    const generateDocsDisposable = vscode.commands.registerCommand('neuroforge.generateDocs', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor || !editor.document.getText().trim())
            return;
        const doc = editor.document;
        const code = doc.getText();
        const fetchFn = getFetch();
        vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "NeuroForge: Synthesizing Documentation...",
            cancellable: false
        }, async () => {
            try {
                const res = await fetchFn(`${getAiEngineUrl()}/generate/docs`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ code, language: doc.languageId, history: [] }),
                });
                const data = await res.json();
                if (data.status === 'success' && data.documented_code) {
                    const edit = new vscode.WorkspaceEdit();
                    edit.replace(doc.uri, new vscode.Range(0, 0, doc.lineCount, 0), data.documented_code);
                    await vscode.workspace.applyEdit(edit);
                    vscode.window.showInformationMessage("Neural Documentation injected!");
                }
                else {
                    vscode.window.showErrorMessage(`Failed to generate docs: ${data.message || 'Unknown error'}`);
                }
            }
            catch (e) {
                vscode.window.showErrorMessage(`Neural link failed: ${e.message}`);
            }
        });
    });
    // --- EXPERIMENTAL: Neural Autocomplete (Ghost Text) ---
    const autocompleteProvider = vscode.languages.registerInlineCompletionItemProvider(['python', 'javascript', 'typescript', 'javascriptreact', 'typescriptreact'], {
        async provideInlineCompletionItems(document, position, context, token) {
            // Determine context boundaries
            const prefixRange = new vscode.Range(new vscode.Position(0, 0), position);
            const suffixRange = new vscode.Range(position, new vscode.Position(document.lineCount, 0));
            const prefix = document.getText(prefixRange);
            const suffix = document.getText(suffixRange);
            if (prefix.trim().length < 5)
                return [];
            try {
                const fetchFn = getFetch();
                const res = await fetchFn(`${getAiEngineUrl()}/autocomplete`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        prefix,
                        suffix,
                        language: document.languageId
                    }),
                });
                if (token.isCancellationRequested)
                    return [];
                const data = await res.json();
                if (data.status === 'success' && data.completion) {
                    return [new vscode.InlineCompletionItem(data.completion, new vscode.Range(position, position))];
                }
            }
            catch (e) {
                // Fail silently for autocomplete so we don't spam the user
            }
            return [];
        }
    });
    context.subscriptions.push(analyzeDisposable, explainDisposable, dnaDisposable, applyFixDisposable, codeActionProvider, vscode.languages.registerCodeLensProvider(['javascript', 'typescript', 'python'], lensProvider), analyzeBtn, timeTrackerBar, typingDisposable, autoAnalyzeDisposable, interviewDisposable, workspaceDisposable, heatmapDisposable, generateTestsDisposable, generateDocsDisposable, autocompleteProvider);
    context.subscriptions.push(vscode.commands.registerCommand('neuroforge.healthCheck', checkHealth));
}
function deactivate() { }
