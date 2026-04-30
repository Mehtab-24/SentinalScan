import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const seededRandom = (seed) => {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
};

const createParticle = (index, progressSeed = 0) => {
  const theta = seededRandom(index + progressSeed + 1) * 2 * Math.PI;
  const phi = Math.acos((seededRandom(index + progressSeed + 2) * 2) - 1);
  const r = 2.0 + seededRandom(index + progressSeed + 3) * 7.0;
  const start = new THREE.Vector3(
    r * Math.sin(phi) * Math.cos(theta),
    r * Math.sin(phi) * Math.sin(theta),
    r * Math.cos(phi) * 0.4
  );
  const end = start.clone().add(
    start.clone().normalize().multiplyScalar(1.5 + seededRandom(index + progressSeed + 4) * 3)
  );

  return {
    start,
    end,
    progress: seededRandom(index + progressSeed + 5),
    speed: 0.08 + seededRandom(index + progressSeed + 6) * 0.12,
  };
};

/**
 * Animates particles moving to simulate data packets flowing.
 * Optimized for performance and a graceful cinematic aesthetic.
 */
export default function DataFlow({ particleCount = 120 }) {
  const meshRef = useRef();
  const resetSeedRef = useRef(1000);

  // Generate particles with random start and end positions to simulate flowing data
  const initialParticles = useMemo(() => {
    const data = [];
    for (let i = 0; i < particleCount; i++) {
      data.push(createParticle(i));
    }
    return data;
  }, [particleCount]);
  const particlesRef = useRef(initialParticles);

  useEffect(() => {
    particlesRef.current = initialParticles;
  }, [initialParticles]);

  const dummy = useMemo(() => new THREE.Object3D(), []);
  // Soft cyan/blue glow for data packets
  const packetColor = useMemo(() => new THREE.Color('#00D4FF').multiplyScalar(1.5), []);

  useFrame((state, delta) => {
    if (!meshRef.current) return;

    const particles = particlesRef.current;
    for (let i = 0; i < particleCount; i++) {
      const p = particles[i];
      p.progress += delta * p.speed;

      // Reset particle when it reaches the end smoothly
      if (p.progress >= 1) {
        Object.assign(p, createParticle(i, resetSeedRef.current++));
        p.progress = 0;
      }

      // Smooth ease-in-out interpolation for fluid motion
      const easeProgress = p.progress < 0.5 
        ? 2 * p.progress * p.progress 
        : -1 + (4 - 2 * p.progress) * p.progress;

      dummy.position.copy(p.start).lerp(p.end, easeProgress);
      
      // Pulse scale so it fades in/out naturally instead of popping into existence
      const scale = Math.sin(p.progress * Math.PI) * 1.5;
      dummy.scale.set(scale, scale, scale);
      
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
      meshRef.current.setColorAt(i, packetColor);
    }

    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[null, null, particleCount]} frustumCulled={false}>
      {/* icosahedron is highly performant (20 polys) and looks sharp */}
      <icosahedronGeometry args={[0.02, 0]} />
      <meshBasicMaterial toneMapped={false} />
    </instancedMesh>
  );
}
