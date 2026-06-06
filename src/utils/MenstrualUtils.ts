import { CoupleUtils } from './CoupleUtils';

export type DayStatus = 'PERIOD' | 'UPCOMING' | 'FERTILE' | 'OVULATION' | 'SAFE' | 'NONE';

export const DayStatusTranslation: Record<DayStatus, string> = {
  PERIOD: 'Đang trong kỳ kinh',
  UPCOMING: 'Kỳ kinh dự kiến',
  FERTILE: 'Ngày dễ thụ thai',
  OVULATION: 'Ngày rụng trứng',
  SAFE: 'Ngày an toàn',
  NONE: 'Bình thường'
};

export interface MenstrualCycle {
  id?: number;
  startDate: string; // yyyy-MM-dd
  cycleLength: number;
  periodLength: number;
  lhTestResult?: string | null;
  lhPositiveDate?: string | null;
  bbt?: number | null;
  cervicalMucus?: string | null;
}

export interface MenstrualStats {
  minCycle: number | null;
  maxCycle: number | null;
  averageCycle: number;
  predictedPeriodStart: string | null;
  predictedPeriodStart2: string | null;
  predictedPeriodStart3: string | null;
  ovulationDate: string | null;
  fertileStart: string | null;
  fertileEnd: string | null;
  safePeriod1Start: string | null;
  safePeriod1End: string | null;
  safePeriod2Start: string | null;
  safePeriod2End: string | null;
}

// Date helpers for local dates
function addDays(dateStr: string, days: number): string {
  const parsed = CoupleUtils.parseDate(dateStr);
  if (!parsed) return dateStr;
  parsed.setDate(parsed.getDate() + days);
  return CoupleUtils.formatDate(parsed);
}

