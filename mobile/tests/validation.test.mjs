import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { validNigerianPhone, validRedeemAmount } from '../src/lib/validation.ts';

test('supports ordinary Nigerian mobile numbers', () => {
  assert.equal(validNigerianPhone('08012345678'), true);
  assert.equal(validNigerianPhone('+2348012345678'), true);
  assert.equal(validNigerianPhone('09012345678'), true);
});
test('rejects malformed or non-Nigerian phone numbers', () => {
  assert.equal(validNigerianPhone('08012'), false);
  assert.equal(validNigerianPhone('12345678901'), false);
  assert.equal(validNigerianPhone('+15551234567'), false);
});
test('redemption requires verified balance and exact bounds', () => {
  assert.equal(validRedeemAmount(50, 50), true);
  assert.equal(validRedeemAmount(5000, 5000), true);
  assert.equal(validRedeemAmount(50, null), false);
  assert.equal(validRedeemAmount(49, 1000), false);
  assert.equal(validRedeemAmount(5001, 9999), false);
  assert.equal(validRedeemAmount(100.5, 1000), false);
  assert.equal(validRedeemAmount(100, 99), false);
  assert.equal(validRedeemAmount(NaN, 1000), false);
});