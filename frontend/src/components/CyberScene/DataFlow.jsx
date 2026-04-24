import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * Animates particles moving to simulate data packets flowing.
 * Optimized for performance and a graceful cinematic aesthetic.
 */
export default function DataFlow({ particleCount = 120 }) {
  const meshRef = useRef();

  // Generate particles with random start and end positions to simulate flowing data
  const particles = useMemo(() => {
    const data = [];
    for (let i = 0; i < particleCount; i++) {
      const theta = Math.random() * 2 * Math.PI;
      const phi = Math.acos((Math.random() * 2) - 1);
      const r = 2.0 + Math.random() * 7.0; 
      const start = new THREE.Vector3(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.sin(phi) * Math.sin(theta),
        r * Math.cos(phi) * 0.4
      );
      
      // End point further along a predictable direction
      const end = start.clone().add(start.clone().normalize().multiplyScalar(1.5 + Math.random() * 3));

      data.push({
        start,
        end,
        progress: Math.random(), // Start at random progress
        speed: 0.08 + Math.random() * 0.12, // Slower, graceful speed
      });
    }
    return data;
  }, [particleCount]);

  const dummy = useMemo(() => new THREE.Object3D(), []);
  // Soft cyan/blue glow for data packets
  const packetColor = useMemo(() => new THREE.Color('#00D4FF').multiplyScalar(1.5), []);

  useFrame((state, delta) => {
    if (!meshRef.current) return;

    for (let i = 0; i < particleCount; i++) {
      const p = particles[i];
      p.progress += delta * p.speed;

      // Reset particle when it reaches the end smoothly
      if (p.progress >= 1) {
        p.progress = 0;
        
        // Pick new continuous-looking path
        const theta = Math.random() * 2 * Math.PI;
        const phi = Math.acos((Math.random() * 2) - 1);
        const r = 2.0 + Math.random() * 7.0; 
        p.start.set(
          r * Math.sin(phi) * Math.cos(theta),
          r * Math.sin(phi) * Math.sin(theta),
          r * Math.cos(phi) * 0.4
        );
        p.end.copy(p.start).add(p.start.clone().normalize().multiplyScalar(1.5 + Math.random() * 3));
        p.speed = 0.08 + Math.random() * 0.12;
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
