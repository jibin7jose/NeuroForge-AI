import * as vscode from 'vscode';
import { ActionEngine } from '../core/contracts';

export class FastRefactorActionEngine implements ActionEngine {
    public async proposeRefactor(document: vscode.TextDocument): Promise<vscode.WorkspaceEdit | undefined> {
        const text = document.getText();
        if (!text.trim()) {
            return undefined;
        }

        // Placeholder: a safe no-op until AI patch generation is wired.
        // Keeping this method explicit now prevents direct document writes later.
        return undefined;
    }
}