function daysBetween(startStr: string, endStr: string): number {
  const start = CoupleUtils.parseDate(startStr);
  const end = CoupleUtils.parseDate(endStr);
  if (!start || !end) return 0;
  const sDate = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const eDate = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  const diffTime = eDate.getTime() - sDate.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

export const MenstrualUtils = {
  /**
   * Run the standard 7-step menstrual cycle computation formula.
   */
  calculateMenstrualFormula(allCycles: MenstrualCycle[]): MenstrualStats {
    const sorted = [...allCycles].sort((a, b) => a.startDate.localeCompare(b.startDate));
    
    if (sorted.length === 0) {
      return {
        minCycle: null,
        maxCycle: null,
        averageCycle: 28,
        predictedPeriodStart: null,
        predictedPeriodStart2: null,
        predictedPeriodStart3: null,
        ovulationDate: null,
        fertileStart: null,
        fertileEnd: null,
        safePeriod1Start: null,
        safePeriod1End: null,
        safePeriod2Start: null,
        safePeriod2End: null
      };
    }

    // Only use the 6 most recent cycles chronologically for calculating averages and statistics
    const recentCycles = sorted.slice(-6);

    // STEP 1 - Calculate cycle lengths (distance between consecutive startDates)
    const cycleLengths: number[] = [];
    for (let i = 1; i < recentCycles.length; i++) {
      const len = daysBetween(recentCycles[i - 1].startDate, recentCycles[i].startDate);
      cycleLengths.push(len);
    }

    // STEP 2 - Calculate statistics (min, max, average rounded)
    const minCycle = cycleLengths.length > 0 ? Math.min(...cycleLengths) : null;
    const maxCycle = cycleLengths.length > 0 ? Math.max(...cycleLengths) : null;
    
    let averageCycle = 28;
    if (cycleLengths.length > 0) {
      const sum = cycleLengths.reduce((acc, val) => acc + val, 0);
      averageCycle = Math.round(sum / cycleLengths.length);
    } else {
      const lastLength = recentCycles[recentCycles.length - 1].cycleLength;
      averageCycle = (lastLength >= 15 && lastLength <= 50) ? lastLength : 28;
    }

    // STEP 3 - Predict future period starts
    const lastPeriodStart = sorted[sorted.length - 1].startDate;
    const predictedPeriodStart = addDays(lastPeriodStart, averageCycle);
    const predictedPeriodStart2 = addDays(predictedPeriodStart, averageCycle);
    const predictedPeriodStart3 = addDays(predictedPeriodStart2, averageCycle);

    // STEP 4 - Ovulation day estimation (14 days before predicted next period start)
    const ovulationDate = addDays(predictedPeriodStart, -14);

    // STEP 5 - Fertility window (5 days before ovulation to 1 day after ovulation)
    const fertileStart = addDays(ovulationDate, -5);
    const fertileEnd = addDays(ovulationDate, 1);

    // STEP 6 - Safety ranges inside current predicted range
    const periodLength = sorted[sorted.length - 1].periodLength || 5;
    const periodEnd = addDays(lastPeriodStart, periodLength - 1);

    const safePeriod1Start = addDays(periodEnd, 1);
    const safePeriod1End = addDays(fertileStart, -1);

    const safePeriod2Start = addDays(fertileEnd, 1);
    const safePeriod2End = addDays(predictedPeriodStart, -1);

    return {
      minCycle,
      maxCycle,
      averageCycle,
      predictedPeriodStart,
      predictedPeriodStart2,
      predictedPeriodStart3,
      ovulationDate,
      fertileStart,
      fertileEnd,
      safePeriod1Start,
      safePeriod1End,
      safePeriod2Start,
      safePeriod2End
    };
  },

  /**
   * Annotate days into a lookup map (yyyy-MM-dd -> DayStatus) spanning past cycles and 24 months of future prediction.
   */
  getCombinedCycleEvents(allCycles: MenstrualCycle[], maxFutureMonths: number = 24): Record<string, DayStatus> {
    const sorted = [...allCycles].sort((a, b) => a.startDate.localeCompare(b.startDate));
    if (sorted.length === 0) {
      return {};
    }

    const stats = this.calculateMenstrualFormula(allCycles);
    const averageCycle = stats.averageCycle;
    const eventMap: Record<string, DayStatus> = {};

    // 1. Mark real historical entries
    for (let i = 0; i < sorted.length; i++) {
      const curr = sorted[i];
      const periodStart = curr.startDate;
      const periodLength = curr.periodLength;

      const nextPeriodStart = (i < sorted.length - 1)
        ? sorted[i + 1].startDate
        : addDays(periodStart, averageCycle);

      const periodEnd = addDays(periodStart, periodLength - 1);
      
      // Default ovulation date: predicted next period - 14 days
      let ovulationDate = addDays(nextPeriodStart, -14);
      
      // If there is an LH positive peak, prioritize: ovulationDate = lhPositiveDate + 1 day
      if (curr.lhTestResult === 'Peak' && curr.lhPositiveDate) {
        ovulationDate = addDays(curr.lhPositiveDate, 1);
      }
      
      const fertileStart = addDays(ovulationDate, -5);
      const fertileEnd = addDays(ovulationDate, 1);

      // Pre-populate interval between current cycle start and subsequent start as SAFE
      let d = periodStart;
      while (d < nextPeriodStart) {
        eventMap[d] = 'SAFE';
        d = addDays(d, 1);
      }

      // Overlap with fertility window
      let f = fertileStart;
      while (f <= fertileEnd) {
        if (f > periodEnd && f < nextPeriodStart) {
          eventMap[f] = 'FERTILE';
        }
        f = addDays(f, 1);
      }

      // Overlap with actual ovulation date
      if (ovulationDate > periodEnd && ovulationDate < nextPeriodStart) {
        eventMap[ovulationDate] = 'OVULATION';
      }

      // Premium override: active bleeding period (🩸 always highest priority)
      let p = periodStart;
      while (p <= periodEnd) {
        eventMap[p] = 'PERIOD';
        p = addDays(p, 1);
      }
    }

    // 2. Project future predictions from the last real entry
    const latestReal = sorted[sorted.length - 1];
    let currentStart = latestReal.startDate;
    const defaultPeriodLength = latestReal.periodLength;

    for (let j = 1; j <= maxFutureMonths; j++) {
      const nextStart = addDays(currentStart, averageCycle);
      const endOfNextCycle = addDays(nextStart, averageCycle);

      const periodEnd = addDays(nextStart, defaultPeriodLength - 1);
      const ovulationDate = addDays(endOfNextCycle, -14);
      const fertileStart = addDays(ovulationDate, -5);
      const fertileEnd = addDays(ovulationDate, 1);

      // Project default SAFE days
      let d = nextStart;
      while (d < endOfNextCycle) {
        if (!eventMap[d]) {
          eventMap[d] = 'SAFE';
        }
        d = addDays(d, 1);
      }

      // Project fertile days
      let f = fertileStart;
      while (f <= fertileEnd) {
        if (f > periodEnd && f < endOfNextCycle) {
          eventMap[f] = 'FERTILE';
        }
        f = addDays(f, 1);
      }

      // Project ovulation day
      if (ovulationDate > periodEnd && ovulationDate < endOfNextCycle) {
        eventMap[ovulationDate] = 'OVULATION';
      }

      // Project bleeding window - displayed as UPCOMING (upcoming period)
      let p = nextStart;
      while (p <= periodEnd) {
        eventMap[p] = 'UPCOMING';
        p = addDays(p, 1);
      }

      currentStart = nextStart;
    }

    return eventMap;
  },

  calculateAverageCycleLength(allCycles: MenstrualCycle[]): number {
    return this.calculateMenstrualFormula(allCycles).averageCycle;
  }
};
