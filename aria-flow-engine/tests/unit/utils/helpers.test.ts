import { ObjectId } from 'mongodb';
import {
  isValidObjectId,
  toObjectId,
  safeToObjectId,
  removeUndefined,
  deepClone,
  sleep,
  retryWithBackoff,
  generateRandomString,
  omit,
  pick,
  chunk,
  calculatePagination,
} from '../../../src/utils/helpers';

// ============================================
// ObjectId Helpers
// ============================================

describe('isValidObjectId', () => {
  it('should return true for a valid ObjectId string', () => {
    const id = new ObjectId().toString();
    expect(isValidObjectId(id)).toBe(true);
  });

  it('should return false for an invalid string', () => {
    expect(isValidObjectId('not-an-id')).toBe(false);
  });

  it('should return false for an empty string', () => {
    expect(isValidObjectId('')).toBe(false);
  });

  it('should return false for a 12-char string that looks valid but does not round-trip', () => {
    // ObjectId.isValid accepts 12-byte strings, but toString won't match
    expect(isValidObjectId('123456789012')).toBe(false);
  });
});

describe('toObjectId', () => {
  it('should convert a string to ObjectId', () => {
    const str = new ObjectId().toString();
    const result = toObjectId(str);

    expect(result).toBeInstanceOf(ObjectId);
    expect(result.toString()).toBe(str);
  });

  it('should return the same ObjectId if already an ObjectId', () => {
    const id = new ObjectId();
    const result = toObjectId(id);

    expect(result).toBe(id);
  });
});

describe('safeToObjectId', () => {
  it('should return ObjectId for a valid string', () => {
    const str = new ObjectId().toString();
    const result = safeToObjectId(str);

    expect(result).toBeInstanceOf(ObjectId);
    expect(result!.toString()).toBe(str);
  });

  it('should return null for an invalid string', () => {
    expect(safeToObjectId('bad-id')).toBeNull();
  });

  it('should return null for undefined', () => {
    expect(safeToObjectId(undefined)).toBeNull();
  });

  it('should return null for null', () => {
    expect(safeToObjectId(null)).toBeNull();
  });
});

// ============================================
// Object Helpers
// ============================================

describe('removeUndefined', () => {
  it('should remove undefined values', () => {
    const result = removeUndefined({ a: 1, b: undefined, c: 'hello' });

    expect(result).toEqual({ a: 1, c: 'hello' });
  });

  it('should keep null and falsy values', () => {
    const result = removeUndefined({ a: null, b: 0, c: '', d: false } as any);

    expect(result).toEqual({ a: null, b: 0, c: '', d: false });
  });

  it('should return empty object when all values are undefined', () => {
    const result = removeUndefined({ a: undefined, b: undefined } as any);

    expect(result).toEqual({});
  });
});

describe('deepClone', () => {
  it('should create a deep copy of an object', () => {
    const original = { a: 1, b: { c: [1, 2, 3] } };
    const cloned = deepClone(original);

    expect(cloned).toEqual(original);
    expect(cloned).not.toBe(original);
    expect(cloned.b).not.toBe(original.b);
    expect(cloned.b.c).not.toBe(original.b.c);
  });

  it('should clone arrays', () => {
    const original = [1, { a: 2 }, [3, 4]];
    const cloned = deepClone(original);

    expect(cloned).toEqual(original);
    expect(cloned).not.toBe(original);
  });
});

describe('omit', () => {
  it('should remove specified keys', () => {
    const result = omit({ a: 1, b: 2, c: 3 }, ['b']);

    expect(result).toEqual({ a: 1, c: 3 });
  });

  it('should handle multiple keys', () => {
    const result = omit({ a: 1, b: 2, c: 3, d: 4 }, ['a', 'c']);

    expect(result).toEqual({ b: 2, d: 4 });
  });

  it('should return full object when no keys to omit', () => {
    const result = omit({ a: 1, b: 2 }, []);

    expect(result).toEqual({ a: 1, b: 2 });
  });
});

describe('pick', () => {
  it('should keep only specified keys', () => {
    const result = pick({ a: 1, b: 2, c: 3 }, ['a', 'c']);

    expect(result).toEqual({ a: 1, c: 3 });
  });

  it('should ignore keys that do not exist', () => {
    const result = pick({ a: 1, b: 2 } as any, ['a', 'z']);

    expect(result).toEqual({ a: 1 });
  });

  it('should return empty object when no keys to pick', () => {
    const result = pick({ a: 1, b: 2 }, []);

    expect(result).toEqual({});
  });
});

describe('chunk', () => {
  it('should split an array into chunks of the given size', () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });

  it('should return one chunk when size >= array length', () => {
    expect(chunk([1, 2, 3], 5)).toEqual([[1, 2, 3]]);
  });

  it('should return empty array for empty input', () => {
    expect(chunk([], 3)).toEqual([]);
  });

  it('should handle chunk size of 1', () => {
    expect(chunk([1, 2, 3], 1)).toEqual([[1], [2], [3]]);
  });
});

