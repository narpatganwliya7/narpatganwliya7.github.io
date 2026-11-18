// Hero 3D: the "signal sphere". Thousands of customer reviews as points on a globe (teal = praise,
// vermilion = pain, gold = neutral), new signals streaming in, and a ring of KPI bars rising inside.
// One WebGL context, DPR capped, paused off-screen; a CSS ground shows if WebGL is unavailable.
import * as THREE from "three";

const canvas = document.getElementById("scene");
const hero = document.querySelector(".hero");
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
} catch (e) {
  canvas.remove();
  throw e;
}
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setClearColor(0x000000, 0);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
camera.position.set(0, 0.4, 9);

const world = new THREE.Group();
scene.add(world);
const tilt = new THREE.Group();
world.add(tilt);

const C = { teal: new THREE.Color("#19a3a8"), verm: new THREE.Color("#e2492b"), gold: new THREE.Color("#f2b33d"),
  navy: new THREE.Color("#3a5fc4"), paper: new THREE.Color("#f4f1ea") };

// ---------------------------------------------------------------- sphere of reviews
const N = 4200, R = 2.25;
const pos = new Float32Array(N * 3), col = new Float32Array(N * 3), seed = new Float32Array(N), size = new Float32Array(N);
const golden = Math.PI * (3 - Math.sqrt(5));
for (let i = 0; i < N; i++) {
  const y = 1 - (i / (N - 1)) * 2, r = Math.sqrt(1 - y * y), th = golden * i;
  const jit = 1 + (Math.random() - 0.5) * 0.05;
  pos.set([Math.cos(th) * r * R * jit, y * R * jit, Math.sin(th) * r * R * jit], i * 3);
  const p = Math.random();
  const c = p < 0.6 ? C.teal : p < 0.85 ? C.verm : C.gold;
  col.set([c.r, c.g, c.b], i * 3);
  seed[i] = Math.random();
  size[i] = p > 0.85 ? 1.25 : p > 0.6 ? 1.15 : 0.9;
}
const sphereGeo = new THREE.BufferGeometry();
sphereGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
sphereGeo.setAttribute("color", new THREE.BufferAttribute(col, 3));
sphereGeo.setAttribute("seed", new THREE.BufferAttribute(seed, 1));
sphereGeo.setAttribute("psize", new THREE.BufferAttribute(size, 1));

const uniforms = { uTime: { value: 0 }, uPx: { value: renderer.getPixelRatio() }, uIntro: { value: reduce ? 1 : 0 } };
const pointMat = new THREE.ShaderMaterial({
  uniforms, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  vertexShader: `
    attribute vec3 color; attribute float seed; attribute float psize;
    uniform float uTime, uPx, uIntro; varying vec3 vColor; varying float vAlpha;
    void main() {
      float k = smoothstep(seed * .6, seed * .6 + .4, uIntro);
      vec3 p = position * mix(2.6, 1.0, k);
      p += normalize(position) * sin(uTime * 1.3 + seed * 40.) * .025;
      vec4 mv = modelViewMatrix * vec4(p, 1.);
      gl_Position = projectionMatrix * mv;
      float tw = .65 + .35 * sin(uTime * 2. + seed * 60.);
      gl_PointSize = psize * 26. * uPx / -mv.z * (.8 + .4 * tw);
      float facing = smoothstep(-2.6, 1.2, mv.z + 9.);
      vAlpha = k * tw * mix(.25, 1., facing);
      vColor = color;
    }`,
  fragmentShader: `
    varying vec3 vColor; varying float vAlpha;
    void main() {
      vec2 d = gl_PointCoord - .5; float r = length(d);
      if (r > .5) discard;
      float a = smoothstep(.5, .0, r);
      gl_FragColor = vec4(vColor, a * a * vAlpha);
    }`,
});
tilt.add(new THREE.Points(sphereGeo, pointMat));

