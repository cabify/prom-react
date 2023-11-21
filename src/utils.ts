import { Registry } from './promjs/registry';

export const sendMetricsToGateway = async (
  registry: Registry,
  promGatewayUrl: string,
  fetchOptions: Partial<RequestInit> = {},
  isAppUnloading = false,
) => {
  const metrics = registry.metrics();
  if (metrics.length > 0) {
    const keepalive = isAppUnloading ? { keepalive: true } : {};

    try {
      await fetch(promGatewayUrl, {
        body: metrics,
        method: 'POST',
        ...keepalive,
        ...fetchOptions,
        headers: {
          'Content-Type': 'text/plain;charset=UTF-8',
          ...fetchOptions.headers,
        },
      });
      registry.reset();
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Error while sending metrics', e);
    }
  }
};

export const addToMetrics = ({
  registry,
  metricName,
  value,
  tags,
}: {
  metricName: string;
  registry: Registry;
  tags: Record<string, string>;
  value?: number;
}) => {
  const histogram = registry.get('histogram', metricName);
  const counter = registry.get('counter', metricName);

  if (!histogram && !counter) {
    // eslint-disable-next-line no-console
    console.warn(`[prom_react] No metric found for ${metricName}`);
    return;
  }

  if (histogram) {
    if (typeof value === 'number') {
      histogram.observe(value, tags);
    } else {
      // eslint-disable-next-line no-console
      console.warn(
        `[prom_react] ${metricName} is an histogram, so value is mandatory`,
      );
      return;
    }
  }

  counter?.add(value ?? 1, tags);
};
