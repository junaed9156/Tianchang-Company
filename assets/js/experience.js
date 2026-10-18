import * as THREE from './vendor/three.module.js';
import {buildShowroom,positionCards,paintCard,nearestAngle,wrapIndex,studioEnvironment} from './scene-models.js?v=20261019-logo';

const ROTATION_SPEED=Math.PI*2/66,CARDS=10;
// All 41 cut-outs in one stream, ordered so dogs, cats, toys and products take turns.
// Pictures enter on the right, pass the front and leave on the left; a card hidden behind the podium takes the next one.
const STREAM=['costumes-1','toys-1','costumes-3','outerwear-4','snuffle-3','sweaters-1','apparel-5','toys-6','beds-5','access-1',
  'apparel-3','toys-3','costumes-5','outerwear-2','snuffle-1','beds-3','sweaters-5','toys-2','costumes-2','access-5',
  'apparel-1','snuffle-4','sweaters-2','outerwear-1','toys-4','beds-1','costumes-4','snuffle-2','access-3','sweaters-3',
  'toys-5','apparel-2','beds-4','outerwear-3','snuffle-5','access-2','sweaters-4','apparel-4','beds-2','outerwear-5','access-4'];
const COVERS={toys:'toys-1',snuffle:'snuffle-1',apparel:'apparel-3',costumes:'costumes-2',sweaters:'sweaters-3',outerwear:'outerwear-4',beds:'beds-5',access:'access-1'};
const cutout=name=>`assets/cutouts/${name}.webp`;
export function showroomPictures(lines){
  const lineOf=Object.fromEntries(lines.map((line,i)=>[line.id,i]));
  return STREAM.map((name,order)=>({url:cutout(name),line:lineOf[name.split('-')[0]],order}));
}

const strings={
  en:{heading:'Interactive showroom',drag:'Drag to rotate',paused:'Motion paused · drag to explore',prev:'Previous picture',next:'Next picture',pause:'Pause 3D animation',play:'Play 3D animation',reset:'Reset 3D view',choose:'Bring a collection to the front',instructions:'Interactive 3D product showroom. Drag to rotate, or use the left and right arrow keys. Press Space to pause or play.',chapters:'Explore the page',collections:'Product collections',products:'The full catalog',process:'From sketch to shelf',factories:'Our factories',cambodia:'Your brand, our factories',trust:'Certifications',contact:'Start a conversation'},
  zh:{heading:'交互式产品展厅',drag:'拖动旋转',paused:'动画已暂停 · 拖动探索',prev:'上一张',next:'下一张',pause:'暂停3D动画',play:'播放3D动画',reset:'重置3D视角',choose:'将产品系列转到前面',instructions:'交互式3D产品展厅。拖动旋转，或使用左右方向键。按空格键暂停或播放。',chapters:'浏览页面',collections:'产品系列',products:'完整产品目录',process:'从草图到货架',factories:'我们的工厂',cambodia:'您的品牌，我们的工厂',trust:'资质认证',contact:'开始沟通'}
};

