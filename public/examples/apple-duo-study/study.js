/* Readable adapter for the original Lotus scene. Module IDs are recorded in EVIDENCE.md. */
(() => {
 'use strict';
 const $ = selector => document.querySelector(selector);
 const viewer = $('.viewer');
 const loading = $('#loading');
 const entries = [
  ['PT_SliderLanding','可折叠设计','美妙的观看体验，精妙的创新设计，放进口袋刚刚好。','↔'],
  ['PT_Landscape','横屏','大屏大视野，娱乐体验超沉浸。还能利用“分屏浏览”进行多任务处理，并排打开同一个 app 的两个视图，比如一边查看整月行程，一边对照当天安排。','↔'],
  ['PT_Portrait','竖屏','键盘更宽，打起字来更自如。空间也更大，浏览内容、滚动操作更轻松。视频也可以固定在屏幕上方，方便你一边观看一边使用其他 app。','↕'],
  ['PT_Closed','闭合','身形精巧，握感超好。主要控制项移到侧边，用起来很顺手，还能为你留出更多纵向空间来使用 app。','▯'],
  ['PT_Laptop','坐立','将 iPhone Duo 折起平放，无论看片刷剧还是健身跟练，都能轻松调到合适的角度。控制项就在底面屏幕上，操作起来也很方便。','⌁'],
  ['PT_Tent','站立','进入待机显示模式，可显示床头钟、照片、小组件等。也能随心调个好角度，在外屏上尽情看片追剧。','∧'],
  ['PT_Durability','耐用性','边框和铰链护壳均采用 5 级钛金属打造，内屏具有抗刮划涂层，机身前后由超瓷晶面板守护，还拥有 IP68 级抗水防尘性能。','◇']
 ];
 let scene, selected = -1, pointer = false;
 const plus = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9.25"/><path d="M12 7.5v9M7.5 12h9"/></svg>';
 const sliderIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="2.5"/><circle cx="15" cy="17" r="2.5"/></svg>';
 $('#items').innerHTML = entries.map(([state,title,text],index) => `
  <li class="item" data-viewer-state="${state}" data-index="${index}">
   <span class="item-bg" aria-hidden="true"></span>
   <button class="item-open" id="item-${index}" aria-controls="detail-${index}" aria-expanded="false"><span class="item-label"><span class="icon" aria-hidden="true">${index===0?sliderIcon:plus}</span><span>${title}</span></span></button>
   <div class="detail" id="detail-${index}" tabindex="-1" aria-hidden="true"><div class="detail-mask"><div class="detail-inner"><p><strong>${title}。</strong>${text}</p>${index===0?'<label class="slider-label" for="fold">移动滑块来打开或折起</label><div class="slider-track"><input id="fold" aria-label="折叠程度" type="range" min="0" max="1" step="any" value="0.333333"><div class="slider-output" aria-hidden="true"><div class="slider-thumb"></div></div></div>':''}</div></div></div>
  </li>`).join('');
 const items = [...document.querySelectorAll('.item')];
 const slider = $('#fold');
 const sliderOutput=$('.slider-output'),sliderThumb=$('.slider-thumb');
 let sliderGesture=1/3,sliderBounds=null;
 let sliderPresentation={position:1/3,stretchPosition:1/3,stretchMax:30};
 slider.classList.add('control-detent-slider--input');
 slider.dataset.sliderAria=JSON.stringify({0:'已折起',1:'已展开',default:'部分展开'});
 const diagnostics = document.createElement('output');
 diagnostics.id = 'diagnostics';
 diagnostics.hidden = true;
 viewer.append(diagnostics);

 const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
 const springModule = window.appleStudyRequire('1M8ZXl/FWYPb8Hf1HxuG');
  const spring = springModule.fromCSSString('spring(1,100,14,0)');
 const introSpring = springModule.fromCSSString('spring(1.61,100,14,0)');
 const running = new WeakMap();
 const dimensions = new WeakMap();
 let stepperFrame = 0;
 function cacheDimensions() {
  const mobile=matchMedia('(max-width:734px)').matches;
  items.forEach(item=>{
   const button=item.querySelector('.item-open'),inner=item.querySelector('.detail-inner');
   inner.style.width=mobile?`${document.documentElement.clientWidth-48}px`:'';
   const buttonRect=button.getBoundingClientRect(),contentRect=inner.getBoundingClientRect();
   dimensions.set(item,{button:{width:buttonRect.width,height:buttonRect.height},content:{width:contentRect.width,height:contentRect.height}});
  });
 }
 function setItemSize(item,size) {
  item.style.width=`${size.width}px`;
  item.style.height=`${size.height}px`;
 }
 function animateSize(item,from,to,start=performance.now()) {
  const previous=running.get(item);
  if(previous)cancelAnimationFrame(previous.frame);
  setItemSize(item,from);
  if(reducedMotion){setItemSize(item,to);return;}
  const state={frame:0};
  const frame=now=>{
   const t=Math.min(1,(now-start)/1000),value=spring(t);
   setItemSize(item,{width:from.width+(to.width-from.width)*value,height:from.height+(to.height-from.height)*value});
   if(t<1)state.frame=requestAnimationFrame(frame);
   else {setItemSize(item,to);if(running.get(item)===state)running.delete(item);}
  };
  running.set(item,state);
  state.frame=requestAnimationFrame(frame);
 }
 function setItemState(item,expanded,animateSizeChange=true,start=performance.now()) {
  const button=item.querySelector('.item-open'),content=item.querySelector('.detail');
  const sizes=dimensions.get(item);
  item.classList.toggle('active',expanded);
  button.setAttribute('aria-expanded',String(expanded));
  button.setAttribute('aria-hidden',String(expanded));
  button.tabIndex=expanded?-1:0;
  content.setAttribute('aria-hidden',String(!expanded));
  const from=expanded?sizes.button:sizes.content,to=expanded?sizes.content:sizes.button;
  if(!animateSizeChange||reducedMotion){const active=running.get(item);if(active)cancelAnimationFrame(active.frame);running.delete(item);setItemSize(item,to);return;}
  animateSize(item,from,to,start);
 }
 function easeOutQuart(value) {return 1-(1-value)**4;}
 function animateStepper(visible,animateChange=true) {
  const stepper=$('.stepper');
  cancelAnimationFrame(stepperFrame);
  stepper.setAttribute('aria-hidden',String(!visible));
  if(visible)stepper.style.visibility='visible';
  if(!animateChange||reducedMotion){stepper.style.transform=visible?'translateY(0) scale(1)':'translateY(120px) scale(0)';stepper.style.visibility=visible?'visible':'hidden';return;}
  const start=performance.now();
  const frame=now=>{
   const elapsed=now-start,scaleProgress=Math.min(1,elapsed/300),yProgress=Math.min(1,elapsed/600);
   const scale=visible?easeOutQuart(scaleProgress):1-easeOutQuart(scaleProgress);
   const y=visible?120*(1-easeOutQuart(yProgress)):120*easeOutQuart(yProgress);
   stepper.style.transform=`translateY(${y}px) scale(${scale})`;
   if(elapsed<600)stepperFrame=requestAnimationFrame(frame);
   else if(!visible)stepper.style.visibility='hidden';
  };
  stepperFrame=requestAnimationFrame(frame);
 }
 function tween({duration,delay=0,ease=spring,update,complete}) {
  const start=performance.now()+delay;
  function frame(now){
   if(now<start){requestAnimationFrame(frame);return;}
   const t=Math.min(1,(now-start)/duration);update(ease(t),t);
   if(t<1)requestAnimationFrame(frame);else complete?.();
  }
  requestAnimationFrame(frame);
 }
 function playControlsIntro() {
  const controls=$('.controls'),introElement=$('.intro-element');
  const center=3;
  const easeIn=value=>value*value;
  items.forEach((item,index)=>{
   const button=item.querySelector('.item-open'),bg=item.querySelector('.item-bg'),label=item.querySelector('.item-label');
   button.style.visibility='hidden';
   bg.style.opacity='0';
   label.style.opacity='0';
   label.style.transform='translateY(0)';
  });
  introElement.style.top=`${items[center].offsetTop}px`;
  controls.classList.remove('intro-pending');
  viewer.classList.add('ui-ready');
  if(reducedMotion){
   items.forEach(item=>{
    item.querySelector('.item-open').style.visibility='visible';
    item.querySelector('.item-bg').style.opacity='1';
    item.querySelector('.item-label').style.opacity='1';
   });
   controls.classList.add('intro-complete');
   return;
  }
  controls.classList.add('intro-running');
  introElement.style.display='block';
  introElement.style.opacity='1';
  tween({duration:1400,ease:introSpring,update:value=>{
   introElement.style.transform=`translateX(${-100*(1-value)}px) scale(${value})`;
  },complete:()=>{
   controls.classList.remove('intro-running');
   controls.classList.add('intro-complete');
  }});
  tween({duration:600,delay:400,ease:spring,update:value=>{
   introElement.style.setProperty('--pe-scale',String(value));
  }});
  setTimeout(()=>{
   items.forEach((item,index)=>{
    const button=item.querySelector('.item-open'),bg=item.querySelector('.item-bg'),label=item.querySelector('.item-label');
    const rank=Math.abs(index-center);
    button.style.visibility='visible';
   const width=button.offsetWidth;
   if(index===center){
    introElement.style.display='none';
    tween({duration:600,update:value=>{
     bg.style.opacity='1';
     bg.style.width=`${56+(width-56)*value}px`;
    },complete:()=>{bg.style.width='';}});
    tween({duration:250,delay:250,ease:easeIn,update:value=>{label.style.opacity=String(value);}});
   } else {
    const y=index<center?35:-35;
    tween({duration:1000,delay:50,update:value=>{
     bg.style.transform=`translateY(${y*(1-value)}px) scale(${.5+.5*value})`;
    },complete:()=>{bg.style.transform='';}});
    tween({duration:800,delay:rank*50,update:value=>{
     bg.style.width=`${56+(width-56)*value}px`;
    },complete:()=>{bg.style.width='';}});
    tween({duration:200,delay:100,ease:value=>value,update:value=>{bg.style.opacity=String(value);}});
    tween({duration:400,delay:200+rank*40,ease:easeIn,update:value=>{label.style.opacity=String(value);}});
    tween({duration:200,delay:160+rank*20,ease:easeIn,update:value=>{
     label.style.transform=`translateY(${(index<center?7:-7)*(1-value)}px)`;
    },complete:()=>{label.style.transform='';}});
   }
   });
  },600);
 }
 function select(index, {animateCards=true, force=false}={}) {
  if(index===selected&&!force)return;
  const previous=selected;
  selected = index;
  viewer.classList.toggle('interactive',index===-1);
  viewer.dataset.state = index<0?'interactive':entries[index][0];
  $('#rotate-hint').hidden = index!==-1;
  // One animation clock keeps contraction/expansion complementary in flex layout.
  const start=performance.now();
  if(previous>=0&&previous!==index)setItemState(items[previous],false,animateCards,start);
  if(index>=0&&previous!==index)setItemState(items[index],true,animateCards,start);
  if(previous<0&&index>=0)animateStepper(true,animateCards);
  else if(previous>=0&&index<0)animateStepper(false,animateCards);
  $('#prev').disabled = index<=0;
  $('#next').disabled = index===entries.length-1;
  if (scene) {
   // Selection terminates slider control; the next input enables it again.
   scene.onSliderInactive();
   scene.onViewChange(index);
  }
 }
 items.forEach((item,i) => item.querySelector('button').addEventListener('click',() => select(i)));
 $('#close').addEventListener('click',() => select(-1));
 $('#prev').addEventListener('click',() => select(Math.max(0,selected-1)));
 $('#next').addEventListener('click',() => select(Math.min(6,selected+1)));
 window.addEventListener('resize',()=>{cacheDimensions();items.forEach((item,index)=>setItemState(item,index===selected,false));renderSlider(sliderPresentation);});
 function renderSlider({position,stretchPosition,stretchMax,aria}) {
  sliderPresentation={position,stretchPosition,stretchMax,aria};
  const width=sliderOutput.getBoundingClientRect().width-60;
  const difference=stretchPosition-position,direction=Math.sign(difference);
  const stretch=stretchMax>0?Math.tanh(Math.abs(difference)/(stretchMax*2))*stretchMax*width:0;
  sliderThumb.style.transform=`translateX(${position*width}px) scaleY(${1-.0025*stretch})`;
  sliderThumb.style.setProperty('--thumb-width',`${stretch}px`);
  if(direction){
   sliderThumb.style.setProperty('--left',direction>0?'var(--offset)':'auto');
   sliderThumb.style.setProperty('--right',direction>0?'auto':'var(--offset)');
  }
  sliderThumb.style.setProperty('--icon-offset',`${direction*stretch*.5}px`);
  slider.value=Math.max(0,Math.min(1,position));
  if(aria)slider.setAttribute('aria-valuetext',aria);
 }
 function updateSlider(value,{held=pointer,isClick=false}={}) {
  sliderGesture=value;
  if (scene) {
   scene.onSliderActive();
   scene.onSliderUpdate({gestureProgress:value,pointer:held,isClick});
  }
 }
 function sliderRatio(clientX) {
  const bounds=sliderBounds||sliderOutput.getBoundingClientRect();
  return Math.max(0,Math.min(1,(clientX-bounds.left-30)/(bounds.width-60)));
 }
 function moveSlider(event) {if(pointer)updateSlider(sliderRatio(event.clientX));}
 function releaseSlider() {
  if(!pointer)return;
  pointer=false;
  updateSlider(sliderGesture,{held:false});
  window.removeEventListener('pointermove',moveSlider);
  window.removeEventListener('pointerup',releaseSlider);
  window.removeEventListener('pointercancel',releaseSlider);
 }
 sliderThumb.addEventListener('pointerdown',event=>{
  event.preventDefault();
  sliderBounds=sliderOutput.getBoundingClientRect();
  updateSlider(Number(slider.value),{held:false});
  pointer=true;
  window.addEventListener('pointermove',moveSlider);
  window.addEventListener('pointerup',releaseSlider);
  window.addEventListener('pointercancel',releaseSlider);
 });
 sliderOutput.addEventListener('click',event=>{
  if(event.target!==sliderOutput)return;
  sliderBounds=sliderOutput.getBoundingClientRect();
  updateSlider(sliderRatio(event.clientX),{held:true,isClick:true});
 });
 slider.addEventListener('input',()=>updateSlider(Number(slider.value),{held:true}));
 slider.addEventListener('keydown',e => {
  if (!['ArrowLeft','ArrowRight'].includes(e.key)) return;
  e.preventDefault();
  updateSlider(Math.max(0,Math.min(1,Number(slider.value)+(e.key==='ArrowLeft'?-.5:.5))),{held:true});
 });
 cacheDimensions();
 items.forEach(item=>setItemState(item,false,false));
 animateStepper(false,false);
 select(-1,{animateCards:false,force:true});
 renderSlider(sliderPresentation);

 function reportError(error) {
  console.error(error);
  viewer.dataset.error = error.message||String(error);
  loading.hidden=false;
  loading.querySelector('span').textContent='场景载入失败：'+(error.message||error);
 }
 window.addEventListener('error',event => reportError(event.error||event.message));
 window.addEventListener('unhandledrejection',event => reportError(event.reason));
 async function boot() {
  const require = window.appleStudyRequire;
  const namespace = window.Lotus = require('YEMv/39/pw6MbIjSlRSe');
  const {Lotus,CustomScene} = namespace;
  const chunks = Object.fromEntries([
   ['DetailChunk','rPr0FRAY05W5smljnBUZ'],['Wallpaper','iQR0xhrLkcgDNKF/CrlT'],['Wipe','3KWH7xpHANxtsy7reUMs']
  ].map(([name,id]) => [name,require(id)[name]]));
  const scripts = Object.fromEntries([
   ['AnimationScrubber','kjH2WT2JtSgZLYUFj9jM'],['CameraMixerOffset','OJhHH5Nrn5Av8/a7vghL'],
   ['FadeThroughBlack','QEikGNFzm1WGbKgdoGe8'],['Hinge','a6KkYNc7ItI2tZbDpVEF'],
   ['StencilMasking','Xci3QsCa8MxXYXf24Gwn'],['WallpaperRenderer','2g0qWaU7yu+645nbbw9b']
  ].map(([name,id]) => [name,require(id)[name]]));
  Lotus.settings.dprTest=() => Math.min(window.devicePixelRatio,2);

  class StudyScene extends CustomScene {
   init() {
    Lotus.chunks.initialize(chunks);
    Lotus.scripts.initialize(scripts);
    super.init();
   }
   create() {
    super.create();
    this.pointer.changeEventListeners($('#hit-area'));
    this.interactiveCameraScript=this.getComponentsByName('camera_360')[0].element;
    this.mainWeights=this.getComponentByName('weights_main').scripts.get('VariantWeightsMixer');
    this.ptWeights=this.getComponentByName('weights_pt').scripts.get('VariantWeights');
    this.hinge=this.getComponentByName('YvVAegQhHvoGyyp:Hinge');
    this.variantWeights=this.getComponentByName('weights_pt:VariantWeights');
    this.originalStiffness=this.variantWeights.data.stiffness;
    this.hinge.simulator.on('simulationUpdate',values => {
     renderSlider(values);
     this.setSliderProgress(values);
    });
    this.previousIndex=-2;
   }
   get ptActivation() {return this.mainWeights.mixSpring;}
   setSliderProgress({position,stretchPosition}) {
    if (!this.hinge.sliderIsActive) return;
    const radius=Math.max(this.hinge.data.magnetClosedRadius,this.hinge.data.magnetOpenRadius);
    const effective=position+Math.tanh(Math.abs(stretchPosition-position)/(radius*3))*radius*Math.sign(stretchPosition-position);
    const keys=[['PT_SliderClosed',0],['PT_SliderLanding',1/3],['PT_SliderOpen',1]];
    let end=keys.findIndex(([,value])=>value>=effective);
    if(end===0)end=1;
    if(end===-1)end=keys.length-1;
    const [a,b]=keys.slice(end-1,end+1), range=Math.abs(a[1]-b[1]);
    this.ptWeights.setWeightTargets([a,b].map(([label,value])=>({label,weight:1-Math.abs(value-effective)/range})));
   }
   onSliderActive() {this.hinge.sliderIsActive=true;this.variantWeights.data.stiffness=9999;}
   onSliderInactive() {this.hinge.sliderIsActive=false;this.variantWeights.data.stiffness=this.originalStiffness;}
   onSliderUpdate({gestureProgress,pointer,isClick}) {
    Object.assign(this.hinge,{sliderProgress:gestureProgress,sliderPointer:pointer,isClick});
    Lotus.tryRequestAnimationFrame();
   }
   onViewChange(index) {
    if(index===this.previousIndex)return;
    const camera=this.interactiveCameraScript;
    camera.theta=camera.closestAngle.x;
    camera.phi=Math.max(.001,Math.min(Math.PI,camera.phi));
    if(index===-1) {
     this.ptActivation.targetValue=0;
     const interactive=this.getComponentByName('camera_360:InteractiveCamera');
     const previousPose=this.ptWeights.interpolation.interpolations.a.label;
     const angle=({PT_Durability:'backRight',PT_Tent:'frontLeft'})[previousPose]||'front';
     const open=this.hinge.target>.6;
     interactive.data.angles=open?'uKtkkwyBlvwChQg':'aPrkGWufFevjiao';
     this.states.set('angles','');
     this.states.set('angles',angle+(open?'_Open':''));
    } else {
     this.ptActivation.targetValue=1;
     this.ptWeights.setWeightTargets([{label:entries[index][0],weight:1}]);
     if(this.ptActivation.value<.05)this.ptWeights.snapValuesToTargets();
     if(index===0) {
      sliderGesture=1/3;
      this.hinge.sliderProgress=1/3;
     }
    }
    this.previousIndex=index;
    Lotus.tryRequestAnimationFrame();
   }
   onPointerStart() {
    this._userInteracted=true;
    clearTimeout(this.uiIntroTimer);
    clearTimeout(this.hintTimer);
    this.timelines.get('hint')?.pause();
    this.timelines.get('intro')?.pause();
    select(-1);
   }
   onPointerEnd() { }
   setupIdleTimelines() {
    const introEntry=this.timelines.get('intro');
    const intro=introEntry?.timeline;
    const hint=this.timelines.get('hint');
    playControlsIntro();
    if(introEntry){introEntry.restart();introEntry.play();}
    this.uiIntroTimer=setTimeout(()=>{
     if(this._userInteracted)return;
     select(0);
     if(hint)this.hintTimer=setTimeout(()=>hint.play(),2500);
    },2200);
   }
  }
  // Keep all original AVIF scene assets local; no CDN, analytics, or page framework.
  const variant=matchMedia('(max-width:734px)').matches?'S':'L';
  viewer.dataset.scene=variant;
  const progressTimer=setInterval(() => {
   const value=namespace.instance().scene?.loader?.progress;
   if(Number.isFinite(value))loading.querySelector('progress').value=value/100;
  },100);
  scene=await namespace.instance().loadScene({
   src:`assets/scenes/iPhoneDuo_ROW_${variant}_avif.lsd`,
   element:$('#scene'),SceneClass:StudyScene,
   assetsPath:new URL('assets/',document.baseURI).href
  });
  clearInterval(progressTimer);
  scene.onViewChange(-1);
  scene.setupIdleTimelines();
  loading.hidden=true;
  viewer.dataset.ready='true';
  setInterval(() => {
   diagnostics.textContent=JSON.stringify({state:viewer.dataset.state,hinge:scene.hinge.position,target:scene.hinge.target,
    sliderActive:scene.hinge.sliderIsActive,activation:scene.ptActivation.value,
    theta:scene.interactiveCameraScript.theta,phi:scene.interactiveCameraScript.phi,
    rendered:scene.rendered,frame:scene.frame});
  },200);
 }
 boot().catch(reportError);
})();
