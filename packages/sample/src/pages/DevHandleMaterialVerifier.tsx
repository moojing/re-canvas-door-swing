import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import SampleHeader from "@/components/SampleHeader";
import { doorKnob } from "../../../door-lib/src/assets/models/index.ts";
import {
  createAgedHandleMaterial,
  prepareHandleModel,
} from "../../../door-lib/src/handleModel.ts";
import NotFound from "./NotFound";

const loader = new GLTFLoader();

const lightModes = {
  front: {
    label: "Front",
    key: new THREE.Vector3(0, 1.6, 4),
    fill: new THREE.Vector3(-3, 2, 2),
    warmth: 0xf3d39a,
  },
  side: {
    label: "Side",
    key: new THREE.Vector3(4, 1.3, 2.2),
    fill: new THREE.Vector3(-2, 1.2, -2),
    warmth: 0xe8bf78,
  },
  warm: {
    label: "Warm",
    key: new THREE.Vector3(2.4, 2.6, 3.2),
    fill: new THREE.Vector3(-2.8, 1.2, 2.8),
    warmth: 0xd89b50,
  },
} as const;

type LightMode = keyof typeof lightModes;

const materialRows = () => {
  const material = createAgedHandleMaterial();

  return [
    ["color", `#${material.color.getHexString()}`],
    ["metalness", material.metalness.toFixed(2)],
    ["roughness", material.roughness.toFixed(2)],
    ["envMapIntensity", material.envMapIntensity.toFixed(2)],
    ["emissive", `#${material.emissive.getHexString()}`],
    ["emissiveIntensity", material.emissiveIntensity.toFixed(2)],
    ["texture", material.map?.name ?? "none"],
  ];
};

const fitObjectToView = (object: THREE.Object3D, camera: THREE.PerspectiveCamera) => {
  object.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(object);
  const center = bounds.getCenter(new THREE.Vector3());
  const size = bounds.getSize(new THREE.Vector3());
  const maxDimension = Math.max(size.x, size.y, size.z, 0.001);

  object.position.sub(center);
  camera.position.set(0, maxDimension * 0.12, maxDimension * 3.1);
  camera.near = maxDimension / 100;
  camera.far = maxDimension * 30;
  camera.updateProjectionMatrix();
};

