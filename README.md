# Thermal Mesh Lab

An offline finite-element lab for seeing how a mesh changes a physical prediction. The first milestone solves steady-state heat conduction on a square plate and measures the numerical result against a known answer. The project starts from the **Finite Elements From the Mesh Up** example in the supplied project guide.

## Run locally

Open [index.html](index.html) in a browser. Pick **Internal heat source** or **Warm left edge**, change the mesh resolution, and toggle triangle edges to see the interpolated temperature field.

The browser needs no server, package install, account, or internet connection. The terminal checks use Node.js 20 or newer with the standard library.

```sh
node --test
node examples/convergence.js
```

## What the starter computes

The solver splits a unit square into linear triangular elements and assembles a sparse system for `−ΔT = f` at unit conductivity. The source term uses three-point triangle quadrature. Prescribed edge temperatures are eliminated from the system and conjugate gradient solves the interior unknowns. The browser interpolates the computed nodal values across each triangle.

- **Internal heat source.** The exact field is `sin(πx) sin(πy)` and the plate edges stay at zero. The nodal error falls by about four times per refinement from 8 to 64 cells per side.
- **Warm left edge.** The exact field is `1 − x`. The test checks both the nodal solution and interpolated samples.

The error shown is the maximum absolute error **at mesh nodes**. The current implementation supports structured square meshes and fixed temperatures on all four edges.

## Next milestones

1. Add an unstructured mesher for plates with holes and brackets. Check orientation, boundary tags, and mesh quality.
2. Add transient heat with mixed boundary conditions and energy-balance checks.
3. Add plane-stress elasticity, thermal expansion, and modal analysis. Compare deflection, stress concentration, and natural frequencies with reference cases.
4. Extend the solver to 3D and measure run time and memory. The guide’s stretch target is a million unknowns in two minutes under 8 GB, with 40 reference cases within 1%.

Method reference [FEniCSx tutorial on checking finite-element convergence](https://jsdokken.com/dolfinx-tutorial/stable/chapter4/convergence.html).
