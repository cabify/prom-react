import { FC, useEffect } from 'react';

import { ObserveCallback, useMetrics } from './MetricsContext';

const handleObserve: ObserveCallback = ({ metricName, value, tags }) => {
  // eslint-disable-next-line no-console
  console.log('[prom_react]', metricName, value, tags);
};

const MetricsLogger: FC = () => {
  const { addObserveListener, removeObserveListener } = useMetrics();

  useEffect(() => {
    addObserveListener(handleObserve);
    return () => {
      removeObserveListener(handleObserve);
    };
  }, [addObserveListener, removeObserveListener]);

  return null;
};

export { MetricsLogger };
