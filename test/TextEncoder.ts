// https://github.com/jsdom/jsdom/issues/2524#issuecomment-897707183
import { TextDecoder, TextEncoder } from 'util';

global.TextEncoder = TextEncoder;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
global.TextDecoder = TextDecoder as any;
