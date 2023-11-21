import { Labels, Metric, MetricValue } from './types';
import { findExistingMetric } from './utils';

export abstract class Collector<Value extends MetricValue> {
  private readonly data: Metric<Value>[];

  constructor() {
    this.data = [];
  }

  get(labels?: Labels): Metric<Value> | undefined {
    return findExistingMetric<Value>(labels, this.data);
  }

  set(value: Value, labels?: Labels): this {
    const existing = findExistingMetric(labels, this.data);
    if (existing) {
      existing.value = value;
    } else {
      this.data.push({
        labels,
        value,
      });
    }

    return this;
  }

  collect(labels?: Labels): Metric<Value>[] {
    if (!labels) {
      return this.data;
    }
    return this.data.filter((item) => {
      if (!item.labels) {
        return false;
      }
      const entries = Object.entries(labels);
      for (let i = 0; i < entries.length; i += 1) {
        const [label, value] = entries[i];
        if (item.labels[label] !== value) {
          return false;
        }
      }
      return true;
    });
  }

  resetAll(): this {
    for (let i = 0; i < this.data.length; i += 1) {
      this.reset(this.data[i].labels);
    }

    return this;
  }

  abstract reset(labels?: Labels): void;
}
