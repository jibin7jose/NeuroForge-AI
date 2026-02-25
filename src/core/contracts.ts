import * as vscode from 'vscode';

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface SourceLocation {
    readonly file: string;
    readonly line: number;
    readonly column?: number;
}

export interface FileLineHit {
    readonly file: string;
    readonly line: number;
    readonly covered: boolean;
    readonly hits: number;
}

export interface FunctionComplexity {
    readonly name: string;
    readonly location: SourceLocation;
    readonly cyclomatic: number;
    readonly nestingDepth: number;
    readonly loopDepth: number;
    readonly recursive: boolean;
}

export interface ComplexityFileReport {
    readonly file: string;
    readonly language: string;
    readonly functions: readonly FunctionComplexity[];
}

export interface SecuritySignal {
    readonly id: string;
    readonly location: SourceLocation;
    readonly severity: RiskLevel;
    readonly message: string;
}

export interface PerformanceSignal {
    readonly id: string;
    readonly location: SourceLocation;
    readonly severity: RiskLevel;
    readonly message: string;
}

export interface RiskHotspot {
    readonly id: string;
    readonly file: string;
    readonly line: number;
    readonly score: number;
    readonly level: RiskLevel;
    readonly reasons: readonly string[];
}

export interface ScoreBreakdown {
    readonly coverage: number;
    readonly complexity: number;
    readonly security: number;
    readonly performance: number;
}

export interface NeuroScoreResult {
    readonly total: number;
    readonly breakdown: ScoreBreakdown;
    readonly hotspots: readonly RiskHotspot[];
    readonly generatedAt: string;
}

export interface AnalysisInput {
    readonly workspaceFolder: vscode.WorkspaceFolder;
    readonly editor?: vscode.TextEditor;
}

export interface AnalysisSnapshot {
    readonly coverage: readonly FileLineHit[];
    readonly complexityReports: readonly ComplexityFileReport[];
    readonly securitySignals: readonly SecuritySignal[];
    readonly performanceSignals: readonly PerformanceSignal[];
    readonly score?: NeuroScoreResult;
    readonly coverageStatus?: CoverageStatus;
    readonly coverageSource?: string;
    readonly coverageError?: string;
}

export type CoverageStatus = 'ok' | 'missing' | 'error';

export interface WorkspaceAnalyzer {
    analyze(input: AnalysisInput): Promise<AnalysisSnapshot>;
}

export interface HeatmapRenderer {
    render(snapshot: AnalysisSnapshot): void;
    clear(): void;
}

export interface NeuroScorePresenter {
    present(score: NeuroScoreResult): void;
    reset(): void;
}

export interface ActionEngine {
    proposeRefactor(document: vscode.TextDocument): Promise<vscode.WorkspaceEdit | undefined>;
}
