import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * Renders an expanding glowing volumetric sphere to visualize the scan wave.
 */
export default function ScanEffect({ scanRadius }) {
  const meshRef = useRef();

  useFrame(() => {
    if (meshRef.current && scanRadius >= 0) {
      // Prevent scale 0 error
      const scale = Math.max(0.01, scanRadius);
      meshRef.current.scale.set(scale, scale, scale);

      // Fade out smoothly as it expands
      const opacity = Math.max(0, 1 - (scanRadius / 25));
      meshRef.current.material.opacity = opacity * 0.10; // Kept very subtle to avoid washing out
    }
  });

  if (scanRadius < 0) return null;

  return (
    <mesh ref={meshRef}>
      {/* Icosahedron wireframe gives a premium high-tech "scan" feel */}
      <icosahedronGeometry args={[1, 3]} />
      <meshBasicMaterial
        color="#00D4FF"
        transparent
        wireframe={true}
        opacity={0.10}
        toneMapped={false}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}
