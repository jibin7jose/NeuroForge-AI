import {
    AnalysisSnapshot,
    NeuroScoreResult,
    RiskHotspot,
    ScoreBreakdown
} from '../core/contracts';

const DEFAULT_WEIGHTS = {
    coverage: 0.35,
    complexity: 0.25,
    security: 0.25,
    performance: 0.15
} as const;

export class NeuroScoreEngine {
    public calculate(snapshot: AnalysisSnapshot): NeuroScoreResult {
        const breakdown = this.calculateBreakdown(snapshot);
        const total = Math.round(
            breakdown.coverage * DEFAULT_WEIGHTS.coverage +
            breakdown.complexity * DEFAULT_WEIGHTS.complexity +
            breakdown.security * DEFAULT_WEIGHTS.security +
            breakdown.performance * DEFAULT_WEIGHTS.performance
        );

        return {
            total: clampScore(total),
            breakdown,
            hotspots: this.buildHotspots(snapshot),
            generatedAt: new Date().toISOString()
        };
    }

    private calculateBreakdown(snapshot: AnalysisSnapshot): ScoreBreakdown {
        const covered = snapshot.coverage.filter((line) => line.covered).length;
        const coverage = snapshot.coverage.length === 0
            ? 100
            : Math.round((covered / snapshot.coverage.length) * 100);

        const complexityValues = snapshot.complexityReports.flatMap((report) =>
            report.functions.map((fn) => fn.cyclomatic + fn.nestingDepth + fn.loopDepth)
        );
        const complexityPenalty = average(complexityValues);
        const complexity = clampScore(100 - Math.round(complexityPenalty * 5));

        const securityPenalty = snapshot.securitySignals.length * 12;
        const performancePenalty = snapshot.performanceSignals.length * 10;

        return {
            coverage: clampScore(coverage),
            complexity,
            security: clampScore(100 - securityPenalty),
            performance: clampScore(100 - performancePenalty)
        };
    }

    private buildHotspots(snapshot: AnalysisSnapshot): RiskHotspot[] {
        const hotspots: RiskHotspot[] = [];

        for (const security of snapshot.securitySignals) {
            hotspots.push({
                id: `sec:${security.id}`,
                file: security.location.file,
                line: security.location.line,
                score: riskScoreFromLevel(security.severity),
                level: security.severity,
                reasons: [security.message]
            });
        }

        for (const perf of snapshot.performanceSignals) {
            hotspots.push({
                id: `perf:${perf.id}`,
                file: perf.location.file,
                line: perf.location.line,
                score: riskScoreFromLevel(perf.severity),
                level: perf.severity,
                reasons: [perf.message]
            });
        }

        return hotspots.sort((a, b) => b.score - a.score).slice(0, 20);
    }
}

function average(values: readonly number[]): number {
    if (values.length === 0) {
        return 0;
    }
    return values.reduce((total, value) => total + value, 0) / values.length;
}

function clampScore(value: number): number {
    if (value < 0) return 0;
    if (value > 100) return 100;
    return value;
}

function riskScoreFromLevel(level: 'low' | 'medium' | 'high' | 'critical'): number {
    if (level === 'critical') return 95;
    if (level === 'high') return 80;
    if (level === 'medium') return 60;
    return 35;
}