export function mountShowroom({Renderer=THREE.WebGLRenderer,textureLoader=null,observe=true}={}) {
  const world=document.getElementById('hero-world');if(!world)return null;
  const $=s=>world.querySelector(s),viewport=$('#world-viewport'),host=$('#world-canvas');
  const lang=document.documentElement.lang.startsWith('zh')?'zh':'en',text=strings[lang],collections=window.LINES,stream=showroomPictures(collections),step=Math.PI*2/CARDS;
  const preference=window.matchMedia('(prefers-reduced-motion: reduce)');
  const compact=window.matchMedia('(pointer: coarse)').matches||window.innerWidth<700;
  const state={selected:0,playing:!preference.matches,angle:0,target:0,elapsed:0,intro:preference.matches?1:0,visible:true,disposed:false,next:CARDS/2+1};
  const listeners=[];const listen=(el,type,fn,options)=>{el.addEventListener(type,fn,options);listeners.push(()=>el.removeEventListener(type,fn,options));};
  let renderer=null,scene=null,camera=null,model=null,environment=null,drag=null,frameId=0,clock=0,lastFrame=0,manualMotion=false,selectionPending=false;
  let retiredRenderer=null,cameraDistance=8;
  let pointerX=0,pointerY=0,smoothedX=0,smoothedY=0,hover=-1;
  const loader=textureLoader||new THREE.TextureLoader(),textures=new Map();
  const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();
  $('#world-heading').textContent=text.heading;$('#world-hint').textContent=text.drag;
  viewport.setAttribute('aria-label',text.instructions);
  for(const id of ['prev','next','reset'])$('#world-'+id).setAttribute('aria-label',text[id]);
  $('#world-categories').setAttribute('aria-label',text.choose);
  const thumbs=collections.map((line,i)=>{
    const button=document.createElement('button');button.type='button';button.dataset.worldLine=i;
    button.setAttribute('aria-label',line[lang].t);button.setAttribute('aria-pressed','false');button.style.setProperty('--swatch',line.color);
    const image=document.createElement('img');image.src=cutout(COVERS[line.id]||`${line.id}-1`);image.alt='';image.width=38;image.height=38;button.append(image);
    $('#world-categories').append(button);return button;
  });
  // Cards right of the front and behind the podium show the start of the stream; cards on the left show its end.
  const startPicture=i=>stream[i<=CARDS/2?i:stream.length-(CARDS-i)];
  // CSS perspective is a functional fallback if the device cannot create WebGL.
  const fallback=document.createElement('div');fallback.className='world-css-orbit';fallback.setAttribute('aria-hidden','true');
  fallback.innerHTML='<svg class="world-css-paw" viewBox="0 0 64 64"><use href="#paw"/></svg>';
  const fallbackCards=Array.from({length:CARDS},(_,i)=>{
    const element=document.createElement('div');element.className='world-css-card';element.innerHTML='<img src="" alt="">';
    fallback.append(element);const card={element,turned:Math.cos(i*step)<=-.85};showOnFallback(card,startPicture(i));return card;
  });viewport.append(fallback);world.classList.add('world-mounted');
  try {
    renderer=new Renderer({alpha:true,antialias:true,powerPreference:'high-performance',preserveDrawingBuffer:false});
    renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,compact?1.5:2));
    renderer.setClearColor(0x000000,0);renderer.outputColorSpace=THREE.SRGBColorSpace;
    renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
    renderer.domElement.setAttribute('aria-hidden','true');host.append(renderer.domElement);
    scene=new THREE.Scene();camera=new THREE.PerspectiveCamera(40,1,.1,40);
    scene.fog=new THREE.Fog(0x111c3b,8.5,15);
    environment=studioEnvironment(renderer);scene.environment=environment.texture;
    scene.add(new THREE.HemisphereLight(0xdfe8ff,0x2a3866,.9));
    const key=new THREE.DirectionalLight(0xffeccc,2.4);key.position.set(3,5,6);scene.add(key);
    const fill=new THREE.DirectionalLight(0xa9caff,1.2);fill.position.set(-4,1.5,3);scene.add(fill);
    const rim=new THREE.DirectionalLight(0xf3bf65,2.6);rim.position.set(-1,3,-4);scene.add(rim);
    const starts=Array.from({length:CARDS},(_,i)=>startPicture(i));
    model=buildShowroom(starts.map(picture=>({color:collections[picture.line].color})),{compact});scene.add(model.root);
    model.cards.forEach((card,i)=>{card.picture=starts[i];card.turned=Math.cos(i*step)<=-.85;loadTexture(starts[i].url,map=>{if(card.picture===starts[i]){fitTexture(card,map);requestDraw();}});});
    loadTexture(stream[state.next].url);
    world.dataset.renderer='webgl';fallback.hidden=true;
    listen(renderer.domElement,'webglcontextlost',event=>{
      event.preventDefault();
      // A lost GPU context must not strand the controls or leave a second render loop.
      retiredRenderer=renderer;renderer.setAnimationLoop(null);renderer=null;
      host.replaceChildren();fallback.hidden=false;world.dataset.renderer='css-3d';syncLoop();
    });
  } catch(error) {
    if(renderer){renderer.dispose();renderer=null;}host.replaceChildren();world.dataset.renderer='css-3d';fallback.hidden=false;
  }
  const cards=()=>renderer&&model?model.cards:fallbackCards;

  // Cut-out textures are loaded once and shared; a callback runs when a picture is ready.
  function loadTexture(url,ready) {
    let entry=textures.get(url);
    if(!entry){
      entry={texture:null,ready:false,waiting:[]};textures.set(url,entry);
      entry.texture=loader.load(url,()=>{if(state.disposed)return;entry.ready=true;entry.waiting.splice(0).forEach(fn=>fn(entry.texture));},undefined,()=>{world.dataset.textureWarning='true';});
      entry.texture.colorSpace=THREE.SRGBColorSpace;entry.texture.anisotropy=4;
    }
    if(ready){if(entry.ready)ready(entry.texture);else entry.waiting.push(ready);}
    return entry;
  }
  function fitTexture(card,map) {
    const aspect=map.image.width/map.image.height,w=Math.min(1.16,1.5*aspect);
    card.image.scale.set(w,w/aspect,1);card.image.material.map=map;card.image.material.needsUpdate=true;
  }
  function showOnFallback(card,picture){card.picture=picture;card.element.style.setProperty('--swatch',collections[picture.line].color);card.element.querySelector('img').src=picture.url;}
  // Put a picture on a card. WebGL cards change only once the texture is ready, so they never flash empty.
  function show(index,picture) {
    const card=cards()[index];
    if(card===fallbackCards[index]){showOnFallback(card,picture);return true;}
    const entry=loadTexture(picture.url);if(!entry.ready)return false;
    card.picture=picture;fitTexture(card,entry.texture);paintCard(card,collections[picture.line].color);return true;
  }
  // While a card is hidden behind the podium it takes the next picture in the stream.
  function feedStream() {
    cards().forEach((card,i)=>{
      if(Math.cos(state.angle+i*step)>-.85){card.turned=false;return;}
      if(card.turned||!show(i,stream[state.next%stream.length]))return;
      card.turned=true;state.next=(state.next+1)%stream.length;
      if(model)loadTexture(stream[state.next].url);
    });
  }
  // A collection button gives the card furthest behind a picture from that collection, then spins it to the front.
  function bringCollection(line) {
    const back=wrapIndex(state.selected+CARDS/2,CARDS),showing=new Set(cards().map(card=>card.picture.url));
    const choices=stream.filter(picture=>picture.line===line),picture=choices.find(p=>!showing.has(p.url))||choices[0];
    const place=()=>{if(state.disposed)return;show(back,picture);cards()[back].turned=true;select(back);};
    if(model&&cards()===model.cards)loadTexture(picture.url,place);else place();
  }
  function updateLabels() {
    const picture=cards()[state.selected].picture;
    world.style.setProperty('--active',collections[picture.line].color);
    thumbs.forEach((button,i)=>button.setAttribute('aria-pressed',String(i===picture.line)));
    world.dataset.activeIndex=state.selected;world.dataset.motion=state.playing?'playing':'paused';
    $('#world-pause').setAttribute('aria-label',state.playing?text.pause:text.play);$('#world-pause').setAttribute('aria-pressed',String(!state.playing));
    $('#world-pause-icon').textContent=state.playing?'Ⅱ':'▷';$('#world-hint').textContent=state.playing?text.drag:text.paused;
  }
  function select(index,{instant=false}={}) {
    state.selected=wrapIndex(index,CARDS);state.target=nearestAngle(state.angle,state.selected,CARDS);
    selectionPending=!instant&&state.playing;
    if(instant||!state.playing)state.angle=state.target;
    updateLabels();requestDraw();
  }
  function draw() {
    if(state.disposed)return;
    feedStream();
    const t=state.elapsed,intro=1-Math.pow(1-state.intro,3);
    if(renderer&&model) {
      positionCards(model.cards,state.angle,t,state.intro);
      model.root.rotation.set(smoothedY*.06,smoothedX*.1,0);
      model.paw.rotation.y=Math.sin(t*.42)*.3;model.paw.position.y=.95+Math.sin(t*.8)*.06;
      model.halo.material.opacity=(.3+Math.sin(t*1.1)*.06)*intro;
      model.orbits.forEach((orbit,i)=>{orbit.rotation.y=(i?-.6:.4)+t*(i?-.12:.09);orbit.rotation.z=t*(i?.07:-.05);});
      model.rings.forEach((ring,i)=>{ring.rotation.z=t*(i?-.03:.02);});
      model.deck.rotation.y=state.angle*.5;
      if(model.beam)model.beam.material.uniforms.strength.value=(.14+Math.sin(t*.7)*.02)*intro;
      model.yarn.rotation.set(t*.15,t*.22,0);model.yarn.position.y=1.45+Math.sin(t*.9)*.1;
      model.bone.rotation.set(.2,-.2,-.42+Math.sin(t*.65)*.15);model.bone.position.y=1.5+Math.sin(t*.8+2)*.09;
      camera.position.set(0,1.85+(1-intro)*1.2,cameraDistance+(1-intro)*2.6);camera.lookAt(0,-.62,0);
      renderer.render(scene,camera);
    } else {
      const width=viewport.clientWidth||500;
      fallback.style.transform=`rotateX(${smoothedY*-5}deg) rotateY(${smoothedX*6}deg)`;
      fallbackCards.forEach(({element},i)=>{
        const a=state.angle+i*step,front=(Math.cos(a)+1)/2;
        element.style.transform=`translate3d(${Math.sin(a)*width*.32}px,${Math.sin(t*.8+i)*7}px,${Math.cos(a)*100}px) rotateY(${-Math.sin(a)*22}deg) scale(${.64+front*.3})`;
        element.style.zIndex=String(Math.round(front*10));element.style.opacity=String(.45+front*.55);
        element.classList.toggle('front',front>.97);
      });
    }
  }
  function animateDetails(delta) {
    if(!model)return;
    model.cards.forEach((card,i)=>{card.hover+=((i===hover?1:0)-card.hover)*(1-Math.exp(-delta*10));});
    // Gold dust rises slowly and wraps back to the floor.
    const dust=model.particles.geometry.attributes.position;
    for(let i=0;i<dust.count;i++){let y=dust.getY(i)+delta*(.06+(i%5)*.02);if(y>2.9)y=-2.6;dust.setY(i,y);}
    dust.needsUpdate=true;
  }
  function frame(timestamp) {
    if(state.disposed)return;
    if(compact&&lastFrame&&timestamp-lastFrame<30)return;
    const delta=clock?Math.min((timestamp-clock)/1000,.06):0;clock=timestamp;lastFrame=timestamp;
    state.elapsed+=delta;state.intro=Math.min(1,state.intro+delta/1.8);
    smoothedX+=(pointerX-smoothedX)*.075;smoothedY+=(pointerY-smoothedY)*.075;
    if(!drag){
      // Constant angular velocity: a complete orbit in 66 seconds, with no dwell.
      state.target-=delta*ROTATION_SPEED;state.angle-=delta*ROTATION_SPEED;
      state.angle+=(state.target-state.angle)*(1-Math.exp(-delta*6));
      if(selectionPending&&Math.abs(state.target-state.angle)<.025)selectionPending=false;
      const front=wrapIndex(Math.round(-state.angle/step),CARDS);
      if(!selectionPending&&front!==state.selected){state.selected=front;updateLabels();}
    }
    animateDetails(delta);draw();
  }
  function cssFrame(timestamp){frameId=0;if(!running())return;frame(timestamp);frameId=requestAnimationFrame(cssFrame);}
  function running(){return state.playing&&state.visible&&!document.hidden&&!state.disposed;}
  function syncLoop() {
    clock=0;lastFrame=0;
    if(renderer)renderer.setAnimationLoop(running()?frame:null);
    if(frameId){cancelAnimationFrame(frameId);frameId=0;}
    if(!renderer&&running())frameId=requestAnimationFrame(cssFrame);
    if(!running()){state.intro=1;draw();}
  }
  function requestDraw(){if(!running()&&!state.disposed)draw();}
  function setPlaying(playing,user=true){if(state.disposed)return;if(!playing&&selectionPending){state.angle=state.target;selectionPending=false;}state.playing=playing;if(user)manualMotion=true;updateLabels();syncLoop();}
  function reset(){pointerX=pointerY=smoothedX=smoothedY=0;state.angle=0;select(0,{instant:true});}
  function resize(){
    if(state.disposed)return;
    const w=viewport.clientWidth||500,h=viewport.clientHeight||440;
    if(renderer){renderer.setSize(w,h,false);camera.aspect=w/h;cameraDistance=Math.max(8.9,11/camera.aspect);camera.updateProjectionMatrix();}
    draw();
  }
  function hit(event){
    if(!renderer||!model||state.disposed)return -1;
    const rect=viewport.getBoundingClientRect();pointer.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);
    raycaster.setFromCamera(pointer,camera);const hits=raycaster.intersectObjects(model.cards.map(card=>card.backing),false);
    return hits.length?hits[0].object.userData.index:-1;
  }
  listen(viewport,'pointerdown',event=>{if(event.button!==undefined&&event.button!==0)return;drag={id:event.pointerId,x:event.clientX,y:event.clientY,angle:state.angle,active:false};viewport.focus({preventScroll:true});});
  listen(viewport,'pointermove',event=>{
    const rect=viewport.getBoundingClientRect();if(!preference.matches){pointerX=((event.clientX-rect.left)/rect.width-.5)*2;pointerY=((event.clientY-rect.top)/rect.height-.5)*2;}
    if(drag&&event.pointerId===drag.id){
      const dx=event.clientX-drag.x,dy=event.clientY-drag.y;
      if(!drag.active&&Math.abs(dx)>7&&Math.abs(dx)>Math.abs(dy)){drag.active=true;viewport.setPointerCapture?.(event.pointerId);viewport.classList.add('dragging');}
      if(drag.active){event.preventDefault();state.target=drag.angle+dx*.007;state.angle=state.target;draw();}
    } else {
      const index=hit(event);if(index!==hover){hover=index;viewport.classList.toggle('over-product',index>=0);if(!running()&&model){model.cards.forEach((card,i)=>{card.hover=i===hover?1:0;});draw();}}
    }
    if(!state.playing){smoothedX=pointerX;smoothedY=pointerY;draw();}
  },{passive:false});
  const finishDrag=event=>{
    if(!drag||event.pointerId!==drag.id)return;
    const wasDragging=drag.active;drag=null;viewport.classList.remove('dragging');
    if(viewport.hasPointerCapture?.(event.pointerId))viewport.releasePointerCapture(event.pointerId);
    if(wasDragging)select(Math.round(-state.target/step));else{const index=hit(event);if(index>=0)select(index);}
  };
  listen(window,'pointerup',finishDrag);listen(viewport,'pointercancel',()=>{drag=null;viewport.classList.remove('dragging');select(Math.round(-state.target/step));});
  listen(viewport,'pointerleave',()=>{pointerX=pointerY=0;hover=-1;viewport.classList.remove('over-product');if(!state.playing){smoothedX=smoothedY=0;model?.cards.forEach(card=>{card.hover=0;});draw();}});
  listen(viewport,'keydown',event=>{
    if(event.target!==viewport)return;
    if(['ArrowLeft','ArrowRight',' '].includes(event.key))event.preventDefault();else return;
    if(event.key===' ')setPlaying(!state.playing);else select(state.selected+(event.key==='ArrowRight'?1:-1));
  });
  listen($('#world-prev'),'click',()=>select(state.selected-1));listen($('#world-next'),'click',()=>select(state.selected+1));
  listen($('#world-pause'),'click',()=>setPlaying(!state.playing));listen($('#world-reset'),'click',reset);
  thumbs.forEach((button,i)=>listen(button,'click',()=>bringCollection(i)));
  listen(document,'visibilitychange',syncLoop);
  if(preference.addEventListener)listen(preference,'change',event=>{if(!manualMotion)setPlaying(!event.matches,false);});
  let visibility=null,sizeObserver=null;
  if(observe&&'IntersectionObserver'in window){visibility=new IntersectionObserver(entries=>{state.visible=entries[0].isIntersecting;syncLoop();},{threshold:0});visibility.observe(world);}
  if(observe&&'ResizeObserver'in window){sizeObserver=new ResizeObserver(resize);sizeObserver.observe(viewport);}else listen(window,'resize',resize,{passive:true});
  function dispose(){
    if(state.disposed)return;
    state.disposed=true;renderer?.setAnimationLoop(null);if(frameId)cancelAnimationFrame(frameId);listeners.forEach(remove=>remove());visibility?.disconnect();sizeObserver?.disconnect();
    const geometries=new Set(),materials=new Set(),maps=new Set();
    model?.root.traverse(object=>{if(object.geometry)geometries.add(object.geometry);if(object.material)(Array.isArray(object.material)?object.material:[object.material]).forEach(material=>materials.add(material));});
    materials.forEach(material=>{if(material.map)maps.add(material.map);material.dispose();});textures.forEach(entry=>maps.add(entry.texture));
    maps.forEach(texture=>texture.dispose());geometries.forEach(geometry=>geometry.dispose());
    environment?.dispose();renderer?.dispose();retiredRenderer?.dispose();
    thumbs.forEach(button=>button.remove());fallback.remove();host.replaceChildren();world.classList.remove('world-mounted','world-ready');
  }
  updateLabels();resize();syncLoop();world.classList.add('world-ready');
  return{state,select,setPlaying,reset,dispose,resize,model,get renderer(){return renderer;}};
}

