import { describe, expect, it } from 'vitest';
import { isLocalRequest, lanAddresses } from '../src/network';

describe('réseau local', () => {
  it('ne liste que des adresses IPv4 privées', () => {
    for (const ip of lanAddresses()) {
      expect(ip).toMatch(/^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/);
    }
  });

  it('reconnaît une requête locale vers localhost', () => {
    expect(isLocalRequest('127.0.0.1', 'localhost:3000')).toBe(true);
    expect(isLocalRequest('::1', '[::1]:3000')).toBe(true);
    expect(isLocalRequest('::ffff:127.0.0.1', '127.0.0.1')).toBe(true);
    expect(isLocalRequest('192.168.1.7', 'localhost:3000')).toBe(false);
    expect(isLocalRequest('127.0.0.1', 'pepite.example.org')).toBe(false);
    expect(isLocalRequest('127.0.0.1', undefined)).toBe(false);
  });
});
