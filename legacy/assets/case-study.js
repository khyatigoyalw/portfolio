(function(){
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* sticky nav */
  var nav = document.getElementById('nav');
  var onScroll = function(){ nav.classList.toggle('scrolled', window.scrollY > 40); };
  onScroll(); window.addEventListener('scroll', onScroll, {passive:true});

  /* mobile menu */
  var burger = document.getElementById('burger'), mm = document.getElementById('mobileMenu');
  function toggleMenu(open){
    burger.classList.toggle('open', open); mm.classList.toggle('open', open);
    burger.setAttribute('aria-expanded', open); document.body.style.overflow = open ? 'hidden':'';
  }
  burger.addEventListener('click', function(){ toggleMenu(!mm.classList.contains('open')); });
  mm.querySelectorAll('a').forEach(function(a){ a.addEventListener('click', function(){ toggleMenu(false); }); });

  /* scroll reveal */
  var io = new IntersectionObserver(function(entries){
    entries.forEach(function(e){ if(e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); } });
  }, {threshold:0.12, rootMargin:'0px 0px -8% 0px'});
  document.querySelectorAll('.reveal').forEach(function(el){ io.observe(el); });

  /* smooth-anchor offset for sticky nav */
  document.querySelectorAll('a[href^="#"]').forEach(function(a){
    a.addEventListener('click', function(e){
      var id = a.getAttribute('href'); if(id.length<2) return;
      var t = document.querySelector(id); if(!t) return;
      e.preventDefault();
      window.scrollTo({top: t.getBoundingClientRect().top + window.scrollY - 20, behavior: reduce?'auto':'smooth'});
    });
  });
})();
