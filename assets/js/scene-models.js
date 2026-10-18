/* Procedural geometry for the PAWSIGN showroom. Everything is built here; no remote model or image service. */
import * as THREE from './vendor/three.module.js';

export const wrapIndex = (value, count = 8) => ((value % count) + count) % count;
export function nearestAngle(current, index, count = 8) {
  const desired = -wrapIndex(index, count) * Math.PI * 2 / count;
  return current + Math.atan2(Math.sin(desired - current), Math.cos(desired - current));
}
export function roundedRect(width, height, radius) {
  const s = new THREE.Shape(), x = -width / 2, y = -height / 2, r = radius;
  s.moveTo(x + r, y); s.lineTo(x + width - r, y); s.quadraticCurveTo(x + width, y, x + width, y + r);
  s.lineTo(x + width, y + height - r); s.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  s.lineTo(x + r, y + height); s.quadraticCurveTo(x, y + height, x, y + height - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y); return s;
}

// Small canvas textures for glows, the turntable surface and bokeh.
function canvasTexture(size, paint, height = size, colorSpace = THREE.SRGBColorSpace) {
  const canvas = document.createElement('canvas'); canvas.width = size; canvas.height = height;
  paint(canvas.getContext('2d'), size, height);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = colorSpace; texture.anisotropy = 8; return texture;
}
const radialTexture = stops => canvasTexture(128, (g, s) => {
  const gradient = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  stops.forEach(([offset, color]) => gradient.addColorStop(offset, color));
  g.fillStyle = gradient; g.fillRect(0, 0, s, s);
});
const turntableTexture = () => canvasTexture(512, (g, s) => {
  const c = s / 2, base = g.createRadialGradient(c, c * .82, 0, c, c, c);
  base.addColorStop(0, '#25385f'); base.addColorStop(.55, '#16233f'); base.addColorStop(1, '#0e172e');
  g.fillStyle = base; g.fillRect(0, 0, s, s);
  for (let r = 18; r < c; r += 9) {
    g.beginPath(); g.arc(c, c, r, 0, Math.PI * 2);
    g.strokeStyle = r % 54 === 0 ? 'rgba(239,199,120,.28)' : 'rgba(255,255,255,.035)'; g.lineWidth = r % 54 === 0 ? 1.4 : 1; g.stroke();
  }
});

// The logo's ribbon: navy enamel, gold piping and gold PAWSIGN letters. One canvas draws the colours,
// a second marks which parts are polished metal, and a third raises the letters.
function ribbonTextures() {
  const W = 2048, H = 320, NAVY = '#14213d';
  const letters = (g, fill, stroke) => {
    g.font = 'bold 190px Georgia, "Times New Roman", serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    if ('letterSpacing' in g) g.letterSpacing = '14px';
    if (stroke) { g.lineJoin = 'round'; g.lineWidth = 16; g.strokeStyle = stroke; g.strokeText('PAWSIGN', W / 2, H / 2 + 8); }
    g.fillStyle = fill; g.fillText('PAWSIGN', W / 2, H / 2 + 8);
  };
  const piping = (g, style) => { g.fillStyle = style; g.fillRect(0, 26, W, 10); g.fillRect(0, H - 36, W, 10); };
  const gold = g => { const gradient = g.createLinearGradient(0, 60, 0, H - 60); gradient.addColorStop(0, '#fbecbf'); gradient.addColorStop(.45, '#e9c06a'); gradient.addColorStop(.55, '#d9a444'); gradient.addColorStop(1, '#f5d88f'); return gradient; };
  const color = canvasTexture(W, g => {
    const shade = g.createLinearGradient(0, 0, 0, H); shade.addColorStop(0, '#1d2d52'); shade.addColorStop(.5, NAVY); shade.addColorStop(1, '#0d1730');
    g.fillStyle = shade; g.fillRect(0, 0, W, H); piping(g, gold(g)); letters(g, gold(g), '#0a1226');
  }, H);
  const surface = canvasTexture(W, g => {   // green = roughness, blue = metalness
    g.fillStyle = 'rgb(0,110,30)'; g.fillRect(0, 0, W, H); piping(g, 'rgb(0,60,255)'); letters(g, 'rgb(0,60,255)');
  }, H, THREE.NoColorSpace);
  const relief = canvasTexture(W, g => {
    g.fillStyle = '#000'; g.fillRect(0, 0, W, H); g.filter = 'blur(5px)'; piping(g, '#fff'); letters(g, '#fff'); g.filter = 'none';
  }, H, THREE.NoColorSpace);
  return { color, surface, relief };
}
function ribbon(parent, gold) {
  const arc = 1.25, radius = 2.86, height = .5, y = -1.8, { color, surface, relief } = ribbonTextures();
  const band = new THREE.Group(); parent.add(band);
  const material = new THREE.MeshPhysicalMaterial({ map: color, metalnessMap: surface, roughnessMap: surface, bumpMap: relief, bumpScale: 2.5, metalness: 1, roughness: 1, clearcoat: .6, clearcoatRoughness: .2 });
  mesh(new THREE.CylinderGeometry(radius, radius + .04, height, 96, 1, true, -arc / 2, arc), material, band, [0, y, 0]);
  // Gold piping along both edges and rounded caps at the ends, as on the logo's banner.
  [y + height / 2, y - height / 2].forEach((edge, i) => {
    const holder = new THREE.Group(); holder.rotation.y = arc / 2 - Math.PI / 2; band.add(holder);
    const pipe = mesh(new THREE.TorusGeometry(radius + .01 + i * .04, .028, 10, 120, arc), gold, holder, [0, edge, 0]); pipe.rotation.x = Math.PI / 2;
  });
  [-arc / 2, arc / 2].forEach(theta => {
    const cap = mesh(new THREE.CapsuleGeometry(.03, height, 6, 12), gold, band, [Math.sin(theta) * (radius + .02), y, Math.cos(theta) * (radius + .02)]);
    cap.rotation.y = theta;
  });
  return band;
}

