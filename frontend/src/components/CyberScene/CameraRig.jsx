import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * Cinematic camera movement for the CyberScene.
 * Gently pans and floats while always looking at the center.
 */
export default function CameraRig() {
  const vec = new THREE.Vector3();
  const target = new THREE.Vector3();
  
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    
    // Slow, subtle cinematic pan mixed with pointer movement
    // Reduced multipliers to make it less distracting and more premium
    const targetX = Math.sin(t * 0.05) * 1.5 + (state.pointer.x * 1.2);
    const targetY = Math.cos(t * 0.05) * 1.5 + (state.pointer.y * 1.2);
    
    // Smoothly interpolate camera position towards target
    // Starting z is around 10 to see the whole network closer up
    state.camera.position.lerp(vec.set(targetX, targetY, 10), 0.02);
    
    // Always keep focus near the center with a very subtle sway
    target.set(Math.sin(t * 0.1) * 0.2, Math.cos(t * 0.1) * 0.2, 0);
    state.camera.lookAt(target);
  });
  
  return null;
}
