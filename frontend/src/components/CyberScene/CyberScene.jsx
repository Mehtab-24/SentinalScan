import { useState, useEffect, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import NetworkNodes from './NetworkNodes';
import DataFlow from './DataFlow';
import ScanEffect from './ScanEffect';
import CameraRig from './CameraRig';

/**
 * A wrapper to gently float the entire scene content
 * This ensures nodes, lines, and particles move in perfect sync.
 */
function SceneAnimator({ children }) {
  const groupRef = useRef();
  
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (groupRef.current) {
      // Gentle cinematic breathing motion for the entire network
      groupRef.current.position.y = Math.sin(t * 0.2) * 0.3;
      groupRef.current.rotation.y = Math.sin(t * 0.1) * 0.05;
      groupRef.current.rotation.z = Math.cos(t * 0.1) * 0.02;
    }
  });
  
  return <group ref={groupRef}>{children}</group>;
}

/**
 * Main 3D Canvas component for the cybersecurity background.
 */
export default function CyberScene({ isScanning }) {
  const [scanRadius, setScanRadius] = useState(-1);

  // Manage scan animation state
  useEffect(() => {
    if (isScanning) {
      setScanRadius(0); // Start scan
    } else {
      // Cool down / reset
      const timeout = setTimeout(() => setScanRadius(-1), 1000);
      return () => clearTimeout(timeout);
    }
  }, [isScanning]);

  // Update scanRadius over time when scanning
  useEffect(() => {
    let animationFrame;
    if (scanRadius >= 0 && scanRadius < 40) {
      animationFrame = requestAnimationFrame(() => {
        setScanRadius((prev) => prev + 0.3); // Speed of wave
      });
    } else if (scanRadius >= 40 && isScanning) {
      // Loop scan wave if still scanning
      setScanRadius(0);
    }
    return () => cancelAnimationFrame(animationFrame);
  }, [scanRadius, isScanning]);

  return (
    <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 0, background: '#040814' }}>
      <Canvas
        camera={{ position: [0, 0, 10], fov: 60 }}
        dpr={[1, 2]} // Optimize pixel ratio
        performance={{ min: 0.5 }} // Auto-degrade if needed
      >
        {/* Subtle fog for depth perception - pushed back to give breathing room */}
        <fog attach="fog" args={['#040814', 8, 30]} />

        {/* Lighting - carefully balanced to not wash out the scene */}
        <ambientLight intensity={0.4} color="#7C3AED" />
        <pointLight position={[10, 10, 10]} intensity={1.2} color="#00D4FF" />
        <pointLight position={[-10, -10, 10]} intensity={0.8} color="#7C3AED" />

        {/* Scene Components wrapped in Animator - Drastically reduced counts for elegance & performance */}
        <SceneAnimator>
          <NetworkNodes count={60} scanRadius={scanRadius} />
          <DataFlow particleCount={120} />
          <ScanEffect scanRadius={scanRadius} />
        </SceneAnimator>
        
        <CameraRig />

        {/* Post-Processing (Bloom for glowing neon effect) */}
        <EffectComposer disableNormalPass>
          <Bloom
            luminanceThreshold={0.8}
            mipmapBlur
            intensity={1.0} // Kept moderate to ensure stability and no blackout/overexposure
          />
        </EffectComposer>
      </Canvas>
    </div>
  );
}
