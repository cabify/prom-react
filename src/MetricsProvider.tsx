import {
  useLifecycleEventListener,
  useNavigationListener,
} from '@shopify/react-performance';
import EventEmitter from 'events';
import prom from 'promjs';
import {
  PropsWithChildren,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useBeforeunload } from 'react-beforeunload';

import { ObserveCallback } from '.';
import {
  createMetrics,
  GoldenMetrics,
  MetricDefinition,
} from './createMetrics';
import { MetricsContext, NavigationData } from './MetricsContext';
import { addToMetrics, sendMetricsToGateway } from './utils';

export interface MetricsProviderProps {
  /**
   * Name of the app. All metrics will include a label 'app_name' with this value.
   */
  appName: string;

  /**
   * Owner of the app. All metrics will include a label 'owner' with this value.
   */
  owner?: string;

  /**
   * Url of the push gateway aggregator. If not set, metrics will be collected but not sent.
   */
  metricsAggregatorUrl?: string;

  /**
   * Extra fetch options (headers, credentials, etc) to be used when sending metrics to the aggregator.
   */
  fetchOptions?: Partial<RequestInit>;

  /**
   * Given that all route change metrics include a 'path' label, you should add this function to avoid cardinality issues if you
   * have parameterized routes (ex: `/products/:id`).
   * @param path The actual path of the route (ex: `/products/123`)
   * @returns The normalized path of the route (ex: `/products/:id`)
   *
   * @example
   * ```ts
   * const normalizePath = (path: string) => {
   *  const match = path.match(/\/products\/(\d+)/);
   *  if (match) {
   *  return `/products/:id`;
   *  }
   *  return path;
   * }
   * ```
   */
  getNormalizedPath?: (path: string) => string;

  /**
   * Bucket list for the histogram metrics. Defaulted to [0.001, 0.01, 0.1, 1, 2, 5, 10]
   */
  histogramBuckets?: number[];

  /**
   * Custom application metrics. Please define in a const outside the component to avoid infinite loops trying to create them.
   * @example
   * ```tsx
   * const customMetrics: MetricDefinition[] = [
   * {
   *   type: 'counter',
   *   name: 'test_metric',
   *   description: 'Test metric',
   *  },
   * ];
   *
   * const MyApp = () => {
   *  return <MetricsProvider appName="MyApp" customMetrics={customMetrics}>...</MetricsProvider>
   * }
   * ```
   */
  customMetrics?: MetricDefinition[];
}

const defaultBuckets = [0.01, 0.1, 1, 2, 3, 4, 5, 7, 10, 15];

const MetricsProvider = ({
  appName,
  children,
  metricsAggregatorUrl,
  getNormalizedPath,
  owner = '',
  histogramBuckets = defaultBuckets,
  customMetrics = [],
  fetchOptions,
}: PropsWithChildren<MetricsProviderProps>) => {
  const [isReady, setIsReady] = useState(false);
  const [navigationData, setNavigationData] = useState<NavigationData | null>(
    null,
  );

  const registry = useRef(prom());
  const eventEmitter = useRef(new EventEmitter());

  const defaultTags = useMemo(
    () => ({
      app_name: appName,
      owner,
    }),
    [appName, owner],
  );

  const sendMetrics = useCallback(
    (isAppUnloading = false) => {
      if (!metricsAggregatorUrl) {
        return;
      }
      // eslint-disable-next-line no-void
      void sendMetricsToGateway(
        registry.current,
        metricsAggregatorUrl,
        fetchOptions,
        isAppUnloading,
      );
    },
    [metricsAggregatorUrl, fetchOptions],
  );

  const observe = useCallback(
    (
      metricName: string,
      extraTags?: Record<string, string>,
      value?: number,
      skipSend = false,
    ) => {
      const tags = { ...defaultTags, ...extraTags };

      addToMetrics({
        metricName,
        registry: registry.current,
        tags,
        value,
      });

      eventEmitter.current.emit('observation', { metricName, tags, value });

      if (!skipSend) {
        sendMetrics();
      }
    },
    [defaultTags, sendMetrics],
  );

  const addObserveListener = useCallback((callback: ObserveCallback) => {
    eventEmitter.current.on('observation', callback);
  }, []);

  const removeObserveListener = useCallback((callback: ObserveCallback) => {
    eventEmitter.current.off('observation', callback);
  }, []);

  // Cleanup load error metric if any
  useEffect(() => {
    // eslint-disable-next-line no-underscore-dangle
    window.__PROM_REACT_LOAD_FAILURE_TIMEOUT__ &&
      // eslint-disable-next-line no-underscore-dangle
      clearTimeout(window.__PROM_REACT_LOAD_FAILURE_TIMEOUT__);
  }, []);

  useEffect(() => {
    createMetrics(registry.current, histogramBuckets, customMetrics);
    setIsReady(true);
  }, [registry, histogramBuckets, customMetrics]);

  useEffect(() => {
    observe(GoldenMetrics.AppLoaded, {
      status: 'success',
    });
  }, [appName, observe, sendMetrics]);

  useEffect(
    () => () => {
      eventEmitter.current.removeAllListeners();
    },
    [],
  );

  useBeforeunload(() => {
    observe(GoldenMetrics.AppUnloaded, {}, undefined, true);
    sendMetrics(true);
  });

  useNavigationListener((navigation) => {
    const {
      start,
      duration,
      timeToComplete,
      timeToUsable,
      isFullPageNavigation,
      target,
    } = navigation;

    const path = getNormalizedPath?.(target) || target;

    setNavigationData({
      start,
      duration,
      timeToComplete,
      timeToUsable,
      isFullPageNavigation,
      path,
    });

    const tags = {
      navigation_type: isFullPageNavigation ? 'full_page' : 'in_app',
      path,
    };

    observe(GoldenMetrics.PageNavigation, tags, duration / 1000, true);
    observe(
      GoldenMetrics.PageTimeToComplete,
      tags,
      timeToComplete / 1000,
      true,
    );
    observe(GoldenMetrics.PageTimeToUsable, tags, timeToUsable / 1000, true);

    sendMetrics();
  });

  useLifecycleEventListener(({ type, start }) => {
    observe(
      GoldenMetrics.PerformanceTime,
      {
        event_type: type,
      },
      start / 1000,
      true,
    );
  });

  return (
    <MetricsContext.Provider
      value={{
        observe,
        registry: registry.current,
        isReady,
        histogramBuckets,
        navigationData,
        sendMetrics,
        addObserveListener,
        removeObserveListener,
      }}
    >
      {children}
    </MetricsContext.Provider>
  );
};

export { MetricsProvider };

declare global {
  interface Window {
    __PROM_REACT_LOAD_FAILURE_TIMEOUT__?: number;
  }
}
