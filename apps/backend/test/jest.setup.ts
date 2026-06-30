// Silence NestJS Logger output during tests so spec results aren't buried in
// app log lines. Runs after the test framework is set up.
import { Logger } from '@nestjs/common';

beforeAll(() => {
  jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
  jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
  jest.spyOn(Logger.prototype, 'debug').mockImplementation(() => undefined);
  jest.spyOn(Logger.prototype, 'verbose').mockImplementation(() => undefined);
});
