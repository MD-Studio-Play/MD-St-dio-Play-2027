export interface VisitorRecord {
  id: string;
  timestamp: string;
  path: string;
  device: 'mobile' | 'desktop' | 'tablet';
  browser?: string;
  referrer?: string;
}

export interface DailyVisitPoint {
  date: string; // YYYY-MM-DD
  visits: number;
  unique: number;
}

export interface VisitorAnalyticsData {
  totalVisits: number;
  uniqueVisitors: number;
  visitsToday: number;
  uniqueToday: number;
  visitsThisWeek: number;
  visitsThisMonth: number;
  deviceBreakdown: {
    desktop: number;
    mobile: number;
    tablet: number;
  };
  pageBreakdown: Record<string, number>;
  dailyHistory: DailyVisitPoint[];
  recentVisits: VisitorRecord[];
  todayDate?: string;
  lastUpdated: string;
}
