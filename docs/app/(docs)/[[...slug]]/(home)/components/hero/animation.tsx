import { Canvas, useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { ExtrudeGeometry, type Group, Shape } from "three";

type BoxProps = {
  position: [number, number, number];
  rotation: [number, number, number];
};

const Box = ({ position, rotation }: BoxProps) => {
  const shape = new Shape();
  const angleStep = Math.PI * 0.5;
  const radius = 1;

  shape.absarc(2, 2, radius, angleStep * 0, angleStep * 1);
  shape.absarc(-2, 2, radius, angleStep * 1, angleStep * 2);
  shape.absarc(-2, -2, radius, angleStep * 2, angleStep * 3);
  shape.absarc(2, -2, radius, angleStep * 3, angleStep * 4);

  const extrudeSettings = {
    depth: 0.3,
    bevelEnabled: true,
    bevelThickness: 0.05,
    bevelSize: 0.05,
    bevelSegments: 20,
    curveSegments: 20,
  };

  const geometry = new ExtrudeGeometry(shape, extrudeSettings);
  geometry.center();

  return (
    <mesh geometry={geometry} position={position} rotation={rotation}>
      <meshPhysicalMaterial
        alphaTest={0}
        clearcoat={0.0}
        clearcoatRoughness={0.0}
        color="#232323"
        depthTest={true}
        depthWrite={true}
        emissive="#000000"
        emissiveIntensity={0}
        flatShading={false}
        ior={1.5}
        iridescence={1}
        iridescenceIOR={1.3}
        iridescenceThicknessRange={[100, 400]}
        metalness={1}
        opacity={1.0}
        reflectivity={0.5}
        roughness={0.3}
        sheen={0}
        sheenColor="#ffffff"
        sheenRoughness={1.0}
        side={0}
        specularColor="#ffffff"
        specularIntensity={1.0}
        thickness={0.5}
        transmission={0.0}
        transparent={false}
      />
    </mesh>
  );
};

const AnimatedBoxes = () => {
  const groupRef = useRef<Group>(null);

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.x += delta * 0.05;
    }
  });

  const boxes = Array.from({ length: 50 }, (_, index) => ({
    position: [(index - 25) * 0.75, 0, 0],
    rotation: [(index - 10) * 0.1, Math.PI / 2, 0],
    id: index,
  }));

  return (
    <group ref={groupRef}>
      {boxes.map((box) => (
        <Box
          key={box.id}
          position={box.position as [number, number, number]}
          rotation={box.rotation as [number, number, number]}
        />
      ))}
    </group>
  );
};

export const Animation = () => (
  <div className="z-0 h-full w-full">
    <Canvas camera={{ position: [5, 5, 20], fov: 40 }}>
      <ambientLight intensity={15} />
      <directionalLight intensity={15} position={[10, 10, 5]} />
      <AnimatedBoxes />
    </Canvas>
  </div>
);
