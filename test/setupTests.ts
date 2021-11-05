import '@testing-library/jest-dom';
import 'isomorphic-unfetch';

import { server } from './mockServer';

beforeAll(() =>
  server.listen({
    onUnhandledRequest: 'warn',
  }),
);
afterEach(() => {
  server.resetHandlers();
  server.events.removeAllListeners('request:start');
  server.events.removeAllListeners('request:match');
  server.events.removeAllListeners('request:unhandled');
});
afterAll(() => server.close());
