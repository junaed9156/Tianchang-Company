import * as THREE from './vendor/three.module.js';
import {buildShowroom,positionCards,nearestAngle,wrapIndex} from './scene-models.js?v=20261018-pets';

const ROTATION_SPEED=Math.PI*2/66;
export function showroomSlides(lines){
  return [
    {id:'catalog-dog',image:'assets/cutouts/costumes-1.webp',color:'#f0dfb9',pet:true,collectionIndex:null,en:{t:'Made for dogs'},zh:{t:'为狗狗而设计'}},
    {id:'catalog-cat',image:'assets/cutouts/costumes-3.webp',color:'#d7e9e4',pet:true,collectionIndex:null,en:{t:'Made for cats'},zh:{t:'为猫咪而设计'}},
    ...lines.map((line,collectionIndex)=>({...line,image:`assets/cutouts/${line.id}-${({apparel:3,costumes:2,sweaters:3,beds:5})[line.id]||1}.webp`,collectionIndex}))
  ];
}

const strings={
  en:{heading:'Interactive showroom',drag:'Drag to rotate',paused:'Motion paused · drag to explore',explore:'Explore collection',prev:'Previous 3D collection',next:'Next 3D collection',pause:'Pause 3D animation',play:'Play 3D animation',reset:'Reset 3D view',choose:'Choose a collection',instructions:'Interactive 3D product showroom. Drag to rotate, or use the left and right arrow keys. Press Space to pause or play.',chapters:'Explore the page',collections:'Product collections',products:'The full catalog',process:'From sketch to shelf',factories:'Our factories',cambodia:'Your brand, our factories',trust:'Certifications',contact:'Start a conversation'},
  zh:{heading:'交互式产品展厅',drag:'拖动旋转',paused:'动画已暂停 · 拖动探索',explore:'浏览此系列',prev:'上一个3D系列',next:'下一个3D系列',pause:'暂停3D动画',play:'播放3D动画',reset:'重置3D视角',choose:'选择产品系列',instructions:'交互式3D产品展厅。拖动旋转，或使用左右方向键。按空格键暂停或播放。',chapters:'浏览页面',collections:'产品系列',products:'完整产品目录',process:'从草图到货架',factories:'我们的工厂',cambodia:'您的品牌，我们的工厂',trust:'资质认证',contact:'开始沟通'}
};

