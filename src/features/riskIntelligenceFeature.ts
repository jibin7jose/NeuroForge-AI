import * as vscode from 'vscode';
import { DefaultWorkspaceAnalyzer } from '../analysis/workspaceAnalyzer';
import { NeuroScoreEngine } from '../scoring/neuroScoreEngine';
import { GutterRiskHeatmapRenderer } from '../ui/riskHeatmapRenderer';
import { StatusBarNeuroScorePresenter } from '../ui/neuroScorePresenter';

export class RiskIntelligenceFeature implements vscode.Disposable {
    private readonly analyzer = new DefaultWorkspaceAnalyzer();
    private readonly scorer = new NeuroScoreEngine();
    private readonly heatmap = new GutterRiskHeatmapRenderer();
    private readonly scorePresenter = new StatusBarNeuroScorePresenter();
    private enabled = true;
    private lastCoverageStatus?: string;

    public register(context: vscode.ExtensionContext): void {
        context.subscriptions.push(
            this.scorePresenter,
            vscode.commands.registerCommand('neuroforge.refreshRiskHeatmap', async () => {
                await this.refresh();
            }),
            vscode.commands.registerCommand('neuroforge.toggleRiskHeatmap', () => {
                this.toggle();
            }),
            vscode.commands.registerCommand('neuroforge.selectCoverageFile', async () => {
                await this.selectCoverageFile();
            }),
            vscode.window.onDidChangeActiveTextEditor(async () => {
                if (this.enabled) {
                    await this.refresh();
                }
            })
        );
    }

    public dispose(): void {
        this.heatmap.clear();
        this.scorePresenter.dispose();
    }

    private async refresh(): Promise<void> {
        if (!this.enabled) {
            return;
        }

        const workspaceFolder = this.getWorkspaceFolder();
        if (!workspaceFolder) {
            this.scorePresenter.reset();
            this.heatmap.clear();
            return;
        }

        const snapshot = await this.analyzer.analyze({
            workspaceFolder,
            editor: vscode.window.activeTextEditor
        });
        this.reportCoverageStatus(snapshot);
        const score = this.scorer.calculate(snapshot);
        this.scorePresenter.present(score);
        this.heatmap.render(snapshot);
    }

    private toggle(): void {
        this.enabled = !this.enabled;

        if (!this.enabled) {
            this.heatmap.clear();
            this.scorePresenter.reset();
            vscode.window.showInformationMessage('NeuroForge risk heatmap disabled.');
            return;
        }

        vscode.window.showInformationMessage('NeuroForge risk heatmap enabled.');
        void this.refresh();
    }

    private getWorkspaceFolder(): vscode.WorkspaceFolder | undefined {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            return vscode.workspace.getWorkspaceFolder(editor.document.uri);
        }
        return vscode.workspace.workspaceFolders?.[0];
    }

    private reportCoverageStatus(snapshot: { coverageStatus?: string; coverageSource?: string; coverageError?: string }): void {
        const status = snapshot.coverageStatus ?? 'ok';
        if (status === 'ok') {
            this.lastCoverageStatus = 'ok';
            return;
        }

        const message = status === 'missing'
            ? 'NeuroForge: coverage file not found. Run tests with coverage to render the heatmap.'
            : `NeuroForge: ${snapshot.coverageError ?? 'Failed to load coverage.'}`;

        if (this.lastCoverageStatus !== message) {
            vscode.window.setStatusBarMessage(message, 5000);
            this.lastCoverageStatus = message;
        }
    }

    private async selectCoverageFile(): Promise<void> {
        const workspaceFolder = this.getWorkspaceFolder();
        if (!workspaceFolder) {
            vscode.window.showWarningMessage('Open a workspace to select coverage.');
            return;
        }

        const selection = await vscode.window.showOpenDialog({
            title: 'Select coverage JSON (coverage-final.json)',
            canSelectMany: false,
            filters: { 'Coverage JSON': ['json'] }
        });

        if (!selection || selection.length === 0) {
            return;
        }

        const chosen = selection[0].fsPath;
        const config = vscode.workspace.getConfiguration('neuroforge', workspaceFolder.uri);
        await config.update('coverageFile', chosen, vscode.ConfigurationTarget.Workspace);
        vscode.window.showInformationMessage(`NeuroForge: coverage file set to ${chosen}`);
        await this.refresh();
    }
}
