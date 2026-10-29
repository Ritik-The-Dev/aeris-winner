import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import type { WindField } from '../../lib/analysis';
import { errorColourRgb } from '../../lib/colors';

interface Props {
  field: WindField;
  selectedDay: string;
  onSelectDay: (day: string) => void;
  reducedMotion: boolean;
  onReady?: () => void;
  onFail?: () => void;
}

const WIDTH = 72;
const DEPTH = 48;
const HEIGHT_SCALE = 17;

export default function Windfield3D({
  field,
  selectedDay,
  onSelectDay,
  reducedMotion,
  onReady,
  onFail,
}: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const onSelectRef = useRef(onSelectDay);
  const indicatorRef = useRef<THREE.Group | null>(null);
  const highlightRef = useRef<THREE.Group | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    onSelectRef.current = onSelectDay;
  }, [onSelectDay]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
      });
    } catch {
      setFailed(true);
      onFail?.();
      return;
    }

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0xf3eee3, 0.0058);
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 400);
    const target = new THREE.Vector3(0, 7.5, 0);
    const radius = 74;
    let yaw = 0.55;
    let pitch = 0.34;
    let dragging = false;
    let moved = 0;
    let lastX = 0;
    let lastY = 0;
    let frame = 0;

    renderer.setClearColor(0xf3eee3, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    host.appendChild(renderer.domElement);
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.touchAction = 'none';

    scene.add(new THREE.HemisphereLight(0xfffdf7, 0xd8cfbf, 1.45));
    const key = new THREE.DirectionalLight(0xfff2dd, 1.9);
    key.position.set(28, 48, 22);
    scene.add(key);
    const rim = new THREE.PointLight(0x2b4bf2, 55, 150, 2);
    rim.position.set(-36, 24, -28);
    scene.add(rim);
    const warm = new THREE.PointLight(0xff6a33, 32, 120, 2);
    warm.position.set(34, 12, -30);
    scene.add(warm);

    const group = new THREE.Group();
    scene.add(group);

    const dayCount = Math.max(field.days.length, 1);
    const intervalCount = Math.max(...field.byDay.map((row) => row.length), 1);
    const cellW = WIDTH / Math.max(intervalCount - 1, 1);
    const cellD = DEPTH / Math.max(dayCount - 1, 1);
    const zForDay = (index: number) => -DEPTH / 2 + index * cellD;
    const maxValue = Math.max(field.maxActual, field.maxForecast, 1);
    const heightFor = (value: number | null) =>
      value === null ? 0 : Math.max((value / maxValue) * HEIGHT_SCALE, 0.02);

    const grid: Array<Array<{ actual: number | null; forecast: number | null; error: number | null }>> =
      field.days.map((_, dayIndex) => {
        const row = field.byDay[dayIndex] ?? [];
        return Array.from({ length: intervalCount }, (_, intervalIndex) => {
          const cell = row[intervalIndex];
          return {
            actual: cell?.actual ?? null,
            forecast: cell?.forecast ?? null,
            error: cell?.error ?? null,
          };
        });
      });

    const buildSurface = (keyName: 'actual' | 'forecast') => {
      const positions = new Float32Array(dayCount * intervalCount * 3);
      const colors = new Float32Array(dayCount * intervalCount * 3);
      const indices: number[] = [];
      for (let dayIndex = 0; dayIndex < dayCount; dayIndex += 1) {
        for (let intervalIndex = 0; intervalIndex < intervalCount; intervalIndex += 1) {
          const cell = grid[dayIndex]?.[intervalIndex];
          const vertex = dayIndex * intervalCount + intervalIndex;
          positions[vertex * 3] = -WIDTH / 2 + intervalIndex * cellW;
          positions[vertex * 3 + 1] = heightFor(cell?.[keyName] ?? null);
          positions[vertex * 3 + 2] = zForDay(dayIndex);
          const [r, g, b] = errorColourRgb(
            cell?.error ?? null,
            field.maxAbsoluteError,
          );
          colors[vertex * 3] = r / 255;
          colors[vertex * 3 + 1] = g / 255;
          colors[vertex * 3 + 2] = b / 255;
        }
      }
      for (let dayIndex = 0; dayIndex < dayCount - 1; dayIndex += 1) {
        for (let intervalIndex = 0; intervalIndex < intervalCount - 1; intervalIndex += 1) {
          const a = dayIndex * intervalCount + intervalIndex;
          const b = a + 1;
          const c = a + intervalCount;
          const d = c + 1;
          const corners = [
            grid[dayIndex]?.[intervalIndex],
            grid[dayIndex]?.[intervalIndex + 1],
            grid[dayIndex + 1]?.[intervalIndex],
            grid[dayIndex + 1]?.[intervalIndex + 1],
          ];
          if (corners.every((corner) => corner && corner[keyName] !== null)) {
            indices.push(a, b, d, a, d, c);
          }
        }
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      geometry.setIndex(indices);
      geometry.computeVertexNormals();
      return geometry;
    };

    const actualGeometry = buildSurface('actual');
    const actualMaterial = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.82,
      metalness: 0.02,
      side: THREE.DoubleSide,
    });
    const actualMesh = new THREE.Mesh(actualGeometry, actualMaterial);
    group.add(actualMesh);

    // A cobalt trace and marker make the selected ridge legible against the
    // coloured surface, not just in the adjacent date pill.
    const highlights = new THREE.Group();
    field.days.forEach((day, dayIndex) => {
      const row = grid[dayIndex] ?? [];
      const points = row
        .map((cell, intervalIndex) => {
          if (cell?.actual === null || cell?.actual === undefined) return null;
          return new THREE.Vector3(
            -WIDTH / 2 + intervalIndex * cellW,
            heightFor(cell.actual) + 0.42,
            zForDay(dayIndex),
          );
        })
        .filter((point): point is THREE.Vector3 => point !== null);
      if (!points.length) return;
      const ridge = new THREE.Group();
      const line = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(points),
        new THREE.LineBasicMaterial({
          color: 0x2b4bf2,
          transparent: true,
          opacity: 0.9,
        }),
      );
      line.renderOrder = 2;
      ridge.add(line);
      const marker = new THREE.Mesh(
        new THREE.SphereGeometry(0.38, 12, 12),
        new THREE.MeshBasicMaterial({ color: 0x2b4bf2 }),
      );
      marker.position.copy(points[0]);
      marker.position.x -= 0.7;
      ridge.add(marker);
      ridge.visible = day === selectedDay;
      highlights.add(ridge);
    });
    group.add(highlights);
    highlightRef.current = highlights;

    const wireMaterial = new THREE.MeshBasicMaterial({
      color: 0x2b4bf2,
      wireframe: true,
      transparent: true,
      opacity: 0.05,
      depthWrite: false,
    });
    const wireMesh = new THREE.Mesh(actualGeometry, wireMaterial);
    wireMesh.position.y = 0.03;
    group.add(wireMesh);

    const forecastGeometry = buildSurface('forecast');
    const forecastMaterial = new THREE.MeshBasicMaterial({
      color: 0xff6a33,
      wireframe: true,
      transparent: true,
      opacity: 0.1,
      depthWrite: false,
    });
    const forecastMesh = new THREE.Mesh(forecastGeometry, forecastMaterial);
    forecastMesh.position.y = 0.16;
    group.add(forecastMesh);

    const gridHelper = new THREE.GridHelper(WIDTH + 10, 32, 0xbcb2a2, 0xe4dccd);
    gridHelper.position.y = -0.18;
    const gridMaterial = gridHelper.material as THREE.Material;
    gridMaterial.transparent = true;
    gridMaterial.opacity = 0.38;
    group.add(gridHelper);

    const base = new THREE.Mesh(
      new THREE.PlaneGeometry(WIDTH + 10, DEPTH + 10),
      new THREE.MeshBasicMaterial({
        color: 0xefe8dc,
        transparent: true,
        opacity: 0.7,
        side: THREE.DoubleSide,
      }),
    );
    base.rotation.x = -Math.PI / 2;
    base.position.y = -0.28;
    group.add(base);

    const indicator = new THREE.Group();
    const indicatorPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(WIDTH + 3, Math.max(cellD * 0.92, 1.2)),
      new THREE.MeshBasicMaterial({
        color: 0x2b4bf2,
        transparent: true,
        opacity: 0.1,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );
    indicatorPlane.rotation.x = -Math.PI / 2;
    indicator.add(indicatorPlane);
    const outlinePoints = [
      new THREE.Vector3(-(WIDTH + 3) / 2, 0, -(cellD * 0.48)),
      new THREE.Vector3((WIDTH + 3) / 2, 0, -(cellD * 0.48)),
      new THREE.Vector3((WIDTH + 3) / 2, 0, cellD * 0.48),
      new THREE.Vector3(-(WIDTH + 3) / 2, 0, cellD * 0.48),
    ];
    const outline = new THREE.LineLoop(
      new THREE.BufferGeometry().setFromPoints(outlinePoints),
      new THREE.LineBasicMaterial({ color: 0x2b4bf2, transparent: true, opacity: 0.55 }),
    );
    outline.position.y = 0.02;
    indicator.add(outline);
    indicator.position.y = 0.05;
    group.add(indicator);
    indicatorRef.current = indicator;

    const updateIndicator = (day: string) => {
      const index = field.days.indexOf(day);
      if (index < 0 || !indicatorRef.current) return;
      indicatorRef.current.position.z = zForDay(index);
    };
    updateIndicator(selectedDay);

    const particleCount = reducedMotion ? 260 : 540;
    const positions = new Float32Array(particleCount * 3);
    const speeds = new Float32Array(particleCount);
    for (let index = 0; index < particleCount; index += 1) {
      positions[index * 3] = (Math.random() - 0.5) * (WIDTH + 24);
      positions[index * 3 + 1] = Math.random() * HEIGHT_SCALE * 1.3 + 1.5;
      positions[index * 3 + 2] = (Math.random() - 0.5) * (DEPTH + 24);
      speeds[index] = 0.018 + Math.random() * 0.055;
    }
    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const particleMaterial = new THREE.PointsMaterial({
      color: 0x2b4bf2,
      size: 0.22,
      transparent: true,
      opacity: 0.36,
      sizeAttenuation: true,
      depthWrite: false,
    });
    const particles = new THREE.Points(particleGeometry, particleMaterial);
    group.add(particles);

    // Short labels along the delivery-day axis make the ridges readable without
    // requiring a click. They face the camera and never occlude interaction.
    const shortDay = (value: string) =>
      new Intl.DateTimeFormat('en-GB', {
        day: '2-digit',
        month: 'short',
        timeZone: 'UTC',
      })
        .format(new Date(`${value}T12:00:00Z`))
        .toUpperCase();

    const makeDayLabel = (text: string) => {
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 64;
      const context = canvas.getContext('2d');
      if (!context) return null;
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.font = '600 25px "IBM Plex Mono", ui-monospace, monospace';
      context.fillStyle = 'rgba(23, 21, 17, 0.64)';
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillText(text, canvas.width / 2, canvas.height / 2 + 1);
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.minFilter = THREE.LinearFilter;
      const material = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        depthTest: false,
        depthWrite: false,
      });
      const sprite = new THREE.Sprite(material);
      sprite.scale.set(7.4, 1.85, 1);
      sprite.renderOrder = 3;
      return sprite;
    };

    field.days.forEach((day, index) => {
      if (index !== 0 && index !== dayCount - 1 && index % 5 !== 0) return;
      const label = makeDayLabel(shortDay(day));
      if (!label) return;
      label.position.set(-WIDTH / 2 - 5.2, 1.05, zForDay(index));
      group.add(label);
    });

    const updateCamera = () => {
      const horizontal = Math.cos(pitch) * radius;
      camera.position.set(
        Math.sin(yaw) * horizontal,
        Math.sin(pitch) * radius + 9,
        Math.cos(yaw) * horizontal,
      );
      camera.lookAt(target);
    };
    updateCamera();

    const resize = () => {
      const width = host.clientWidth || 1;
      const height = host.clientHeight || 1;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(host);

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const pickTargets = [actualMesh, forecastMesh];

    const pickDay = (event: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      // Only an actual ridge counts. The previous ground-plane pick selected a
      // date from any empty click, which looked like a random day change.
      const intersection = raycaster.intersectObjects(pickTargets, false)[0];
      if (!intersection) return;
      const raw = (intersection.point.z + DEPTH / 2) / Math.max(cellD, 0.001);
      const index = Math.max(0, Math.min(dayCount - 1, Math.round(raw)));
      const day = field.days[index];
      if (day) onSelectRef.current(day);
    };

    const onPointerDown = (event: PointerEvent) => {
      dragging = true;
      moved = 0;
      lastX = event.clientX;
      lastY = event.clientY;
      renderer.domElement.setPointerCapture?.(event.pointerId);
      renderer.domElement.style.cursor = 'grabbing';
    };
    const onPointerMove = (event: PointerEvent) => {
      if (!dragging) {
        renderer.domElement.style.cursor = 'grab';
        return;
      }
      const dx = event.clientX - lastX;
      const dy = event.clientY - lastY;
      lastX = event.clientX;
      lastY = event.clientY;
      moved += Math.abs(dx) + Math.abs(dy);
      yaw -= dx * 0.006;
      pitch = Math.min(Math.max(pitch + dy * 0.004, 0.08), 0.78);
      updateCamera();
    };
    const onPointerUp = (event: PointerEvent) => {
      if (dragging && moved < 6) pickDay(event);
      dragging = false;
      renderer.domElement.style.cursor = 'grab';
    };
    const onPointerLeave = () => {
      dragging = false;
      renderer.domElement.style.cursor = 'grab';
    };

    renderer.domElement.style.cursor = 'grab';
    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointermove', onPointerMove);
    renderer.domElement.addEventListener('pointerup', onPointerUp);
    renderer.domElement.addEventListener('pointerleave', onPointerLeave);

    let started = false;
    const clock = new THREE.Clock();
    const render = () => {
      frame = window.requestAnimationFrame(render);
      const delta = Math.min(clock.getDelta(), 0.05);
      if (!reducedMotion && !dragging) {
        yaw += delta * 0.055;
        updateCamera();
      }
      if (!reducedMotion) {
        const position = particleGeometry.getAttribute('position') as THREE.BufferAttribute;
        for (let index = 0; index < particleCount; index += 1) {
          const array = position.array as Float32Array;
          array[index * 3] += speeds[index] * delta * 12;
          if (array[index * 3] > WIDTH / 2 + 12) array[index * 3] = -WIDTH / 2 - 12;
          array[index * 3 + 1] += Math.sin(clock.elapsedTime * 0.6 + index) * delta * 0.05;
        }
        position.needsUpdate = true;
      }
      renderer.render(scene, camera);
      if (!started) {
        started = true;
        onReady?.();
      }
    };
    render();

    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      renderer.domElement.removeEventListener('pointerleave', onPointerLeave);
      indicatorRef.current = null;
      highlightRef.current = null;
      scene.traverse((object) => {
        if (
          object instanceof THREE.Mesh ||
          object instanceof THREE.Points ||
          object instanceof THREE.Line ||
          object instanceof THREE.LineSegments
        ) {
          object.geometry?.dispose();
          const material = object.material;
          if (Array.isArray(material)) material.forEach((item) => item.dispose());
          else material?.dispose();
        } else if (object instanceof THREE.Sprite) {
          object.material.map?.dispose();
          object.material.dispose();
        }
      });
      renderer.dispose();
      renderer.domElement.remove();
    };
    // selectedDay is applied by the lightweight effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [field, reducedMotion, onReady, onFail]);

  useEffect(() => {
    const indicator = indicatorRef.current;
    if (!indicator) return;
    const index = field.days.indexOf(selectedDay);
    if (index < 0) return;
    const dayCount = Math.max(field.days.length, 1);
    const cellD = DEPTH / Math.max(dayCount - 1, 1);
    indicator.position.z = -DEPTH / 2 + index * cellD;
    highlightRef.current?.children.forEach((ridge, ridgeIndex) => {
      ridge.visible = field.days[ridgeIndex] === selectedDay;
    });
  }, [selectedDay, field.days]);

  if (failed) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-center text-sm text-mist">
        This device could not start WebGL. The grid view is available below.
      </div>
    );
  }

  return (
    <div
      ref={hostRef}
      className="h-full min-h-[18rem] w-full"
      role="img"
      aria-label={`Interactive 3D wind field: ${field.matched} matched half-hour intervals, one ridge per delivery day. Drag to orbit and click a ridge to select its date.`}
    />
  );
}
