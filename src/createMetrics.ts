import { Registry } from 'promjs/registry';

export enum GoldenMetrics {
  AppLoaded = 'prom_react_app_loaded',
  AppUnloaded = 'prom_react_app_unloaded',
  PageNavigation = 'prom_react_navigation_duration_seconds',
  PageTimeToComplete = 'prom_react_ttc_seconds',
  PageTimeToUsable = 'prom_react_ttu_seconds',
  PerformanceTime = 'prom_react_performance_seconds',
}

export type MetricDefinition =
  | {
      type: 'counter';
      name: string;
      description: string;
    }
  | {
      type: 'histogram';
      name: string;
      description: string;
      buckets?: number[];
    };

const goldenMetrics: MetricDefinition[] = [
  {
    type: 'counter',
    name: GoldenMetrics.AppLoaded,
    description: 'Application loaded counter',
  },
  {
    type: 'counter',
    name: GoldenMetrics.AppUnloaded,
    description: 'Application unloaded counter',
  },
  {
    type: 'histogram',
    name: GoldenMetrics.PageNavigation,
    description: 'Total navigation duration between pages in seconds',
  },
  {
    type: 'histogram',
    name: GoldenMetrics.PageTimeToComplete,
    description: 'Section time to interactive in seconds',
  },
  {
    type: 'histogram',
    name: GoldenMetrics.PageTimeToUsable,
    description: 'Section time to usable in seconds',
  },
  {
    type: 'histogram',
    name: GoldenMetrics.PerformanceTime,
    description: 'Application performance load time in seconds',
  },
];

export const createMetrics = (
  registry: Registry,
  defaultBuckets: number[],
  customMetrics: MetricDefinition[] = [],
) => {
  if (registry.get('counter', GoldenMetrics.AppLoaded)) {
    // Avoid creating golden metrics if they already exist
    return;
  }

  [...goldenMetrics, ...customMetrics].forEach((metric) => {
    switch (metric.type) {
      case 'counter':
        registry.create('counter', metric.name, metric.description);
        break;
      case 'histogram':
        registry.create(
          'histogram',
          metric.name,
          metric.description,
          metric.buckets || defaultBuckets,
        );
        break;
      default:
        break;
    }
  });
};
