"use strict";

(() => {
  const sine = (x, y) => Math.sin(Math.PI * x) * Math.sin(Math.PI * y);
  const cases = Object.freeze({
    internal: Object.freeze({
      source: (x, y) => 2 * Math.PI ** 2 * sine(x, y),
      boundary: () => 0,
      exact: sine,
    }),
    gradient: Object.freeze({
      source: () => 0,
      boundary: (x) => 1 - x,
      exact: (x) => 1 - x,
    }),
  });

  function squareMesh(divisions) {
    if (!Number.isInteger(divisions) || divisions < 2 || divisions > 64) {
      throw new RangeError("Use an integer from 2 through 64 for the mesh divisions.");
    }

    const stride = divisions + 1;
    const nodes = [];
    const triangles = [];
    for (let row = 0; row <= divisions; row += 1) {
      for (let column = 0; column <= divisions; column += 1) {
        nodes.push({
          x: column / divisions,
          y: row / divisions,
          boundary: row === 0 || row === divisions || column === 0 || column === divisions,
        });
      }
    }
    for (let row = 0; row < divisions; row += 1) {
      for (let column = 0; column < divisions; column += 1) {
        const lowerLeft = row * stride + column;
        const lowerRight = lowerLeft + 1;
        const upperLeft = lowerLeft + stride;
        const upperRight = upperLeft + 1;
        triangles.push([lowerLeft, lowerRight, upperRight], [lowerLeft, upperRight, upperLeft]);
      }
    }
    return { divisions, nodes, triangles };
  }

  // Barycentric points for degree-two integration over a triangle.
  const quadrature = [
    [2 / 3, 1 / 6, 1 / 6],
    [1 / 6, 2 / 3, 1 / 6],
    [1 / 6, 1 / 6, 2 / 3],
  ];

  function assemble(mesh, problem) {
    const temperatures = new Float64Array(mesh.nodes.length);
    const unknowns = new Int32Array(mesh.nodes.length);
    let count = 0;
    for (const [id, node] of mesh.nodes.entries()) {
      if (node.boundary) {
        temperatures[id] = problem.boundary(node.x, node.y);
        unknowns[id] = -1;
      } else {
        unknowns[id] = count;
        count += 1;
      }
    }
    const matrix = Array.from({ length: count }, () => new Map());
    const load = new Float64Array(count);

    for (const ids of mesh.triangles) {
      const [a, b, c] = ids.map((id) => mesh.nodes[id]);
      const twiceArea = (b.x - a.x) * (c.y - a.y) - (c.x - a.x) * (b.y - a.y);
      const dx = [b.y - c.y, c.y - a.y, a.y - b.y];
      const dy = [c.x - b.x, a.x - c.x, b.x - a.x];
      const samples = quadrature.map(([wa, wb, wc]) => {
        const x = wa * a.x + wb * b.x + wc * c.x;
        const y = wa * a.y + wb * b.y + wc * c.y;
        return problem.source(x, y);
      });

      for (let i = 0; i < 3; i += 1) {
        const row = unknowns[ids[i]];
        if (row < 0) continue;
        for (let q = 0; q < quadrature.length; q += 1) {
          load[row] += twiceArea / 6 * quadrature[q][i] * samples[q];
        }
        for (let j = 0; j < 3; j += 1) {
          const column = unknowns[ids[j]];
          const stiffness = (dx[i] * dx[j] + dy[i] * dy[j]) / (2 * twiceArea);
          if (column < 0) {
            load[row] -= stiffness * temperatures[ids[j]];
          } else if (stiffness !== 0) {
            matrix[row].set(column, (matrix[row].get(column) ?? 0) + stiffness);
          }
        }
      }
    }
    return { matrix, load, unknowns, temperatures };
  }

  function dot(a, b) {
    let value = 0;
    for (let i = 0; i < a.length; i += 1) value += a[i] * b[i];
    return value;
  }

  function conjugateGradient(matrix, load) {
    const n = load.length;
    const values = new Float64Array(n);
    const residual = load.slice();
    const direction = residual.slice();
    const product = new Float64Array(n);
    let energy = dot(residual, residual);
    const tolerance = Math.sqrt(energy) * 1e-11;
    let iterations = 0;

    while (Math.sqrt(energy) > tolerance && iterations < n) {
      for (const [row, entries] of matrix.entries()) {
        let sum = 0;
        for (const [column, coefficient] of entries) sum += coefficient * direction[column];
        product[row] = sum;
      }
      const curvature = dot(direction, product);
      if (curvature <= 0 || !Number.isFinite(curvature)) throw new Error("Invalid stiffness matrix.");
      const step = energy / curvature;
      for (let i = 0; i < n; i += 1) {
        values[i] += step * direction[i];
        residual[i] -= step * product[i];
      }
      const nextEnergy = dot(residual, residual);
      for (let i = 0; i < n; i += 1) {
        direction[i] = residual[i] + nextEnergy / energy * direction[i];
      }
      energy = nextEnergy;
      iterations += 1;
    }

    const norm = Math.sqrt(energy);
    if (!Number.isFinite(norm) || norm > tolerance) throw new Error("Heat solver did not converge.");
    return { values, iterations };
  }

  function solveHeat(divisions, caseName) {
    if (!Object.hasOwn(cases, caseName)) throw new RangeError("Unknown heat scenario.");
    const problem = cases[caseName];
    const mesh = squareMesh(divisions);
    const { matrix, load, unknowns, temperatures } = assemble(mesh, problem);
    const { values, iterations } = conjugateGradient(matrix, load);
    let maxNodalError = 0;
    let peak = 0;
    for (const [id, { x, y }] of mesh.nodes.entries()) {
      if (unknowns[id] >= 0) temperatures[id] = values[unknowns[id]];
      maxNodalError = Math.max(maxNodalError, Math.abs(temperatures[id] - problem.exact(x, y)));
      peak = Math.max(peak, temperatures[id]);
    }
    return { mesh, temperatures, iterations, maxNodalError, peak };
  }

  function temperatureAt(result, x, y) {
    if (!Number.isFinite(x) || !Number.isFinite(y) || x < 0 || x > 1 || y < 0 || y > 1) {
      throw new RangeError("Sample points must be on the unit square.");
    }
    const { mesh: { divisions }, temperatures } = result;
    const column = Math.min(divisions - 1, Math.floor(x * divisions));
    const row = Math.min(divisions - 1, Math.floor(y * divisions));
    const u = x * divisions - column;
    const v = y * divisions - row;
    const a = row * (divisions + 1) + column;
    const b = a + 1;
    const c = a + divisions + 2;
    const d = c - 1;

    if (v <= u) return (1 - u) * temperatures[a] + (u - v) * temperatures[b] + v * temperatures[c];
    return (1 - v) * temperatures[a] + u * temperatures[c] + (v - u) * temperatures[d];
  }

  const api = Object.freeze({ squareMesh, solveHeat, temperatureAt });
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  } else {
    globalThis.ThermalMesh = api;
  }
})();
