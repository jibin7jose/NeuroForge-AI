import * as vscode from 'vscode';
import { AnalysisSnapshot, HeatmapRenderer } from '../core/contracts';

export class GutterRiskHeatmapRenderer implements HeatmapRenderer {
    private readonly coveredDecoration = vscode.window.createTextEditorDecorationType({
        isWholeLine: true,
        gutterIconPath: this.svgDataUri('#2ea043')
    });

    private readonly uncoveredDecoration = vscode.window.createTextEditorDecorationType({
        isWholeLine: true,
        gutterIconPath: this.svgDataUri('#f85149')
    });

    public render(snapshot: AnalysisSnapshot): void {
        const active = vscode.window.activeTextEditor;
        if (!active) {
            return;
        }

        const coveredRanges: vscode.Range[] = [];
        const uncoveredRanges: vscode.Range[] = [];
        const targetFile = active.document.uri.fsPath;

        for (const hit of snapshot.coverage) {
            if (hit.file !== targetFile || hit.line < 1) {
                continue;
            }

            const lineIndex = hit.line - 1;
            if (lineIndex >= active.document.lineCount) {
                continue;
            }

            const range = active.document.lineAt(lineIndex).range;
            if (hit.covered) {
                coveredRanges.push(range);
            } else {
                uncoveredRanges.push(range);
            }
        }

        active.setDecorations(this.coveredDecoration, coveredRanges);
        active.setDecorations(this.uncoveredDecoration, uncoveredRanges);
    }

    public clear(): void {
        const active = vscode.window.activeTextEditor;
        if (!active) {
            return;
        }
        active.setDecorations(this.coveredDecoration, []);
        active.setDecorations(this.uncoveredDecoration, []);
    }

    private svgDataUri(hexColor: string): vscode.Uri {
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12"><rect x="2" y="2" width="8" height="8" rx="2" ry="2" fill="${hexColor}" /></svg>`;
        return vscode.Uri.parse(`data:image/svg+xml;utf8,${encodeURIComponent(svg)}`);
    }
}
