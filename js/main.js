(function(){
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ── mobile "1" — static, no animation ──
  var isMobile = window.matchMedia('(max-width:640px)').matches;
  var mobileOne = document.querySelector('.mobile-one');
  var heroBody  = document.querySelector('.hero-body');
  if(!isMobile && mobileOne){
    mobileOne.style.display = 'none';
  }

  // ── nav: transparent over hero, solid on scroll ──
  var navEl = document.querySelector('.nav');
  var heroEl = document.getElementById('top');
  function navOnScroll(){
    if(!navEl) return;
    if(window.scrollY > 90) navEl.classList.add('scrolled');
    else navEl.classList.remove('scrolled');
  }
  window.addEventListener('scroll', navOnScroll, {passive:true});
  navOnScroll();

  // ── top nav (mobile toggle) ──
  var navToggle = document.getElementById('navToggle');
  var navLinks = document.getElementById('navLinks');
  if(navToggle && navLinks){
    navToggle.addEventListener('click', function(){
      var open = navLinks.classList.toggle('open');
      navToggle.classList.toggle('open', open);
      navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    navLinks.querySelectorAll('a').forEach(function(a){
      a.addEventListener('click', function(){
        navLinks.classList.remove('open');
        navToggle.classList.remove('open');
        navToggle.setAttribute('aria-expanded','false');
      });
    });
  }

  // ── venue map (SVG, no library needed) ──

  function FlowField(canvas, opts){
    opts = opts || {};
    var ctx = canvas.getContext('2d');
    var DPR = Math.min(window.devicePixelRatio||1, 2);
    var W, H, particles = [], COUNT = opts.count || 700;
    var speed = opts.speed || 1.15;
    var core = (opts.core != null) ? opts.core : 0.5;   // peak brightness
    // swoosh ribbon endpoints (as fractions of W/H); a diagonal sweeping up to the right
    var L1 = opts.l1 || {x:0.30, y:1.04}, L2 = opts.l2 || {x:1.06, y:-0.04};
    var P1, P2, dirx, diry, len, bandw;

    function setupLine(){
      P1 = {x:L1.x*W, y:L1.y*H}; P2 = {x:L2.x*W, y:L2.y*H};
      dirx = P2.x-P1.x; diry = P2.y-P1.y; len = Math.hypot(dirx,diry)||1;
      bandw = H*(opts.band || 0.42);
    }
    function distToLine(x,y){
      return Math.abs(diry*x - dirx*y + P2.x*P1.y - P2.y*P1.x)/len;
    }
    function resize(){
      var r = canvas.getBoundingClientRect();
      W = Math.max(1, r.width); H = Math.max(1, r.height);
      canvas.width = W*DPR; canvas.height = H*DPR;
      ctx.setTransform(DPR,0,0,DPR,0,0);
      ctx.fillStyle = '#12100f'; ctx.fillRect(0,0,W,H);
      setupLine();
    }
    function gauss(){ return (Math.random()+Math.random()+Math.random()-1.5)/1.5; }
    function spawn(p){
      var t = Math.random();
      var px = P1.x + dirx*t, py = P1.y + diry*t;
      var nperpx = -diry/len, nperpy = dirx/len;
      var off = gauss()*bandw;                 // concentrate near the line
      p.x = px + nperpx*off;
      p.y = py + nperpy*off;
      p.t = t;
      p.life = 50 + Math.random()*120;
      p.warm = Math.random();
    }
    function init(){
      particles = [];
      for(var i=0;i<COUNT;i++){ var p={}; spawn(p); particles.push(p); }
    }
    function angle(x,y,t){
      var s = 0.0017;
      return (Math.sin(x*s + t*0.00012) + Math.cos(y*s*1.25 - t*0.0001)
              + Math.sin((x+y)*s*0.55 + t*0.00008)) * Math.PI;
    }
    function step(t){
      ctx.fillStyle = 'rgba(18,16,15,0.04)';
      ctx.fillRect(0,0,W,H);
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineWidth = 1.1;
      for(var i=0;i<particles.length;i++){
        var p = particles[i];
        var a = angle(p.x,p.y,t);
        var nx = p.x + Math.cos(a)*speed;
        var ny = p.y + Math.sin(a)*speed;
        var d = distToLine(p.x,p.y)/bandw;                 // 0 at core
        var taper = 1 - p.t*0.55;                          // brighter toward lower-left
        var alpha = Math.max(0, core*(1 - d)*(1 - d)) * taper;
        if(alpha > 0.004){
          ctx.strokeStyle = (p.warm < 0.4 ? 'rgba(235,110,28,' : 'rgba(200,16,46,')+alpha.toFixed(3)+')';
          ctx.beginPath(); ctx.moveTo(p.x,p.y); ctx.lineTo(nx,ny); ctx.stroke();
          // brighter near-white-hot core highlights + dispersing dust
          if(d < 0.4 && Math.random() < 0.05){
            ctx.fillStyle = 'rgba(255,158,96,'+(alpha*0.9).toFixed(3)+')';
            ctx.fillRect(nx,ny,1.3,1.3);
          } else if(Math.random() < 0.03){
            ctx.fillStyle = 'rgba(242,116,40,'+(alpha*1.2).toFixed(3)+')';
            ctx.fillRect(nx,ny,1.1,1.1);
          }
        }
        p.x = nx; p.y = ny; p.life--;
        if(p.life<=0 || p.x< -30 || p.x>W+30 || p.y< -30 || p.y>H+30) spawn(p);
      }
      ctx.globalCompositeOperation = 'source-over';
    }

    resize(); init();
    var t0 = performance.now();
    if(reduce){ for(var k=0;k<420;k++) step(t0 + k*16); return; }
    function loop(now){ step(now); requestAnimationFrame(loop); }
    requestAnimationFrame(loop);

    var rt;
    window.addEventListener('resize', function(){
      clearTimeout(rt);
      rt = setTimeout(function(){ resize(); init(); }, 200);
    });
  }

  var c1 = document.getElementById('flow');
  if(c1) FlowField(c1, {count:1600, speed:1.2, core:0.85, band:0.36,
                        l1:{x:0.32,y:1.06}, l2:{x:1.04,y:-0.06}});
  var c2 = document.getElementById('flow2');
  if(c2) FlowField(c2, {count:800, speed:1.05, core:0.6, band:0.5,
                        l1:{x:-0.05,y:1.05}, l2:{x:1.05,y:-0.05}});

  function drawStrands(svg){
    var ns='http://www.w3.org/2000/svg', i, j;
    for(i=0;i<9;i++){
      var p=document.createElementNS(ns,'path');
      var y0=40+i*60, y1=y0-30-i*8;
      p.setAttribute('d','M620 '+y0+' C 440 '+(y0-20)+', 260 '+(y1+60)+', 40 '+y1);
      p.setAttribute('fill','none');
      p.setAttribute('stroke','#8f2d1e');
      p.setAttribute('stroke-width','1');
      p.setAttribute('opacity', (0.06 + i*0.018).toFixed(3));
      svg.appendChild(p);
    }
    for(j=0;j<90;j++){
      var c=document.createElementNS(ns,'circle');
      var t=Math.random();
      c.setAttribute('cx', (40 + t*560 + (Math.random()-0.5)*60).toFixed(1));
      c.setAttribute('cy', (Math.random()*600).toFixed(1));
      c.setAttribute('r', (Math.random()*1.3+0.3).toFixed(2));
      c.setAttribute('fill', Math.random()>0.5 ? '#e8344c' : '#f2884b');
      c.setAttribute('opacity', (Math.random()*0.5+0.1).toFixed(2));
      svg.appendChild(c);
    }
  }
  document.querySelectorAll('.strands').forEach(drawStrands);

  var target = new Date('2026-11-19T14:00:00+01:00').getTime();
  var cd = {
    d:document.getElementById('cd-d'), h:document.getElementById('cd-h'),
    m:document.getElementById('cd-m'), s:document.getElementById('cd-s')
  };
  function pad(n){ return (n<10?'0':'')+n; }
  function tick(){
    if(!cd.d) return;
    var diff = target - Date.now();
    if(diff < 0) diff = 0;
    cd.d.textContent = pad(Math.floor(diff/86400000));
    cd.h.textContent = pad(Math.floor(diff%86400000/3600000));
    cd.m.textContent = pad(Math.floor(diff%3600000/60000));
    cd.s.textContent = pad(Math.floor(diff%60000/1000));
  }
  tick(); setInterval(tick, 1000);

  if(!reduce){
    var io = new IntersectionObserver(function(es){
      es.forEach(function(e){ if(e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); } });
    }, {threshold:.12});
    document.querySelectorAll('.reveal').forEach(function(n){ io.observe(n); });
  } else {
    document.querySelectorAll('.reveal').forEach(function(n){ n.classList.add('in'); });
  }
})();