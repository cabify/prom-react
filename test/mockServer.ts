import { delay, http, HttpResponse, matchRequestUrl } from 'msw';
import { setupServer } from 'msw/node';

export const server = setupServer(
  http.post('http://push-aggregation-gateway/push-metrics', async () => {
    await delay();
    return new HttpResponse(null, {
      status: 200,
    });
  }),
  http.post('http://push-aggregation-gateway/server-down', async () => {
    await delay();
    return new HttpResponse(null, {
      status: 503,
    });
  }),
);

export const waitForRequests = async (
  method: string,
  url: string,
  expectedRequests = 1,
) => {
  const requestIds: string[] = [];
  const requests: Request[] = [];

  return new Promise<Request[]>((resolve, reject) => {
    server.events.on('request:start', ({ request, requestId }) => {
      const matchesMethod =
        request.method.toLowerCase() === method.toLowerCase();

      const matchesUrl = matchRequestUrl(new URL(request.url), url);

      if (matchesMethod && matchesUrl) {
        requestIds.push(requestId);
      }
    });

    server.events.on('request:match', ({ request, requestId }) => {
      if (requestIds.includes(requestId)) {
        requests.push(request);
        if (requests.length === expectedRequests) {
          resolve(requests);
        }
      }
    });

    server.events.on('request:unhandled', ({ request, requestId }) => {
      if (requestIds.includes(requestId)) {
        reject(
          new Error(
            `The ${request.method} ${request.url} request was unhandled.`,
          ),
        );
      }
    });
  });
};

export const hasAnyRequest = async (waitFor = 1000) => {
  return new Promise<boolean>((resolve) => {
    const timeout = setTimeout(() => {
      resolve(false);
    }, waitFor);
    server.events.on('request:start', () => {
      clearTimeout(timeout);
      resolve(true);
    });
  });
};
