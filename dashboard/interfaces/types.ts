export interface Metrics {
  stable: {
    pageviews: number;
    errors: number;
    clicks: number;
  };
  canary: {
    pageviews: number;
    errors: number;
    clicks: number;
  };
  events: Array<any>;
}

export interface Assignment {
  version: string;
  timestamp: string;
}

export interface Config {
  initialCanaryPercentage: number;
  [key: string]: any;
}

export interface DashboardData {
  metrics: Metrics;
  assignment: Assignment;
  config: Config;
}
