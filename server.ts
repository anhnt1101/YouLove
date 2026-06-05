import express from 'express';
import { GoogleGenAI, Type } from '@google/genai';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(express.json({ limit: '10mb' }));

// Secure server-side Gemini client as instructed by developer standards
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Endpoint for secure menstrual analysis via Gemini
app.post('/api/gemini/analyze', async (req, res): Promise<any> => {
  try {
    const { startDates = [], age = 20 } = req.body;

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        error: 'Chưa cấu hình GEMINI_API_KEY trên máy chủ. Vui lòng thêm trong Settings > Secrets.',
      });
    }

    if (startDates.length === 0) {
      return res.status(400).json({ error: 'Không có dữ liệu chu kỳ để phân tích.' });
    }

    const reversedDates = [...startDates].reverse();
    const prompt = `
Bạn là chuyên gia phân tích chu kỳ kinh nguyệt.

Dữ liệu đầu vào:
- Tuổi: ${age}
- Danh sách ngày bắt đầu các kỳ kinh theo thứ tự thời gian (từ cũ nhất đến mới nhất):
${reversedDates.join('\n')}

Yêu cầu phân tích và dự đoán:
1. Tính độ dài từng chu kỳ (khoảng cách ngày giữa các ngày bắt đầu kỳ kinh liên tiếp).
2. Tính chu kỳ trung bình, trung vị (median), độ lệch chuẩn và mức độ ổn định chu kỳ.
3. Phát hiện chu kỳ bất thường (outlier):
   * Nếu một chu kỳ lệch quá lớn so với xu hướng 6–12 chu kỳ gần nhất thì giảm trọng số hoặc loại khỏi dự đoán.
4. Dự đoán ngày bắt đầu kỳ kinh tiếp theo bằng cách ưu tiên:
   * Median cycle length.
   * Weighted average của các chu kỳ gần nhất.
   * Loại bỏ ảnh hưởng của outlier.
5. Tính toán các giá trị sau:
   * Ngày kinh tiếp theo.
   * Khoảng sai số dự kiến.
   * Mức độ tin cậy (%).
   * Ngày rụng trứng dự kiến (quy tắc: khoảng 14 ngày trước kỳ kinh tiếp theo, hoặc tinh chỉnh dựa trên dữ liệu lịch sử).
   * Cửa sổ dễ thụ thai (quy tắc: khoảng 5 ngày trước đến 1 ngày sau ngày rụng trứng dự kiến).
   * Các ngày có khả năng thụ thai thấp (các ngày còn lại nằm ngoài cửa sổ dễ thụ thai).
6. Không sử dụng công thức cố định đơn giản. Hãy ưu tiên xu hướng lịch sử thực tế của người dùng.
7. Nếu dữ liệu dưới 6 chu kỳ thì giảm confidence score (mức độ tin cậy %).

Hãy trả về chính xác một đối tượng JSON có cấu trúc sau:
{
  "average_cycle_length": "độ dài chu kỳ trung bình",
  "median_cycle_length": "độ dài chu kỳ trung vị",
  "cycle_stability": "Mô tả độ ổn định chu kỳ (ví dụ: 'Rất đều', 'Tương đối đều', 'Không đều')",
  "outliers": ["Danh sách các chuỗi ngày bắt đầu của chu kỳ bất thường nếu có"],
  "next_period_date": "YYYY-MM-DD",
  "prediction_range": "Ví dụ: '01/07/2026 - 05/07/2026' hoặc sai số '+- 2 ngày'",
  "confidence_score": 85,
  "estimated_ovulation_date": "YYYY-MM-DD",
  "fertility_window": "Ví dụ: '12/06/2026 - 18/06/2026'",
  "low_fertility_days": "Mô tả hoặc danh sách các ngày khả năng thụ thai thấp",
  "reasoning": "Giải thích chi tiết lập luận phân tích bằng tiếng Việt bao gồm độ dài từng chu kỳ tính được, các chu kỳ bất thường phát hiện được và cách thức tính toán tinh lọc kết quả."
}
`;

    // Modern @google/genai SDK implementation with response schema
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            average_cycle_length: { type: Type.NUMBER },
            median_cycle_length: { type: Type.NUMBER },
            cycle_stability: { type: Type.STRING },
            outliers: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            next_period_date: { type: Type.STRING },
            prediction_range: { type: Type.STRING },
            confidence_score: { type: Type.INTEGER },
            estimated_ovulation_date: { type: Type.STRING },
            fertility_window: { type: Type.STRING },
            low_fertility_days: { type: Type.STRING },
            reasoning: { type: Type.STRING },
          },
          required: [
            'average_cycle_length',
            'median_cycle_length',
            'cycle_stability',
            'next_period_date',
            'prediction_range',
            'confidence_score',
            'estimated_ovulation_date',
            'fertility_window',
            'reasoning'
          ]
        },
        temperature: 0.2,
      },
    });

    const rawText = response.text || '';
    res.json(JSON.parse(rawText));
  } catch (error: any) {
    console.error('Lỗi API phân tích chu kỳ:', error);
    res.status(500).json({ error: error.message || 'Lỗi không xác định khi gọi Gemini.' });
  }
});

// Configure Vite dynamic middleware in Development or serve Static Assets in Production
const port = 3000;
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await import('vite');
    const viteServer = await vite.createServer({
      server: {
        middlewareMode: true,
        port: port,
        strictPort: true,
      },
      appType: 'spa',
    });
    app.use(viteServer.middlewares);
    console.log('Phát triển server chạy với Vite middleware.');
  } else {
    const buildPath = path.resolve('dist');
    app.use(express.static(buildPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(buildPath, 'index.html'));
    });
    console.log('Chế độ Production: Phục vụ tệp tĩnh từ thư mục dist.');
  }

  app.listen(port, () => {
    console.log(`Ứng dụng hoạt động trên port ${port}`);
  });
}

startServer().catch((err) => {
  console.error('Không thể khởi động máy chủ:', err);
});
