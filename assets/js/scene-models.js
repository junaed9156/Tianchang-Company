/* Procedural geometry for the PAWSIGN showroom. No remote model or image service. */
import * as THREE from './vendor/three.module.js';

export const STEP = Math.PI * 2 / 8;
export const wrapIndex = (value,count=8) => ((value % count) + count) % count;
export function nearestAngle(current, index, count=8) {
  const desired = -wrapIndex(index,count) * Math.PI * 2 / count;
  return current + Math.atan2(Math.sin(desired - current), Math.cos(desired - current));
}
export function roundedRect(width, height, radius) {
  const s = new THREE.Shape(), x=-width/2, y=-height/2, r=radius;
  s.moveTo(x+r,y);s.lineTo(x+width-r,y);s.quadraticCurveTo(x+width,y,x+width,y+r);
  s.lineTo(x+width,y+height-r);s.quadraticCurveTo(x+width,y+height,x+width-r,y+height);
  s.lineTo(x+r,y+height);s.quadraticCurveTo(x,y+height,x,y+height-r);
  s.lineTo(x,y+r);s.quadraticCurveTo(x,y,x+r,y);return s;
}
function mesh(geometry,material,parent,position=[0,0,0]) {
  const object=new THREE.Mesh(geometry,material);object.position.set(...position);
  object.castShadow=true;object.receiveShadow=true;parent.add(object);return object;
}
export function buildShowroom(lines,{compact=false}={}) {
  const root=new THREE.Group(), carousel=new THREE.Group(), sculpture=new THREE.Group();
  root.add(carousel,sculpture);
  const gold=new THREE.MeshPhysicalMaterial({color:0xecc26e,metalness:.48,roughness:.25,clearcoat:.85,clearcoatRoughness:.2});
  const navy=new THREE.MeshPhysicalMaterial({color:0x15244d,metalness:.12,roughness:.24,clearcoat:1});
  const ceramic=new THREE.MeshPhysicalMaterial({color:0xfaf0db,roughness:.45,clearcoat:.5});
  const paleGold=new THREE.MeshStandardMaterial({color:0xdeb46c,metalness:.25,roughness:.4});
  const disc=mesh(new THREE.CylinderGeometry(2.28,2.4,.22,80),navy,root,[0,-1.62,0]);
  mesh(new THREE.CylinderGeometry(2.3,2.3,.035,80),paleGold,root,[0,-1.49,0]);
  mesh(new THREE.CylinderGeometry(2.15,2.15,.04,80),navy,root,[0,-1.45,0]);
  const rings=[];
  for(let i=0;i<3;i++) {
    const ring=mesh(new THREE.TorusGeometry(2.7+i*.17,.009,6,120),new THREE.MeshBasicMaterial({color:i===1?0x8faed7:0xe9ba67,transparent:true,opacity:i===1?.3:.55}),root,[0,-1.4+i*.04,0]);
    ring.rotation.x=Math.PI/2;ring.castShadow=false;rings.push(ring);
  }
  const stitches=new THREE.InstancedMesh(new THREE.SphereGeometry(.019,6,4),gold,72), dummy=new THREE.Object3D();
  for(let i=0;i<72;i++){const a=i/72*Math.PI*2;dummy.position.set(Math.sin(a)*2.19,-1.415,Math.cos(a)*2.19);dummy.updateMatrix();stitches.setMatrixAt(i,dummy.matrix);}
  root.add(stitches);

  // The logo's paw is a solid, bevelled sculpture with an inset navy face.
  const pad=new THREE.Shape();pad.moveTo(-.78,-.25);
  pad.bezierCurveTo(-1,-.64,-.75,-1,-.32,-.84);pad.bezierCurveTo(-.08,-.71,.08,-.71,.32,-.84);
  pad.bezierCurveTo(.75,-1,1,-.64,.78,-.25);pad.bezierCurveTo(.61,.08,.32,.34,0,.34);
  pad.bezierCurveTo(-.32,.34,-.61,.08,-.78,-.25);
  const paw=new THREE.Group();sculpture.add(paw);paw.position.set(0,.9,-.36);paw.rotation.x=-.06;
  const padGeometry=new THREE.ExtrudeGeometry(pad,{depth:.27,bevelEnabled:true,bevelSegments:5,steps:1,bevelSize:.075,bevelThickness:.075,curveSegments:20});
  padGeometry.translate(0,0,-.14);mesh(padGeometry,gold,paw);
  const face=mesh(padGeometry,navy,paw,[0,-.02,.13]);face.scale.set(.84,.84,.55);
  [[-.73,.58,.25,.34,-.35],[-.28,.98,.26,.38,-.13],[.28,.98,.26,.38,.13],[.73,.58,.25,.34,.35]].forEach(([x,y,sx,sy,r])=>{
    const toe=mesh(new THREE.SphereGeometry(1,24,18),gold,paw,[x,y,.01]);toe.scale.set(sx,sy,.21);toe.rotation.z=r;
    const inset=mesh(new THREE.SphereGeometry(1,24,18),navy,paw,[x,y,.16]);inset.scale.set(sx*.76,sy*.78,.1);inset.rotation.z=r;
  });
  const stem=mesh(new THREE.CylinderGeometry(.1,.14,.6,24),gold,sculpture,[0,-1.1,-.4]);
  const mount=mesh(new THREE.CylinderGeometry(.58,.7,.1,48),navy,sculpture,[0,-1.36,-.4]);

  // Pet portraits and real catalog images share the same dimensional carousel.
  const cardGeometry=new THREE.ExtrudeGeometry(roundedRect(1.45,1.88,.14),{depth:.065,bevelEnabled:true,bevelSegments:3,bevelSize:.025,bevelThickness:.025,steps:1,curveSegments:10});
  cardGeometry.translate(0,0,-.035);
  const cards=lines.map((line,index)=>{
    const group=new THREE.Group();group.userData.index=index;carousel.add(group);
    const material=new THREE.MeshPhysicalMaterial({color:line.color,roughness:.48,clearcoat:.45});
    const backing=mesh(cardGeometry,material,group);backing.userData.index=index;
    const image=mesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial({transparent:true,alphaTest:.035,toneMapped:false,side:THREE.DoubleSide}),group,[0,.1,.083]);
    image.castShadow=false;image.receiveShadow=false;image.userData.index=index;
    const trim=mesh(new THREE.ShapeGeometry(roundedRect(1.3,1.72,.1)),new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.19,depthWrite:false}),group,[0,0,.062]);
    trim.castShadow=false;trim.receiveShadow=false;
    return{group,backing,image,index,material};
  });

  // A threaded yarn ball and a sculpted toy bone make the depth easy to see.
  const yarn=new THREE.Group();root.add(yarn);yarn.position.set(-2.72,1.5,.1);
  const coral=new THREE.MeshStandardMaterial({color:0xea8268,roughness:.82});
  mesh(new THREE.SphereGeometry(.34,24,18),coral,yarn);
  for(let j=0;j<(compact?7:12);j++){
    const points=[];const rotation=new THREE.Euler(j*.37,j*.61,j*.14);
    for(let k=0;k<=64;k++){const a=k/64*Math.PI*2;points.push(new THREE.Vector3(Math.cos(a)*.349,Math.sin(a)*.349,0).applyEuler(rotation));}
    mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),64,.012,5,true),new THREE.MeshStandardMaterial({color:j%2?0xf5ac92:0xca604c,roughness:.9}),yarn);
  }
  const bone=new THREE.Group();root.add(bone);bone.position.set(2.62,1.55,-.1);bone.rotation.set(.2,-.2,-.42);
  const shaft=mesh(new THREE.CapsuleGeometry(.13,.65,6,16),ceramic,bone);shaft.rotation.z=Math.PI/2;
  for(const x of [-.48,.48])for(const y of [-.12,.12]){const end=mesh(new THREE.SphereGeometry(.19,18,14),ceramic,bone,[x,y,0]);end.scale.z=.85;}
  const points=new Float32Array((compact?60:120)*3);
  let seed=71;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  for(let i=0;i<points.length;i+=3){points[i]=(random()-.5)*9;points[i+1]=(random()-.5)*5;points[i+2]=-2-random()*3;}
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(points,3));
  const particles=new THREE.Points(geometry,new THREE.PointsMaterial({color:0xf4dca5,size:.025,transparent:true,opacity:.52,depthWrite:false}));root.add(particles);
  return{root,carousel,sculpture,paw,cards,rings,yarn,bone,particles,disc,stem,mount};
}

export function positionCards(cards,angle,time=0) {
  cards.forEach(({group},i)=>{
    const a=angle+i*Math.PI*2/cards.length,front=(Math.cos(a)+1)/2;
    group.position.set(Math.sin(a)*2.48,-.12+Math.sin(time*.75+i*.9)*.085,Math.cos(a)*1.6);
    group.rotation.set(Math.sin(time*.45+i)*.025,-Math.sin(a)*.32,Math.sin(a)*.045);
    group.scale.setScalar(.73+front*.29);
  });
}
