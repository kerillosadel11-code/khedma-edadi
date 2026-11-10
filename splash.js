/* شاشة البداية (لوجو الكاتدرائية + خدمة إعدادي): مرة في كل فتحة للتطبيق، وتتقفل بلمسة */
(function(){
  var s=document.getElementById('splash');if(!s)return;
  try{if(sessionStorage.getItem('kh_splash')){s.remove();return}sessionStorage.setItem('kh_splash','1')}catch(_){}
  var done=function(){if(s.parentNode)s.parentNode.removeChild(s)};
  s.addEventListener('animationend',function(e){if(e.target===s)done()});
  s.addEventListener('click',done);
  setTimeout(done,5000);
})();
