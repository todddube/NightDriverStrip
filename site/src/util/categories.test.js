import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getEffectCategory, getCategory } from './categories.js';

test('matches whole words by prefix, not arbitrary substrings', () => {
    assert.equal(getEffectCategory('Spring Fling'), 'other');   // "ring" must not match "Spring"
    assert.equal(getEffectCategory('String Theory'), 'other');
    assert.equal(getEffectCategory('Rings'), 'geo');
    assert.equal(getEffectCategory('Fireplace'), 'fire');
});

test('splits camelCase names into words', () => {
    assert.equal(getEffectCategory('PongClock'), 'classic');    // "pong" is checked before "clock"
    assert.equal(getEffectCategory('RadialFire'), 'fire');
});

test('real effect names keep their categories', () => {
    assert.equal(getEffectCategory('Liquidflow'), 'particle');
    assert.equal(getEffectCategory('Colorball'), 'particle');   // "colorball" beats the generic "color"
    assert.equal(getEffectCategory('Clock'), 'info');
    assert.equal(getEffectCategory('Supernova'), 'space');
});

test('getCategory falls back to Other', () => {
    assert.equal(getCategory('nope').id, 'other');
});
