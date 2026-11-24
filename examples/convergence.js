"use strict";

const { solveHeat } = require("../src/heat.js");

console.log("Internal heat source: max nodal error against sin(πx) sin(πy)");
console.log("Cells/side   Triangles    Max error     Order");
let previousError;
for (const divisions of [8, 16, 32, 64]) {
  const { mesh, maxNodalError } = solveHeat(divisions, "internal");
  const order = previousError === undefined ? "—" : Math.log2(previousError / maxNodalError).toFixed(2);
  console.log(
    String(divisions).padEnd(13) +
    String(mesh.triangles.length).padEnd(13) +
    maxNodalError.toExponential(4).padEnd(14) +
    order,
  );
  previousError = maxNodalError;
}
