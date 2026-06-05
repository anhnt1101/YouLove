export interface LoveBreakdown {
  years: number;
  months: number;
  weeks: number;
  days: number;
}

export const CoupleUtils = {
  /**
   * Parse yyyy-MM-dd or dd/MM/yyyy to a local Date object.
   */
  parseDate(dateStr: string): Date | null {
    if (!dateStr) return null;
    const cleanStr = dateStr.trim();
    // Try yyyy-MM-dd
    let match = cleanStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      const year = parseInt(match[1], 10);
      const month = parseInt(match[2], 10) - 1;
      const day = parseInt(match[3], 10);
      return new Date(year, month, day);
    }
    // Try dd/MM/yyyy
    match = cleanStr.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
    if (match) {
      const day = parseInt(match[1], 10);
      const month = parseInt(match[2], 10) - 1;
      const year = parseInt(match[3], 10);
      return new Date(year, month, day);
    }
    // Fallback
    const d = new Date(cleanStr);
    return isNaN(d.getTime()) ? null : d;
  },

  /**
   * Format Date to yyyy-MM-dd
   */
  formatDate(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  },

  /**
   * Format any date string to dd/MM/yyyy
   */
  formatDisplayDate(dateStr: string): string {
    const parsed = this.parseDate(dateStr);
    if (!parsed) return dateStr;
    const d = String(parsed.getDate()).padStart(2, '0');
    const m = String(parsed.getMonth() + 1).padStart(2, '0');
    const y = parsed.getFullYear();
    return `${d}/${m}/${y}`;
  },

  /**
   * Count days between love start date and today (inclusive context)
   */
  countLoveDays(loveDateStr: string): number {
    const start = this.parseDate(loveDateStr);
    if (!start) return 0;
    const today = new Date();
    // Clear time for precise day calculations
    const sDate = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    const tDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    if (tDate < sDate) return 0;
    const diffTime = tDate.getTime() - sDate.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  },

  /**
   * Get breakdowns in years, months, weeks, and days
   */
  getLoveBreakdown(loveDateStr: string): LoveBreakdown {
    const start = this.parseDate(loveDateStr);
    if (!start) return { years: 0, months: 0, weeks: 0, days: 0 };
    const today = new Date();
    const sDate = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    const tDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    if (tDate < sDate) return { years: 0, months: 0, weeks: 0, days: 0 };

    let years = tDate.getFullYear() - sDate.getFullYear();
    let months = tDate.getMonth() - sDate.getMonth();
    let days = tDate.getDate() - sDate.getDate();

    if (days < 0) {
      months -= 1;
      // Get previous month length
      const prevMonth = new Date(tDate.getFullYear(), tDate.getMonth(), 0);
      days += prevMonth.getDate();
    }
    if (months < 0) {
      years -= 1;
      months += 12;
    }

    const totalDaysRemaining = days;
    const weeks = Math.floor(totalDaysRemaining / 7);
    const remDays = totalDaysRemaining % 7;

    return { years, months, weeks, days: remDays };
  },

  /**
   * Calculate exact age from birthday
   */
  calculateAge(birthdayStr: string): number {
    const birth = this.parseDate(birthdayStr);
    if (!birth) return 20;
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age -= 1;
    }
    return age;
  },

  /**
   * Calculates days remaining until the next birthday (0 to 365)
   */
  daysToNextBirthday(birthdayStr: string): number {
    const birth = this.parseDate(birthdayStr);
    if (!birth) return 100;
    const today = new Date();
    const tDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    let nextBirthday = new Date(tDate.getFullYear(), birth.getMonth(), birth.getDate());
    if (nextBirthday < tDate) {
      nextBirthday.setFullYear(tDate.getFullYear() + 1);
    }

    const diffTime = nextBirthday.getTime() - tDate.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  },

  /**
   * Get the zodiac sign for any birthday string
   */
  getZodiacSign(birthdayStr: string): string {
    const date = this.parseDate(birthdayStr);
    if (!date) return "Ma Kết";
    const day = date.getDate();
    const month = date.getMonth() + 1; // 1-indexed for matching

    switch (month) {
      case 1: return (day < 20) ? "Ma Kết" : "Bảo Bình";
      case 2: return (day < 19) ? "Bảo Bình" : "Song Ngư";
      case 3: return (day < 21) ? "Song Ngư" : "Bạch Dương";
      case 4: return (day < 20) ? "Bạch Dương" : "Kim Ngưu";
      case 5: return (day < 21) ? "Kim Ngưu" : "Song Tử";
      case 6: return (day < 21) ? "Song Tử" : "Cự Giải";
      case 7: return (day < 23) ? "Cự Giải" : "Sư Tử";
      case 8: return (day < 23) ? "Sư Tử" : "Xử Nữ";
      case 9: return (day < 23) ? "Xử Nữ" : "Thiên Bình";
      case 10: return (day < 23) ? "Thiên Bình" : "Thiên Yết";
      case 11: return (day < 22) ? "Thiên Yết" : "Nhân Mã";
      case 12: return (day < 22) ? "Nhân Mã" : "Ma Kết";
      default: return "Ma Kết";
    }
  },

  /**
   * Compresses and resizes a base64 image (data:image/...) using canvas.
   * Resolves with the optimized jpeg base64.
   */
  compressAndResizeImage(base64Str: string, maxWidth: number, maxHeight: number, quality: number = 0.7): Promise<string> {
    return new Promise((resolve) => {
      if (!base64Str || !base64Str.startsWith('data:image/')) {
        resolve(base64Str);
        return;
      }
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          if (width > maxWidth || height > maxHeight) {
            if (width > height) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            } else {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(base64Str);
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          
          const compressed = canvas.toDataURL('image/jpeg', quality);
          resolve(compressed);
        } catch (e) {
          console.error("Image processing error, returning original:", e);
          resolve(base64Str);
        }
      };
      img.onerror = () => {
        resolve(base64Str);
      };
    });
  }
};
