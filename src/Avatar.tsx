import { useGLTF, useAnimations } from "@react-three/drei";
import { useEffect, useRef } from "react";
import { Group } from "three";

export default function Avatar() {
  const group = useRef<Group>(null);

  const { scene, animations } = useGLTF("/models/avatar.glb");
  console.log("Animations:", animations);

  const { actions } = useAnimations(animations, group);

  useEffect(() => {
    if (actions) {
      const firstAnimation = Object.values(actions)[0];
      firstAnimation?.play();
    }
  }, [actions]);

return (
  <primitive
    ref={group}
    object={scene}
    scale={1}
    position={[0, -1.2, 0]}
  />
);
}