import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  AlertTriangle,
  Camera,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Flame,
  Layers,
  Sparkles,
  Sun,
} from 'lucide-react';
import { CYCLE_OVERVIEW, PLANTS, type PlantId } from '../data/argusData';
import { getOct22Measurement } from '../utils/calculations';

interface TentScene3DProps {
  selectedPlantId: PlantId;
  onSelectPlant: (id: PlantId) => void;
  onOpenPlantInAudit: (id: PlantId) => void;
  onAskAiAboutPlant: (id: PlantId) => void;
}

type CameraPresetId = 'interior' | 'top' | 'melom' | 'rig';

interface CameraPreset {
  id: CameraPresetId;
  label: string;
  position: [number, number, number];
  target: [number, number, number];
}

const CAMERA_PRESETS: CameraPreset[] = [
  {
    id: 'interior',
    label: 'Wnętrze SL100',
    position: [0.06, 1.05, 2.08],
    target: [0, 0.86, 0],
  },
  {
    id: 'top',
    label: 'Korona + PPFD',
    position: [0.01, 1.58, 0.54],
    target: [0, 0.45, 0],
  },
  {
    id: 'melom',
    label: 'Fokus MELO-M',
    position: [0.76, 0.78, 0.96],
    target: [0.25, 0.42, 0.25],
  },
  {
    id: 'rig',
    label: 'Lampy i VK125',
    position: [-0.95, 1.54, 1.15],
    target: [0, 1.5, 0],
  },
];

function createMylarTexture(): { map: THREE.CanvasTexture; bumpMap: THREE.CanvasTexture } {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#c4c9d0';
  ctx.fillRect(0, 0, 256, 256);

  // Subtle quilted diamond / crumpled mylar facets matching DiamondBox SL100 reference
  for (let y = 0; y < 256; y += 16) {
    for (let x = 0; x < 256; x += 16) {
      const shade = 182 + ((x * 7 + y * 13) % 44);
      ctx.fillStyle = `rgb(${shade}, ${shade + 2}, ${shade + 6})`;
      ctx.beginPath();
      ctx.moveTo(x + 8, y);
      ctx.lineTo(x + 16, y + 8);
      ctx.lineTo(x + 8, y + 16);
      ctx.lineTo(x, y + 8);
      ctx.closePath();
      ctx.fill();
    }
  }

  const map = new THREE.CanvasTexture(canvas);
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(3, 5);
  map.colorSpace = THREE.SRGBColorSpace;

  const bumpMap = new THREE.CanvasTexture(canvas);
  bumpMap.wrapS = THREE.RepeatWrapping;
  bumpMap.wrapT = THREE.RepeatWrapping;
  bumpMap.repeat.set(3, 5);

  return { map, bumpMap };
}

function createFabricPotTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#1b1f26';
  ctx.fillRect(0, 0, 128, 128);
  ctx.strokeStyle = '#2b323d';
  ctx.lineWidth = 1;
  for (let i = 0; i < 128; i += 4) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 128);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(128, i);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 2);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createPpfdHeatmapTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createRadialGradient(128, 128, 18, 128, 128, 168);
  grad.addColorStop(0.0, 'rgba(239, 68, 68, 0.85)'); // 755-760 center
  grad.addColorStop(0.42, 'rgba(245, 158, 11, 0.78)'); // 720-740 mid
  grad.addColorStop(0.78, 'rgba(16, 185, 129, 0.72)'); // 700 corners
  grad.addColorStop(1.0, 'rgba(59, 130, 246, 0.62)'); // 500 wall dropoff
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);

  // Subtle grid lines and PPFD label stamps
  ctx.strokeStyle = 'rgba(255,255,255,0.22)';
  ctx.lineWidth = 1;
  for (let p = 64; p < 256; p += 64) {
    ctx.beginPath();
    ctx.moveTo(p, 0);
    ctx.lineTo(p, 256);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, p);
    ctx.lineTo(256, p);
    ctx.stroke();
  }

  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 14px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('740-760', 128, 132);
  ctx.font = '12px monospace';
  ctx.fillText('700-740', 48, 44);
  ctx.fillText('700-740', 208, 44);
  ctx.fillText('700-740', 48, 220);
  ctx.fillText('700-740', 208, 220);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createContactShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(64, 64, 12, 64, 64, 64);
  grad.addColorStop(0, 'rgba(2, 6, 23, 0.68)');
  grad.addColorStop(0.65, 'rgba(2, 6, 23, 0.25)');
  grad.addColorStop(1, 'rgba(2, 6, 23, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function TentScene3D({
  selectedPlantId,
  onSelectPlant,
  onOpenPlantInAudit,
  onAskAiAboutPlant,
}: TentScene3DProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const selectedPlantRef = useRef<PlantId>(selectedPlantId);
  const onSelectPlantRef = useRef(onSelectPlant);

  const [cutawayMode, setCutawayMode] = useState(true);
  const [showPpfd, setShowPpfd] = useState(false);
  const [lampSpectrum, setLampSpectrum] = useState<'VEG' | 'BLOOM'>('VEG');
  const [activePreset, setActivePreset] = useState<CameraPresetId>('interior');
  const [dockExpanded, setDockExpanded] = useState(() =>
    typeof window === 'undefined' ? true : window.innerWidth >= 640,
  );

  const sceneActionsRef = useRef<{
    setCutaway: (enabled: boolean) => void;
    setPpfdVisible: (visible: boolean) => void;
    setSpectrumMode: (mode: 'VEG' | 'BLOOM') => void;
    setSelectedRing: (plantId: PlantId) => void;
    goToPreset: (preset: CameraPreset) => void;
  } | null>(null);

  useEffect(() => {
    selectedPlantRef.current = selectedPlantId;
    sceneActionsRef.current?.setSelectedRing(selectedPlantId);
  }, [selectedPlantId]);

  useEffect(() => {
    onSelectPlantRef.current = onSelectPlant;
  }, [onSelectPlant]);

  useEffect(() => {
    sceneActionsRef.current?.setCutaway(cutawayMode);
  }, [cutawayMode]);

  useEffect(() => {
    sceneActionsRef.current?.setPpfdVisible(showPpfd);
  }, [showPpfd]);

  useEffect(() => {
    sceneActionsRef.current?.setSpectrumMode(lampSpectrum);
  }, [lampSpectrum]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || 960;
    const height = container.clientHeight || 620;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
    });

    const gl = renderer.getContext();
    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    const rendererStr = dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : '';
    const isSoftwareGl = /SwiftShader|llvmpipe|Software Rasterizer/i.test(rendererStr);

    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.06;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = !isSoftwareGl;
    if (!isSoftwareGl) {
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#070b12');
    scene.fog = new THREE.FogExp2('#070b12', 0.09);

    const pmrem = new THREE.PMREMGenerator(renderer);
    const roomEnv = new RoomEnvironment();
    const envTarget = pmrem.fromScene(roomEnv, 0.04);
    scene.environment = envTarget.texture;
    scene.environmentIntensity = isSoftwareGl ? 0.78 : 0.92;
    roomEnv.dispose();

    const camera = new THREE.PerspectiveCamera(44, width / height, 0.05, 30);
    camera.position.set(0.06, 1.05, 2.08);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0.86, 0);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 0.45;
    controls.maxDistance = 3.2;
    controls.maxPolarAngle = Math.PI * 0.49;
    controls.update();

    // Lighting rig: Cool ambient fill + warm tent grow fixture key + rim light
    const hemiLight = new THREE.HemisphereLight('#cbd5e1', '#1e293b', 0.95);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight('#fff5e6', 2.2);
    keyLight.position.set(0.35, 1.85, 0.55);
    if (!isSoftwareGl) {
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.set(1024, 1024);
      keyLight.shadow.bias = -0.0004;
      keyLight.shadow.normalBias = 0.02;
    }
    scene.add(keyLight);

    const tentCanopyLight = new THREE.PointLight('#fff1d6', 2.1, 3.2, 1.6);
    tentCanopyLight.position.set(0, 1.22, 0);
    scene.add(tentCanopyLight);

    const rimLight = new THREE.DirectionalLight('#93c5fd', 0.65);
    rimLight.position.set(-1.3, 1.4, -1.1);
    scene.add(rimLight);

    // Studio floor outside tent
    const studioFloor = new THREE.Mesh(
      new THREE.PlaneGeometry(12, 12),
      new THREE.MeshStandardMaterial({
        color: '#0b101b',
        roughness: 0.92,
        metalness: 0.05,
      }),
    );
    studioFloor.rotation.x = -Math.PI / 2;
    studioFloor.position.y = -0.004;
    studioFloor.receiveShadow = !isSoftwareGl;
    scene.add(studioFloor);

    // --- 1. DiamondBox SL100 Tent Shell & Frame (1.0 x 1.0 x 2.0 m) ---
    const tentGroup = new THREE.Group();
    const { map: mylarMap, bumpMap: mylarBump } = createMylarTexture();
    const mylarMat = new THREE.MeshStandardMaterial({
      map: mylarMap,
      bumpMap: mylarBump,
      bumpScale: 0.012,
      color: '#dce2ea',
      metalness: 0.82,
      roughness: 0.32,
      side: THREE.DoubleSide,
    });
    const darkCanvasMat = new THREE.MeshStandardMaterial({
      color: '#181c24',
      roughness: 0.86,
      metalness: 0.06,
      side: THREE.DoubleSide,
    });
    const poleMat = new THREE.MeshStandardMaterial({
      color: '#12151c',
      roughness: 0.38,
      metalness: 0.65,
    });
    const jointMat = new THREE.MeshStandardMaterial({
      color: '#d4d8df',
      roughness: 0.55,
      metalness: 0.1,
    });

    // Bottom waterproof tray
    const tray = new THREE.Mesh(
      new THREE.BoxGeometry(0.98, 0.055, 0.98),
      new THREE.MeshStandardMaterial({ color: '#141820', roughness: 0.72, metalness: 0.12 }),
    );
    tray.position.y = 0.028;
    tray.receiveShadow = !isSoftwareGl;
    tentGroup.add(tray);

    // 4 Vertical Corner Poles + 4 Top + 4 Bottom + 2 Roof Support Bars
    const poleGeoV = new THREE.CylinderGeometry(0.011, 0.011, 2.0, 10);
    const poleGeoH = new THREE.CylinderGeometry(0.01, 0.01, 1.0, 10);
    const cornerPositions: Array<[number, number]> = [
      [-0.5, -0.5],
      [0.5, -0.5],
      [-0.5, 0.5],
      [0.5, 0.5],
    ];
    for (const [cx, cz] of cornerPositions) {
      const vPole = new THREE.Mesh(poleGeoV, poleMat);
      vPole.position.set(cx, 1.0, cz);
      tentGroup.add(vPole);

      const topJoint = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.036, 0.036), jointMat);
      topJoint.position.set(cx, 2.0, cz);
      tentGroup.add(topJoint);

      const botJoint = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.036, 0.036), jointMat);
      botJoint.position.set(cx, 0.018, cz);
      tentGroup.add(botJoint);
    }

    const horizSpecs: Array<{ pos: [number, number, number]; rot: [number, number, number] }> = [
      { pos: [0, 2.0, -0.5], rot: [0, 0, Math.PI / 2] },
      { pos: [0, 2.0, 0.5], rot: [0, 0, Math.PI / 2] },
      { pos: [-0.5, 2.0, 0], rot: [Math.PI / 2, 0, 0] },
      { pos: [0.5, 2.0, 0], rot: [Math.PI / 2, 0, 0] },
      { pos: [0, 1.94, -0.22], rot: [0, 0, Math.PI / 2] },
      { pos: [0, 1.94, 0.22], rot: [0, 0, Math.PI / 2] },
    ];
    for (const spec of horizSpecs) {
      const bar = new THREE.Mesh(poleGeoH, poleMat);
      bar.position.set(...spec.pos);
      bar.rotation.set(...spec.rot);
      tentGroup.add(bar);
    }

    // Back wall (always visible), roof, and cutaway walls
    const backWall = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 2.0), mylarMat);
    backWall.position.set(0, 1.0, -0.5);
    tentGroup.add(backWall);

    const roofWall = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 1.0), mylarMat);
    roofWall.rotation.x = Math.PI / 2;
    roofWall.position.set(0, 2.0, 0);
    tentGroup.add(roofWall);

    const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 2.0), mylarMat);
    leftWall.rotation.y = Math.PI / 2;
    leftWall.position.set(-0.5, 1.0, 0);
    tentGroup.add(leftWall);

    const rightWall = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 2.0), mylarMat);
    rightWall.rotation.y = -Math.PI / 2;
    rightWall.position.set(0.5, 1.0, 0);
    tentGroup.add(rightWall);

    // Passive intake window on left wall + top/side duct sleeves matching SL100 image
    const intakeMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.015, 0.24, 0.34),
      darkCanvasMat,
    );
    intakeMesh.position.set(-0.495, 0.34, -0.1);
    leftWall.visible = true;
    tentGroup.add(intakeMesh);

    const sleeveGeo = new THREE.CylinderGeometry(0.085, 0.085, 0.12, 16, 1, true);
    const topSleeve = new THREE.Mesh(sleeveGeo, mylarMat);
    topSleeve.position.set(0, 1.94, -0.18);
    tentGroup.add(topSleeve);

    const rightUpperSleeve = new THREE.Mesh(sleeveGeo, mylarMat);
    rightUpperSleeve.rotation.z = Math.PI / 2;
    rightUpperSleeve.position.set(0.45, 1.62, -0.2);
    tentGroup.add(rightUpperSleeve);

    const rightLowerSleeve = new THREE.Mesh(sleeveGeo, mylarMat);
    rightLowerSleeve.rotation.z = Math.PI / 2;
    rightLowerSleeve.position.set(0.45, 0.24, -0.32);
    tentGroup.add(rightLowerSleeve);

    const cutawayWalls = [leftWall, rightWall, rightUpperSleeve, rightLowerSleeve, intakeMesh];
    scene.add(tentGroup);

    // --- 2. Ventilation & Climate Equipment ---
    const ventGroup = new THREE.Group();
    const metalMat = new THREE.MeshStandardMaterial({
      color: '#adb5bd',
      metalness: 0.72,
      roughness: 0.34,
    });

    // Prima Klima Economy Line Ø125 Carbon Filter suspended top-left
    const filterCan = new THREE.Mesh(
      new THREE.CylinderGeometry(0.095, 0.095, 0.42, 18),
      new THREE.MeshStandardMaterial({ color: '#e2e8f0', roughness: 0.65, metalness: 0.15 }),
    );
    filterCan.rotation.z = Math.PI / 2;
    filterCan.position.set(-0.22, 1.78, -0.2);
    ventGroup.add(filterCan);

    // VENTS VK125 inline fan housing
    const fanBody = new THREE.Mesh(
      new THREE.CylinderGeometry(0.11, 0.11, 0.22, 18),
      new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.45, metalness: 0.25 }),
    );
    fanBody.rotation.z = Math.PI / 2;
    fanBody.position.set(0.16, 1.78, -0.2);
    ventGroup.add(fanBody);

    // Curved exhaust duct connecting fan to top sleeve
    const ductCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.01, 1.78, -0.2),
      new THREE.Vector3(0.06, 1.78, -0.2),
      new THREE.Vector3(0.27, 1.78, -0.2),
      new THREE.Vector3(0.42, 1.68, -0.2),
    ]);
    const ductMesh = new THREE.Mesh(
      new THREE.TubeGeometry(ductCurve, 14, 0.066, 12, false),
      metalMat,
    );
    ventGroup.add(ductMesh);

    // 2x Circulation Fans mounted on front/rear poles with bracket arms
    const circPositions: Array<[number, number, number, number]> = [
      [-0.43, 1.05, 0.43, -Math.PI / 4],
      [0.43, 0.92, -0.43, (3 * Math.PI) / 4],
    ];
    for (const [fx, fy, fz, rotY] of circPositions) {
      const fanGroup = new THREE.Group();
      const cage = new THREE.Mesh(
        new THREE.CylinderGeometry(0.068, 0.068, 0.036, 14),
        new THREE.MeshStandardMaterial({ color: '#cbd5e1', roughness: 0.48, metalness: 0.25 }),
      );
      cage.rotation.x = Math.PI / 2;
      const hub = new THREE.Mesh(
        new THREE.CylinderGeometry(0.022, 0.022, 0.044, 10),
        poleMat,
      );
      hub.rotation.x = Math.PI / 2;
      const mountArm = new THREE.Mesh(
        new THREE.BoxGeometry(0.018, 0.018, 0.11),
        poleMat,
      );
      mountArm.position.set(0, 0, -0.055);
      fanGroup.add(cage, hub, mountArm);
      fanGroup.position.set(fx, fy, fz);
      fanGroup.rotation.y = rotY;
      ventGroup.add(fanGroup);
    }

    // RAM Ultrasonic Humidifier 5L (status OFF ~17-18.10)
    const humidifierGroup = new THREE.Group();
    const humBody = new THREE.Mesh(
      new THREE.CylinderGeometry(0.075, 0.085, 0.24, 14),
      new THREE.MeshStandardMaterial({ color: '#cbd5e1', roughness: 0.42, metalness: 0.05 }),
    );
    humBody.position.y = 0.12;
    const humCap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.065, 0.05, 12),
      new THREE.MeshStandardMaterial({ color: '#334155', roughness: 0.5 }),
    );
    humCap.position.y = 0.26;
    humidifierGroup.add(humBody, humCap);
    humidifierGroup.position.set(0, 0.055, 0.41);
    ventGroup.add(humidifierGroup);

    // LUMii Green Work Light 10W (mounted upper right front pole)
    const greenBulb = new THREE.Mesh(
      new THREE.SphereGeometry(0.028, 12, 12),
      new THREE.MeshStandardMaterial({
        color: '#22c55e',
        emissive: '#16a34a',
        emissiveIntensity: 0.7,
        roughness: 0.3,
      }),
    );
    greenBulb.position.set(0.45, 1.56, 0.44);
    ventGroup.add(greenBulb);
    scene.add(ventGroup);

    // --- 3. 4 × LUMii SWITCH BLADE 150 W Lighting Array (~y = 1.24 m) ---
    const lightsGroup = new THREE.Group();
    const ledDiodeMaterials: THREE.MeshStandardMaterial[] = [];
    const fixturePositions: Array<[number, number]> = [
      [-0.24, -0.24],
      [0.24, -0.24],
      [-0.24, 0.24],
      [0.24, 0.24],
    ];
    const chassisMat = new THREE.MeshStandardMaterial({
      color: '#1f2937',
      metalness: 0.75,
      roughness: 0.36,
    });

    for (const [lx, lz] of fixturePositions) {
      const fixture = new THREE.Group();
      const plate = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.022, 0.24), chassisMat);
      fixture.add(plate);

      // Extruded heatsink ribs on top
      for (let r = -0.12; r <= 0.12; r += 0.06) {
        const rib = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.018, 0.012), metalMat);
        rib.position.set(0, 0.018, r);
        fixture.add(rib);
      }

      // Emissive LED bar strips underneath
      const diodeMat = new THREE.MeshStandardMaterial({
        color: '#fef3c7',
        emissive: '#fde68a',
        emissiveIntensity: 1.5,
        roughness: 0.2,
      });
      ledDiodeMaterials.push(diodeMat);
      const ledPanel = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.2), diodeMat);
      ledPanel.rotation.x = Math.PI / 2;
      ledPanel.position.y = -0.012;
      fixture.add(ledPanel);

      // Suspension cords up to roof rail
      const cordGeo = new THREE.CylinderGeometry(0.0025, 0.0025, 0.7, 6);
      const cord1 = new THREE.Mesh(cordGeo, poleMat);
      cord1.position.set(-0.12, 0.36, 0);
      const cord2 = new THREE.Mesh(cordGeo, poleMat);
      cord2.position.set(0.12, 0.36, 0);
      fixture.add(cord1, cord2);

      fixture.position.set(lx, 1.24, lz);
      lightsGroup.add(fixture);
    }
    scene.add(lightsGroup);

    // --- 4. PPFD Heatmap Overlay Plane (22.10 Photone Audit) ---
    const ppfdPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(0.94, 0.94),
      new THREE.MeshBasicMaterial({
        map: createPpfdHeatmapTexture(),
        transparent: true,
        opacity: 0.78,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );
    ppfdPlane.rotation.x = -Math.PI / 2;
    ppfdPlane.position.y = 0.85;
    ppfdPlane.visible = false;
    scene.add(ppfdPlane);

    // --- 5. Four 19 L Hero Fabric Pots & Procedural LST Plants ---
    const potFabricTex = createFabricPotTexture();
    const contactShadowTex = createContactShadowTexture();
    const potMat = new THREE.MeshStandardMaterial({
      map: potFabricTex,
      bumpMap: potFabricTex,
      bumpScale: 0.008,
      color: '#20252e',
      roughness: 0.92,
      metalness: 0.02,
    });
    const soilMat = new THREE.MeshStandardMaterial({
      color: '#3a2a1d',
      roughness: 0.95,
      metalness: 0.0,
    });
    const stemMat = new THREE.MeshStandardMaterial({
      color: '#4d7c3f',
      roughness: 0.74,
      metalness: 0.02,
    });
    const lstTieMat = new THREE.MeshStandardMaterial({
      color: '#38bdf8',
      roughness: 0.5,
      metalness: 0.1,
    });

    const interactiveMeshes: THREE.Object3D[] = [];
    const selectionRings = new Map<PlantId, THREE.Mesh>();

    for (const plant of PLANTS) {
      const plantGroup = new THREE.Group();
      const [px, pz] = plant.position3D;
      plantGroup.position.set(px, 0.055, pz);
      plantGroup.userData.plantId = plant.id;

      // Ground contact shadow
      const contactShadow = new THREE.Mesh(
        new THREE.PlaneGeometry(0.42, 0.42),
        new THREE.MeshBasicMaterial({
          map: contactShadowTex,
          transparent: true,
          depthWrite: false,
        }),
      );
      contactShadow.rotation.x = -Math.PI / 2;
      contactShadow.position.y = 0.002;
      plantGroup.add(contactShadow);

      // 19L Hero fabric pot (radius ~0.145m, height ~0.27m)
      const pot = new THREE.Mesh(
        new THREE.CylinderGeometry(0.145, 0.132, 0.27, 20),
        potMat,
      );
      pot.position.y = 0.135;
      pot.castShadow = !isSoftwareGl;
      pot.receiveShadow = !isSoftwareGl;
      pot.userData.plantId = plant.id;
      plantGroup.add(pot);
      interactiveMeshes.push(pot);

      // Pot soil top
      const soil = new THREE.Mesh(new THREE.CircleGeometry(0.14, 18), soilMat);
      soil.rotation.x = -Math.PI / 2;
      soil.position.y = 0.262;
      plantGroup.add(soil);

      // White plastic ID tag sticking out of soil
      const tag = new THREE.Mesh(
        new THREE.BoxGeometry(0.024, 0.075, 0.004),
        new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.45 }),
      );
      tag.position.set(0.08, 0.285, 0.08);
      tag.rotation.x = 0.22;
      plantGroup.add(tag);

      // Selection ring at pot base
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.16, 0.185, 28),
        new THREE.MeshBasicMaterial({
          color: plant.healthTier === 'critical' ? '#f59e0b' : '#10b981',
          side: THREE.DoubleSide,
        }),
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.008;
      ring.visible = plant.id === selectedPlantRef.current;
      plantGroup.add(ring);
      selectionRings.set(plant.id, ring);

      // Main bent LST stem + multi-branch canopy
      const { heightM, radiusM, droopFactor, leafDensity, branchCount } = plant.canopyProfile;
      const stemBaseY = 0.26;
      const trunkCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, stemBaseY, 0),
        new THREE.Vector3(-0.03, stemBaseY + 0.09, 0.02),
        new THREE.Vector3(0.02, stemBaseY + heightM * 0.46, -0.02),
      ]);
      const trunk = new THREE.Mesh(new THREE.TubeGeometry(trunkCurve, 8, 0.012, 8, false), stemMat);
      plantGroup.add(trunk);

      // Blue/green LST wire tie anchor to pot rim
      const tie = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.13, 6), lstTieMat);
      tie.position.set(-0.07, stemBaseY + 0.04, 0.04);
      tie.rotation.z = 0.65;
      plantGroup.add(tie);

      const leafColor =
        plant.healthTier === 'critical'
          ? new THREE.Color('#5a7a38')
          : plant.id === 'MELO-D'
            ? new THREE.Color('#276a32')
            : new THREE.Color('#2e7d3b');

      const leafMat = new THREE.MeshStandardMaterial({
        color: leafColor,
        roughness: 0.62,
        metalness: 0.03,
        side: THREE.DoubleSide,
      });

      const colaMat = new THREE.MeshStandardMaterial({
        color: plant.healthTier === 'critical' ? '#708e44' : '#439c4c',
        roughness: 0.72,
      });

      const leafGeo = new THREE.ConeGeometry(0.036, 0.115, 5);
      leafGeo.scale(1.0, 0.14, 2.0);

      for (let b = 0; b < branchCount; b++) {
        const angle = (b / branchCount) * Math.PI * 2 + (plant.id === 'KB-M' ? 0.3 : 0);
        const reach = radiusM * (0.65 + (b % 2) * 0.35);
        const branchTopY = stemBaseY + heightM * (0.72 + (b % 3) * 0.12);

        const branchCurve = new THREE.CatmullRomCurve3([
          new THREE.Vector3(0, stemBaseY + 0.1, 0),
          new THREE.Vector3(Math.cos(angle) * reach * 0.58, stemBaseY + heightM * 0.45, Math.sin(angle) * reach * 0.58),
          new THREE.Vector3(Math.cos(angle) * reach, branchTopY - droopFactor * 0.08, Math.sin(angle) * reach),
        ]);
        const branchMesh = new THREE.Mesh(
          new THREE.TubeGeometry(branchCurve, 6, 0.006, 6, false),
          stemMat,
        );
        plantGroup.add(branchMesh);

        // Terminal apical node cluster (organic elongated bud)
        const cola = new THREE.Mesh(
          new THREE.CylinderGeometry(0.014 * leafDensity, 0.022 * leafDensity, 0.044, 7),
          colaMat,
        );
        cola.position.set(
          Math.cos(angle) * reach,
          branchTopY - droopFactor * 0.06,
          Math.sin(angle) * reach,
        );
        cola.userData.plantId = plant.id;
        plantGroup.add(cola);
        interactiveMeshes.push(cola);

        // Radiating fan leaves around branch node (with droopFactor for MELO-M stress cue)
        const leavesPerBranch = Math.round(3 * leafDensity);
        for (let lf = 0; lf < leavesPerBranch; lf++) {
          const leafAngle = angle + (lf - 1) * 0.78;
          const leaf = new THREE.Mesh(leafGeo, leafMat);
          leaf.position.set(
            Math.cos(angle) * reach * 0.78 + Math.cos(leafAngle) * 0.04,
            branchTopY - 0.04 - lf * 0.03,
            Math.sin(angle) * reach * 0.78 + Math.sin(leafAngle) * 0.04,
          );
          leaf.rotation.set(droopFactor * 1.15 + 0.18, -leafAngle, 0);
          leaf.userData.plantId = plant.id;
          plantGroup.add(leaf);
          interactiveMeshes.push(leaf);
        }
      }

      scene.add(plantGroup);
    }

    // --- On-Demand Render & Camera Preset Damping Loop ---
    let targetCamPos: THREE.Vector3 | null = null;
    let targetLookAt: THREE.Vector3 | null = null;
    let rafId = 0;
    let renderScheduled = false;
    let lastTime = performance.now();

    const drawFrame = () => {
      renderScheduled = false;
      const now = performance.now();
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      let needsMoreFrames = false;

      if (targetCamPos && targetLookAt) {
        const alpha = 1 - Math.exp(-8 * dt);
        camera.position.lerp(targetCamPos, alpha);
        controls.target.lerp(targetLookAt, alpha);
        if (
          camera.position.distanceTo(targetCamPos) < 0.008 &&
          controls.target.distanceTo(targetLookAt) < 0.008
        ) {
          camera.position.copy(targetCamPos);
          controls.target.copy(targetLookAt);
          targetCamPos = null;
          targetLookAt = null;
        } else {
          needsMoreFrames = true;
        }
      }

      const dampingChanged = controls.update();
      renderer.render(scene, camera);

      if (needsMoreFrames || dampingChanged) {
        requestRender();
      }
    };

    const requestRender = () => {
      if (renderScheduled) return;
      renderScheduled = true;
      rafId = requestAnimationFrame(drawFrame);
    };

    controls.addEventListener('change', requestRender);

    // Raycast click-to-select plant
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let pointerDownPos = { x: 0, y: 0 };

    const handlePointerDown = (e: PointerEvent) => {
      pointerDownPos = { x: e.clientX, y: e.clientY };
    };

    const handlePointerUp = (e: PointerEvent) => {
      const moved = Math.hypot(e.clientX - pointerDownPos.x, e.clientY - pointerDownPos.y);
      if (moved > 6) return; // Was an orbit drag, not a click

      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(interactiveMeshes, false);
      if (hits.length > 0) {
        const hitPlantId = hits[0].object.userData.plantId as PlantId | undefined;
        if (hitPlantId) {
          onSelectPlantRef.current(hitPlantId);
        }
      }
    };

    renderer.domElement.addEventListener('pointerdown', handlePointerDown);
    renderer.domElement.addEventListener('pointerup', handlePointerUp);

    sceneActionsRef.current = {
      setCutaway: (enabled: boolean) => {
        for (const obj of cutawayWalls) {
          obj.visible = !enabled;
        }
        requestRender();
      },
      setPpfdVisible: (visible: boolean) => {
        ppfdPlane.visible = visible;
        requestRender();
      },
      setSpectrumMode: (mode: 'VEG' | 'BLOOM') => {
        const isBloom = mode === 'BLOOM';
        tentCanopyLight.color.set(isBloom ? '#ffd6b8' : '#fff4db');
        for (const mat of ledDiodeMaterials) {
          mat.emissive.set(isBloom ? '#fb923c' : '#fde68a');
          mat.color.set(isBloom ? '#fed7aa' : '#fef3c7');
        }
        requestRender();
      },
      setSelectedRing: (plantId: PlantId) => {
        for (const [id, mesh] of selectionRings.entries()) {
          mesh.visible = id === plantId;
        }
        requestRender();
      },
      goToPreset: (preset: CameraPreset) => {
        targetCamPos = new THREE.Vector3(...preset.position);
        targetLookAt = new THREE.Vector3(...preset.target);
        requestRender();
      },
    };

    // Apply initial React state sync
    sceneActionsRef.current.setCutaway(cutawayMode);
    sceneActionsRef.current.setPpfdVisible(showPpfd);
    sceneActionsRef.current.setSpectrumMode(lampSpectrum);

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const w = Math.max(320, Math.floor(entry.contentRect.width));
      const h = Math.max(320, Math.floor(entry.contentRect.height));
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      requestRender();
    });
    resizeObserver.observe(container);

    // Initial render
    requestRender();

    return () => {
      cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
      controls.removeEventListener('change', requestRender);
      renderer.domElement.removeEventListener('pointerdown', handlePointerDown);
      renderer.domElement.removeEventListener('pointerup', handlePointerUp);
      controls.dispose();
      envTarget.dispose();
      pmrem.dispose();
      renderer.dispose();
      sceneActionsRef.current = null;
    };
  }, []);

  const selectedPlant = useMemo(
    () => PLANTS.find((p) => p.id === selectedPlantId) ?? PLANTS[0],
    [selectedPlantId],
  );
  const oct22 = useMemo(() => getOct22Measurement(selectedPlant.id), [selectedPlant.id]);

  const handlePresetClick = (preset: CameraPreset) => {
    setActivePreset(preset.id);
    sceneActionsRef.current?.goToPreset(preset);
  };

  return (
    <section
      aria-label="Bliźniak cyfrowy 3D DiamondBox SL100"
      className="relative flex h-[calc(100vh-3.5rem)] min-h-[560px] w-full overflow-hidden bg-[#070b12]"
    >
      {/* Isolated WebGL Mount Container */}
      <div
        ref={containerRef}
        data-testid="sl100-webgl-canvas"
        data-selected-plant={selectedPlantId}
        data-spectrum={lampSpectrum}
        data-ppfd={showPpfd ? 'on' : 'off'}
        className="h-full w-full cursor-grab active:cursor-grabbing"
      />

      {/* Top-Left Compact Scene Context */}
      <div className="pointer-events-none absolute top-3 left-3 z-10 flex max-w-xs flex-col gap-1.5 sm:max-w-sm">
        <div className="pointer-events-auto rounded-lg border border-slate-800 bg-slate-950/92 px-3.5 py-2.5 shadow-lg">
          <div className="flex items-center justify-between gap-2">
            <h1 className="font-display text-sm font-semibold text-slate-100">
              {CYCLE_OVERVIEW.tentModel}
            </h1>
            <span className="font-mono text-[11px] text-emerald-300 tabular-nums">
              100×100×200 cm
            </span>
          </div>
          <p className="mt-0.5 text-[11px] text-slate-400">
            4× LUMii 150 W ({lampSpectrum === 'BLOOM' ? 'BLOOM 390 PPF · pomiar 22.10' : 'VEG 375 PPF · potwierdzony'}) · VK125 Ø125
          </p>
          <div className="mt-2 flex flex-wrap gap-1">
            {PLANTS.map((p) => {
              const isSelected = p.id === selectedPlantId;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => onSelectPlant(p.id)}
                  className={`rounded px-2 py-0.5 font-mono text-[11px] font-medium transition-colors ${
                    isSelected
                      ? 'bg-emerald-600 text-white'
                      : p.healthTier === 'critical'
                        ? 'bg-amber-950/80 text-amber-300 ring-1 ring-amber-700/50 hover:bg-amber-900/70'
                        : 'bg-slate-900 text-slate-300 ring-1 ring-slate-700 hover:bg-slate-800'
                  }`}
                >
                  {p.id}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Top-Right Selected Plant Inspector Card */}
      <aside
        aria-label="Inspektor wybranej rośliny"
        className="absolute top-3 right-3 z-10 hidden w-80 rounded-lg border border-slate-800 bg-slate-950/94 p-3.5 shadow-xl md:block"
      >
        <div className="flex items-start justify-between gap-2 border-b border-slate-800 pb-2.5">
          <div>
            <div className="font-mono text-[11px] text-emerald-400">
              {selectedPlant.potPosition} · {selectedPlant.potLabel}
            </div>
            <h2 className="font-display text-sm font-semibold text-slate-100">
              {selectedPlant.displayName}
            </h2>
          </div>
          <span
            className={`font-mono text-[11px] font-medium ${
              selectedPlant.healthTier === 'critical'
                ? 'text-amber-300'
                : selectedPlant.healthTier === 'watch'
                  ? 'text-sky-300'
                  : 'text-emerald-300'
            }`}
          >
            {selectedPlant.healthTier === 'critical'
              ? 'UWAGA'
              : selectedPlant.healthTier === 'watch'
                ? 'GĘSTO'
                : 'STABILNA'}
          </span>
        </div>

        <p className="mt-2 text-xs leading-relaxed text-slate-300">
          {selectedPlant.statusSummary}
        </p>

        {oct22 && (
          <div className="mt-3 grid grid-cols-3 gap-2 rounded-md border border-slate-800/80 bg-slate-900/90 p-2 font-mono text-[11px] tabular-nums">
            <div>
              <div className="text-[10px] text-slate-400">22.10 Masa</div>
              <div className="font-semibold text-slate-100">
                {oct22.beforeKg?.toFixed(2)}→{oct22.afterKg?.toFixed(2)}
              </div>
              <div className="text-emerald-400">+{oct22.deltaKg?.toFixed(3)} kg</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-400">Runoff EC</div>
              <div className="font-semibold text-slate-100">
                {oct22.runoffEc?.toFixed(3)}
              </div>
              <div className="text-slate-400">mS/cm</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-400">Runoff pH</div>
              <div className="font-semibold text-slate-100">
                {oct22.runoffPh?.toFixed(3)}
              </div>
              <div className="text-slate-400">Aqua P110</div>
            </div>
          </div>
        )}

        {selectedPlant.conflictIds.length > 0 && (
          <div className="mt-2.5 flex items-start gap-1.5 rounded border border-amber-800/50 bg-amber-950/40 px-2.5 py-1.5 text-[11px] text-amber-200">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" />
            <span>
              Konflikty: <strong className="font-mono">{selectedPlant.conflictIds.join(', ')}</strong>
            </span>
          </div>
        )}

        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={() => onOpenPlantInAudit(selectedPlant.id)}
            className="flex-1 rounded-md border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-slate-200 transition-colors hover:bg-slate-800"
          >
            Pełny log rośliny
          </button>
          <button
            type="button"
            onClick={() => onAskAiAboutPlant(selectedPlant.id)}
            className="flex items-center justify-center gap-1 rounded-md bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-500"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Pytaj AI</span>
          </button>
        </div>
      </aside>

      {/* Collapsible Compact Bottom Control Dock (Solid/RGBA, NO backdrop-filter over WebGL) */}
      <div className="pointer-events-none absolute inset-x-0 bottom-3 z-20 flex justify-center px-3">
        <div className="pointer-events-auto w-full max-w-4xl rounded-xl border border-slate-800 bg-[#0b111d]/95 px-3 py-2 shadow-2xl">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <Camera className="h-3.5 w-3.5 text-emerald-400" />
              <span className="font-medium text-slate-100">Sterowanie Sceną SL100</span>
              <span className="hidden font-mono text-[11px] text-slate-400 sm:inline">
                · 4 × Hero 19 L · 4 × LUMii 150 W
              </span>
            </div>
            <button
              type="button"
              onClick={() => setDockExpanded((v) => !v)}
              aria-expanded={dockExpanded}
              className="flex items-center gap-1 rounded px-2 py-1 text-[11px] font-medium text-slate-300 hover:bg-slate-800 hover:text-white"
            >
              <span>{dockExpanded ? 'Zwiń panel' : 'Rozwiń kontrolki'}</span>
              {dockExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
            </button>
          </div>

          {dockExpanded && (
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-800/80 pt-2">
              {/* Camera Presets */}
              <div className="flex flex-wrap items-center gap-1">
                {CAMERA_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handlePresetClick(preset)}
                    className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors ${
                      activePreset === preset.id
                        ? 'bg-emerald-600/25 text-emerald-300 ring-1 ring-emerald-500/50'
                        : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              {/* Layer & Rig Toggles */}
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setCutawayMode((v) => !v)}
                  className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors ${
                    cutawayMode
                      ? 'bg-slate-800 text-slate-100 ring-1 ring-slate-600'
                      : 'bg-slate-900 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  {cutawayMode ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  <span>{cutawayMode ? 'Przekrój otwarty' : 'Pełny Mylar'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowPpfd((v) => !v)}
                  className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors ${
                    showPpfd
                      ? 'bg-amber-600/25 text-amber-300 ring-1 ring-amber-500/50'
                      : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <Flame className="h-3.5 w-3.5" />
                  <span>Mapa PPFD (700–760)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setLampSpectrum((m) => (m === 'VEG' ? 'BLOOM' : 'VEG'))}
                  className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors ${
                    lampSpectrum === 'BLOOM'
                      ? 'bg-orange-600/25 text-orange-300 ring-1 ring-orange-500/50'
                      : 'bg-sky-600/20 text-sky-300 ring-1 ring-sky-500/40'
                  }`}
                >
                  <Sun className="h-3.5 w-3.5" />
                  <span>Tryb lamp: {lampSpectrum}</span>
                </button>

                <button
                  type="button"
                  onClick={() => onOpenPlantInAudit(selectedPlant.id)}
                  className="flex items-center gap-1 rounded-md bg-slate-900 px-2.5 py-1 text-[11px] font-medium text-emerald-300 ring-1 ring-emerald-700/50 hover:bg-slate-800 md:hidden"
                >
                  <Layers className="h-3.5 w-3.5" />
                  <span>{selectedPlant.id}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
