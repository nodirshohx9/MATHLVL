
(function(){
  const overlay = document.getElementById('nova-help-overlay');
  const closeBtn = document.getElementById('nova-help-close');
  const answer = document.getElementById('nova-help-answer');
  const title = document.getElementById('help-answer-title');
  const content = document.getElementById('help-answer-content');
  const back = document.getElementById('help-back');
  const body = overlay?.querySelector('.nova-help-body');
  const items = overlay ? Array.from(overlay.querySelectorAll('.nova-help-item')) : [];

  const topics = {
    home: {
      title: "Bosh sahifa nima qiladi?",
      html: `
        <p>Bosh sahifa MATHLVL’dagi asosiy boshqaruv markazi. Bu yerdan eng ko‘p ishlatiladigan bo‘limlarga tez o‘tasiz.</p>
        <ul>
          <li><b>Davom etish:</b> oxirgi o‘qigan kitobingiz ochilgan joyidan davom etadi.</li>
          <li><b>Kutubxona:</b> barcha mavjud matematika kitoblariga olib boradi.</li>
          <li><b>Ustoz AI:</b> savol berish va tushuntirish olish bo‘limini ochadi.</li>
          <li><b>Mock test:</b> Milliy sertifikat testlariga olib boradi.</li>
          <li><b>Masala yechish:</b> masalani matn yoki rasm orqali yuborib, bosqichma-bosqich yechim olish uchun ishlaydi.</li>
        </ul>`
    },
    books: {
      title: "Kitoblar bo‘limi nima qiladi?",
      html: `
        <p>Kitoblar bo‘limi matematika materiallarini o‘qish va ular bilan ishlash uchun mo‘ljallangan.</p>
        <ul>
          <li>Qidiruv orqali kerakli kitobni tez topasiz.</li>
          <li>Kitobni ochib sahifalar bo‘ylab harakatlanasiz.</li>
          <li>Sahifa raqami orqali kerakli joyga tez o‘tasiz.</li>
          <li>Qalam va o‘chirg‘ich vositalari bilan sahifaga belgi qo‘yishingiz mumkin.</li>
          <li>Kitob ichidagi <b>Ustoz AI</b> orqali ochilgan mavzu bo‘yicha yordam olasiz.</li>
          <li>O‘qish progressi saqlanadi va keyin davom ettirish mumkin.</li>
        </ul>`
    },
    ai: {
      title: "Ustoz AI nima qiladi?",
      html: `
        <p>Ustoz AI — matematika bo‘yicha yordamchi. U tayyor javobni shunchaki ko‘rsatishdan ko‘ra, yechimni tushuntirishga yordam beradi.</p>
        <ul>
          <li>Masalani qadam-baqadam yechib tushuntiradi.</li>
          <li>Formula va mavzularni sodda tilda izohlaydi.</li>
          <li>Rasm orqali yuborilgan matematika savolini tahlil qila oladi.</li>
          <li>Xato qilgan joyingizni tushunishga yordam beradi.</li>
          <li>Kitob ichidan ochilganda o‘qiyotgan material bilan bog‘liq savollarda ishlatiladi.</li>
        </ul>
        <p>AI ba’zan xato qilishi mumkin, shuning uchun muhim natijalarni qayta tekshirish tavsiya etiladi.</p>`
    },
    mock: {
      title: "Mock Test nima qiladi?",
      html: `
        <p>Mock Test bo‘limi Matematika Milliy sertifikatiga tayyorgarlik uchun sinov variantlarini ishlashga yordam beradi.</p>
        <ul>
          <li>Har bir variantda belgilangan savollar va vaqt mavjud.</li>
          <li>Savollar orasida oldinga-orqaga o‘tish mumkin.</li>
          <li>Tanlangan javoblar test davomida eslab turiladi; natija test yakunida ushbu qurilmada saqlanadi.</li>
          <li>Test yakunida to‘g‘ri javoblar soni va foizli natija chiqadi.</li>
          <li>Natijalar bo‘limidan oldingi urinishlaringizni ko‘rishingiz mumkin.</li>
        </ul>
        <p>Bu tayyorgarlik mock testi; uning natijasi rasmiy sertifikat natijasi hisoblanmaydi.</p>`
    },
    profile: {
      title: "Profil va hisob nima qiladi?",
      html: `
        <p>Profil bo‘limi shaxsiy hisobingiz va MATHLVL sozlamalarini boshqarish uchun ishlaydi.</p>
        <ul>
          <li><b>Google hisob:</b> ism, email va Google profil rasmingiz ko‘rsatiladi.</li>
          <li><b>Tarif:</b> Free yoki MATHLVL Plus holatini ko‘rasiz.</li>
          <li><b>Mening kitoblarim:</b> yaqinda o‘qilgan kitoblar progressini ko‘rsatadi.</li>
          <li><b>Sovg‘a Plus:</b> sovg‘a kodi yoki QR orqali Plus faollashtirish mumkin.</li>
          <li><b>Light/Dark mode:</b> saytdagi rang rejimini o‘zgartiradi.</li>
          <li><b>Chiqish:</b> Google sessiyangizdan xavfsiz chiqadi.</li>
        </ul>`
    },
    plus: {
      title: "MATHLVL Plus nima beradi?",
      html: `
        <p>MATHLVL Plus — platformadagi kengaytirilgan imkoniyatlardan foydalanish uchun premium tarif.</p>
        <div class="plan-grid">
          <div class="plan-card">
            <h4>Bepul</h4>
            <ul>
              <li>Bepul kitob va materiallar</li>
              <li>Ustoz AI’dan asosiy foydalanish</li>
              <li>Mavjud bepul mock testlar</li>
              <li>Asosiy o‘qish vositalari</li>
            </ul>
          </div>
          <div class="plan-card plus">
            <h4>MATHLVL Plus</h4>
            <ul>
              <li>Premium kitob va materiallarga kirish</li>
              <li>Ustoz AI uchun kengaytirilgan imkoniyatlar</li>
              <li>Plus uchun ochilgan mock testlar</li>
              <li>Yangi premium funksiyalarga kirish</li>
            </ul>
            <div class="price-line">Amaldagi narx va muddatlar Profil → “Tarifni almashtirish” oynasida ko‘rsatiladi.</div>
          </div>
        </div>`
    }
  };

  function openHelp(){
    if(!overlay) return;
    overlay.hidden = false;
    document.body.style.overflow = 'hidden';
    showList();
  }
  function closeHelp(){
    if(!overlay) return;
    overlay.hidden = true;
    document.body.style.overflow = '';
  }
  function showList(){
    items.forEach(el => el.hidden = false);
    const report = overlay.querySelector('.nova-help-report');
    if(report) report.hidden = false;
    if(answer) answer.hidden = true;
  }
  function showTopic(key){
    const t = topics[key];
    if(!t || !answer) return;
    items.forEach(el => el.hidden = true);
    const report = overlay.querySelector('.nova-help-report');
    if(report) report.hidden = false;
    title.textContent = t.title;
    content.innerHTML = t.html;
    answer.hidden = false;
    body?.scrollTo({top:0,behavior:'smooth'});
  }

  closeBtn?.addEventListener('click', closeHelp);
  overlay?.addEventListener('click', e => { if(e.target === overlay) closeHelp(); });
  back?.addEventListener('click', showList);
  items.forEach(btn => btn.addEventListener('click', () => showTopic(btn.dataset.helpTopic)));
  document.addEventListener('keydown', e => { if(e.key === 'Escape' && overlay && !overlay.hidden) closeHelp(); });

  // Profile menu'dagi Yordam shu modalni ochadi
  const helpMenuBtn = document.getElementById('sidebar-help-open');
  if(helpMenuBtn){
    helpMenuBtn.replaceWith(helpMenuBtn.cloneNode(true));
    document.getElementById('sidebar-help-open')?.addEventListener('click', e => {
      e.stopPropagation();
      document.getElementById('sidebar-profile-menu')?.setAttribute('hidden','');
      document.getElementById('sidebar-profile-wrap')?.classList.remove('open');
      document.getElementById('sidebar-footer')?.setAttribute('aria-expanded','false');
      openHelp();
    });
  }

  document.getElementById('help-report-btn')?.addEventListener('click', ()=>{
    window.open('https://t.me/mathlvl_admin', '_blank', 'noopener,noreferrer');
  });

  window.openNovaHelp = openHelp;
})();
