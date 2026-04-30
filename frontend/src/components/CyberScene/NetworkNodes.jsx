import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const seededRandom = (seed) => {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
};

/**
 * Renders the 3D network of glowing nodes and connection lines.
 * Uses InstancedMesh for high performance.
 */
export default function NetworkNodes({ count = 75, scanRadius = -1 }) {
  const meshRef = useRef();

  // Generate random positions and connections
  const { positions, lines, nodeProps } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const nodesArr = [];

    for (let i = 0; i < count; i++) {
      const theta = seededRandom(i + 1) * 2 * Math.PI;
      const phi = Math.acos((seededRandom(i + 2) * 2) - 1);
      // Spread nodes evenly: avoiding the direct center, expanding outward
      const r = 3.0 + Math.cbrt(seededRandom(i + 3)) * 7.0;

      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta);
      const z = r * Math.cos(phi) * 0.4; // flatten slightly on Z axis

      pos[i * 3] = x;
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = z;
      nodesArr.push(new THREE.Vector3(x, y, z));
    }

    // Connect smart nearest neighbors (2 lines per node) to reduce clutter and line rendering
    const linePts = [];
    const addedLines = new Set();

    for (let i = 0; i < count; i++) {
      const distances = [];
      for (let j = 0; j < count; j++) {
        if (i !== j) {
          distances.push({ index: j, dist: nodesArr[i].distanceTo(nodesArr[j]) });
        }
      }
      distances.sort((a, b) => a.dist - b.dist);
      
      const numConns = 3; // Slightly denser, cinematic connections
      for (let k = 0; k < numConns; k++) {
        const j = distances[k].index;
        const key = i < j ? `${i}-${j}` : `${j}-${i}`;
        if (!addedLines.has(key)) {
          addedLines.add(key);
          linePts.push(nodesArr[i].x, nodesArr[i].y, nodesArr[i].z);
          linePts.push(nodesArr[j].x, nodesArr[j].y, nodesArr[j].z);
        }
      }
    }

    // Precompute node properties
    const props = [];
    for (let i = 0; i < count; i++) {
      props.push({
        isThreat: i % 17 === 0 && i !== 0,
        baseScale: seededRandom(i + 100) * 0.3 + 0.6, // Slightly softer scale variance
        phaseOffset: seededRandom(i + 200) * Math.PI * 2
      });
    }

    return { positions: pos, lines: new Float32Array(linePts), nodeProps: props };
  }, [count]);

  const dummy = useMemo(() => new THREE.Object3D(), []);
  const color = useMemo(() => new THREE.Color(), []);

  useFrame((state) => {
    const time = state.clock.elapsedTime;

    if (meshRef.current) {
      for (let i = 0; i < count; i++) {
        const x = positions[i * 3];
        const y = positions[i * 3 + 1];
        const z = positions[i * 3 + 2];

        dummy.position.set(x, y, z);

        // Idle pulsing scale - subtle and premium
        const props = nodeProps[i];
        let targetScale = props.baseScale + Math.sin(time * 1.5 + props.phaseOffset) * 0.1;

        // Scan wave logic
        if (scanRadius >= 0) {
          const dist = Math.sqrt(x * x + y * y + z * z);
          const distFromWave = scanRadius - dist;

          if (distFromWave > 0 && distFromWave < 4.0) {
            // Just passed the wave - pop effect
            const pop = Math.sin((distFromWave / 4.0) * Math.PI);
            targetScale += pop * 0.5; // Softer pop

            // Color transition
            color.set(props.isThreat ? '#FF3B3B' : '#00FFA3');
            const intensity = 2.0 + (pop * 1.5); // Controlled brightness
            color.multiplyScalar(intensity);
            
          } else if (distFromWave >= 4.0) {
            // Long passed the wave (cool down state)
            color.set(props.isThreat ? '#FF3B3B' : '#00D4FF');
            color.multiplyScalar(props.isThreat ? 1.2 : 0.5);
          } else {
            // Not yet reached by wave
            color.set('#00D4FF').multiplyScalar(0.7);
          }
        } else {
          // Idle state color
          color.set('#00D4FF').multiplyScalar(0.7);
        }

        // Icosahedron nodes look sharp and premium
        dummy.scale.set(targetScale, targetScale, targetScale);
        dummy.updateMatrix();
        meshRef.current.setMatrixAt(i, dummy.matrix);
        meshRef.current.setColorAt(i, color);
      }
      meshRef.current.instanceMatrix.needsUpdate = true;
      if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
    }
  });

  return (
    <group>
      {/* Instanced Nodes using Icosahedron for clean low-poly premium look */}
      <instancedMesh ref={meshRef} args={[null, null, count]} frustumCulled={false}>
        <icosahedronGeometry args={[0.07, 1]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>

      {/* Network Connections - ultra thin and subtle */}
      <lineSegments>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={lines.length / 3}
            array={lines}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color="#00D4FF" transparent opacity={0.12} depthWrite={false} />
      </lineSegments>
    </group>
  );
}
