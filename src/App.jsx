import * as THREE from "three";
import { useEffect, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useCursor, MeshReflectorMaterial, Image, Environment, useAspect } from "@react-three/drei";
import { useRoute, useLocation } from "wouter";
import { easing } from "maath";
import getUuid from "uuid-by-string";
import "./App.css";
import * as calendar from "./calendar";

export const App = () => {
    const [memesUrls, changeMemesUrl] = useState([]);
    const [loader, setLoader] = useState(false);

    useEffect(() => {
        setLoader(true);
        fetch("https://www.reddit.com/r/memes/top.json?limit=15")
            .then(data => {
                return data.json();
            })
            .then(async ({ data }) => {
                debugger;
                const images = await Promise.all(
                    data.children.map(async child => {
                        try {
                            await fetch(child.data.url);
                            return {
                                url: child.data.url,
                            };
                        } catch (_) {
                            return {
                                url: "",
                            };
                        }
                    })
                );
                changeMemesUrl(
                    images.reduce((acc, cur) => {
                        if (acc.some(image => image.url === cur.url || !cur.url)) {
                            return acc;
                        }
                        return [
                            ...acc,
                            {
                                ...cur,
                                position: [(acc.at(-1)?.position?.[0] ?? 0) + 1, 0, 0],
                                rotation: [0, 0, 0],
                            },
                        ];
                    }, [])
                );
                setLoader(false);
            })
            .catch(err => {
                console.error(err);
                setLoader(false);
            });
    }, []);

    return (
        <>
            <calendar.Calendar />
            {loader ? (
                <div style={{ position: "absolute", left: "50%", top: "50%" }}>Loading...</div>
            ) : null}
            <Canvas dpr={[1, 1.5]} camera={{ fov: 70, position: [0, 2, 15] }}>
                {/* <color attach="background" args={["#191920"]} /> */}
                {/* <fog attach="fog" args={["#191920", 0, 15]} /> */}
                <group position={[0, -0.2, 0]}>
                    <Frames images={memesUrls} />
                    <mesh rotation={[-Math.PI / 2, 0, 0]}>
                        <planeGeometry args={[150, 150]} />
                        <MeshReflectorMaterial
                            blur={[300, 1200]}
                            resolution={1024}
                            mixBlur={2}
                            mixStrength={70}
                            roughness={1}
                            depthScale={1.2}
                            minDepthThreshold={0.4}
                            maxDepthThreshold={1.4}
                            color="#050505"
                            metalness={0.5}
                            mirror={0}
                        />
                    </mesh>
                </group>
                <Environment preset="studio" />
            </Canvas>
        </>
    );
};

function Frames({ images, q = new THREE.Quaternion(), p = new THREE.Vector3() }) {
    const ref = useRef();
    const clicked = useRef();
    const [, params] = useRoute("/item/:id");
    const [, setLocation] = useLocation();
    useEffect(() => {
        clicked.current = ref.current.getObjectByName(params?.id);
        if (clicked.current) {
            clicked.current.parent.updateWorldMatrix(true, true);
            clicked.current.parent.localToWorld(p.set(0, 0.5, 1.25));
            clicked.current.parent.getWorldQuaternion(q);
        } else {
            p.set(0, 0, 2.5);
            q.identity();
        }
    });
    useFrame((state, dt) => {
        easing.damp3(state.camera.position, p, 0.4, dt);
        easing.dampQ(state.camera.quaternion, q, 0.4, dt);
    });
    return (
        <group
            ref={ref}
            onClick={e => {
                e.stopPropagation();
                setLocation(clicked.current === e.object ? "/" : "/item/" + e.object.name);
            }}
            onPointerMissed={() => setLocation("/")}>
            {images.map((props) => <Frame key={props.url} {...props} /> /* prettier-ignore */)}
        </group>
    );
}

function Frame({ url, c = new THREE.Color(), ...props }) {
    const image = useRef();
    const frame = useRef();
    const [, params] = useRoute("/item/:id");
    const [hovered, hover] = useState(false);
    const name = getUuid(url);
    const isActive = params?.id === name;
    useCursor(hovered);
    useFrame((_, dt) => {
        easing.damp3(
            image.current.scale,
            [0.85 * (!isActive && hovered ? 0.85 : 1), 0.9 * (!isActive && hovered ? 0.905 : 1), 1],
            0.5,
            dt
        );
        // easing.dampC(frame.current.material.color, hovered ? "#6B1414" : "white", 0.2, dt);
    });

    return (
        <group {...props}>
            <mesh
                name={name}
                onPointerOver={e => {
                    e.stopPropagation();
                    hover(true);
                }}
                onPointerOut={() => hover(false)}
                scale={[1, 1, 0.5]}
                position={[0, 0.5, 0]}>
                <boxGeometry />

                <mesh ref={frame} raycast={() => null} scale={[1, 1, 1]} position={[0, 0, 0]}>
                    <boxGeometry />
                    <meshBasicMaterial toneMapped={false} fog={false} />
                </mesh>

                <Image
                    raycast={() => null}
                    ref={image}
                    position={[0, 0, 1]}
                    scale={[1, 1, 1]}
                    url={url}
                />
            </mesh>
        </group>
    );
}
