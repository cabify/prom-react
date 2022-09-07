import { useEffect } from 'react';

import { ObserveCallback, useMetrics } from './MetricsContext';

const defaultLogger: ObserveCallback = ({ metricName, value, tags }) => {
  // eslint-disable-next-line no-console
  console.log('[prom_react]', metricName, value, tags);
};

interface MetricsLoggerProps {
  /**
   * If set, it will replace the original logger. Ensure the reference of this value doesn't change between renders by memoizing the logger function or defining it outside the component to avoid performance issues.
   */
  logger?: ObserveCallback;
}

const MetricsLogger = ({ logger = defaultLogger }: MetricsLoggerProps) => {
  const { addObserveListener, removeObserveListener } = useMetrics();

  useEffect(() => {
    addObserveListener(logger);
    return () => {
      removeObserveListener(logger);
    };
  }, [addObserveListener, logger, removeObserveListener]);

  return null;
};

export { MetricsLogger };