// ---------------------------------------------------------------- signals streaming in
const S = 360;
const sStart = new Float32Array(S * 3), sEnd = new Float32Array(S * 3), sSeed = new Float32Array(S), sCol = new Float32Array(S * 3);
for (let i = 0; i < S; i++) {
  const v = new THREE.Vector3().randomDirection();
  sEnd.set([v.x * R, v.y * R, v.z * R], i * 3);
  const far = v.clone().multiplyScalar(6 + Math.random() * 4).add(new THREE.Vector3().randomDirection().multiplyScalar(1.2));
  sStart.set([far.x, far.y, far.z], i * 3);
  sSeed[i] = Math.random();
  const c = Math.random() < .55 ? C.paper : Math.random() < .6 ? C.verm : C.gold;
  sCol.set([c.r, c.g, c.b], i * 3);
}
const streamGeo = new THREE.BufferGeometry();
streamGeo.setAttribute("position", new THREE.BufferAttribute(sEnd, 3));
streamGeo.setAttribute("aStart", new THREE.BufferAttribute(sStart, 3));
streamGeo.setAttribute("seed", new THREE.BufferAttribute(sSeed, 1));
streamGeo.setAttribute("color", new THREE.BufferAttribute(sCol, 3));
const streamMat = new THREE.ShaderMaterial({
  uniforms, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  vertexShader: `
    attribute vec3 aStart; attribute float seed; attribute vec3 color;
    uniform float uTime, uPx, uIntro; varying float vA; varying vec3 vC;
    void main() {
      float t = fract(uTime * (.07 + seed * .06) + seed);
      float e = t * t * (3. - 2. * t);
      vec3 p = mix(aStart, position, e);
      vec4 mv = modelViewMatrix * vec4(p, 1.);
      gl_Position = projectionMatrix * mv;
      gl_PointSize = (1.6 + 2.4 * (1. - t)) * 10. * uPx / -mv.z;
      vA = sin(t * 3.14159) * uIntro * .9; vC = color;
    }`,
  fragmentShader: `
    varying float vA; varying vec3 vC;
    void main() { float r = length(gl_PointCoord - .5); if (r > .5) discard; gl_FragColor = vec4(vC, smoothstep(.5, 0., r) * vA); }`,
});
tilt.add(new THREE.Points(streamGeo, streamMat));

// ---------------------------------------------------------------- orbit rings
function ring(radius, color, rx, rz, opacity) {
  const pts = [];
  for (let i = 0; i <= 160; i++) { const a = (i / 160) * Math.PI * 2; pts.push(new THREE.Vector3(Math.cos(a) * radius, 0, Math.sin(a) * radius)); }
  const g = new THREE.BufferGeometry().setFromPoints(pts);
  const m = new THREE.LineDashedMaterial({ color, dashSize: .09, gapSize: .07, transparent: true, opacity });
  const l = new THREE.Line(g, m); l.computeLineDistances(); l.rotation.set(rx, 0, rz); return l;
}
const ringA = ring(3.05, 0xe2492b, 1.25, .35, .55), ringB = ring(3.4, 0xf4f1ea, 1.45, -.5, .22);
tilt.add(ringA, ringB);
const sat = new THREE.Mesh(new THREE.SphereGeometry(.07, 16, 16), new THREE.MeshBasicMaterial({ color: 0xf2b33d }));
ringA.add(sat);

// ---------------------------------------------------------------- KPI bars inside
scene.add(new THREE.AmbientLight(0xffffff, .55));
const key = new THREE.DirectionalLight(0xffffff, 1.6); key.position.set(3, 5, 6); scene.add(key);
const rim = new THREE.PointLight(0xe2492b, 18, 12); rim.position.set(-2, -1, 2); scene.add(rim);

