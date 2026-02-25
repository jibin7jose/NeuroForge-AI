import * as vscode from 'vscode';
import { NeuroScorePresenter, NeuroScoreResult } from '../core/contracts';

export class StatusBarNeuroScorePresenter implements NeuroScorePresenter, vscode.Disposable {
    private readonly statusBar: vscode.StatusBarItem;

    constructor() {
        this.statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 90);
        this.statusBar.name = 'NeuroScore';
        this.statusBar.command = 'neuroforge.refreshRiskHeatmap';
        this.statusBar.tooltip = 'NeuroForge NeuroScore (click to refresh heatmap)';
        this.statusBar.show();
        this.reset();
    }

    public present(score: NeuroScoreResult): void {
        const color = score.total >= 80 ? '$(pass-filled)' : score.total >= 50 ? '$(warning)' : '$(error)';
        this.statusBar.text = `${color} NeuroScore ${score.total}`;
    }

    public reset(): void {
        this.statusBar.text = '$(pulse) NeuroScore --';
    }

    public dispose(): void {
        this.statusBar.dispose();
    }
}
