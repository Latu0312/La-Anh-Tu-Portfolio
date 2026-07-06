// =====================================================
// SAFETY NET: nếu bất kỳ lỗi nào xảy ra (CDN load chậm/lỗi,
// script exception...), tự động hiện toàn bộ nội dung ẩn
// (.reveal/.reveal-card) để KHÔNG BAO GIỜ mất nội dung trên
// màn hình, kể cả khi hiệu ứng không chạy được.
// =====================================================
function forceShowContent(){
 document.querySelectorAll('.reveal,.reveal-card').forEach(el=>{
  el.style.opacity='1';
  el.style.transform='none';
 });
}
// Nếu sau 4s mà GSAP/Lenis chưa init xong vì lý do gì đó -> vẫn hiện nội dung
const safetyTimer=setTimeout(forceShowContent,4000);

try{

 if(typeof Lenis==='undefined' || typeof gsap==='undefined'){
  throw new Error('Thư viện Lenis/GSAP chưa load được (kiểm tra lại CDN/kết nối mạng)');
 }

 const lenis=new Lenis({duration:1.4,smoothWheel:true});
 function raf(t){lenis.raf(t);requestAnimationFrame(raf)}
 requestAnimationFrame(raf);

 gsap.registerPlugin(ScrollTrigger);

 function playHeroIntro(){
  gsap.from('.hero-title',{y:160,opacity:0,duration:1.5,ease:'power4.out'});
  gsap.from('.hero-sub',{y:120,opacity:0,duration:1.5,delay:.15,ease:'power4.out'});
 }

 // =====================================================
 // INTRO: màn đen + bóng đèn treo dây ở giữa. Đợi 3 giây rồi
 // đèn bật sáng lên (đồng thời hiện chữ LA ANH TU / GAME DESIGNER),
 // sau đó màn đen tắt dần đi và bóng đèn cũng mất dần theo.
 // =====================================================
 const introOverlay=document.getElementById('introOverlay');
 if(introOverlay){
  document.documentElement.classList.add('intro-locking');

  setTimeout(()=>{
   introOverlay.classList.add('lit'); // đèn bật sáng lên
   playHeroIntro(); // đèn sáng -> hiện chữ LA ANH TU / GAME DESIGNER

   // Đèn vừa sáng xong -> snap luôn vào đúng vị trí Hero (LA ANH TU /
   // GAME DESIGNER), làm khi màn vẫn còn được overlay che nên không bị giật
   try{
    if(typeof getSnapPoints==='function'){
     const heroTarget=getSnapPoints()[0].y;
     window.scrollTo(0,heroTarget);
    }
   }catch(e){}

   setTimeout(()=>{
    introOverlay.classList.add('intro-fade'); // màn đen + bóng đèn mờ dần rồi biến mất
    document.documentElement.classList.remove('intro-locking');
    setTimeout(()=>{ introOverlay.remove(); },1300);
   },550);
  },3000);
 }else{
  playHeroIntro();
 }

 // 1. Hero tự mờ dần khi cuộn xuống
 gsap.to('#hero',{
  opacity:0,
  y:-120,
  ease:'none',
  scrollTrigger:{
    trigger:'#hero',
    start:'top top',
    end:'bottom top',
    scrub:true
  }
 });

 // 2. Reveal mạnh và rõ ràng hơn
 gsap.utils.toArray('.reveal').forEach(el=>{
  gsap.to(el,{
   opacity:1,y:0,duration:1.3,ease:'power4.out',
   scrollTrigger:{trigger:el,start:'top 85%'}
  });
 });

 gsap.utils.toArray('.reveal-card').forEach(el=>{
  gsap.to(el,{
   opacity:1,y:0,duration:1.1,ease:'power4.out',
   scrollTrigger:{trigger:el,start:'top 88%'}
  });
 });

 // 3. Nghiêng NHẸ khi hover card - giới hạn góc tối đa để không bị
 //    nghiêng gắt như trước (đặc biệt với card rộng)
 const CARD_MAX_TILT=3.5; // độ - nghiêng rất nhẹ
 document.querySelectorAll('.card').forEach(card=>{
  card.addEventListener('mousemove',e=>{
   const r=card.getBoundingClientRect();
   const x=e.clientX-r.left-r.width/2;
   const y=e.clientY-r.top-r.height/2;
   const rotateY=Math.max(-CARD_MAX_TILT,Math.min(CARD_MAX_TILT,(x/r.width)*CARD_MAX_TILT*2));
   const rotateX=Math.max(-CARD_MAX_TILT,Math.min(CARD_MAX_TILT,-(y/r.height)*CARD_MAX_TILT*2));
   card.style.transform=
    `perspective(1400px) rotateY(${rotateY}deg) rotateX(${rotateX}deg) translateY(-3px)`;
  });
  card.addEventListener('mouseleave',()=>{
   card.style.transform='perspective(1400px) rotateX(0deg) rotateY(0deg) translateY(0px)';
  });
 });

 // =====================================================
 // 4. VIGNETTE + TOPBAR: vignette đen hiện lên thì ẩn HẲN
 //    thanh giới thiệu trên cùng; khi hết hiệu ứng đen (hoặc
 //    snap xong) thì thanh giới thiệu hiện lại như bình thường
 // =====================================================
 const vTop=document.querySelector('.vignette-top');
 const vBottom=document.querySelector('.vignette-bottom');
 const topbar=document.querySelector('.topbar');
 let vignetteHideTimer=null;

 function setDarkActive(active){
  if(active){
   vTop&&vTop.classList.add('active');
   vBottom&&vBottom.classList.add('active');
   topbar&&topbar.classList.add('topbar-hidden');
  }else{
   vTop&&vTop.classList.remove('active');
   vBottom&&vBottom.classList.remove('active');
   topbar&&topbar.classList.remove('topbar-hidden');
  }
 }

 // Dùng cho cuộn tự do (ngoài vùng snap): hiện mờ dần khi cuộn,
 // tự ẩn + hiện lại topbar sau khi ngừng cuộn 1 chút
 function pulseVignette(){
  setDarkActive(true);
  clearTimeout(vignetteHideTimer);
  vignetteHideTimer=setTimeout(()=>setDarkActive(false),700);
 }

 // =====================================================
 // 5. SNAP THEO NẤC CUỘN CHUỘT cho: Tên (hero) / About /
 //    Skills / và TỪNG project một (lần lượt từng card).
 //    Chỉ cần lăn NHẸ một nấc là nhảy hẳn sang phần kế tiếp,
 //    snap từ tốn - chậm rãi. Qua khỏi project cuối cùng thì
 //    trở lại cuộn tự do bình thường (xuống footer).
 // =====================================================
 const heroEl=document.querySelector('#hero');
 const aboutEl=document.querySelector('#about');
 const skillsEl=document.querySelector('#skills');
 const projectCards=Array.from(document.querySelectorAll('.projects .card'));

 // Chỉ bật snap nếu tìm đủ các mốc cần thiết, tránh lỗi vỡ toàn bộ script
 const snapEnabled=!!(heroEl&&aboutEl&&skillsEl&&projectCards.length);

 function elementTop(el){
  let top=0,node=el,guard=0;
  while(node&&guard<50){
   top+=node.offsetTop||0;
   node=node.offsetParent;
   guard++;
  }
  return top;
 }

 function centerTarget(el){
  return elementTop(el)+el.offsetHeight/2-window.innerHeight/2;
 }

 function getSnapPoints(){
  const points=[
   {el:heroEl, y:Math.max(0,centerTarget(heroEl))},
   {el:aboutEl, y:centerTarget(aboutEl)},
   {el:skillsEl, y:centerTarget(skillsEl)}
  ];
  projectCards.forEach(card=>points.push({el:card, y:centerTarget(card)}));
  return points;
 }

 // Qua khỏi project cuối cùng một chút thì ngừng snap, cuộn tự do xuống footer
 function getSnapLimit(){
  const lastCard=projectCards[projectCards.length-1];
  return elementTop(lastCard)+lastCard.offsetHeight+60;
 }

 function nearestIndex(points,scrollY){
  let idx=0,minDist=Infinity;
  points.forEach((p,i)=>{
   const d=Math.abs(scrollY-p.y);
   if(d<minDist){minDist=d;idx=i;}
  });
  return idx;
 }

 // Tween tự viết, không phụ thuộc lenis.scrollTo -> đảm bảo mượt &
 // chủ động điều khiển tốc độ/độ "từ tốn" của chuyển động
 function fastScrollTo(target,duration,onDone){
  const startY=window.scrollY;
  const diff=target-startY;
  if(Math.abs(diff)<1){onDone&&onDone();return;}
  const startTime=performance.now();
  // ease-in-out cubic: khởi động nhẹ nhàng, giữa nhanh, kết thúc êm - cảm giác từ tốn
  const ease=t=>t<0.5 ? 4*t*t*t : 1-Math.pow(-2*t+2,3)/2;
  function step(now){
   const t=Math.min((now-startTime)/1000/duration,1);
   window.scrollTo(0,startY+diff*ease(t));
   if(t<1){requestAnimationFrame(step);}
   else{window.scrollTo(0,target);onDone&&onDone();}
  }
  requestAnimationFrame(step);
 }

 let isSnapping=false;
 const SNAP_DURATION=1.3; // giây - chậm rãi, từ tốn hơn hẳn bản trước (0.5s)

 // =====================================================
 // 5b. CHẶN CUỘN/RUBBER-BAND khi đã hết nội dung ở đầu hoặc
 //     cuối trang: không lướt thêm, không kích hoạt snap/vignette
 //     (áp dụng cho cả lăn chuột lẫn vuốt cảm ứng)
 // =====================================================
 function isAtPageTop(){ return window.scrollY<=0; }
 function isAtPageBottom(){
  return (window.innerHeight+window.scrollY) >= (document.documentElement.scrollHeight-1);
 }

 // Hàm dùng chung: quyết định có snap hay không dựa trên hướng cuộn
 // (direction: 1 = xuống, -1 = lên). Trả về true nếu đã xử lý (cần
 // chặn cuộn mặc định), false nếu không can thiệp (để cuộn tự do).
 function trySnapMove(direction){
  if(isSnapping) return true;
  if(isAtPageTop()||isAtPageBottom()) return false;

  const scrollY=window.scrollY;
  const limit=getSnapLimit();
  if(scrollY>limit) return false; // đã ở vùng cuộn tự do -> không can thiệp

  const points=getSnapPoints();
  const curIdx=nearestIndex(points,scrollY);
  const lastIdx=points.length-1;

  // Đang đứng đúng ở project cuối cùng và lăn/vuốt xuống thêm -> rời khỏi
  // vùng snap, để cuộn tự do lướt tiếp xuống footer
  if(curIdx===lastIdx&&direction>0&&Math.abs(scrollY-points[lastIdx].y)<4) return false;
  // Đang ở hero và lăn/vuốt lên thêm -> không còn gì để snap
  if(curIdx===0&&direction<0&&Math.abs(scrollY-points[0].y)<4) return false;

  const nextIdx=Math.max(0,Math.min(lastIdx,curIdx+direction));
  if(nextIdx===curIdx&&Math.abs(scrollY-points[curIdx].y)<4) return false;

  isSnapping=true;
  lenis.stop();
  setDarkActive(true);

  fastScrollTo(points[nextIdx].y,SNAP_DURATION,()=>{
   isSnapping=false;
   lenis.start();
   setDarkActive(false);
  });
  return true;
 }

 // ---- PC: lăn chuột ----
 window.addEventListener('wheel',e=>{
  const dir=e.deltaY>0?1:-1;
  if((dir<0&&isAtPageTop())||(dir>0&&isAtPageBottom())){
   e.preventDefault(); // đã hết nội dung -> đứng yên, không lướt/không snap nữa
   return;
  }
  if(snapEnabled&&trySnapMove(dir)) e.preventDefault();
 },{passive:false});

 // ---- Mobile/Tablet: vuốt cảm ứng - hoạt động y hệt lăn chuột,
 //      chỉ cần vuốt NHẸ một cái là nhảy sang phần kế tiếp/trước đó ----
 const TOUCH_THRESHOLD=10; // px - vuốt rất nhẹ cũng đủ kích hoạt
 let touchStartY=null;
 let touchHandled=false;

 window.addEventListener('touchstart',e=>{
  if(e.touches.length!==1) return;
  touchStartY=e.touches[0].clientY;
  touchHandled=false;
 },{passive:true});

 window.addEventListener('touchmove',e=>{
  if(touchStartY===null) return;

  const currentY=e.touches[0].clientY;
  const deltaY=touchStartY-currentY; // dương = vuốt lên (ý định cuộn xuống)
  const dir=deltaY>0?1:-1;

  // Đã hết nội dung ở đầu/cuối trang -> đứng yên, chặn rubber-band
  if((dir<0&&isAtPageTop())||(dir>0&&isAtPageBottom())){
   e.preventDefault();
   return;
  }

  if(isSnapping||touchHandled){ e.preventDefault(); return; }
  if(!snapEnabled) return; // không đủ mốc snap -> để cuộn chạm tự nhiên

  if(Math.abs(deltaY)<TOUCH_THRESHOLD) return; // vuốt quá nhẹ, chưa tính là cử chỉ

  if(trySnapMove(dir)){
   touchHandled=true; // đã snap cho lượt vuốt này -> chặn tới khi buông tay
   e.preventDefault();
  }
 },{passive:false});

 window.addEventListener('touchend',()=>{
  touchStartY=null;
  touchHandled=false;
 },{passive:true});
 window.addEventListener('touchcancel',()=>{
  touchStartY=null;
  touchHandled=false;
 },{passive:true});

 // =====================================================
 // MENU HAMBURGER (mobile/tablet) - bấm để mở/đóng danh sách link,
 // bấm ra ngoài khung menu thì tự động đóng lại
 // =====================================================
 const menuToggle=document.getElementById('menuToggle');
 const mainNav=document.getElementById('mainNav');
 if(menuToggle&&mainNav){
  function closeNav(){
   mainNav.classList.remove('nav-open');
   menuToggle.setAttribute('aria-expanded','false');
  }

  menuToggle.addEventListener('click',e=>{
   e.stopPropagation(); // tránh trùng với listener bấm-ra-ngoài bên dưới
   const isOpen=mainNav.classList.toggle('nav-open');
   menuToggle.setAttribute('aria-expanded',isOpen?'true':'false');
  });

  // Bấm vào 1 link thì tự đóng menu lại (trừ nút Email, vì nó chỉ mở
  // dropdown địa chỉ chứ không điều hướng đi đâu)
  mainNav.querySelectorAll('a').forEach(a=>{
   if(a.id==='emailToggle') return;
   a.addEventListener('click',closeNav);
  });

  // Bấm/chạm ra ngoài khung menu -> tự động đóng menu lại
  document.addEventListener('click',e=>{
   if(!mainNav.classList.contains('nav-open')) return;
   if(mainNav.contains(e.target)||menuToggle.contains(e.target)) return;
   closeNav();
  });

  // Nhấn phím Esc cũng đóng menu (tiện thêm, không ảnh hưởng gì khác)
  document.addEventListener('keydown',e=>{
   if(e.key==='Escape') closeNav();
  });
 }

 // =====================================================
 // EMAIL: bấm vào "Email" hiện dropdown nhỏ chứa địa chỉ email
 // ngay bên dưới. Cuộn chuột/vuốt hoặc bấm ra ngoài thì tự ẩn đi
 // =====================================================
 const emailToggle=document.getElementById('emailToggle');
 const emailDropdown=document.getElementById('emailDropdown');
 if(emailToggle&&emailDropdown){
  function closeEmail(){emailDropdown.classList.remove('open');}

  emailToggle.addEventListener('click',e=>{
   e.preventDefault();
   e.stopPropagation(); // tránh bị listener bấm-ra-ngoài đóng lại ngay lập tức
   emailDropdown.classList.toggle('open');
  });

  document.addEventListener('click',e=>{
   if(!emailDropdown.classList.contains('open')) return;
   if(emailDropdown.contains(e.target)||emailToggle.contains(e.target)) return;
   closeEmail();
  });

  // Cuộn (chuột lẫn cảm ứng) thì tự ẩn dropdown email đi
  lenis.on('scroll',closeEmail);
  window.addEventListener('wheel',closeEmail,{passive:true});
  window.addEventListener('touchmove',closeEmail,{passive:true});
 }

 // Cuộn tự do (vùng project bên dưới, hoặc trackpad/touch) vẫn có
 // hiệu ứng vignette mờ dần khi cuộn, ẩn/hiện lại topbar tương ứng
 lenis.on('scroll',()=>{
  if(!isSnapping) pulseVignette();
 });

 // Hiệu ứng vignette/snap chạy ổn -> huỷ bộ đếm an toàn (không cần force show nữa)
 clearTimeout(safetyTimer);

}catch(err){
 // Nếu có lỗi bất kỳ trong khối trên -> vẫn đảm bảo nội dung hiển thị đầy đủ
 console.error('Lỗi khởi tạo hiệu ứng, đã bật chế độ an toàn:',err);
 forceShowContent();
 // Đảm bảo không bị kẹt màn hình đen của intro bóng đèn nếu có lỗi
 const introOverlayFallback=document.getElementById('introOverlay');
 if(introOverlayFallback) introOverlayFallback.remove();
 document.documentElement.classList.remove('intro-locking');
}
