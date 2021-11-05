import { matchRequestUrl, MockedRequest, rest } from 'msw';
import { setupServer } from 'msw/node';

export const server = setupServer(
  rest.post(
    'http://push-aggregation-gateway/push-metrics',
    (_req, res, ctx) => {
      return res(ctx.status(200));
    },
  ),
  rest.post('http://push-aggregation-gateway/server-down', (_req, res, ctx) => {
    return res(ctx.status(503));
  }),
);

export const waitForRequests = async (
  method: string,
  url: string,
  expectedRequests = 1,
) => {
  const requestIds: string[] = [];
  const requests: MockedRequest[] = [];

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