function mesh(geometry, material, parent, position = [0, 0, 0]) {
  const object = new THREE.Mesh(geometry, material); object.position.set(...position); parent.add(object); return object;
}
function glow(texture, size, parent, position, opacity) {
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
  sprite.scale.set(size, size, 1); sprite.position.set(...position); parent.add(sprite); return sprite;
}
function flatGlow(texture, size, parent, y, opacity, blending = THREE.AdditiveBlending) {
  const plane = mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshBasicMaterial({ map: texture, transparent: true, opacity, depthWrite: false, blending, fog: false }), parent, [0, y, 0]);
  plane.rotation.x = -Math.PI / 2; return plane;
}

// A soft studio of light panels, used only for reflections on the gold and lacquer.
export function studioEnvironment(renderer) {
  const room = new THREE.Scene(), geometries = [], materials = [];
  const box = new THREE.BoxGeometry(14, 9, 14), wall = new THREE.MeshBasicMaterial({ color: 0x3a4a78, side: THREE.BackSide });
  room.add(new THREE.Mesh(box, wall)); geometries.push(box); materials.push(wall);
  [[0xffe9c4, 6, 8, 3.5, [0, 4.4, 1.5]], [0xffd496, 4, 3, 6, [-6.5, 1.2, 2.5]], [0xb7d2ff, 3, 3, 6, [6.5, 1, -1.5]], [0xfff4e0, 2, 10, 2.5, [0, .4, 6.5]], [0xc9a46a, .8, 12, 12, [0, -4.4, 0]]]
    .forEach(([color, intensity, width, height, position]) => {
      const geometry = new THREE.PlaneGeometry(width, height), material = new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(intensity), side: THREE.DoubleSide });
      const panel = new THREE.Mesh(geometry, material); panel.position.set(...position); panel.lookAt(0, 0, 0); room.add(panel);
      geometries.push(geometry); materials.push(material);
    });
  const generator = new THREE.PMREMGenerator(renderer), target = generator.fromScene(room, .035);
  generator.dispose(); geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose());
  return target;
}

// A soft cone of light from above, brightest where the beam is thickest.
function lightBeam(parent) {
  const geometry = new THREE.CylinderGeometry(.35, 2.45, 5.2, 64, 1, true);
  const material = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
    uniforms: { color: { value: new THREE.Color(0xffd99a) }, strength: { value: .16 } },
    vertexShader: 'varying float vHeight;varying float vFacing;void main(){vHeight=uv.y;vec4 view=modelViewMatrix*vec4(position,1.);vec3 n=normalize(normalMatrix*normal);vFacing=abs(dot(n,normalize(-view.xyz)));gl_Position=projectionMatrix*view;}',
    fragmentShader: 'uniform vec3 color;uniform float strength;varying float vHeight;varying float vFacing;void main(){float a=strength*pow(vHeight,1.6)*pow(vFacing,2.2);gl_FragColor=vec4(color*a,a);}'
  });
  const beam = mesh(geometry, material, parent, [0, 1.05, -.25]); beam.renderOrder = 2; return beam;
}