const B = 14, bars = [], barGroup = new THREE.Group();
const heights = [.55, .8, .65, 1.05, .9, 1.3, 1.1, 1.5, 1.25, 1.7, 1.45, 1.9, 1.6, 2.05];
for (let i = 0; i < B; i++) {
  const a = (i / B) * Math.PI * 2;
  const c = new THREE.Color().lerpColors(C.navy, i > B * .6 ? C.verm : C.teal, i / B);
  const mat = new THREE.MeshStandardMaterial({ color: c, roughness: .35, metalness: .15, emissive: c, emissiveIntensity: .18 });
  const geo = new THREE.BoxGeometry(.2, 1, .2); geo.translate(0, .5, 0);
  const m = new THREE.Mesh(geo, mat);
  m.position.set(Math.cos(a) * 1.05, -.95, Math.sin(a) * 1.05);
  m.userData = { h: heights[i], d: i * .06 };
  m.scale.y = reduce ? heights[i] : .001;
  bars.push(m); barGroup.add(m);
}
const core = new THREE.Mesh(new THREE.IcosahedronGeometry(.32, 2),
  new THREE.MeshStandardMaterial({ color: 0xe2492b, emissive: 0xe2492b, emissiveIntensity: .9, roughness: .3, flatShading: true }));
core.position.y = .2;
barGroup.add(core);
tilt.add(barGroup);
tilt.rotation.x = .18;

// ---------------------------------------------------------------- layout + input
function layout() {
  const w = hero.clientWidth, h = hero.clientHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  const wide = w > 900;
  world.position.set(wide ? Math.min(3.2, 1.4 + (camera.aspect - 1) * 1.8) : 0, wide ? 0 : 2.1, 0);
  world.scale.setScalar(wide ? 1 : Math.min(1, w / 620) * .68);
  camera.updateProjectionMatrix();
  uniforms.uPx.value = renderer.getPixelRatio();
}
layout();
new ResizeObserver(layout).observe(hero);

const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
window.addEventListener("pointermove", (e) => {
  pointer.tx = (e.clientX / window.innerWidth - .5) * 2;
  pointer.ty = (e.clientY / window.innerHeight - .5) * 2;
}, { passive: true });

// ---------------------------------------------------------------- loop (paused off-screen / hidden tab)
let visible = true, last = performance.now(), t = 0, intro = reduce ? 1 : 0;
new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) tick(performance.now()); }).observe(hero);
document.addEventListener("visibilitychange", () => { if (!document.hidden) { last = performance.now(); tick(last); } });
let raf = 0;

function frame(dt) {
  t += dt;
  intro = Math.min(1, intro + dt / 2.2);
  uniforms.uTime.value = t;
  uniforms.uIntro.value = 1 - Math.pow(1 - intro, 3);
  for (const b of bars) {
    const k = Math.min(1, Math.max(0, (t - .6 - b.userData.d) / 1.1));
    const e = 1 - Math.pow(1 - k, 4);
    const breathe = 1 + Math.sin(t * 1.4 + b.userData.d * 9) * .06 * e;
    b.scale.y = Math.max(.001, b.userData.h * e * breathe);
  }
  core.rotation.set(t * .4, t * .6, 0);
  core.scale.setScalar(1 + Math.sin(t * 2.2) * .06);
  ringA.rotation.y = t * .35; ringB.rotation.y = -t * .2;
  sat.position.set(Math.cos(t * .9) * 3.05, 0, Math.sin(t * .9) * 3.05);
  pointer.x += (pointer.tx - pointer.x) * .05; pointer.y += (pointer.ty - pointer.y) * .05;
  tilt.rotation.y += dt * .12;
  world.rotation.y = pointer.x * .35;
  world.rotation.x = pointer.y * .18;
  renderer.render(scene, camera);
}

function tick(now) {
  cancelAnimationFrame(raf);
  if (!visible || document.hidden) return;
  if (reduce) { renderer.render(scene, camera); return; }
  const dt = Math.min(.05, (now - last) / 1000); last = now;
  frame(dt);
  raf = requestAnimationFrame(tick);
}

if (reduce) {
  t = 3; frame(0);  // one still frame, everything in place
} else {
  raf = requestAnimationFrame(tick);
}