const DevHandleMaterialVerifier = () => {
  const { handleId = "" } = useParams();
  const targetRef = useRef<HTMLDivElement>(null);
  const lightsRef = useRef<{
    key: THREE.DirectionalLight;
    fill: THREE.DirectionalLight;
    ambient: THREE.HemisphereLight;
  } | null>(null);
  const [lightMode, setLightMode] = useState<LightMode>("front");
  const [loadState, setLoadState] = useState<"loading" | "ready" | "failed">("loading");
  const rows = useMemo(materialRows, []);

  useEffect(() => {
    const target = targetRef.current;
    if (!target || handleId !== "door-knob") return;

    let mounted = true;
    let frame = 0;
    setLoadState("loading");

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#050403");

    const camera = new THREE.PerspectiveCamera(34, 1, 0.01, 100);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.52;
    target.appendChild(renderer.domElement);

    const keyLight = new THREE.DirectionalLight(0xf3d39a, 1.15);
    const fillLight = new THREE.DirectionalLight(0x9ab0ff, 0.18);
    const ambient = new THREE.HemisphereLight(0xb89c72, 0x120d09, 0.44);
    scene.add(keyLight, fillLight, ambient);
    lightsRef.current = { key: keyLight, fill: fillLight, ambient };

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enablePan = false;
    controls.minDistance = 0.8;
    controls.maxDistance = 6;

    const resize = () => {
      const { width, height } = target.getBoundingClientRect();
      renderer.setSize(width, height, false);
      camera.aspect = width / Math.max(height, 1);
      camera.updateProjectionMatrix();
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(target);
    resize();

    loader
      .loadAsync(doorKnob)
      .then((gltf) => {
        if (!mounted) return;

        const prepared = prepareHandleModel(gltf.scene);
        if (!prepared) {
          setLoadState("failed");
          return;
        }

        const object = prepared.object;
        object.scale.setScalar(prepared.scale);
        object.rotation.set(0.12, -0.42, 0.05);
        scene.add(object);
        fitObjectToView(object, camera);
        controls.update();
        setLoadState("ready");
      })
      .catch(() => {
        if (mounted) setLoadState("failed");
      });

    const render = () => {
      controls.update();
      renderer.render(scene, camera);
      frame = window.requestAnimationFrame(render);
    };
    render();

    return () => {
      mounted = false;
      window.cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      controls.dispose();
      renderer.dispose();
      lightsRef.current = null;
      target.replaceChildren();
    };
  }, [handleId]);

  useEffect(() => {
    const lights = lightsRef.current;
    if (!lights) return;

    const mode = lightModes[lightMode];
    lights.key.position.copy(mode.key);
    lights.key.color.set(mode.warmth);
    lights.fill.position.copy(mode.fill);
  }, [lightMode]);

  if (handleId !== "door-knob") {
    return <NotFound />;
  }

  return (
    <main className="min-h-screen bg-[#070504] px-5 py-8 text-[#e9dfcd] sm:px-8 lg:px-10">
      <SampleHeader />
      <p className="mt-10 text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-[#c58a45]">
        Developer verify
      </p>
      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-[Georgia,serif] text-4xl text-[#f1e7d6]">
            Door Knob Material
          </h1>
          <p className="mt-2 font-mono text-xs text-[#aa9f90]">
            packages/door-lib/src/assets/models/door_knob.glb
          </p>
        </div>
        <Link
          to="/dev/animations/direct-entry?preset=biohazard-1996-a02-yellow-panel-knob-door"
          className="text-xs font-semibold uppercase tracking-[0.18em] text-[#d69a4b]"
        >
          Back to door
        </Link>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="relative min-h-[62vh] overflow-hidden border border-[#4b3928] bg-black">
          <div ref={targetRef} className="absolute inset-0" />
          {loadState !== "ready" ? (
            <div className="absolute inset-0 grid place-items-center text-sm text-[#aa9f90]">
              {loadState === "failed" ? "Failed to load handle model" : "Loading handle model"}
            </div>
          ) : null}
        </section>

        <aside className="border border-[#4b3928] bg-[#0b0906] p-5">
          <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-[#827665]">
            Light
          </h2>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {(Object.entries(lightModes) as Array<[LightMode, { label: string }]>).map(
              ([id, mode]) => (
                <button
                  key={id}
                  type="button"
                  aria-pressed={lightMode === id}
                  onClick={() => setLightMode(id)}
                  className={`border px-3 py-2 text-sm font-semibold ${
                    lightMode === id
                      ? "border-[#d69a4b] bg-[#d69a4b] text-[#100c08]"
                      : "border-[#5f4933] text-[#d8c9b5]"
                  }`}
                >
                  {mode.label}
                </button>
              )
            )}
          </div>

          <h2 className="mt-6 text-xs font-semibold uppercase tracking-[0.18em] text-[#827665]">
            Material
          </h2>
          <dl className="mt-3 divide-y divide-[#2d2319] border-y border-[#2d2319]">
            {rows.map(([label, value]) => (
              <div key={label} className="flex justify-between gap-4 py-3 text-sm">
                <dt className="font-mono text-[#aa9f90]">{label}</dt>
                <dd className="text-right font-semibold text-[#f1e7d6]">{value}</dd>
              </div>
            ))}
          </dl>

          <p className="mt-5 text-sm leading-6 text-[#aa9f90]">
            Drag to rotate. The material uses the same procedural aged brass applied to
            runtime handle models.
          </p>
        </aside>
      </div>
    </main>
  );
};

export default DevHandleMaterialVerifier;
