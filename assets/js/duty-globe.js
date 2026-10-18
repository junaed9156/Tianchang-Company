/* A small 3D globe for the Cambodia duty card: gold routes from our Kampong Speu factory to the six markets.
   It tours the markets one by one; hovering or focusing a market turns the globe to that route. */
import * as THREE from './vendor/three.module.js';

const ORIGIN = [11.45, 104.52];
const MARKETS = [[50.85, 4.35], [38.9, -77.0], [35.68, 139.69], [45.42, -75.7], [37.57, 126.98], [-35.28, 149.13]];
const TILT = .32;

export function toVector(lat, lon, radius = 1) {
  const phi = (90 - lat) * Math.PI / 180, theta = (lon + 180) * Math.PI / 180;
  return new THREE.Vector3(-radius * Math.sin(phi) * Math.cos(theta), radius * Math.cos(phi), radius * Math.sin(phi) * Math.sin(theta));
}
// The globe's Y rotation that brings a direction to the front of the camera.
const facing = vector => -Math.atan2(vector.x, vector.z);
const nearest = (from, to) => from + Math.atan2(Math.sin(to - from), Math.cos(to - from));

function dotTexture() {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 64;
  const g = canvas.getContext('2d'), gradient = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, '#fff'); gradient.addColorStop(.35, 'rgba(255,255,255,.6)'); gradient.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gradient; g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(canvas);
}

