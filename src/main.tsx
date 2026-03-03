import React, { Suspense } from "react";
import ReactDOM from "react-dom/client";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import Avatar from "./Avatar";
import "./style.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Canvas camera={{ position: [0, 1.6, 3], fov: 45 }}>
  <ambientLight intensity={1} />
  <directionalLight position={[2, 5, 2]} intensity={2} />

  <Suspense fallback={null}>
    <Avatar />
  </Suspense>

  <OrbitControls />
</Canvas>
  </React.StrictMode>
);