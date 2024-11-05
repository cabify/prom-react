import { delay, http, HttpResponse, matchRequestUrl, MockedRequest } from 'msw';
import { setupServer } from 'msw/node';

export const server = setupServer(
  http.post('http://push-aggregation-gateway/push-metrics', async () => {
    await delay(1);
    return new HttpResponse(null, { status: 200 });
    // return res(ctx.delay(), ctx.status(200));
  }),
  http.post('http://push-aggregation-gateway/server-down', async () => {
    await delay(1);
    return new HttpResponse(null, { status: 503 });
    // return res(ctx.delay(), ctx.status(503));
  }),
);

export const waitForRequests = async (
  method: string,
  url: string,
  expectedRequests = 1,
) => {
  const requestIds: string[] = [];
  const requests = [];

  return new Promise<MockedRequest[]>((resolve, reject) => {
    server.events.on('request:start', (req) => {
      const matchesMethod = req.method.toLowerCase() === method.toLowerCase();

      const matchesUrl = matchRequestUrl(req.url, url);

      if (matchesMethod && matchesUrl) {
        requestIds.push(req.id);
      }
    });

    server.events.on('request:match', (req) => {
      if (requestIds.includes(req.id)) {
        requests.push(req);
        if (requests.length === expectedRequests) {
          resolve(requests);
        }
      }
    });

    server.events.on('request:unhandled', (req) => {
      if (requestIds.includes(req.id)) {
        reject(
          new Error(`The ${req.method} ${req.url.href} request was unhandled.`),
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
