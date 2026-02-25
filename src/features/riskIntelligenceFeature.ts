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

    public register(context: vscode.ExtensionContext): void {
        context.subscriptions.push(
            this.scorePresenter,
            vscode.commands.registerCommand('neuroforge.refreshRiskHeatmap', async () => {
                await this.refresh();
            }),
            vscode.commands.registerCommand('neuroforge.toggleRiskHeatmap', () => {
                this.toggle();
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
}
