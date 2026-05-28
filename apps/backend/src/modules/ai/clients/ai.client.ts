import type { AnalysisRequest, AnalysisResult } from '../dto/analysis-result';

/**
 * Contract every AI provider must satisfy. Keeps `AiService` agnostic of
 * the specific upstream and makes mock <-> real swap trivial.
 */
export interface AiClient {
  readonly name: string;
  analyze(request: AnalysisRequest): Promise<AnalysisResult>;
}
