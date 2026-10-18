/* A visual connection between the existing brand story and the three real factories. */
export function mountFactoryStudio({observe=true}={}){
  const host=document.getElementById('brand-studio'),section=document.getElementById('cambodia');
  if(!host||!section||!window.FACTORIES)return null;
  const zh=document.documentElement.lang.startsWith('zh');
  const preference=window.matchMedia('(prefers-reduced-motion: reduce)');
  const labels=zh?{network:'三家工厂，一个团队',brand:'您的品牌',visit:'了解工厂',pause:'暂停工厂动画',play:'播放工厂动画',china:'中国',cambodia:'柬埔寨',since:y=>`始于${y}年`,area:'平方米',team:'名员工'}:{network:'Three factories, one team',brand:'Your brand',visit:'Explore factory',pause:'Pause factory animation',play:'Play factory animation',china:'China',cambodia:'Cambodia',since:y=>`since ${y}`,area:'m²',team:'people'};
  const towns=zh?['天长','桐庐','磅士卑']:['Tianchang','Tonglu','Kampong Speu'],photos=['tianchang','tonglu','cambodia'],since=[2014,2008,2023];
  let playing=!preference.matches,visible=!observe,manual=false,disposed=false;
  const cleanups=[],listen=(el,type,fn,options)=>{el.addEventListener(type,fn,options);cleanups.push(()=>el.removeEventListener(type,fn,options));};
  host.setAttribute('role','region');host.setAttribute('aria-label',labels.network);
  host.innerHTML=`
    <div class="studio-topline"><span>${labels.network}</span><button class="studio-motion" type="button"><span aria-hidden="true">Ⅱ</span></button></div>
    <div class="studio-hub"><div class="studio-hub-ring" aria-hidden="true"></div><img src="assets/brand/pawsign-128.png" width="128" height="128" alt="PAWSIGN"><span>${labels.brand}</span></div>
    <svg class="studio-links" viewBox="0 0 600 100" preserveAspectRatio="none" aria-hidden="true">
      <path class="studio-link-base" d="M300 0 C300 60 100 40 100 100"/><path class="studio-link-base" d="M300 0 V100"/><path class="studio-link-base" d="M300 0 C300 60 500 40 500 100"/>
      <path class="studio-link-flow" d="M300 0 C300 60 100 40 100 100"/><path class="studio-link-flow" d="M300 0 V100" style="animation-delay:-1.3s"/><path class="studio-link-flow" d="M300 0 C300 60 500 40 500 100" style="animation-delay:-2.6s"/>
    </svg>
    <div class="studio-cards"></div>`;
  const cards=window.FACTORIES.map((factory,index)=>{
    const button=document.createElement('button');button.className=`studio-card studio-card-${index}`;button.type='button';button.dataset.factory=index;
    button.setAttribute('aria-label',`${labels.visit}: ${factory.name}`);
    button.style.setProperty('--float-delay',`${index*-2.4}s`);
    // The honeycomb keeps every hexagon photo whole; it sits on its own lit stage.
    const stage=document.createElement('span');stage.className='studio-stage';
    const image=document.createElement('img');image.className='studio-photo';image.src=`assets/factory/${photos[index]}-honeycomb.webp`;image.alt=factory.name;image.loading='lazy';image.decoding='async';stage.append(image);
    const caption=document.createElement('span');caption.className='studio-card-caption';
    const name=document.createElement('b');name.textContent=towns[index];
    const country=document.createElement('small');country.textContent=`${index===2?labels.cambodia:labels.china} · ${labels.since(since[index])}`;
    const arrow=document.createElement('i');arrow.textContent='↗';arrow.setAttribute('aria-hidden','true');
    const stats=document.createElement('span');stats.className='studio-stats';
    stats.innerHTML=`<span><b>${factory.area.toLocaleString('en-US')}</b>${labels.area}</span><span><b>${factory.team}</b>${labels.team}</span>`;
    caption.append(name,country,arrow);button.append(stage,caption,stats);host.querySelector('.studio-cards').append(button);
    listen(button,'click',()=>{
      const target=document.querySelector(`.fac-tab[data-f="${index}"]`);
      target?.click();document.querySelector('#site-nav a[href="#factories"]')?.click();target?.focus({preventScroll:true});
    });return button;
  });
  const toggle=host.querySelector('.studio-motion');
  function sync(){
    section.dataset.studioMotion=playing&&visible&&!document.hidden?'playing':'paused';
    toggle.setAttribute('aria-label',playing?labels.pause:labels.play);toggle.setAttribute('aria-pressed',String(!playing));toggle.firstElementChild.textContent=playing?'Ⅱ':'▷';
  }
  function setPlaying(value,user=true){if(disposed)return;playing=value;if(user)manual=true;sync();}
  listen(toggle,'click',()=>setPlaying(!playing));listen(document,'visibilitychange',sync);
  if(preference.addEventListener)listen(preference,'change',event=>{if(!manual)setPlaying(!event.matches,false);});
  let observer=null;
  if(observe&&'IntersectionObserver'in window){observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;sync();},{threshold:0});observer.observe(section);}else visible=true;
  if(window.matchMedia('(hover:hover) and (pointer:fine)').matches&&!preference.matches){
    listen(host,'pointermove',event=>{const rect=host.getBoundingClientRect();host.style.setProperty('--studio-x',`${(.5-(event.clientY-rect.top)/rect.height)*3}deg`);host.style.setProperty('--studio-y',`${((event.clientX-rect.left)/rect.width-.5)*4}deg`);},{passive:true});
    listen(host,'pointerleave',()=>{host.style.setProperty('--studio-x','0deg');host.style.setProperty('--studio-y','0deg');});
  }
  if(!preference.matches&&window.gsap&&window.ScrollTrigger){
    window.gsap.from(cards,{y:28,opacity:0,scale:.94,rotateY:-12,duration:.9,stagger:.14,clearProps:'transform,opacity',scrollTrigger:{trigger:host,start:'top 85%',once:true}});
    window.ScrollTrigger.refresh();
  }
  sync();
  function dispose(){if(disposed)return;disposed=true;observer?.disconnect();cleanups.forEach(remove=>remove());host.replaceChildren();delete section.dataset.studioMotion;}
  return{setPlaying,dispose,get playing(){return playing;}};
}
if(typeof document!=='undefined')mountFactoryStudio();
