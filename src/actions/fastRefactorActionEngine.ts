import * as vscode from 'vscode';
import { ActionEngine } from '../core/contracts';

export class FastRefactorActionEngine implements ActionEngine {
    public async proposeRefactor(document: vscode.TextDocument): Promise<vscode.WorkspaceEdit | undefined> {
        const text = document.getText();
        if (!text.trim()) {
            return undefined;
        }

        if (!this.supportsOrganizeImports(document.languageId)) {
            return undefined;
        }

        const edit = await vscode.commands.executeCommand<vscode.WorkspaceEdit>(
            'vscode.executeOrganizeImports',
            document.uri
        );

        if (!edit || edit.size === 0) {
            return undefined;
        }

        return edit;
    }

    private supportsOrganizeImports(languageId: string): boolean {
        return languageId === 'typescript'
            || languageId === 'typescriptreact'
            || languageId === 'javascript'
            || languageId === 'javascriptreact';
    }
}
