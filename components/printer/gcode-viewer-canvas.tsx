"use client";

import type { ParsedGcodeLayers } from "@/lib/gcode/layers";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

export type GcodeViewMode = "live" | "full";

const FALLBACK_COLOR = "#f97316";
const GHOST_COLOR = "#8b8b8b";
const EXTRUSION_WIDTH = 0.45;
const DEFAULT_LAYER_HEIGHT = 0.2;

interface GcodeViewerCanvasProps {
  parsed: ParsedGcodeLayers;
  mode: GcodeViewMode;
  /** Layer the printer is currently on; null when unknown. */
  liveLayer: number | null;
  buildVolume: { x: number; y: number };
  className?: string;
}

interface SceneHandle {
  printed: THREE.InstancedMesh;
  ghost: THREE.BufferGeometry;
  render: () => void;
}

/**
 * Gcode is Z-up and three.js is Y-up, so (x, y, z) becomes (x, z, -y). The
 * segment buffers are ordered by layer, which lets a layer range be drawn by
 * limiting the instance count or draw range.
 */
function colorForTool(
  cache: Map<number, THREE.Color>,
  filamentColors: ParsedGcodeLayers["filamentColors"],
  tool: number,
) {
  let color = cache.get(tool);
  if (!color) {
    color = new THREE.Color(filamentColors?.[tool] ?? FALLBACK_COLOR);
    cache.set(tool, color);
  }
  return color;
}

/** Thin lines for the not-yet-printed remainder, which needs no lighting. */
function buildGhostGeometry(parsed: ParsedGcodeLayers) {
  const { segments, segmentCount, layers } = parsed;
  const positions = new Float32Array(segmentCount * 6);

  for (const layer of layers) {
    for (let s = layer.segmentStart; s < layer.segmentEnd; s++) {
      const src = s * 4;
      const dst = s * 6;
      positions[dst] = segments[src];
      positions[dst + 1] = layer.z;
      positions[dst + 2] = -segments[src + 1];
      positions[dst + 3] = segments[src + 2];
      positions[dst + 4] = layer.z;
      positions[dst + 5] = -segments[src + 3];
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  return geometry;
}

/** One lit box per extrusion segment, so layer lines catch the light. */
function buildPrintedMesh(
  parsed: ParsedGcodeLayers,
  geometry: THREE.BoxGeometry,
  material: THREE.Material,
) {
  const { segments, segmentTools, segmentCount, layers, filamentColors } =
    parsed;
  const mesh = new THREE.InstancedMesh(
    geometry,
    material,
    Math.max(segmentCount, 1),
  );
  mesh.count = segmentCount;
  mesh.frustumCulled = false;

  const toolColors = new Map<number, THREE.Color>();
  const matrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  const yAxis = new THREE.Vector3(0, 1, 0);

  for (const layer of layers) {
    const height = layer.height > 0 ? layer.height : DEFAULT_LAYER_HEIGHT;
    for (let s = layer.segmentStart; s < layer.segmentEnd; s++) {
      const i = s * 4;
      const dx = segments[i + 2] - segments[i];
      const dy = segments[i + 3] - segments[i + 1];

      position.set(
        (segments[i] + segments[i + 2]) / 2,
        layer.z - height / 2,
        -(segments[i + 1] + segments[i + 3]) / 2,
      );
      // Box length lies along X; rotate it onto the segment's direction.
      quaternion.setFromAxisAngle(yAxis, Math.atan2(dy, dx));
      scale.set(
        Math.hypot(dx, dy) + EXTRUSION_WIDTH * 0.25,
        height,
        EXTRUSION_WIDTH,
      );
      mesh.setMatrixAt(s, matrix.compose(position, quaternion, scale));
      mesh.setColorAt(
        s,
        colorForTool(toolColors, filamentColors, segmentTools[s]),
      );
    }
  }

  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) {
    mesh.instanceColor.needsUpdate = true;
  }
  return mesh;
}

export function GcodeViewerCanvas({
  parsed,
  mode,
  liveLayer,
  buildVolume,
  className,
}: GcodeViewerCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<SceneHandle | null>(null);

  // Build the scene once per parsed file.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.domElement.className = "block size-full";
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, 1, 1, 5000);

    // Lights ride on the camera so the contour stays readable from any angle.
    scene.add(camera);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x555566, 1.4));
    const keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
    keyLight.position.set(-1, 1.5, 1);
    keyLight.target.position.set(0, 0, -1);
    camera.add(keyLight, keyLight.target);

    const boxGeometry = new THREE.BoxGeometry(1, 1, 1);
    const printedMaterial = new THREE.MeshLambertMaterial();
    const printed = buildPrintedMesh(parsed, boxGeometry, printedMaterial);
    const ghost = buildGhostGeometry(parsed);
    const ghostMaterial = new THREE.LineBasicMaterial({
      color: GHOST_COLOR,
      transparent: true,
      opacity: 0.18,
      depthWrite: false,
    });
    scene.add(new THREE.LineSegments(ghost, ghostMaterial), printed);

    const plateGeometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(buildVolume.x, 0, 0),
      new THREE.Vector3(buildVolume.x, 0, -buildVolume.y),
      new THREE.Vector3(0, 0, -buildVolume.y),
    ]);
    const plateMaterial = new THREE.LineBasicMaterial({
      color: GHOST_COLOR,
      transparent: true,
      opacity: 0.5,
    });
    scene.add(new THREE.LineLoop(plateGeometry, plateMaterial));

    // Render on demand rather than every frame; nothing animates by itself.
    const render = () => renderer.render(scene, camera);

    const { bounds } = parsed;
    const hasModel = parsed.segmentCount > 0;
    const center = new THREE.Vector3(
      hasModel ? (bounds.minX + bounds.maxX) / 2 : buildVolume.x / 2,
      hasModel ? bounds.maxZ / 2 : 0,
      -(hasModel ? (bounds.minY + bounds.maxY) / 2 : buildVolume.y / 2),
    );
    const size = hasModel
      ? Math.max(
          bounds.maxX - bounds.minX,
          bounds.maxY - bounds.minY,
          bounds.maxZ,
        )
      : Math.max(buildVolume.x, buildVolume.y);
    camera.position
      .copy(center)
      .add(new THREE.Vector3(0.9, 1.1, 1.4).multiplyScalar(size));

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.copy(center);
    controls.addEventListener("change", render);
    controls.update();

    const resize = () => {
      const { clientWidth: width, clientHeight: height } = container;
      if (width === 0 || height === 0) {
        return;
      }
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      render();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(container);
    resize();

    sceneRef.current = { printed, ghost, render };

    return () => {
      sceneRef.current = null;
      observer.disconnect();
      controls.dispose();
      printed.dispose();
      boxGeometry.dispose();
      ghost.dispose();
      plateGeometry.dispose();
      printedMaterial.dispose();
      ghostMaterial.dispose();
      plateMaterial.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [parsed, buildVolume.x, buildVolume.y]);

  // Update which layers are drawn without rebuilding the scene. Declared after
  // the effect above so it runs after a rebuild too.
  useEffect(() => {
    const handle = sceneRef.current;
    if (!handle) {
      return;
    }

    const { layers, segmentCount } = parsed;
    const drawn =
      mode === "live" && liveLayer != null && layers[liveLayer]
        ? layers[liveLayer].segmentEnd
        : segmentCount;

    handle.printed.count = drawn;
    handle.ghost.setDrawRange(drawn * 2, (segmentCount - drawn) * 2);
    handle.render();
  }, [parsed, mode, liveLayer, buildVolume.x, buildVolume.y]);

  return <div ref={containerRef} className={className} />;
}
