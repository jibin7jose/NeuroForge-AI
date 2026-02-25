import * as path from 'path';
import * as vscode from 'vscode';
import {
    AnalysisInput,
    AnalysisSnapshot,
    ComplexityFileReport,
    CoverageStatus,
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

        const coverageResult = await this.loadCoverage(input);
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
            coverage: coverageResult.hits,
            coverageStatus: coverageResult.status,
            coverageSource: coverageResult.source,
            coverageError: coverageResult.error,
            complexityReports,
            securitySignals,
            performanceSignals
        };
    }

    private async loadCoverage(input: AnalysisInput): Promise<CoverageResult> {
        const configured = await this.getCoverageFileFromConfig(input.workspaceFolder);
        if (configured) {
            if (!configured.exists) {
                return {
                    hits: [],
                    status: 'error',
                    source: configured.uri.fsPath,
                    error: 'Configured coverage file was not found.'
                };
            }
            return this.loadCoverageFromFile(configured.uri, input);
        }

        const coverageFiles = await this.findCoverageFiles(input.workspaceFolder);
        if (coverageFiles.length === 0) {
            return { hits: [], status: 'missing' };
        }

        const latest = await this.pickLatestCoverage(coverageFiles);
        if (!latest) {
            return { hits: [], status: 'missing' };
        }

        return this.loadCoverageFromFile(latest, input);
    }

    private async loadCoverageFromFile(file: vscode.Uri, input: AnalysisInput): Promise<CoverageResult> {
        try {
            const bytes = await vscode.workspace.fs.readFile(file);
            const json = JSON.parse(Buffer.from(bytes).toString('utf8')) as CoverageMap;
            const targetFile = input.editor?.document?.uri.fsPath;
            return {
                hits: this.extractLineHits(json, input.workspaceFolder, targetFile),
                status: 'ok',
                source: file.fsPath
            };
        } catch {
            return { hits: [], status: 'error', source: file.fsPath, error: 'Failed to parse coverage JSON.' };
        }
    }

    private async getCoverageFileFromConfig(folder: vscode.WorkspaceFolder): Promise<ConfiguredCoverageFile | undefined> {
        const configured = vscode.workspace.getConfiguration('neuroforge', folder.uri).get<string>('coverageFile');
        if (!configured || !configured.trim()) {
            return undefined;
        }

        const resolved = path.isAbsolute(configured)
            ? configured
            : path.join(folder.uri.fsPath, configured);

        const uri = vscode.Uri.file(resolved);
        try {
            await vscode.workspace.fs.stat(uri);
            return { uri, exists: true };
        } catch {
            return { uri, exists: false };
        }
    }

    private async findCoverageFiles(folder: vscode.WorkspaceFolder): Promise<vscode.Uri[]> {
        const patterns = [
            '**/coverage/coverage-final.json',
            '**/coverage/coverage.json',
            '**/coverage-final.json'
        ];

        const matches = await Promise.all(
            patterns.map((pattern) => vscode.workspace.findFiles(
                new vscode.RelativePattern(folder, pattern),
                '**/node_modules/**',
                20
            ))
        );

        const all = matches.flat();
        const seen = new Set<string>();
        const unique: vscode.Uri[] = [];
        for (const uri of all) {
            const key = uri.toString();
            if (seen.has(key)) {
                continue;
            }
            seen.add(key);
            unique.push(uri);
        }

        return unique;
    }

    private async pickLatestCoverage(files: vscode.Uri[]): Promise<vscode.Uri | undefined> {
        let latest: vscode.Uri | undefined;
        let latestMtime = 0;

        for (const file of files) {
            try {
                const stat = await vscode.workspace.fs.stat(file);
                if (stat.mtime > latestMtime) {
                    latestMtime = stat.mtime;
                    latest = file;
                }
            } catch {
                continue;
            }
        }

        return latest;
    }

    private extractLineHits(
        coverageMap: CoverageMap,
        folder: vscode.WorkspaceFolder,
        targetFile?: string
    ): FileLineHit[] {
        const hits: FileLineHit[] = [];
        const workspaceRoot = folder.uri.fsPath;
        const targetNormalized = targetFile ? path.normalize(targetFile) : undefined;

        for (const [key, entry] of Object.entries(coverageMap)) {
            if (!entry) {
                continue;
            }

            const rawPath = typeof entry.path === 'string' ? entry.path : key;
            const normalized = path.isAbsolute(rawPath)
                ? path.normalize(rawPath)
                : path.normalize(path.join(workspaceRoot, rawPath));

            if (targetNormalized && normalized !== targetNormalized) {
                continue;
            }

            const lineHits = this.collectLineHits(entry);
            for (const [line, count] of lineHits) {
                hits.push({
                    file: normalized,
                    line,
                    covered: count > 0,
                    hits: count
                });
            }
        }

        return hits;
    }

    private collectLineHits(entry: CoverageFileEntry): Map<number, number> {
        const map = new Map<number, number>();

        if (entry.l && typeof entry.l === 'object') {
            for (const [line, count] of Object.entries(entry.l)) {
                const lineNumber = Number(line);
                if (!Number.isFinite(lineNumber)) {
                    continue;
                }
                map.set(lineNumber, Math.max(map.get(lineNumber) ?? 0, toNumber(count)));
            }
            return map;
        }

        if (entry.lines && typeof entry.lines === 'object' && !('total' in entry.lines)) {
            for (const [line, count] of Object.entries(entry.lines)) {
                const lineNumber = Number(line);
                if (!Number.isFinite(lineNumber)) {
                    continue;
                }
                map.set(lineNumber, Math.max(map.get(lineNumber) ?? 0, toNumber(count)));
            }
            return map;
        }

        if (entry.statementMap && entry.s) {
            for (const [statementId, location] of Object.entries(entry.statementMap)) {
                const count = entry.s[statementId];
                const lineNumber = location?.start?.line;
                if (!lineNumber || !Number.isFinite(lineNumber)) {
                    continue;
                }
                map.set(lineNumber, Math.max(map.get(lineNumber) ?? 0, toNumber(count)));
            }
        }

        return map;
    }
}

interface CoverageFileEntry {
    path?: string;
    statementMap?: Record<string, { start?: { line?: number } }>;
    s?: Record<string, number>;
    l?: Record<string, number>;
    lines?: Record<string, number | unknown>;
}

type CoverageMap = Record<string, CoverageFileEntry>;

function toNumber(value: unknown): number {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
    }
    const coerced = Number(value);
    return Number.isFinite(coerced) ? coerced : 0;
}

interface CoverageResult {
    hits: FileLineHit[];
    status: CoverageStatus;
    source?: string;
    error?: string;
}

interface ConfiguredCoverageFile {
    uri: vscode.Uri;
    exists: boolean;
}
