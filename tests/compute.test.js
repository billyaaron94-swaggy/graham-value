// Run with: node tests/compute.test.js
const assert = require("assert");
const { compute, DEFAULT_SETTINGS, EXAMPLES } = require("../app.js");
const S = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
const near = (a, b, t = 0.01) => assert.ok(Math.abs(a - b) < t, `${a} != ${b}`);

// Maybank example (Bursa, EPS in sen)
let r = compute(EXAMPLES[0], S);
near(r.eps, 0.87, 1e-9); near(r.cons, 10.54); near(r.orig, 16.24);
assert.strictEqual(r.verdict, "Under value, thin margin");

// Reel's Alphabet example, original formula = ~$382
r = compute(EXAMPLES[1], Object.assign({}, S, { basis: "orig" }));
near(r.orig, 381.81); near(r.cons, 213.28);
assert.ok(r.flags.some(f => f.startsWith("g above")));

// Missing yield currency
r = compute(Object.assign({}, EXAMPLES[1], { ccy: "EUR" }), S);
assert.strictEqual(r.verdict, "Add bond yield");

// Negative EPS
r = compute(Object.assign({}, EXAMPLES[0], { eps: -5 }), S);
assert.strictEqual(r.verdict, "Needs positive EPS");

// Y override wins
r = compute(Object.assign({}, EXAMPLES[0], { yo: 5 }), S);
near(r.adj, 0.88, 1e-9);
console.log("All tests passed");