// ============================================
// Async Helpers
// ============================================

describe('sleep', () => {
  it('should resolve after the specified time', async () => {
    const start = Date.now();
    await sleep(50);
    const elapsed = Date.now() - start;

    expect(elapsed).toBeGreaterThanOrEqual(40);
  });
});

describe('retryWithBackoff', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should return immediately on first success', async () => {
    const fn = jest.fn().mockResolvedValue('ok');

    const promise = retryWithBackoff(fn, { maxRetries: 3, initialDelayMs: 100 });
    const result = await promise;

    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should retry and succeed on a later attempt', async () => {
    jest.useRealTimers();

    const fn = jest.fn()
      .mockRejectedValueOnce(new Error('fail 1'))
      .mockRejectedValueOnce(new Error('fail 2'))
      .mockResolvedValueOnce('success');

    const result = await retryWithBackoff(fn, {
      maxRetries: 3,
      initialDelayMs: 10,
      backoffMultiplier: 1,
    });

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('should throw the last error after exhausting all retries', async () => {
    jest.useRealTimers();

    const fn = jest.fn().mockRejectedValue(new Error('always fails'));

    await expect(
      retryWithBackoff(fn, { maxRetries: 2, initialDelayMs: 10, backoffMultiplier: 1 })
    ).rejects.toThrow('always fails');

    // initial attempt + 2 retries = 3 calls
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('should use default options when none provided', async () => {
    jest.useRealTimers();

    const fn = jest.fn().mockResolvedValue('ok');

    const result = await retryWithBackoff(fn);

    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should wrap non-Error throws into Error objects', async () => {
    jest.useRealTimers();

    const fn = jest.fn().mockRejectedValue('string error');

    await expect(
      retryWithBackoff(fn, { maxRetries: 0 })
    ).rejects.toThrow('string error');
  });

  it('should respect maxDelayMs cap', async () => {
    jest.useRealTimers();

    const fn = jest.fn()
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValueOnce('ok');

    const start = Date.now();
    await retryWithBackoff(fn, {
      maxRetries: 1,
      initialDelayMs: 10,
      maxDelayMs: 15,
      backoffMultiplier: 100, // Would be 1000ms without cap
    });
    const elapsed = Date.now() - start;

    // Should not wait longer than maxDelayMs + margin
    expect(elapsed).toBeLessThan(100);
    expect(fn).toHaveBeenCalledTimes(2);
  });
});

// ============================================
// String Helpers
// ============================================

describe('generateRandomString', () => {
  it('should generate a string of the requested length', () => {
    expect(generateRandomString(10)).toHaveLength(10);
    expect(generateRandomString(0)).toHaveLength(0);
    expect(generateRandomString(100)).toHaveLength(100);
  });

  it('should only contain alphanumeric characters', () => {
    const result = generateRandomString(1000);
    expect(result).toMatch(/^[A-Za-z0-9]+$/);
  });

  it('should produce different strings on subsequent calls', () => {
    const a = generateRandomString(20);
    const b = generateRandomString(20);

    // Extremely unlikely to collide with 62^20 possibilities
    expect(a).not.toBe(b);
  });
});

// ============================================
// Pagination
// ============================================

describe('calculatePagination', () => {
  it('should calculate correct pagination for the first page', () => {
    const result = calculatePagination(1, 20, 100);

    expect(result).toEqual({
      page: 1,
      limit: 20,
      total: 100,
      totalPages: 5,
      hasNextPage: true,
      hasPrevPage: false,
    });
  });

  it('should calculate correct pagination for the last page', () => {
    const result = calculatePagination(5, 20, 100);

    expect(result).toEqual({
      page: 5,
      limit: 20,
      total: 100,
      totalPages: 5,
      hasNextPage: false,
      hasPrevPage: true,
    });
  });

  it('should calculate correct pagination for a middle page', () => {
    const result = calculatePagination(3, 10, 42);

    expect(result).toEqual({
      page: 3,
      limit: 10,
      total: 42,
      totalPages: 5,
      hasNextPage: true,
      hasPrevPage: true,
    });
  });

  it('should handle single page', () => {
    const result = calculatePagination(1, 20, 5);

    expect(result).toEqual({
      page: 1,
      limit: 20,
      total: 5,
      totalPages: 1,
      hasNextPage: false,
      hasPrevPage: false,
    });
  });

  it('should handle zero total', () => {
    const result = calculatePagination(1, 20, 0);

    expect(result).toEqual({
      page: 1,
      limit: 20,
      total: 0,
      totalPages: 0,
      hasNextPage: false,
      hasPrevPage: false,
    });
  });
});