export function mountShowroom({Renderer=THREE.WebGLRenderer,textureLoader=null,observe=true}={}) {
  const world=document.getElementById('hero-world');if(!world)return null;
  const $=s=>world.querySelector(s),viewport=$('#world-viewport'),host=$('#world-canvas');
  const lang=document.documentElement.lang.startsWith('zh')?'zh':'en',text=strings[lang],lines=showroomSlides(window.LINES),step=Math.PI*2/lines.length;
  const preference=window.matchMedia('(prefers-reduced-motion: reduce)');
  const compact=window.matchMedia('(pointer: coarse)').matches||window.innerWidth<700;
  const state={selected:0,playing:!preference.matches,angle:0,target:0,elapsed:0,visible:true,disposed:false};
  const listeners=[];const listen=(el,type,fn,options)=>{el.addEventListener(type,fn,options);listeners.push(()=>el.removeEventListener(type,fn,options));};
  let renderer=null,scene=null,camera=null,model=null,drag=null,frameId=0,clock=0,lastFrame=0,manualMotion=false,selectionPending=false;
  let retiredRenderer=null;
  let pointerX=0,pointerY=0,smoothedX=0,smoothedY=0,hover=-1;
  const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();
  $('#world-heading').textContent=text.heading;$('#world-hint').textContent=text.drag;
  viewport.setAttribute('aria-label',text.instructions);$('#world-explore').innerHTML=`${text.explore} <span aria-hidden="true">↗</span>`;
  for(const id of ['prev','next','reset'])$('#world-'+id).setAttribute('aria-label',text[id]);
  $('#world-categories').setAttribute('aria-label',text.choose);
  const thumbs=lines.map((line,i)=>{
    const button=document.createElement('button');button.type='button';button.dataset.worldLine=i;
    button.setAttribute('aria-label',line[lang].t);button.setAttribute('aria-pressed',String(i===0));button.style.setProperty('--swatch',line.color);
    const image=document.createElement('img');image.src=line.image;image.alt='';image.width=38;image.height=38;button.append(image);
    $('#world-categories').append(button);return button;
  });
  // CSS perspective is a functional fallback if the device cannot create WebGL.
  const fallback=document.createElement('div');fallback.className='world-css-orbit';fallback.setAttribute('aria-hidden','true');
  fallback.innerHTML='<svg class="world-css-paw" viewBox="0 0 64 64"><use href="#paw"/></svg>';
  const fallbackCards=lines.map((line,i)=>{
    const card=document.createElement('div');card.className=`world-css-card${line.pet?' world-css-card--pet':''}`;card.style.background=line.color;
    card.innerHTML=`<img src="${line.image}" alt=""><span>${String(i+1).padStart(2,'0')}</span>`;
    fallback.append(card);return card;
  });viewport.append(fallback);world.classList.add('world-mounted');
  try {
    renderer=new Renderer({alpha:true,antialias:true,powerPreference:'high-performance',preserveDrawingBuffer:false});
    renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,compact?1.35:1.7));
    renderer.setClearColor(0x000000,0);renderer.outputColorSpace=THREE.SRGBColorSpace;
    renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.4;
    renderer.shadowMap.enabled=!compact;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    renderer.domElement.setAttribute('aria-hidden','true');host.append(renderer.domElement);
    scene=new THREE.Scene();camera=new THREE.PerspectiveCamera(43,1,.1,40);
    scene.add(new THREE.HemisphereLight(0xe4edff,0x475c8a,2.2));
    const key=new THREE.DirectionalLight(0xffedcb,4.2);key.position.set(3,5,6);key.castShadow=!compact;
    key.shadow.mapSize.set(1024,1024);key.shadow.camera.left=-5;key.shadow.camera.right=5;key.shadow.camera.top=5;key.shadow.camera.bottom=-5;key.shadow.normalBias=.04;scene.add(key);
    const fill=new THREE.DirectionalLight(0xb1d7ff,3.2);fill.position.set(-4,2,3);scene.add(fill);
    const rim=new THREE.DirectionalLight(0xf3bf65,3.3);rim.position.set(1,3,-4);scene.add(rim);
    model=buildShowroom(lines,{compact});scene.add(model.root);
    const loader=textureLoader||new THREE.TextureLoader();
    model.cards.forEach((card,i)=>{
      const texture=loader.load(lines[i].image,loaded=>{
        if(state.disposed){loaded.dispose();return;}
        const aspect=loaded.image.width/loaded.image.height,maxWidth=lines[i].pet?1.39:1.29,maxHeight=lines[i].pet?1.72:1.5,w=Math.min(maxWidth,maxHeight*aspect),h=w/aspect;
        card.image.scale.set(w,h,1);requestDraw();
      },undefined,()=>{world.dataset.textureWarning='true';});
      texture.colorSpace=THREE.SRGBColorSpace;card.image.material.map=texture;card.image.material.needsUpdate=true;
    });
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
  function updateLabels() {
    $('#world-title').textContent=lines[state.selected][lang].t;
    $('#world-counter').textContent=`${String(state.selected+1).padStart(2,'0')} / ${String(lines.length).padStart(2,'0')}`;
    $('#world-explore').innerHTML=`${lines[state.selected].pet?(lang==='zh'?'浏览所有系列':'Explore collections'):text.explore} <span aria-hidden="true">↗</span>`;
    thumbs.forEach((button,i)=>button.setAttribute('aria-pressed',String(i===state.selected)));
    world.dataset.activeIndex=state.selected;world.dataset.motion=state.playing?'playing':'paused';
    $('#world-pause').setAttribute('aria-label',state.playing?text.pause:text.play);$('#world-pause').setAttribute('aria-pressed',String(!state.playing));
    $('#world-pause-icon').textContent=state.playing?'Ⅱ':'▷';$('#world-hint').textContent=state.playing?text.drag:text.paused;
    if(model)model.cards.forEach((card,i)=>{card.material.emissive.set(i===state.selected?0x423119:0x000000);card.material.emissiveIntensity=.18;});
  }
  function select(index,{instant=false}={}) {
    state.selected=wrapIndex(index,lines.length);state.target=nearestAngle(state.angle,state.selected,lines.length);
    selectionPending=!instant&&state.playing;
    if(instant||!state.playing)state.angle=state.target;
    updateLabels();requestDraw();
  }
  function draw() {
    if(state.disposed)return;
    if(renderer&&model) {
      positionCards(model.cards,state.angle,state.elapsed);
      model.root.rotation.set(smoothedY*.08,smoothedX*.12,0);
      model.paw.rotation.y=Math.sin(state.elapsed*.42)*.22;model.paw.position.y=.9+Math.sin(state.elapsed*.8)*.065;
      model.yarn.rotation.set(state.elapsed*.15,state.elapsed*.22,0);model.yarn.position.y=1.5+Math.sin(state.elapsed*.9)*.12;
      model.bone.rotation.z=-.42+Math.sin(state.elapsed*.65)*.15;model.bone.position.y=1.55+Math.sin(state.elapsed*.8+2)*.1;
      model.particles.rotation.y=state.elapsed*.012;
      renderer.render(scene,camera);
    } else {
      const width=viewport.clientWidth||500;
      fallback.style.transform=`rotateX(${smoothedY*-5}deg) rotateY(${smoothedX*6}deg)`;
      fallbackCards.forEach((card,i)=>{
        const a=state.angle+i*step,front=(Math.cos(a)+1)/2;
        card.style.transform=`translate3d(${Math.sin(a)*width*.32}px,${Math.sin(state.elapsed*.8+i)*7}px,${Math.cos(a)*100}px) rotateY(${-Math.sin(a)*22}deg) scale(${.64+front*.3})`;
        card.style.zIndex=String(Math.round(front*10));card.style.opacity=String(.45+front*.55);
      });
    }
  }
  function frame(timestamp) {
    if(state.disposed)return;
    if(compact&&lastFrame&&timestamp-lastFrame<30)return;
    const delta=clock?Math.min((timestamp-clock)/1000,.06):0;clock=timestamp;lastFrame=timestamp;
    state.elapsed+=delta;smoothedX+=(pointerX-smoothedX)*.075;smoothedY+=(pointerY-smoothedY)*.075;
    if(!drag){
      // Constant angular velocity: a complete orbit in 66 seconds, with no dwell.
      state.target-=delta*ROTATION_SPEED;state.angle-=delta*ROTATION_SPEED;
      state.angle+=(state.target-state.angle)*(1-Math.exp(-delta*6));
      if(selectionPending&&Math.abs(state.target-state.angle)<.025)selectionPending=false;
      const front=wrapIndex(Math.round(-state.angle/step),lines.length);
      if(!selectionPending&&front!==state.selected){state.selected=front;updateLabels();}
    }
    draw();
  }
  function cssFrame(timestamp){frameId=0;if(!running())return;frame(timestamp);frameId=requestAnimationFrame(cssFrame);}
  function running(){return state.playing&&state.visible&&!document.hidden&&!state.disposed;}
  function syncLoop() {
    clock=0;lastFrame=0;
    if(renderer)renderer.setAnimationLoop(running()?frame:null);
    if(frameId){cancelAnimationFrame(frameId);frameId=0;}
    if(!renderer&&running())frameId=requestAnimationFrame(cssFrame);
    if(!running())draw();
  }
  function requestDraw(){if(!running()&&!state.disposed)draw();}
  function setPlaying(playing,user=true){if(state.disposed)return;if(!playing&&selectionPending){state.angle=state.target;selectionPending=false;}state.playing=playing;if(user)manualMotion=true;updateLabels();syncLoop();}
  function reset(){pointerX=pointerY=smoothedX=smoothedY=0;state.angle=0;select(0,{instant:true});}
  function resize(){
    if(state.disposed)return;
    const w=viewport.clientWidth||500,h=viewport.clientHeight||440;
    if(renderer){renderer.setSize(w,h,false);camera.aspect=w/h;camera.position.set(0,2.25,Math.max(7.75,9.3/camera.aspect));camera.lookAt(0,-.2,0);camera.updateProjectionMatrix();}
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
      const index=hit(event);if(index!==hover){hover=index;viewport.classList.toggle('over-product',index>=0);}
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
  listen(viewport,'pointerleave',()=>{pointerX=pointerY=0;hover=-1;viewport.classList.remove('over-product');if(!state.playing){smoothedX=smoothedY=0;draw();}});
  listen(viewport,'keydown',event=>{
    if(event.target!==viewport)return;
    if(['ArrowLeft','ArrowRight','Home','End',' '].includes(event.key))event.preventDefault();else return;
    if(event.key===' ')setPlaying(!state.playing);else select(event.key==='Home'?0:event.key==='End'?lines.length-1:state.selected+(event.key==='ArrowRight'?1:-1));
  });
  listen($('#world-prev'),'click',()=>select(state.selected-1));listen($('#world-next'),'click',()=>select(state.selected+1));
  listen($('#world-pause'),'click',()=>setPlaying(!state.playing));listen($('#world-reset'),'click',reset);
  thumbs.forEach((button,i)=>listen(button,'click',()=>select(i)));
  listen($('#world-explore'),'click',()=>{
    const index=lines[state.selected].collectionIndex;
    if(index===null)document.querySelector('#site-nav a[href="#collections"]')?.click();
    else document.querySelector(`.coll [data-line="${index}"]`)?.click();
  });
  listen(document,'visibilitychange',syncLoop);
  if(preference.addEventListener)listen(preference,'change',event=>{if(!manualMotion)setPlaying(!event.matches,false);});
  let visibility=null,sizeObserver=null;
  if(observe&&'IntersectionObserver'in window){visibility=new IntersectionObserver(entries=>{state.visible=entries[0].isIntersecting;syncLoop();},{threshold:0});visibility.observe(world);}
  if(observe&&'ResizeObserver'in window){sizeObserver=new ResizeObserver(resize);sizeObserver.observe(viewport);}else listen(window,'resize',resize,{passive:true});
  function dispose(){
    if(state.disposed)return;
    state.disposed=true;renderer?.setAnimationLoop(null);if(frameId)cancelAnimationFrame(frameId);listeners.forEach(remove=>remove());visibility?.disconnect();sizeObserver?.disconnect();
    const geometries=new Set(),materials=new Set(),textures=new Set();
    model?.root.traverse(object=>{if(object.geometry)geometries.add(object.geometry);if(object.material)(Array.isArray(object.material)?object.material:[object.material]).forEach(material=>materials.add(material));});
    materials.forEach(material=>{if(material.map)textures.add(material.map);material.dispose();});textures.forEach(texture=>texture.dispose());geometries.forEach(geometry=>geometry.dispose());renderer?.dispose();retiredRenderer?.dispose();
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
    gsap.from('.world-topbar,.world-caption,.world-transport,.world-categories',{opacity:0,y:15,stagger:.12,duration:.8,delay:.6,clearProps:'transform,opacity'});
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