export function mountDetails(){
  const lang=document.documentElement.lang.startsWith('zh')?'zh':'en',text=strings[lang];
  const sections=['collections','products','process','factories','cambodia','trust','contact'];
  sections.forEach((id,i)=>{
    const section=document.getElementById(id),heading=section?.querySelector('.sec-head,.coll-head,.bk-copy');if(!heading)return;
    const label=document.createElement('p');label.className='detail-eyebrow experience-added';label.innerHTML=`<span>${String(i+1).padStart(2,'0')}</span><i></i>${text[id]}`;
    if(heading.classList.contains('bk-copy'))heading.prepend(label);else heading.parentElement.insertBefore(label,heading);
  });
  const fine=window.matchMedia('(hover:hover) and (pointer:fine)').matches,reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const cards=[...document.querySelectorAll('.coll,.cert,.contact-card,.fac-photo,.step')];
  cards.forEach(card=>{
    card.classList.add('depth-card');
    if(!fine||reduce)return;
    card.addEventListener('pointermove',event=>{
      const r=card.getBoundingClientRect(),x=(event.clientX-r.left)/r.width,y=(event.clientY-r.top)/r.height;
      const strength=card.classList.contains('coll')?7:4;
      card.style.setProperty('--tilt-x',`${(.5-y)*strength}deg`);card.style.setProperty('--tilt-y',`${(x-.5)*strength*1.4}deg`);
      card.style.setProperty('--light-x',`${x*100}%`);card.style.setProperty('--light-y',`${y*100}%`);
    },{passive:true});
    card.addEventListener('pointerleave',()=>{card.style.setProperty('--tilt-x','0deg');card.style.setProperty('--tilt-y','0deg');});
  });
  if(!reduce&&window.gsap&&window.ScrollTrigger){
    document.querySelectorAll('.step-media img').forEach(image=>{
      gsap.fromTo(image,{yPercent:-5,scale:1.12},{yPercent:5,scale:1.04,ease:'none',scrollTrigger:{trigger:image.closest('.step'),start:'top bottom',end:'bottom top',scrub:1}});
    });
    document.querySelectorAll('.detail-eyebrow').forEach(label=>gsap.from(label,{opacity:0,x:-22,duration:.8,clearProps:'transform,opacity',scrollTrigger:{trigger:label,start:'top 90%',once:true}}));
    gsap.from('.world-topbar,.world-transport,.world-categories',{opacity:0,y:15,stagger:.12,duration:.8,delay:.6,clearProps:'transform,opacity'});
    ScrollTrigger.refresh();
  }
  const progress=document.createElement('nav');progress.className='chapter-nav experience-added';progress.setAttribute('aria-label',text.chapters);
  progress.innerHTML=sections.map((id,i)=>`<a href="#${id}" aria-label="${text[id]}"><i></i><span>${String(i+1).padStart(2,'0')} ${text[id]}</span></a>`).join('');document.body.append(progress);
  if('IntersectionObserver'in window){
    const chapterObserver=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){progress.querySelectorAll('a').forEach(a=>a.classList.toggle('active',a.hash==='#'+entry.target.id));progress.classList.add('show');}}),{rootMargin:'-20% 0px -45% 0px'});
    sections.forEach(id=>chapterObserver.observe(document.getElementById(id)));
    const heroObserver=new IntersectionObserver(entries=>{if(entries[0].isIntersecting)progress.classList.remove('show');},{threshold:.25});heroObserver.observe(document.getElementById('hero'));
  }
}

if(typeof document!=='undefined'&&document.getElementById('hero-world')){
  mountDetails();
  try{mountShowroom();}catch(error){const world=document.getElementById('hero-world');world.dataset.renderer='static';world.classList.remove('world-mounted');}
}
