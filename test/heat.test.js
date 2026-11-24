"use strict";

const assert = require("node:assert/strict");
const { test } = require("node:test");
const { squareMesh, solveHeat, temperatureAt } = require("../src/heat.js");

test("the mesh tiles the unit square with positively oriented triangles", () => {
  const mesh = squareMesh(8);
  assert.equal(mesh.nodes.length, 81);
  assert.equal(mesh.nodes.filter((node) => node.boundary).length, 32);
  assert.equal(mesh.triangles.length, 128);
  let totalArea = 0;
  for (const triangle of mesh.triangles) {
    const [a, b, c] = triangle.map((id) => mesh.nodes[id]);
    const area = ((b.x - a.x) * (c.y - a.y) - (c.x - a.x) * (b.y - a.y)) / 2;
    assert.ok(area > 0);
    totalArea += area;
  }
  assert.equal(totalArea, 1);
});

test("the linear field is reproduced at boundary nodes and inside both triangles", () => {
  const result = solveHeat(16, "gradient");
  assert.ok(result.maxNodalError < 1e-9);
  for (const [x, y] of [[0, 0], [0, 1], [0.4, 0.43], [0.43, 0.4], [1, 0.23]]) {
    assert.ok(Math.abs(temperatureAt(result, x, y) - (1 - x)) < 1e-9);
  }
});

test("the manufactured solution approaches second order under mesh refinement", () => {
  const results = [8, 16, 32, 64].map((n) => solveHeat(n, "internal"));
  for (let index = 1; index < results.length; index += 1) {
    const ratio = results[index - 1].maxNodalError / results[index].maxNodalError;
    assert.ok(ratio > 3.8 && ratio < 4.2, `Expected an error ratio near 4, got ${ratio}`);
  }
  assert.ok(results[2].maxNodalError < 0.001);
  assert.equal(temperatureAt(results[2], 0.3, 0), 0);
  assert.equal(temperatureAt(results[2], 1, 0.3), 0);
  assert.ok(Math.abs(temperatureAt(results[2], 0.5, 0.5) - 1) < 0.001);
});

test("unsupported grid sizes, scenarios, and sample points are rejected", () => {
  for (const divisions of [1, 65, 2.5, NaN]) {
    assert.throws(() => squareMesh(divisions), RangeError);
  }
  assert.throws(() => solveHeat(8, "constructor"), RangeError);
  const result = solveHeat(8, "internal");
  assert.throws(() => temperatureAt(result, NaN, 0.5), RangeError);
  assert.throws(() => temperatureAt(result, 0.5, 1.1), RangeError);
});
