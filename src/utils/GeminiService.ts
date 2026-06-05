export interface GeminiAnalysisResult {
  average_cycle_length: number;
  median_cycle_length: number;
  cycle_stability: string;
  outliers?: string[];
  next_period_date: string;
  prediction_range: string;
  confidence_score: number;
  estimated_ovulation_date: string;
  fertility_window: string;
  low_fertility_days?: string;
  reasoning: string;
}

export const GeminiService = {
  /**
   * Gọi API trung gian server-side để phân tích chu kỳ kinh nguyệt qua Gemini
   */
  async analyzeMenstrualCycle(
    age: number,
    startDates: string[],
    lengths: number[]
  ): Promise<GeminiAnalysisResult> {
    const response = await fetch('/api/gemini/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        age,
        startDates,
        lengths,
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || `Lỗi kết nối máy chủ (${response.status})`);
    }

    return response.json();
  }
};
