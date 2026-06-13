import { validateEnv } from './env.schema';

// A minimal valid base env so we can isolate the field under test.
const base = {
  DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
  JWT_SECRET: 'a-sufficiently-long-test-secret-value',
};

describe('env.schema validateEnv', () => {
  it('accepts a minimal valid env and applies defaults', () => {
    const env = validateEnv({ ...base });
    expect(env.NODE_ENV).toBe('development');
    expect(env.PORT).toBe(3000);
    expect(env.AI_PROVIDER).toBe('mock');
  });

  it('throws on missing DATABASE_URL', () => {
    expect(() => validateEnv({ JWT_SECRET: base.JWT_SECRET })).toThrow(
      /Invalid environment variables/,
    );
  });

  describe('DEMO_MODE', () => {
    it('defaults to false when unset', () => {
      expect(validateEnv({ ...base }).DEMO_MODE).toBe(false);
    });

    it('parses "true" as true', () => {
      expect(validateEnv({ ...base, DEMO_MODE: 'true' }).DEMO_MODE).toBe(true);
    });

    // Regression: z.coerce.boolean() ran Boolean("false") === true, which turned
    // demo mode ON in production. The literal parser must treat "false" as false.
    it('parses "false" as false (not the coercion trap)', () => {
      expect(validateEnv({ ...base, DEMO_MODE: 'false' }).DEMO_MODE).toBe(false);
    });

    it('rejects non-boolean strings rather than silently coercing', () => {
      expect(() => validateEnv({ ...base, DEMO_MODE: 'yes' })).toThrow(
        /Invalid environment variables/,
      );
    });
  });

  describe('JWT_SECRET', () => {
    it('rejects secrets that are too short', () => {
      expect(() => validateEnv({ ...base, JWT_SECRET: 'short' })).toThrow(
        /Invalid environment variables/,
      );
    });
  });

  describe('numeric coercion', () => {
    it('coerces PORT from a string', () => {
      expect(validateEnv({ ...base, PORT: '4000' }).PORT).toBe(4000);
    });

    it('applies outbreak threshold defaults', () => {
      const env = validateEnv({ ...base });
      expect(env.OUTBREAK_CREATE_THRESHOLD).toBe(5);
      expect(env.OUTBREAK_DEACTIVATE_HOURS).toBe(48);
    });
  });
});
