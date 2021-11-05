import {
  MetricsDebugOverlay,
  MetricsLogger,
  MetricsProvider,
  useMetrics,
  usePerformanceMark,
} from './index';

describe('index', () => {
  it('should export a provider', () => {
    expect(MetricsProvider).toBeDefined();
  });

  it('should export a hook', () => {
    expect(useMetrics).toBeDefined();
  });

  it('should export a debug overlay', () => {
    expect(MetricsDebugOverlay).toBeDefined();
  });

  it('should export a logger', () => {
    expect(MetricsLogger).toBeDefined();
  });

  it('should re-export shopify performance hooks', () => {
    expect(usePerformanceMark).toBeDefined();
  });
});
