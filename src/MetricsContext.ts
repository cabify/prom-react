import { Registry } from 'promjs/registry';
import { createContext, useContext } from 'react';

export interface NavigationData {
  start: number;
  duration: number;
  isFullPageNavigation: boolean;
  timeToComplete: number;
  timeToUsable: number;
  path: string;
}

export type ObserveCallback = (data: {
  metricName: string;
  tags: Record<string, string>;
  value?: number;
}) => void;

export interface MetricsContextValue {
  /**
   * Helper to add an observation to an existing metric. Note that the metric should be created in the
   * provider. It supports both histogram and counter metrics.
   *
   * @param metricName Name of the metric to add observation to.
   * @param tags Optional tags to add to the observation. All observations added with this method will have `app_name` and `owner` label properly set.
   * @param value Value to add to the observation. It is mandatory for histogram metrics and optional for counter metrics. If not set, this
   * method will increase the counter by `1`.
   * @param skipSending If set to true, the observation will not be sent to the backend (you can call sendMetrics() manually to send observations).
   *
   * @example
   * ```ts
   * const { observe } = useMetrics();
   *
   * observe('my_app_metric_histogram', {}, 1);
   * ```
   */
  observe: (
    metricName: string,
    tags?: Record<string, string>,
    value?: number,
    skipSending?: boolean,
  ) => void;

  /**
   * promjs registry instance. You should not use this directly, but use `observe` instead.
   * It is exposed for some extremely rare cases where you need to access the registry directly.
   * @example
   * const { registry, observe, histogramBuckets } = useMetrics();
   *
   * registry.create('histogram', 'my_app_metric_histogram', 'My app histogram metric', histogramBuckets);
   *
   * // later on
   * observe('my_app_metric_histogram', {}, 1);
   */
  registry: Registry;

  /**
   * flag to indicate when metrics are ready to be used. Useful to avoid calling `observe` before metrics are ready.
   */
  isReady: boolean;

  /**
   * Send metrics to the server. Note: by default, this method is called automatically by observe, but
   * you can call it manually whenever needed
   */
  sendMetrics: () => void;

  /**
   * Buckets for histograms configured in the provider
   */
  histogramBuckets: number[];

  /**
   * Last navigation data
   */
  navigationData: NavigationData | null;

  /**
   * Add a listener called whenever an observation is added to the registry.
   */
  addObserveListener: (callback: ObserveCallback) => void;

  /**
   * Remove observe listener
   */
  removeObserveListener: (callback: ObserveCallback) => void;
}

export const MetricsContext = createContext<MetricsContextValue>(
  {} as MetricsContextValue,
);

export const useMetrics = () => useContext(MetricsContext);
