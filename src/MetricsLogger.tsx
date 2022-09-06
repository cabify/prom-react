import { FC, useEffect } from 'react';

import { ObserveCallback, useMetrics } from './MetricsContext';

const defaultLogger: ObserveCallback = ({ metricName, value, tags }) => {
  // eslint-disable-next-line no-console
  console.log('[prom_react]', metricName, value, tags);
};

const MetricsLogger: FC<{ logger?: ObserveCallback }> = ({
  logger = defaultLogger,
}) => {
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
