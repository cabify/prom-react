import { Stage, usePerformanceMark } from '@shopify/react-performance';
import { render, screen } from '@testing-library/react';
import { Metric } from 'promjs';
import { useEffect } from 'react';

import { hasAnyRequest, waitForRequests } from '../test/mockServer';
import { GoldenMetrics, MetricDefinition } from './createMetrics';
import { useMetrics } from './MetricsContext';
import { MetricsProvider } from './MetricsProvider';

const LoadMetricChecker = ({
  onLoad,
}: {
  onLoad: (metrics: Metric<number>[]) => void;
}) => {
  const { registry, isReady } = useMetrics();

  useEffect(() => {
    const counter = registry.get('counter', GoldenMetrics.AppLoaded);
    if (isReady && counter) {
      onLoad(counter.collect());
    }
  }, [isReady, registry, onLoad]);
  return null;
};

const CustomMetricProducer = () => {
  const { observe, isReady } = useMetrics();

  useEffect(() => {
    if (isReady) {
      observe('test_metric', { custom_label: 'customValue' });
    }
  }, [observe, isReady]);

  return null;
};

const TestSection = () => {
  usePerformanceMark(Stage.Complete, 'test-section');
  return <p>My app</p>;
};

describe('<MetricsProvider />', () => {
  let requestsPromise: Promise<Request[]>;
  let requests: Request[];

  describe('default behavior', () => {
    let getNormalizedPath: jest.Mock;
    beforeEach(async () => {
      getNormalizedPath = jest.fn(() => '/normalized');
      requestsPromise = waitForRequests(
        'POST',
        'http://push-aggregation-gateway/push-metrics',
        2,
      );
      render(
        <MetricsProvider
          appName="test-app"
          getNormalizedPath={getNormalizedPath}
          metricsAggregatorUrl="http://push-aggregation-gateway/push-metrics"
          owner="team"
        >
          <TestSection />
        </MetricsProvider>,
      );
      requests = await requestsPromise;
    });

    it('should render the children', () => {
      expect(screen.getByText('My app')).toBeInTheDocument();
    });

    it('should emit a loaded app metric', async () => {
      const body = await requests[0].text();
      expect(body).toContain(
        'prom_react_app_loaded{app_name="test-app",owner="team",status="success"} 1',
      );
    });

    it('should emit navigation metrics', async () => {
      const body = await requests[1].text();
      expect(body).toContain(
        'prom_react_navigation_duration_seconds_count{app_name="test-app",owner="team",navigation_type="full_page",path="/normalized"} 1',
      );
    });

    it('should call getNormalizedPath to normalize paths before sending metrics', () => {
      expect(getNormalizedPath).toHaveBeenCalledWith('/');
    });
  });

  describe('when using custom metrics', () => {
    beforeEach(async () => {
      const customMetrics: MetricDefinition[] = [
        {
          type: 'counter',
          name: 'test_metric',
          description: 'Test metric',
        },
      ];
      requestsPromise = waitForRequests(
        'POST',
        'http://push-aggregation-gateway/push-metrics',
        3,
      );
      render(
        <MetricsProvider
          appName="test-app"
          customMetrics={customMetrics}
          metricsAggregatorUrl="http://push-aggregation-gateway/push-metrics"
          owner="team"
        >
          <TestSection />
          <CustomMetricProducer />
        </MetricsProvider>,
      );
      requests = await requestsPromise;
    });

    it('should allow to define and use them', async () => {
      const body = await requests[2].text();
      expect(body).toContain(
        'test_metric{app_name="test-app",owner="team",custom_label="customValue"} 1',
      );
    });
  });

  describe('when no aggregator url is provided', () => {
    let anyRequest: Promise<boolean>;
    let onLoad: jest.Mock;
    beforeEach(() => {
      anyRequest = hasAnyRequest();
      onLoad = jest.fn();
      render(
        <MetricsProvider appName="test-app" owner="team">
          <LoadMetricChecker onLoad={onLoad} />
          <TestSection />
        </MetricsProvider>,
      );
    });

    it('should render the children', () => {
      expect(screen.getByText('My app')).toBeInTheDocument();
    });

    it('should not try to send any metrics', () => {
      return expect(anyRequest).resolves.toBe(false);
    });

    it('should store them for further consumption', () => {
      expect(onLoad).toHaveBeenCalledWith([
        {
          value: 1,
          labels: {
            app_name: 'test-app',
            owner: 'team',
            status: 'success',
          },
        },
      ]);
    });
  });

  describe('when aggregator server is down', () => {
    let onLoad: jest.Mock;
    beforeEach(async () => {
      requestsPromise = waitForRequests(
        'POST',
        'http://push-aggregation-gateway/server-down',
        2,
      );
      onLoad = jest.fn();
      render(
        <MetricsProvider
          appName="test-app"
          metricsAggregatorUrl="http://push-aggregation-gateway/server-down"
          owner="team"
        >
          <LoadMetricChecker onLoad={onLoad} />
          <TestSection />
        </MetricsProvider>,
      );
      requests = await requestsPromise;
    });

    it('should render the children', () => {
      expect(screen.getByText('My app')).toBeInTheDocument();
    });

    it('should fail silently', () => {
      return expect(requests).toHaveLength(2);
    });

    // TODO: This test is failing because of an error in the argument matcher
    // eslint-disable-next-line jest/no-disabled-tests
    it.skip('should store metrics for further consumption', () => {
      expect(onLoad).toHaveBeenCalledWith([
        {
          value: 1,
          labels: {
            app_name: 'test-app',
            owner: 'team',
            status: 'success',
          },
        },
      ]);
    });
  });

  describe('when using custom fetch options', () => {
    beforeEach(async () => {
      requestsPromise = waitForRequests(
        'POST',
        'http://push-aggregation-gateway/push-metrics',
        2,
      );
      const fetchOptions: Partial<RequestInit> = {
        headers: {
          Authorization: 'Basic bla',
        },
      };
      render(
        <MetricsProvider
          appName="test-app"
          fetchOptions={fetchOptions}
          metricsAggregatorUrl="http://push-aggregation-gateway/push-metrics"
          owner="team"
        >
          <TestSection />
        </MetricsProvider>,
      );
      requests = await requestsPromise;
    });

    it('should honor them', () => {
      expect(requests[0].headers.get('Authorization')).toBe('Basic bla');
    });

    it('should keep existing config values', () => {
      expect(requests[0].headers.get('Content-Type')).toBe(
        'text/plain;charset=UTF-8',
      );
    });
  });
});