export function buildShowroom(slides, { compact = false } = {}) {
  const root = new THREE.Group(), carousel = new THREE.Group(), sculpture = new THREE.Group();
  root.add(carousel, sculpture);
  const gold = new THREE.MeshPhysicalMaterial({ color: 0xe0a948, metalness: 1, roughness: .28, clearcoat: .4, clearcoatRoughness: .2 });
  const navy = new THREE.MeshPhysicalMaterial({ color: 0x14213d, metalness: .2, roughness: .3, clearcoat: 1, clearcoatRoughness: .12 });
  const enamel = new THREE.MeshPhysicalMaterial({ color: 0x24407c, roughness: .35, metalness: .1, clearcoat: 1, clearcoatRoughness: .08 });
  const ceramic = new THREE.MeshPhysicalMaterial({ color: 0xfbf3e2, roughness: .38, clearcoat: .7 });
  const warmGlow = radialTexture([[0, 'rgba(255,214,150,1)'], [.35, 'rgba(255,196,110,.35)'], [1, 'rgba(255,190,100,0)']]);
  const shadow = radialTexture([[0, 'rgba(4,8,22,.85)'], [.5, 'rgba(4,8,22,.35)'], [1, 'rgba(4,8,22,0)']]);

  // Stepped turntable podium with gold trims and a ring of pearls.
  const podium = new THREE.Group(); root.add(podium);
  mesh(new THREE.CylinderGeometry(2.62, 2.78, .26, 96), navy, podium, [0, -1.79, 0]);
  const top = new THREE.MeshPhysicalMaterial({ map: turntableTexture(), roughness: .32, clearcoat: 1, clearcoatRoughness: .1, metalness: .1 });
  const deck = mesh(new THREE.CylinderGeometry(2.42, 2.5, .2, 96), [navy, top, navy], podium, [0, -1.57, 0]);
  [[2.5, -1.67, .022], [2.78, -1.92, .02], [2.42, -1.465, .016]].forEach(([radius, y, tube]) => {
    const trim = mesh(new THREE.TorusGeometry(radius, tube, 10, 160), gold, podium, [0, y, 0]); trim.rotation.x = Math.PI / 2;
  });
  const pearls = new THREE.InstancedMesh(new THREE.SphereGeometry(.024, 10, 8), gold, 84), dummy = new THREE.Object3D();
  for (let i = 0; i < 84; i++) { const a = i / 84 * Math.PI * 2; dummy.position.set(Math.sin(a) * 2.62, -1.655, Math.cos(a) * 2.62); dummy.updateMatrix(); pearls.setMatrixAt(i, dummy.matrix); }
  podium.add(pearls);
  flatGlow(warmGlow, 4, podium, -1.455, .26);
  ribbon(podium, gold);
  const floor = flatGlow(radialTexture([[0, 'rgba(98,130,196,.55)'], [.45, 'rgba(60,86,150,.18)'], [1, 'rgba(40,60,120,0)']]), 11, root, -1.95, .8);
  const rings = [0, 1].map(i => {
    const ring = mesh(new THREE.TorusGeometry(3.05 + i * .22, .006, 6, 180), new THREE.MeshBasicMaterial({ color: i ? 0x8faed7 : 0xefc778, transparent: true, opacity: i ? .22 : .45, fog: false }), root, [0, -1.72 - i * .05, 0]);
    ring.rotation.x = Math.PI / 2; return ring;
  });

  // The logo's paw as a polished gold emblem on a slim stand, framed by two slowly turning rings.
  const pad = new THREE.Shape(); pad.moveTo(-.78, -.25);
  pad.bezierCurveTo(-1, -.64, -.75, -1, -.32, -.84); pad.bezierCurveTo(-.08, -.71, .08, -.71, .32, -.84);
  pad.bezierCurveTo(.75, -1, 1, -.64, .78, -.25); pad.bezierCurveTo(.61, .08, .32, .34, 0, .34);
  pad.bezierCurveTo(-.32, .34, -.61, .08, -.78, -.25);
  const paw = new THREE.Group(); sculpture.add(paw); paw.position.set(0, .95, -.45); paw.scale.setScalar(.82);
  const padGeometry = new THREE.ExtrudeGeometry(pad, { depth: .2, bevelEnabled: true, bevelSegments: 8, steps: 1, bevelSize: .09, bevelThickness: .1, curveSegments: 32 });
  padGeometry.translate(0, 0, -.1); mesh(padGeometry, gold, paw);
  const enamelGeometry = new THREE.ExtrudeGeometry(pad, { depth: .02, bevelEnabled: true, bevelSegments: 4, steps: 1, bevelSize: .02, bevelThickness: .02, curveSegments: 32 });
  mesh(enamelGeometry, enamel, paw, [0, -.03, .19]).scale.set(.8, .8, 1);
  [[-.74, .52, .2, .26, -.42], [-.28, .92, .21, .28, -.14], [.28, .92, .21, .28, .14], [.74, .52, .2, .26, .42]].forEach(([x, y, rx, ry, r]) => {
    const toe = new THREE.Shape(); toe.absellipse(0, 0, rx, ry, 0, Math.PI * 2);
    const geometry = new THREE.ExtrudeGeometry(toe, { depth: .16, bevelEnabled: true, bevelSegments: 8, steps: 1, bevelSize: .07, bevelThickness: .08, curveSegments: 32 });
    geometry.translate(0, 0, -.08); mesh(geometry, gold, paw, [x, y, 0]).rotation.z = r;
    const inset = new THREE.Shape(); inset.absellipse(0, 0, rx * .78, ry * .8, 0, Math.PI * 2);
    mesh(new THREE.ExtrudeGeometry(inset, { depth: .02, bevelEnabled: true, bevelSegments: 4, steps: 1, bevelSize: .02, bevelThickness: .02, curveSegments: 32 }), enamel, paw, [x, y, .17]).rotation.z = r;
  });
  const halo = glow(warmGlow, 3.6, sculpture, [0, .95, -.7], .38);
  const orbits = [0, 1].map(i => {
    const orbit = mesh(new THREE.TorusGeometry(1.32 + i * .1, .008, 6, 160), new THREE.MeshBasicMaterial({ color: 0xf2d08f, transparent: true, opacity: .55 - i * .2, fog: false }), sculpture, [0, .95, -.45]);
    orbit.rotation.set(i ? .5 : -.35, i ? -.6 : .4, 0); return orbit;
  });
  mesh(new THREE.CylinderGeometry(.035, .05, 1.3, 20), gold, sculpture, [0, -.75, -.45]);
  mesh(new THREE.CylinderGeometry(.5, .6, .08, 64), navy, sculpture, [0, -1.43, -.45]);
  const beam = compact ? null : lightBeam(root);

  // Product frames: lacquered colour backing, a pale mat, the cut-out, and a gold edge that lights at the front.
  const cardGeometry = new THREE.ExtrudeGeometry(roundedRect(1.4, 1.82, .16), { depth: .05, bevelEnabled: true, bevelSegments: 4, bevelSize: .025, bevelThickness: .025, steps: 1, curveSegments: 12 });
  cardGeometry.translate(0, 0, -.025);
  const matGeometry = new THREE.ShapeGeometry(roundedRect(1.26, 1.68, .11), 12);
  const frameShape = roundedRect(1.53, 1.95, .2); frameShape.holes.push(roundedRect(1.43, 1.85, .17));
  const frameGeometry = new THREE.ShapeGeometry(frameShape, 12), shadowGeometry = new THREE.PlaneGeometry(1.9, .8);
  const cards = slides.map((slide, index) => {
    const group = new THREE.Group(); group.userData.index = index; carousel.add(group);
    const material = new THREE.MeshPhysicalMaterial({ roughness: .5, clearcoat: .55, clearcoatRoughness: .25 });
    const backing = mesh(cardGeometry, material, group); backing.userData.index = index;
    const mat = mesh(matGeometry, new THREE.MeshStandardMaterial({ roughness: .85 }), group, [0, 0, .052]).material;
    paintCard({ material, mat }, slide.color);
    const image = mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ transparent: true, alphaTest: .035, toneMapped: false }), group, [0, .02, .06]);
    image.userData.index = index;
    const frame = mesh(frameGeometry, new THREE.MeshBasicMaterial({ color: 0xf5cf86, transparent: true, opacity: 0, depthWrite: false, toneMapped: false }), group, [0, 0, -.005]);
    const blob = mesh(shadowGeometry, new THREE.MeshBasicMaterial({ map: shadow, transparent: true, opacity: .5, depthWrite: false, fog: false }), carousel);
    blob.rotation.x = -Math.PI / 2;
    return { group, backing, image, frame, blob, index, material, mat, hover: 0 };
  });

  // A threaded yarn ball and a glazed toy bone float in the corners.
  const yarn = new THREE.Group(); root.add(yarn); yarn.position.set(-2.95, 1.45, -.2);
  mesh(new THREE.SphereGeometry(.3, 32, 24), new THREE.MeshStandardMaterial({ color: 0xe57c62, roughness: .85 }), yarn);
  for (let j = 0; j < (compact ? 7 : 12); j++) {
    const points = [], rotation = new THREE.Euler(j * .37, j * .61, j * .14);
    for (let k = 0; k <= 64; k++) { const a = k / 64 * Math.PI * 2; points.push(new THREE.Vector3(Math.cos(a) * .309, Math.sin(a) * .309, 0).applyEuler(rotation)); }
    mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 64, .011, 5, true), new THREE.MeshStandardMaterial({ color: j % 2 ? 0xf6b39a : 0xc95d48, roughness: .9 }), yarn);
  }
  const bone = new THREE.Group(); root.add(bone); bone.position.set(2.95, 1.5, -.3); bone.scale.setScalar(.85);
  const shaft = mesh(new THREE.CapsuleGeometry(.13, .65, 8, 20), ceramic, bone); shaft.rotation.z = Math.PI / 2;
  for (const x of [-.48, .48]) for (const y of [-.12, .12]) { const end = mesh(new THREE.SphereGeometry(.19, 24, 18), ceramic, bone, [x, y, 0]); end.scale.z = .85; }

  // Gold dust drifting upward, plus a few large out-of-focus lights in the distance.
  let seed = 71; const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const bokeh = radialTexture([[0, 'rgba(255,255,255,1)'], [.4, 'rgba(255,255,255,.5)'], [1, 'rgba(255,255,255,0)']]);
  const dust = new Float32Array((compact ? 70 : 150) * 3);
  for (let i = 0; i < dust.length; i += 3) { dust[i] = (random() - .5) * 9; dust[i + 1] = (random() - .5) * 5.5; dust[i + 2] = (random() - .5) * 6 - 1; }
  const dustGeometry = new THREE.BufferGeometry(); dustGeometry.setAttribute('position', new THREE.BufferAttribute(dust, 3));
  const particles = new THREE.Points(dustGeometry, new THREE.PointsMaterial({ color: 0xf6d79c, map: bokeh, size: .07, transparent: true, opacity: .75, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
  root.add(particles);
  const lights = new Float32Array(16 * 3);
  for (let i = 0; i < lights.length; i += 3) { lights[i] = (random() - .5) * 11; lights[i + 1] = (random() - .2) * 5; lights[i + 2] = -4 - random() * 3; }
  const lightsGeometry = new THREE.BufferGeometry(); lightsGeometry.setAttribute('position', new THREE.BufferAttribute(lights, 3));
  root.add(new THREE.Points(lightsGeometry, new THREE.PointsMaterial({ color: 0x9db8ee, map: bokeh, size: .55, transparent: true, opacity: .16, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })));

  return { root, carousel, sculpture, paw, halo, orbits, beam, cards, rings, yarn, bone, particles, deck, floor };
}

// A card's lacquer takes the collection colour; its mat is a paler tint of the same colour.
export function paintCard(card, color) {
  card.material.color.set(color); card.mat.color.set(color).lerp(new THREE.Color(0xffffff), .55);
}

export const RADIUS_X = 2.7, RADIUS_Z = 1.9;
// Cards ride an elliptical orbit; the front card grows, lifts and lights its gold edge.
export function positionCards(cards, angle, time = 0, intro = 1) {
  cards.forEach(card => {
    const { group, frame, blob, index } = card, a = angle + index * Math.PI * 2 / cards.length;
    const front = (Math.cos(a) + 1) / 2, focus = Math.pow(front, 10), appear = THREE.MathUtils.clamp(intro * 1.6 - index * .06, 0, 1);
    const x = Math.sin(a) * RADIUS_X, z = Math.cos(a) * RADIUS_Z, lift = focus * .12 + card.hover * .1;
    group.position.set(x, -.2 + lift + Math.sin(time * .75 + index * .9) * .05, z);
    group.rotation.set(Math.sin(time * .45 + index) * .02, -Math.sin(a) * .42, Math.sin(a) * .03);
    group.scale.setScalar((.7 + front * .26 + focus * .08 + card.hover * .04) * (1 - Math.pow(1 - appear, 3)));
    frame.material.opacity = Math.max(focus, card.hover * .7);
    blob.position.set(x, -1.452, z); blob.scale.setScalar(.6 + front * .45); blob.material.opacity = (.22 + front * .3) * appear;
  });
}