export function mountDutyGlobe({ observe = true } = {}) {
  const host = document.getElementById('duty-globe'), rows = [...document.querySelectorAll('#duty article')];
  if (!host || rows.length !== MARKETS.length) return null;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.classList.contains('reduce');
  const colors = (window.MARKETS || []).map(m => m.color);
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true }); } catch (error) { return null; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); renderer.setClearColor(0x000000, 0);
  renderer.domElement.className = 'duty-canvas'; host.append(renderer.domElement); host.classList.add('live');
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(30, 1, .1, 20); camera.position.set(0, 0, 4.4);
  const globe = new THREE.Group(); globe.rotation.x = TILT; scene.add(globe);
  const disposables = [];
  const keep = (...items) => { disposables.push(...items); return items[0]; };

  // Glassy navy body with a soft gold-blue rim, like an enamel pin.
  const body = new THREE.Mesh(keep(new THREE.SphereGeometry(1, 64, 48)), keep(new THREE.ShaderMaterial({
    uniforms: { core: { value: new THREE.Color(0x12204a) }, rim: { value: new THREE.Color(0x5f84c9) } },
    vertexShader: 'varying vec3 vN;varying vec3 vV;void main(){vec4 p=modelViewMatrix*vec4(position,1.);vN=normalize(normalMatrix*normal);vV=normalize(-p.xyz);gl_Position=projectionMatrix*p;}',
    fragmentShader: 'uniform vec3 core;uniform vec3 rim;varying vec3 vN;varying vec3 vV;void main(){float f=pow(1.-max(dot(vN,vV),0.),2.4);gl_FragColor=vec4(mix(core,rim,f),1.);}'
  })));
  globe.add(body);
  const halo = new THREE.Mesh(keep(new THREE.SphereGeometry(1.16, 48, 32)), keep(new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.BackSide, blending: THREE.AdditiveBlending,
    vertexShader: 'varying vec3 vN;varying vec3 vV;void main(){vec4 p=modelViewMatrix*vec4(position,1.);vN=normalize(normalMatrix*normal);vV=normalize(-p.xyz);gl_Position=projectionMatrix*p;}',
    fragmentShader: 'varying vec3 vN;varying vec3 vV;void main(){float f=pow(max(dot(vN,vV),0.),3.);gl_FragColor=vec4(vec3(.94,.78,.47)*f*.55,f*.55);}'
  })));
  scene.add(halo);

  // An even field of dots and a few gold meridians give the sphere its shape.
  const dots = [], count = 1500;
  for (let i = 0; i < count; i++) {
    const y = 1 - (i / (count - 1)) * 2, r = Math.sqrt(1 - y * y), a = i * Math.PI * (3 - Math.sqrt(5));
    dots.push(Math.cos(a) * r * 1.004, y * 1.004, Math.sin(a) * r * 1.004);
  }
  const dotGeometry = keep(new THREE.BufferGeometry()); dotGeometry.setAttribute('position', new THREE.Float32BufferAttribute(dots, 3));
  const dotMap = keep(dotTexture());
  globe.add(new THREE.Points(dotGeometry, keep(new THREE.PointsMaterial({ color: 0xb4c6ec, map: dotMap, size: .055, transparent: true, opacity: .7, depthWrite: false }))));
  const lineMaterial = keep(new THREE.LineBasicMaterial({ color: 0xefc778, transparent: true, opacity: .14 }));
  for (let lat = -60; lat <= 60; lat += 30) {
    const points = []; for (let lon = -180; lon <= 180; lon += 6) points.push(toVector(lat, lon, 1.006));
    globe.add(new THREE.Line(keep(new THREE.BufferGeometry().setFromPoints(points)), lineMaterial));
  }
  for (let lon = -180; lon < 180; lon += 45) {
    const points = []; for (let lat = -90; lat <= 90; lat += 6) points.push(toVector(lat, lon, 1.006));
    globe.add(new THREE.Line(keep(new THREE.BufferGeometry().setFromPoints(points)), lineMaterial));
  }

  // Factory pin with a pulsing ring, and one coloured route per market.
  const origin = toVector(...ORIGIN, 1.01);
  const pin = new THREE.Mesh(keep(new THREE.SphereGeometry(.045, 20, 14)), keep(new THREE.MeshBasicMaterial({ color: 0xf2cd86 })));
  pin.position.copy(origin); globe.add(pin);
  const ring = new THREE.Mesh(keep(new THREE.RingGeometry(.06, .075, 40)), keep(new THREE.MeshBasicMaterial({ color: 0xf2cd86, transparent: true, side: THREE.DoubleSide, depthWrite: false })));
  ring.position.copy(origin); ring.lookAt(origin.clone().multiplyScalar(2)); globe.add(ring);
  const pulseMap = dotMap;
  const routes = MARKETS.map(([lat, lon], i) => {
    const end = toVector(lat, lon, 1.01), mid = origin.clone().add(end).multiplyScalar(.5);
    const lift = 1.12 + origin.distanceTo(end) * .28; mid.normalize().multiplyScalar(lift);
    const curve = new THREE.QuadraticBezierCurve3(origin, mid, end), color = new THREE.Color(colors[i] || '#efc778');
    const material = keep(new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .45, depthWrite: false }));
    globe.add(new THREE.Mesh(keep(new THREE.TubeGeometry(curve, 64, .007, 6, false)), material));
    const marker = new THREE.Mesh(keep(new THREE.SphereGeometry(.03, 16, 12)), keep(new THREE.MeshBasicMaterial({ color })));
    marker.position.copy(end); globe.add(marker);
    const pulse = new THREE.Sprite(keep(new THREE.SpriteMaterial({ map: pulseMap, color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })));
    pulse.scale.setScalar(.12); globe.add(pulse);
    return { curve, material, marker, pulse, view: facing(mid), offset: i / MARKETS.length };
  });

  let active = 0, pinned = null, angle = routes[0].view, target = angle, time = 0, last = 0, tour = 0, visible = !observe, disposed = false;
  function highlight(index) {
    active = index; target = nearest(angle, routes[index].view);
    rows.forEach((row, i) => row.classList.toggle('hot', i === index));
  }
  function draw() {
    globe.rotation.y = angle;
    routes.forEach((route, i) => {
      const on = i === active;
      route.material.opacity += ((on ? 1 : .32) - route.material.opacity) * .12;
      route.marker.scale.setScalar(on ? 1.5 : 1);
      const t = (time * .32 + route.offset) % 1; route.pulse.position.copy(route.curve.getPoint(t));
      route.pulse.material.opacity = Math.sin(t * Math.PI) * (on ? 1 : .55);
    });
    const beat = (time * .8) % 1; ring.scale.setScalar(1 + beat * 1.6); ring.material.opacity = 1 - beat;
    renderer.render(scene, camera);
  }
  function frame(now) {
    const delta = last ? Math.min((now - last) / 1000, .05) : 0; last = now; time += delta;
    if (pinned === null) { tour += delta; if (tour > 3.2) { tour = 0; highlight((active + 1) % routes.length); } }
    angle += (target - angle) * (1 - Math.exp(-delta * 3.2));
    draw();
  }
  function sync() {
    last = 0;
    renderer.setAnimationLoop(!reduce && visible && !document.hidden && !disposed ? frame : null);
  }
  function resize() {
    const size = host.clientWidth || 260; renderer.setSize(size, size, false); camera.aspect = 1; camera.updateProjectionMatrix(); draw();
  }
  const listeners = [], listen = (el, type, fn) => { el.addEventListener(type, fn); listeners.push(() => el.removeEventListener(type, fn)); };
  rows.forEach((row, i) => {
    row.tabIndex = 0;
    const show = () => { pinned = i; highlight(i); if (reduce) { angle = target; draw(); } };
    const release = () => { pinned = null; tour = 0; };
    listen(row, 'mouseenter', show); listen(row, 'focus', show); listen(row, 'mouseleave', release); listen(row, 'blur', release);
  });
  listen(document, 'visibilitychange', sync);
  let observer = null, sizer = null;
  if (observe && 'IntersectionObserver' in window) { observer = new IntersectionObserver(entries => { visible = entries[0].isIntersecting; sync(); }, { rootMargin: '100px' }); observer.observe(host); } else visible = true;
  if ('ResizeObserver' in window) { sizer = new ResizeObserver(resize); sizer.observe(host); } else listen(window, 'resize', resize);
  highlight(0); angle = target; resize(); sync();
  function dispose() {
    disposed = true; renderer.setAnimationLoop(null); observer?.disconnect(); sizer?.disconnect(); listeners.forEach(remove => remove());
    disposables.forEach(item => item.dispose()); renderer.dispose(); renderer.domElement.remove(); host.classList.remove('live');
  }
  return { highlight, dispose };
}

if (typeof document !== 'undefined') { try { mountDutyGlobe(); } catch (error) { /* the still globe stays visible */ } }
