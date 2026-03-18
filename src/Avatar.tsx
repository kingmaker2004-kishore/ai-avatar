import { useEffect, useRef, useState } from "react";
import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { AnimationMixer, AnimationAction } from "three";

export default function Avatar() {
  const { scene, animations } = useGLTF("/mixamo/avatar_with_animations.glb");

  const mixerRef = useRef<AnimationMixer | null>(null);
  const actionsRef = useRef<{ [key: string]: AnimationAction }>({});
  const [current, setCurrent] = useState<string | null>(null);

  useEffect(() => {
    if (!scene || animations.length === 0) return;

    scene.scale.set(1, 1, 1);
    scene.position.set(0, -1, 0);

    const mixer = new AnimationMixer(scene);
    mixerRef.current = mixer;

    animations.forEach((clip) => {
      actionsRef.current[clip.name] = mixer.clipAction(clip);
    });

    // Play first animation by default
    const firstClip = animations[0];
    actionsRef.current[firstClip.name]?.play();
    setCurrent(firstClip.name);

    console.log("Available animations:", animations.map(a => a.name));
  }, [scene, animations]);

  useEffect(() => {
    if (!current || !actionsRef.current[current]) return;

    Object.values(actionsRef.current).forEach((action) => action.stop());
    actionsRef.current[current].reset().play();
  }, [current]);

  useFrame((_, delta) => {
    mixerRef.current?.update(delta);
  });

  return (
    <>
      <primitive object={scene} />

      {/* Temporary buttons */}
      <mesh position={[-1.5, 2, 0]} onClick={() => setCurrent(animations[0]?.name)}>
        <boxGeometry args={[0.5, 0.5, 0.5]} />
        <meshStandardMaterial color="green" />
      </mesh>

      <mesh position={[0, 2, 0]} onClick={() => setCurrent(animations[1]?.name)}>
        <boxGeometry args={[0.5, 0.5, 0.5]} />
        <meshStandardMaterial color="blue" />
      </mesh>

      <mesh position={[1.5, 2, 0]} onClick={() => setCurrent(animations[2]?.name)}>
        <boxGeometry args={[0.5, 0.5, 0.5]} />
        <meshStandardMaterial color="red" />
      </mesh>
    </>
  );
}