/* Generate the two deterministic attractor point clouds away from the main thread. */
self.addEventListener('message', (event) => {
  const { count, pointScale, attractors } = event.data;

  if (!Number.isInteger(count) || count <= 0 || !Number.isFinite(pointScale) || attractors?.length !== 2) {
    self.postMessage({ error: 'Invalid particle worker input.' });
    return;
  }

  try {
    const startPositions = createAttractorPositions(count, pointScale, attractors[0]);
    const endPositions = createAttractorPositions(count, pointScale, attractors[1]);

    self.postMessage({
      startPositions: startPositions.buffer,
      endPositions: endPositions.buffer
    }, [startPositions.buffer, endPositions.buffer]);
  } catch (error) {
    self.postMessage({
      error: error instanceof Error ? error.message : 'Particle generation failed.'
    });
  }
});

function createAttractorPositions(count, pointScale, attractor) {
  const positions = new Float32Array(count * 3);
  let x = 0;
  let y = 0;
  let z = 0;

  for (let index = 0; index < count; index += 1) {
    const offset = index * 3;
    // Math.fround preserves the exact Float32 recurrence used by the original typed-array loop.
    const nextX = Math.fround(Math.sin(attractor.a * y) - Math.cos(attractor.b * x));
    const nextY = Math.fround(Math.sin(attractor.c * x) - Math.cos(attractor.d * y));
    const nextZ = Math.fround(Math.sin(attractor.e * x) - Math.cos(attractor.f * z));

    positions[offset] = nextX * pointScale + attractor.xOffset;
    positions[offset + 1] = nextY * pointScale;
    positions[offset + 2] = nextZ * pointScale;
    x = nextX;
    y = nextY;
    z = nextZ;
  }

  return positions;
}
