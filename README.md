## prom-react

<!-- ALL-CONTRIBUTORS-BADGE:START - Do not remove or modify this section -->

[![All Contributors](https://img.shields.io/badge/all_contributors-11-orange.svg?style=flat-square)](#contributors-)

<!-- ALL-CONTRIBUTORS-BADGE:END -->

Add Prometheus metrics to your React App. Built on top of promjs and react-performance libraries

### Scope and purpose

The main objective of this package is to provide production runtime observability to React frontends,
allowing to monitor and alert about operational metrics such as, but not limited to, section loading times, load app errors and so.

To do so, this library offers a `MetricsProvider` that is built on top of [promjs](https://www.npmjs.com/package/promjs)
and [@shopify/react-performance](https://www.npmjs.com/package/@shopify/react-performance). With a minimal
instrumentation of your code, you can create fancy Grafana dashboards or raise prometheus alerts of your frontend app.

To better understand the purpose and architectural decisions behind this library, please take a look into
[this article / presentation](https://www.weave.works/blog/browser-metrics-into-prometheus/)

It is important to notice that, taking into account Prometheus pull model, this library needs to push metrics
into some Prometheus aggregation gateway to make them available. It is recommended to use against a
[prom-aggregation-gateway](https://github.com/weaveworks/prom-aggregation-gateway) instance, but
other alternatives might work as well.

### Installation

```sh
$ yarn add @cabify/prom-react
```

### Usage

#### Basic usage

First, you'll need to add a `MetricsProvider` into your app. It is desirable to add it to the root of
your app, to make it widely available.

```tsx
// src/index.tsx
import { MetricsProvider } from '@cabify/prom-react';

const normalizePath = (path: string) => {
  const match = path.match(/\/products\/(\d+)/);
  if (match) {
    return `/products/:id`;
  }
  return path;
};

const AppRoot = () => (
  <MetricsProvider
    appName="my-app-name"
    owner="my-team"
    getNormalizedPath={normalizePath}
    metricsAggregatorUrl="https://some-metrics-aggregator.com/push-metrics"
  >
    <OtherProviders>
      <App />
    </OtherProviders>
  </MetricsProvider>
);

render(<AppRoot />, document.getElementById('app'));
```

After that, in all your app pages or section root components, you need to add a navigation mark.
It is important to notice that all your page component should add `usePerformanceMark`. If there is a single page that doesn't
explicitly call `usePerformanceMark(Stage.Complete, 'page-id')`, your metric values will show incorrect results.
You will notice it for unusual high values for `prom_react_navigation_seconds` (it will affect to your p99 metrics).
See [@shopify/react-performance](https://www.npmjs.com/package/@shopify/react-performance#track-some-stats)
for more info.

```tsx
// src/pages/Products.tsx
import { usePerformanceMark, Stage } from '@cabify/prom-react'; // handy re-export of @shopify/react-performance utils

export const Products = () => {
  // whatever way to load the page data
  const [products, isLoading] = useFetchProducts();

  usePerformanceMark(isLoading ? Stage.Usable : Stage.Complete, 'products');

  return '...';
};
```

If you want also to monitor your app load failures (missing bundle files, js errors at boot time, etc), you'll
need to add the following small snippet to your `index.html` file (it must be placed there so it will execute
even if your bundle is unreachable / not working):

```js
window.__PROM_REACT_LOAD_FAILURE_TIMEOUT__ = setTimeout(function () {
  var xhr = new XMLHttpRequest();
  var str = '# HELP prom_react_app_loaded Application loaded counter\n';
  str += '# TYPE prom_react_app_loaded counter\n';
  str += 'prom_react_app_loaded{app_name="<<APP_NAME>>",status="failure"} 1\n';

  xhr.open('POST', '<<METRICS_AGGREGATOR_URL>>');
  xhr.setRequestHeader('Content-Type', 'text/plain');
  xhr.send(str);
}, 3000);
```

(Please remember to replace `<<METRICS_AGGREGATOR_URL>>` and `<<APP_NAME>>` placeholders to match your configuration)

Adding such instrumentation will provide these golden metrics out of the box:

- `prom_react_app_loaded`: Application loaded counter. It will observe both succesful / failure loads.
- `prom_react_app_unloaded`: Application unloaded counter. Uses `navigator.sendBeacon` API behind the scenes.
- `prom_react_performance_seconds`: Histogram to store load performance event timings (`dcl`, `ttfb`, `ttfp`, etc.).
- `prom_react_navigation_duration_seconds`: Histogram to store navigation times between sections.
  It includes both full page loads (`navigation_type="full_page`) and in-app navigations via
  history `pushState` or react-router (`navigation_type="in_app`). It also includes a label
  with the `path` (you need to take care about [cardinality explosion](https://blog.freshtracks.io/bomb-squad-automatic-detection-and-suppression-of-prometheus-cardinality-explosions-62ca8e02fa32)
  by using [getNormalizedPath](#metricsprovider) prop when creating `MetricsProvider`)
- `prom_react_ttc_seconds`: Histogram to store page TimeToComplete navigation times.
  It includes same labels as `navigation_duration_seconds` metric.
- `prom_react_ttu_seconds`: Histogram to store page TimeToUsable navigation times.
  It includes same labels as `navigation_duration_seconds` metric.

#### Adding custom metrics

You can add your custom app metrics to use them when needed. To do so, just attach them to `MetricsProvider`.
Later on, you can take advantage of `useMetrics` hook to add observations on those metrics:

```tsx
// src/index.tsx

import { MetricsProvider } from '@cabify/prom-react';

// please remember to define them outside the component to avoid unneeded re-renders
const customMetrics: MetricDefinition[] = [
  {
    type: 'counter',
    name: 'my_app_report_download_count',
    description: 'Number of reports downloaded',
  },
];

const MyApp = () => {
  return (
    <MetricsProvider appName="MyApp" customMetrics={customMetrics}>
      ...
    </MetricsProvider>
  );
};

// Any inner component
import { useMetrics } from '@cabify/prom-react';

const ReportsDownloadButton = () => {
  const { observe } = useMetrics();

  const downloadReport = () => {
    observe('my_app_report_download_count', { custom_tag: 'custom value' }, 1);

    // your app code
  };

  return <div onClick={downloadReport}>Download report</div>;
};
```

### API

#### MetricsProvider

React component that configures all the monitoring infrastructure and add the aforementioned
golden metrics. It must be placed in the root of your component tree.

Props:

- `appName: string;`: Name of the app. All metrics will include a label 'app_name'
  with this value.
- `owner?: string;`: Owner of the app. All metrics will include a label 'owner' with this value.
- `metricsAggregatorUrl?: string;`: Url of the push gateway aggregator.
  If not set, metrics will be collected but not sent.
- `customMetrics?: MetricDefinition[];`: Custom application metrics. Please define in a const
  outside the component to avoid infinite loops trying to create them.
- `fetchOptions?: Partial<RequestInit>`: Extra fetch options (headers, credentials, etc) to be used when sending metrics to the aggregator.
- `getNormalizedPath?: (path: string) => string;`: Given that all route change metrics include
  a 'path' label, you should add this function to avoid cardinality issues if you have
  parameterized routes (ex: `/products/:id`). See [recipes](#recipes) section for examples.
- `histogramBuckets?: number[]`: Bucket list for the histogram metrics.
  Defaulted to `[0.01, 0.1, 1, 2, 3, 4, 5, 7, 10, 15]`.

#### usePerformanceMark, Stage, etc.

This library re-exports all `@shopify/react-performance` to avoid explicitly add it
to your package dependencies. You can have a look at its
[API documentation](https://www.npmjs.com/package/@shopify/react-performance#api) for further details.

#### MetricsLogger

React component that will log into console all metric observations. It won't render anything in the screen.
You should not add this in production.

#### MetricsDebugOverlay

React component to show metrics debug info. Must be placed under `MetricsProvider`. It shows a not-so-fancy
overlay with navigation info. It is useful to check if all your sections are properly instrumented with `usePerformanceMark`.
It can also log all your observations to console (uses `MetricsLogger` under the hood). You should not show this in production.

Props:

- `onClose?: () => void`: If set, it will show a close button which will call this callback when pressed
- `withLogger?: boolean`: If set to true, it will include a `MetricsLogger`. This way, you can have
  all debugging facilities at hand by only adding this component.

![MetricsDebugOverlay component](./images/MetricsDebugOverlay.png?raw=true 'MetricsDebugOverlay')

Note that these debug components are very basic and may not fit your needs. However, as all metric data
is available through `useMetrics` hook, you can build your own logger, debugging panel, etc. within
your application or as an external library.

#### useMetrics()

Hook to access metrics registry and some other ready-to-use helpers. It returns an object
with the following properties:

- `observe(metricName, tags?, value?, skipSending?)`:
  Helper to add an observation to an existing metric. Note that the metric should be created in the provider. It supports both histogram and counter metrics.
  - `metricName: string`: Name of the metric to add observation to.
  - `tags?: Record<string, string>`: Optional tags to add to the observation. All observations added with this method
    will have `app_name` and `owner` labels properly set.
  - `value?: number`: Value to add to the observation. It is mandatory for histogram metrics and optional
    for counter metrics. If not set, this method will increase the counter by `1`.
  - `skipSending?: boolean`: If set to true, the observation will not be sent to the backend
    (you can call `sendMetrics()` manually to send observations).
- `isReady: boolean`: flag to indicate when metrics are ready to be used. You should only rely on
  this flag if you are planning to add observations to custom metrics when first rendering the app.
  The rule of thumb here is: only use it if your metric observation raise a warning of "this metric does not exist".
- `sendMetrics: () => void`: Send metrics to the server. Note: by default, this method is called
  automatically by `observe`, but you can call it manually if you skip automatic metric send.
- `histogramBuckets: number[];`: Buckets for histograms configured in the provider. Included here
  only for testing purposes, it won't be usually needed.
- `navigationData: NavigationData | null`: Last navigation data.
- `addObserveListener: (callback: ObserveCallback) => void;`: Add a listener called whenever an observation is added to the registry.
- `removeObserveListener: (callback: ObserveCallback) => void;`: Remove observe listener
- `registry: Registry`: promjs regisry instance. You should not use this directly,
  but use `observe` instead. It is exposed for some extremely rare cases and testing purposes.

### Recipes

#### Debugging

If you want to check if your metrics are being generated properly, you can add the `MetricsLogger` into your
component tree and all metric observations will be shown in the console.

```tsx
const AppRoot = () => (
  <MetricsProvider
    appName="my-app-name"
    owner="my-team"
    getNormalizedPath={normalizePath}
    metricsAggregatorUrl="https://some-metrics-aggregator.com/push-metrics"
  >
    <MetricsLogger />
    <MyApp />
  </MetricsProvider>
);
```

This will produce log entries like this:

`[prom_react] prom_react_navigation_duration_seconds 1.2456 {app_name: 'my_app', path: '/app', navigation_type: 'full_page' }`

Moreover, you can also add a widget that will show last navigation event being triggered. This is particularly useful to check
if all your pages are properly instrumented (you should navigate across your app and the widget should show the right path after
every section change).

```tsx
const AppRoot = () => (
  <MetricsProvider
    appName="my-app-name"
    owner="my-team"
    getNormalizedPath={normalizePath}
    metricsAggregatorUrl="https://some-metrics-aggregator.com/push-metrics"
  >
    {process.env.NODE_ENV !== 'production' && (
      <MetricsDebugOverlay withLogger onClose={closeOverlay} />
    )}
    <MyApp />
  </MetricsProvider>
);
```

#### Configure your grafana dashboards and prometheus alerts

- Average active sessions in a given time range:

```
increase(prom_react_app_loaded{app_name="$job", status="success"}[$__range]) -
on() increase(prom_react_app_unloaded{app_name="$job"}[$__range])
```

- Load app error rate:

```
rate(prom_react_app_loaded{app_name="$job",status="failure"}[$__rate_interval]) /
rate(prom_react_app_loaded{app_name="$job"}[$__rate_interval])
```

- Nth quantile of full page load duration in seconds:

```
histogram_quantile($quantile,
sum(sum(rate(prom_react_navigation_duration_seconds_bucket{app_name="$job",navigation_type="full_page"}[$__rate_interval])
)
by (le, path)) without(path))
```

- Page RPS by path:

```
sum by (path)(rate(prom_react_navigation_duration_seconds_count{app_name="$job"}[$__rate_interval]) != 0)
```

- (Prometheus alert). Application load failed:

```
ALERT AppLoadFailed
  IF     rate(prom_react_app_loaded{app_name="my-app",status="failure"}[5m]) /
         rate(prom_react_app_loaded{app_name="my-app"}[5m]) > 0.1
  FOR    15m
  LABELS {...}
  ANNOTATIONS {...}
```

#### getNormalizedPath with routes object

If you have your routes defined in a global object like (that you later use
in your react router configuration, for instance):

```ts
const Urls = {
  INDEX: '/app',
  PRODUCTS: '/app/products',
  PRODUCT_DETAIL: 'app/product/:id',
  ...
}
```

You can easily create a `getNormalizedPath` function by:

```ts
import { pathToRegexp } from 'path-to-regexp';

const urlRegExps = Object.values(Urls).map((url) => ({
  regExp: pathToRegexp(url),
  url,
}));

export const getNormalizedPath = (url: string) => {
  return urlRegExps.find(({ regExp }) => regExp.test(url))?.url || url;
};
```

#### Add authorization header to gateway requests

```tsx
// src/index.tsx
import { MetricsProvider } from '@cabify/prom-react';

const gatewayFetchOptions = {
  headers: {
    Authorization: `Basic ${btoa('login:password')}`,
  },
};

const AppRoot = () => (
  <MetricsProvider
    appName="my-app-name"
    owner="my-team"
    fetchOptions={gatewayFetchOptions}
    metricsAggregatorUrl="https://some-metrics-aggregator.com/push-metrics"
  >
    <App />
  </MetricsProvider>
);
```

#### Automatically check that all your pages include navigation marks

If you can identify your pages root components easily by their file name (for instance if they
are always named `<SectionName>Page.tsx`), it is easy to add a simple shell script to automatically
check that all of them are properly instrumented. This way you can avoid wrong navigation metric values
(you can also add such script to your CI pipelines or pre-commit scripts just to make sure an instrumented
code doesn't reach production). As an extra tip, if there are files that match your page name structure
but are not pages (or the page is instrumented somewhere else), you can add an ignore coment _à la eslint_
(ex. `// prom-react-ignore`).

```sh
echo "Checking if all pages are using 'usePerformanceMark'"

OUTPUT=$(grep --include='*Page.tsx' -Lr 'usePerformanceMark\|prom-react-ignore' .)

if [ -z "$OUTPUT" ]; then
    echo "Everything ok"
else
    echo "There are pages that are not using 'usePerformanceMark'"
    echo "$OUTPUT"
    echo "Please start using 'usePerformanceMark' on them or add // prom-react-ignore to ignore that file"
    exit 1
fi
```

### Contributing

- Running tests and linting: `yarn test`
- Build project: `yarn build`

#### Publish a new version

- Update [CHANGELOG](./CHANGELOG.md) with new features, breaking changes, etc
- Check you're in `main` branch and everything is up-to-date.
- Run `yarn publish:<major|minor|patch>` or `yarn publish:canary` for canary versions.
- Run `git push && git push --tags`
- Check all test actions triggered after previous push are ✔️.
- Go to [create a new release](https://github.com/cabify/prom-react/releases/new), select previously pushed tag and write a Title.
- Check the action for publish the npm has finished with success.
- [Check on npm package webpage](https://www.npmjs.com/package/@cabify/prom-react), the version has been published successfully under `latest` tag.

## Contributors ✨

Thanks goes to these wonderful people ([emoji key](https://allcontributors.org/docs/en/emoji-key)):

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->
<table>
  <tr>
    <td align="center"><a href="https://github.com/jalopez"><img src="https://avatars.githubusercontent.com/u/259623?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Javier López</b></sub></a><br /><a href="https://github.com/cabify/prom-react/commits?author=jalopez" title="Code">💻</a></td>
    <td align="center"><a href="https://github.com/alejandrofdiaz"><img src="https://avatars.githubusercontent.com/u/9197247?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Alejandro</b></sub></a><br /><a href="https://github.com/cabify/prom-react/commits?author=alejandrofdiaz" title="Code">💻</a></td>
    <td align="center"><a href="https://valya.codes/"><img src="https://avatars.githubusercontent.com/u/7880641?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Valentin Berlin</b></sub></a><br /><a href="https://github.com/cabify/prom-react/commits?author=valenber" title="Code">💻</a></td>
    <td align="center"><a href="https://github.com/alexgallardo"><img src="https://avatars.githubusercontent.com/u/7766614?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Alejandro Gallardo Escobar</b></sub></a><br /><a href="https://github.com/cabify/prom-react/commits?author=alexgallardo" title="Code">💻</a></td>
    <td align="center"><a href="https://github.com/christiandebarrio"><img src="https://avatars.githubusercontent.com/u/13832650?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Christian</b></sub></a><br /><a href="https://github.com/cabify/prom-react/commits?author=christiandebarrio" title="Code">💻</a></td>
    <td align="center"><a href="https://github.com/riboher"><img src="https://avatars.githubusercontent.com/u/11684090?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Ricardo Boluda</b></sub></a><br /><a href="https://github.com/cabify/prom-react/commits?author=riboher" title="Code">💻</a></td>
    <td align="center"><a href="https://github.com/pablomarquezcabify"><img src="https://avatars.githubusercontent.com/u/99354964?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Pablo Márquez</b></sub></a><br /><a href="https://github.com/cabify/prom-react/commits?author=pablomarquezcabify" title="Code">💻</a></td>
  </tr>
  <tr>
    <td align="center"><a href="https://leireriel.github.io/leire-rico-portfolio/#/"><img src="https://avatars.githubusercontent.com/u/48056077?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Leire Rico</b></sub></a><br /><a href="https://github.com/cabify/prom-react/commits?author=leireriel" title="Code">💻</a></td>
    <td align="center"><a href="http://www.siete3.com/"><img src="https://avatars.githubusercontent.com/u/2030605?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Rodrigo</b></sub></a><br /><a href="https://github.com/cabify/prom-react/commits?author=area73" title="Code">💻</a></td>
    <td align="center"><a href="https://github.com/AlexTemina"><img src="https://avatars.githubusercontent.com/u/14157093?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Alex Temina</b></sub></a><br /><a href="https://github.com/cabify/prom-react/commits?author=AlexTemina" title="Code">💻</a></td>
    <td align="center"><a href="https://github.com/fernandezAmor"><img src="https://avatars.githubusercontent.com/u/6586552?v=4?s=100" width="100px;" alt=""/><br /><sub><b>fernandezAmor</b></sub></a><br /><a href="https://github.com/cabify/prom-react/commits?author=fernandezAmor" title="Code">💻</a></td>
  </tr>
</table>

<!-- markdownlint-restore -->
<!-- prettier-ignore-end -->

<!-- ALL-CONTRIBUTORS-LIST:END -->

This project follows the [all-contributors](https://github.com/all-contributors/all-contributors) specification. Contributions of any kind welcome!
