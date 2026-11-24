"use strict";

(() => {
  const { solveHeat, temperatureAt } = globalThis.ThermalMesh;
  const get = (id) => document.getElementById(id);
  const canvas = get("field");
  const context = canvas.getContext("2d");
  const palette = [
    [22, 41, 73], [31, 96, 126], [66, 165, 156], [234, 212, 128], [237, 118, 69],
  ];
  const descriptions = {
    internal: "Heat is generated inside the plate. All four edges are held at zero.",
    gradient: "The left edge is held at one and the right edge at zero. The top and bottom change linearly between them.",
  };
  let solution;

  function drawField() {
    const { width, height } = canvas;
    const image = context.createImageData(width, height);
    for (let row = 0; row < height; row += 1) {
      const y = 1 - row / (height - 1);
      for (let column = 0; column < width; column += 1) {
        const value = temperatureAt(solution, column / (width - 1), y);
        const level = Math.min(1, Math.max(0, value)) * (palette.length - 1);
        const stop = Math.min(palette.length - 2, Math.floor(level));
        const blend = level - stop;
        const pixel = 4 * (row * width + column);
        for (let channel = 0; channel < 3; channel += 1) {
          image.data[pixel + channel] =
            palette[stop][channel] * (1 - blend) + palette[stop + 1][channel] * blend;
        }
        image.data[pixel + 3] = 255;
      }
    }
    context.putImageData(image, 0, 0);

    if (!get("show-mesh").checked) return;
    const divisions = solution.mesh.divisions;
    context.strokeStyle = "rgba(241, 246, 255, 0.5)";
    context.lineWidth = 0.65;
    context.beginPath();
    for (let i = 0; i <= divisions; i += 1) {
      const x = width * i / divisions;
      const y = height * i / divisions;
      context.moveTo(x, 0);
      context.lineTo(x, height);
      context.moveTo(0, y);
      context.lineTo(width, y);
    }
    for (const [lowerLeft, , upperRight] of solution.mesh.triangles.filter((_, index) => index % 2 === 0)) {
      const a = solution.mesh.nodes[lowerLeft];
      const b = solution.mesh.nodes[upperRight];
      context.moveTo(a.x * width, (1 - a.y) * height);
      context.lineTo(b.x * width, (1 - b.y) * height);
    }
    context.stroke();
  }

  function refresh() {
    const scenario = get("scenario").value;
    const divisions = Number(get("divisions").value);
    const status = get("status");

    try {
      solution = solveHeat(divisions, scenario);
      const { mesh, maxNodalError, peak } = solution;
      const center = temperatureAt(solution, 0.5, 0.5).toFixed(4);
      get("scenario-detail").textContent = descriptions[scenario];
      get("nodes").textContent = mesh.nodes.length.toLocaleString();
      get("triangles").textContent = mesh.triangles.length.toLocaleString();
      get("center").textContent = center;
      get("peak").textContent = peak.toFixed(4);
      get("nodal-error").textContent = maxNodalError.toExponential(2);
      canvas.setAttribute("aria-label", `Temperature field on a ${divisions} by ${divisions} mesh. Center temperature ${center}.`);
      drawField();
      status.hidden = true;
    } catch (error) {
      status.textContent = error.message;
      status.hidden = false;
    }
  }

  get("scenario").addEventListener("change", refresh);
  get("divisions").addEventListener("change", refresh);
  get("show-mesh").addEventListener("change", () => {
    if (solution) drawField();
  });
  refresh();
})();
