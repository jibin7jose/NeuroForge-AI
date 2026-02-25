import * as vscode from 'vscode';
import {
    AnalysisInput,
    AnalysisSnapshot,
    ComplexityFileReport,
    FileLineHit,
    PerformanceSignal,
    SecuritySignal,
    WorkspaceAnalyzer
} from '../core/contracts';

export class DefaultWorkspaceAnalyzer implements WorkspaceAnalyzer {
    public async analyze(input: AnalysisInput): Promise<AnalysisSnapshot> {
        const files = await vscode.workspace.findFiles(
            new vscode.RelativePattern(input.workspaceFolder, '**/*.{ts,tsx,js,jsx,py}'),
            '**/node_modules/**',
            200
        );

        const coverage: FileLineHit[] = [];
        const complexityReports: ComplexityFileReport[] = [];
        const securitySignals: SecuritySignal[] = [];
        const performanceSignals: PerformanceSignal[] = [];

        for (const file of files) {
            const document = await vscode.workspace.openTextDocument(file);
            if (!document.getText().trim()) {
                continue;
            }

            complexityReports.push({
                file: document.uri.fsPath,
                language: document.languageId,
                functions: []
            });
        }

        return {
            coverage,
            complexityReports,
            securitySignals,
            performanceSignals
        };
    }
}
