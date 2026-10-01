/* ============================================================
   SmileCare — Public site SPA (hash routing)
   ============================================================ */
const App = (() => {
  const app = document.getElementById('app');
  const cache = { doctors: null, services: null };

  const pages = {
    home: renderHome, services: renderServices, doctors: renderDoctors,
    about: renderAbout, testimonials: renderTestimonials, faq: renderFAQ,
    contact: renderContact, book: renderBook, privacy: renderPrivacy, terms: renderTerms
  };

  const titles = {
    home: 'SmileCare Dental Clinic — Modern Dental Care',
    services: 'Dental Services — SmileCare',
    doctors: 'Our Doctors — SmileCare',
    about: 'About — SmileCare',
    testimonials: 'Patient Reviews — SmileCare',
    faq: 'FAQ — SmileCare',
    contact: 'Contact — SmileCare',
    book: 'Book Appointment — SmileCare',
    privacy: 'Privacy Policy — SmileCare',
    terms: 'Terms & Conditions — SmileCare'
  };

  async function loadDoctors() {
    if (cache.doctors) return cache.doctors;
    const { doctors } = await API.get('/doctors');
    cache.doctors = doctors;
    return doctors;
  }
  async function loadServices() {
    if (cache.services) return cache.services;
    const { services } = await API.get('/services');
    cache.services = services;
    return services;
  }

  function setActive(page) {
    document.querySelectorAll('[data-page]').forEach(a => a.classList.toggle('active', a.dataset.page === page));
    document.title = titles[page] || 'SmileCare';
  }

  function navigate(page) {
    page = pages[page] ? page : 'home';
    app.innerHTML = `<div class="container" style="padding:4rem 0"><div class="skeleton" style="height:220px"></div></div>`;
    window.scrollTo({ top: 0 });
    setActive(page);
    app.innerHTML = '';
    pages[page]().then(html => {
      app.innerHTML = html;
      bindPage(page);
      revealScroll();
    }).catch(err => {
      app.innerHTML = `<div class="container section"><div class="card"><h2>Something went wrong</h2><p class="muted">${UI.escape(err.message)}</p><button class="btn btn--primary" onclick="location.reload()">Reload</button></div></div>`;
    });
  }

  /* ---------------------------------------------------------- */
  function doctorAvatar(d) {
    const initials = d.name.split(' ').filter(Boolean).slice(0, 2).map(s => s[0]).join('').toUpperCase();
    return `<div class="doctor-card__avatar" style="background:linear-gradient(135deg,${d.accent_color}, ${shade(d.accent_color, -20)})">${initials}</div>`;
  }
  function shade(hex, p) {
    const n = parseInt(hex.replace('#',''), 16);
    const c = [n >> 16, (n >> 8) & 255, n & 255].map(v => Math.max(0, Math.min(255, v + p)));
    return '#' + c.map(v => v.toString(16).padStart(2,'0')).join('');
  }

  /* ---------------- HOME ---------------- */
  async function renderHome() {
    const [docs, svcs] = await Promise.all([loadDoctors(), loadServices()]);
    const top = svcs.slice(0, 6);
    return `
    <section class="hero">
      <div class="container hero__grid">
        <div>
          <span class="section__eyebrow">Trusted since 2015</span>
          <h1 class="hero__title">Your trusted partner for <em>complete dental care</em></h1>
          <p class="hero__sub">Modern, gentle dentistry in a comfortable environment. Book online, get instant confirmation, and manage everything from your patient portal.</p>
          <div class="hero__cta">
            <a href="#book" data-page="book" class="btn btn--primary btn--lg">Book Appointment</a>
            <a href="tel:+15551234567" class="btn btn--outline btn--lg">Call (555) 123-4567</a>
          </div>
          <div class="hero__trust">
            <div class="trust-item"><strong>9+</strong><span>Years Serving</span></div>
            <div class="trust-item"><strong>5,000+</strong><span>Happy Patients</span></div>
            <div class="trust-item"><strong>4</strong><span>Expert Dentists</span></div>
            <div class="trust-item"><strong>4.9</strong><span>Average Rating</span></div>
          </div>
        </div>
        <div class="hero__visual">
          <div class="hero__card">
            <svg viewBox="0 0 500 500" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <defs>
                <linearGradient id="g1" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stop-color="#14b8a6"/><stop offset="100%" stop-color="#2563eb"/>
                </linearGradient>
              </defs>
              <rect width="500" height="500" fill="#ecfeff"/>
              <circle cx="120" cy="120" r="90" fill="url(#g1)" opacity="0.15"/>
              <circle cx="400" cy="400" r="120" fill="url(#g1)" opacity="0.12"/>
              <path d="M250 130 c-45 0 -80 25 -80 80 0 40 10 60 12 100 2 40 20 75 45 75 22 0 22 -35 23 -55 1 -18 35 -18 36 0 1 20 1 55 23 55 25 0 43 -35 45 -75 2 -40 12 -60 12 -100 0 -55 -35 -80 -80 -80z" fill="url(#g1)"/>
              <path d="M180 180 q 70 -60 140 0" stroke="#fff" stroke-width="6" fill="none" opacity="0.4" stroke-linecap="round"/>
            </svg>
          </div>
          <div class="hero__float">⭐ <span><b>4.9</b> · 1,200+ reviews</span></div>
          <div class="hero__badge">Accepting new patients</div>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="container">
        <div class="section__eyebrow" style="display:block;text-align:center;max-width:max-content;margin:0 auto 1rem">Our Services</div>
        <h2 class="section__title">Comprehensive dental care for every smile</h2>
        <p class="section__sub">From routine cleanings to advanced restorative treatments — all under one roof.</p>
        <div class="grid grid--3">
          ${top.map(s => `
            <div class="service-card reveal">
              <div class="service-card__icon">${catIcon(s.category)}</div>
              <h3>${UI.escape(s.name)}</h3>
              <p>${UI.escape(s.description || '')}</p>
              <a class="link" href="#services" data-page="services">Learn more</a>
            </div>`).join('')}
        </div>
        <div class="center" style="margin-top:2.5rem">
          <a href="#services" data-page="services" class="btn btn--outline btn--lg">View all services</a>
        </div>
      </div>
    </section>

    <section class="section section--alt">
      <div class="container">
        <div class="section__eyebrow" style="display:block;text-align:center;max-width:max-content;margin:0 auto 1rem">Our Team</div>
        <h2 class="section__title">Meet the dentists behind your smile</h2>
        <p class="section__sub">A team of experienced specialists committed to gentle, patient-first care.</p>
        <div class="grid grid--4">
          ${docs.map(d => `
            <div class="doctor-card reveal">
              ${doctorAvatar(d)}
              <h3>${UI.escape(d.name)}</h3>
              <div class="doctor-card__spec">${UI.escape(d.specialty)}</div>
              <p>${d.experience_years}+ years of experience</p>
            </div>`).join('')}
        </div>
      </div>
    </section>

    <section class="section">
      <div class="container">
        <div class="section__eyebrow" style="display:block;text-align:center;max-width:max-content;margin:0 auto 1rem">Why Choose Us</div>
        <h2 class="section__title">Dentistry built around you</h2>
        <p class="section__sub">Everything we do is designed around your comfort, safety, and long-term oral health.</p>
        <div class="grid grid--3">
          ${[
            ['🦷','Gentle, modern care','Advanced, pain-minimizing techniques with sedation options when needed.'],
            ['📱','Digital patient portal','Access appointments, reports, prescriptions and your secure QR card anytime.'],
            ['⚡','Same-day emergencies','Dedicated emergency slots for urgent dental pain and injuries.'],
            ['💳','Transparent pricing','Clear treatment plans, insurance support, and flexible financing.'],
            ['🔬','Advanced technology','Digital X-rays, intraoral cameras and same-day crown tech.'],
            ['💚','Trusted by patients','Over 5,000 patients served with a 98% satisfaction rate.']
          ].map(([icon, t, d]) => `
            <div class="service-card reveal">
              <div class="service-card__icon" style="background:linear-gradient(135deg,#f0fdfa,#ccfbf1);color:#0f766e;font-size:1.6rem">${icon}</div>
              <h3>${t}</h3>
              <p>${d}</p>
            </div>`).join('')}
        </div>
      </div>
    </section>

    <section class="section section--alt">
      <div class="container">
        <div class="stats">
          <div class="stat"><strong>5,000+</strong><span>Patients Served</span></div>
          <div class="stat"><strong>12,000+</strong><span>Treatments Done</span></div>
          <div class="stat"><strong>98%</strong><span>Satisfaction Rate</span></div>
          <div class="stat"><strong>24/7</strong><span>Emergency Support</span></div>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="container">
        <div class="section__eyebrow" style="display:block;text-align:center;max-width:max-content;margin:0 auto 1rem">Patient Stories</div>
        <h2 class="section__title">What our patients say</h2>
        <p class="section__sub">Real experiences from people who trust us with their smiles.</p>
        <div class="grid grid--3">
          ${[
            ['Dr. Johnson completely transformed my smile with veneers. Amazing results!','Sarah M.','Cosmetic Dentistry'],
            ['Gentle care that changed everything. I actually look forward to appointments now!','David K.','General Dentistry'],
            ['Invisalign treatment was perfect for my lifestyle. Professional service throughout.','Jennifer L.','Orthodontics']
          ].map(([q,a,t]) => `
            <div class="quote reveal">
              <div class="quote__stars">★★★★★</div>
              <p>${q}</p>
              <div class="quote__author">${a}</div>
              <div class="quote__meta">${t}</div>
            </div>`).join('')}
        </div>
      </div>
    </section>

    <section class="section section--alt">
      <div class="container">
        <div class="section__eyebrow" style="display:block;text-align:center;max-width:max-content;margin:0 auto 1rem">FAQ</div>
        <h2 class="section__title">Frequently asked questions</h2>
        <div class="faq" style="margin-top:2.5rem">
          ${faqItems().slice(0,5).map(([q,a]) => `<details><summary>${q}</summary><div class="faq__body">${a}</div></details>`).join('')}
        </div>
        <div class="center" style="margin-top:2rem"><a class="btn btn--outline" href="#faq" data-page="faq">See all FAQs</a></div>
      </div>
    </section>

    <section class="section">
      <div class="container">
        <div class="section__eyebrow" style="display:block;text-align:center;max-width:max-content;margin:0 auto 1rem">Visit Us</div>
        <h2 class="section__title">Find our clinic</h2>
        <div class="grid grid--2" style="margin-top:2.5rem;align-items:stretch">
          <div class="card">
            <h3>SmileCare Dental Clinic</h3>
            <p class="muted">123 Healthcare Drive<br>Medical District, ST 12345</p>
            <p><strong>Phone:</strong> <a href="tel:+15551234567">(555) 123-4567</a></p>
            <p><strong>Emergency:</strong> <a href="tel:+15559112273">(555) 911-CARE</a></p>
            <p><strong>Email:</strong> <a href="mailto:hello@smilecare.com">hello@smilecare.com</a></p>
            <p style="margin-top:1rem"><strong>Hours</strong><br>Mon–Thu 8:00–18:00 · Fri 8:00–17:00 · Sat 9:00–14:00 · Sun Closed</p>
            <a class="btn btn--primary" href="#book" data-page="book" style="margin-top:1rem">Book Appointment</a>
          </div>
          <div class="card" style="padding:0;overflow:hidden">
            <iframe title="Clinic location" src="https://www.google.com/maps?q=medical+district&output=embed" style="width:100%;height:100%;min-height:360px;border:0" loading="lazy"></iframe>
          </div>
        </div>
      </div>
    </section>

    <section class="cta-band">
      <div class="container">
        <h2>Ready to schedule your visit?</h2>
        <p>Take the first step toward better oral health. Our friendly team is here to help.</p>
        <div style="display:flex;gap:.75rem;justify-content:center;flex-wrap:wrap;position:relative">
          <a href="#book" data-page="book" class="btn btn--primary btn--lg">Book Appointment</a>
          <a href="tel:+15551234567" class="btn btn--outline btn--lg">Call (555) 123-4567</a>
        </div>
      </div>
    </section>`;
  }

  function catIcon(cat = '') {
    const m = { 'General Dentistry':'🪥','Cosmetic Dentistry':'✨','Restorative Dentistry':'🦷','Orthodontics':'😁','Emergency':'🚑' };
    return m[cat] || '🦷';
  }

  /* ---------------- SERVICES ---------------- */
  async function renderServices() {
    const svcs = await loadServices();
    const groups = svcs.reduce((acc, s) => ((acc[s.category] ||= []).push(s), acc), {});
    return `
    <section class="page-hero"><div class="container">
      <span class="section__eyebrow">Services</span>
      <h1>Comprehensive dental services</h1>
      <p>From routine cleanings to complex restorative procedures — we offer a full range of dental care.</p>
    </div></section>
    <section class="section"><div class="container" style="max-width:960px">
      ${Object.entries(groups).map(([cat, list]) => `
        <div style="margin-bottom:3rem" class="reveal">
          <h2 style="margin-bottom:1.5rem">${catIcon(cat)} ${cat}</h2>
          <div class="grid grid--2">
            ${list.map(s => `
              <div class="card">
                <h3 style="margin-bottom:.35rem">${UI.escape(s.name)}</h3>
                <p class="muted" style="font-size:.92rem">${UI.escape(s.description || '')}</p>
                <div style="display:flex;gap:1rem;margin-top:1rem;font-size:.85rem">
                  <span class="muted">⏱ ${s.duration_minutes} min</span>
                  <span style="color:var(--brand-700);font-weight:700">$${s.price_min}–$${s.price_max}</span>
                </div>
                <a class="btn btn--primary btn--sm" href="#book" data-page="book" style="margin-top:1rem">Book this service</a>
              </div>`).join('')}
          </div>
        </div>`).join('')}
    </div></section>`;
  }

  /* ---------------- DOCTORS ---------------- */
  async function renderDoctors() {
    const docs = await loadDoctors();
    return `
    <section class="page-hero"><div class="container">
      <span class="section__eyebrow">Our Team</span>
      <h1>Meet our expert dentists</h1>
      <p>Experienced professionals dedicated to your oral health and comfort.</p>
    </div></section>
    <section class="section"><div class="container" style="max-width:960px">
      <div class="grid grid--2">
        ${docs.map(d => `
          <div class="card reveal" style="display:grid;grid-template-columns:auto 1fr;gap:1.25rem;align-items:start">
            ${doctorAvatar(d)}
            <div>
              <h3 style="font-size:1.15rem">${UI.escape(d.name)}</h3>
              <div class="doctor-card__spec" style="margin-bottom:.75rem">${UI.escape(d.specialty)}</div>
              <p class="muted" style="font-size:.9rem">${UI.escape(d.bio || '')}</p>
              <p class="muted" style="font-size:.82rem;margin-top:.5rem">
                <strong>Education:</strong> ${UI.escape(d.education || '—')}<br>
                <strong>Experience:</strong> ${d.experience_years} years
              </p>
              <a class="btn btn--primary btn--sm" href="#book" data-page="book" style="margin-top:.75rem">Book with ${d.name.split(' ')[1] || 'doctor'}</a>
            </div>
          </div>`).join('')}
      </div>
    </div></section>`;
  }

  /* ---------------- ABOUT ---------------- */
  async function renderAbout() {
    return `
    <section class="page-hero"><div class="container">
      <span class="section__eyebrow">About Us</span>
      <h1>Modern dentistry with a personal touch</h1>
      <p>Serving our community with compassionate, evidence-based dental care since 2015.</p>
    </div></section>
    <section class="section"><div class="container grid grid--2" style="align-items:start">
      <div class="reveal">
        <h2>Our practice</h2>
        <p class="muted">SmileCare Dental Clinic combines advanced technology with a warm, patient-first approach. Every treatment plan is personalized to your goals, comfort, and long-term oral health.</p>
        <p class="muted">Our facility is equipped with digital X-rays, intraoral cameras, laser dentistry and same-day crown technology — reducing visits and improving outcomes.</p>
        <div class="stats" style="margin-top:2rem">
          <div class="stat"><strong>9+</strong><span>Years</span></div>
          <div class="stat"><strong>5k+</strong><span>Patients</span></div>
          <div class="stat"><strong>4</strong><span>Dentists</span></div>
          <div class="stat"><strong>98%</strong><span>Satisfaction</span></div>
        </div>
      </div>
      <div class="reveal">
        <div class="card">
          <h3>Our mission</h3>
          <p class="muted">To deliver exceptional dental care in a comfortable, modern environment while building lasting relationships with our patients and community.</p>
          <h4 style="margin-top:1rem">Our values</h4>
          <ul style="padding-left:1.1rem;color:var(--ink-500);line-height:2">
            <li>Compassionate, gentle care</li>
            <li>Latest technology and techniques</li>
            <li>Transparent communication</li>
            <li>Personalized treatment plans</li>
            <li>Continuing education and excellence</li>
          </ul>
        </div>
        <div class="card" style="margin-top:1rem">
          <h3>Safety & sterilization</h3>
          <p class="muted">Hospital-grade sterilization, HEPA filtration, and single-use barriers protect every patient visit.</p>
        </div>
      </div>
    </div></section>`;
  }

  /* ---------------- TESTIMONIALS ---------------- */
  async function renderTestimonials() {
    const reviews = [
      ['Dr. Johnson completely transformed my smile with veneers. Amazing results!','Sarah M.','Cosmetic Dentistry','Mar 2025'],
      ['Gentle care that changed everything. I actually look forward to appointments now!','David K.','General Dentistry','Feb 2025'],
      ['Invisalign treatment was perfect for my lifestyle. Professional service throughout.','Jennifer L.','Orthodontics','Jan 2025'],
      ['Emergency root canal saved my tooth. The team was compassionate and quick.','Robert T.','Emergency Care','Apr 2025'],
      ['My children love coming here! Dr. Rodriguez makes visits fun and stress-free.','Maria G.','Pediatric Dentistry','Mar 2025'],
      ['Professional cleaning and the staff explained everything clearly. Great experience.','John P.','Preventive Care','Apr 2025'],
      ['Got my dental implant done by Dr. Wilson — the final result looks completely natural.','Amanda R.','Restorative','Feb 2025'],
      ['Teeth whitening gave me the confidence I needed for my wedding. Thank you!','Carlos M.','Cosmetic','May 2025']
    ];
    return `
    <section class="page-hero"><div class="container">
      <span class="section__eyebrow">Patient Reviews</span>
      <h1>What our patients say</h1>
      <p>Real experiences from our satisfied patients.</p>
    </div></section>
    <section class="section"><div class="container">
      <div class="grid grid--3">
        ${reviews.map(([q,a,t,d]) => `
          <div class="quote reveal">
            <div class="quote__stars">★★★★★</div>
            <p>${q}</p>
            <div class="quote__author">${a}</div>
            <div class="quote__meta">${t} · ${d}</div>
          </div>`).join('')}
      </div>
    </div></section>`;
  }

  /* ---------------- FAQ ---------------- */
  function faqItems() {
    return [
      ['Do you accept my insurance?','We accept most major plans including Delta Dental, Blue Cross Blue Shield, Aetna, Cigna, MetLife, Guardian, Humana and United Healthcare. Our team will verify benefits before treatment.'],
      ['How do I book an appointment?','You can book online through our appointment page, call us at (555) 123-4567, or use the patient portal. You\'ll receive a confirmation and a QR check-in code.'],
      ['What is the QR code for?','Each patient gets a permanent QR code for quick identification at reception, and every appointment generates a unique QR code used for fast, secure check-in. No sensitive data is stored in the QR itself.'],
      ['What if I need to cancel or reschedule?','You can cancel or reschedule directly from your patient portal up to 24 hours before your appointment. Later changes may incur a fee.'],
      ['Do you offer emergency care?','Yes — we reserve same-day slots for dental emergencies. Call (555) 911-CARE and we\'ll do our best to see you the same day.'],
      ['Is my medical information secure?','Yes. All patient data is encrypted in transit and stored securely. QR codes contain only random tokens — never personal or medical data.'],
      ['Do you offer payment plans?','Yes — CareCredit financing, 0% interest options, and HSA/FSA accounts are all accepted. Ask us for details.']
    ];
  }
  async function renderFAQ() {
    return `
    <section class="page-hero"><div class="container">
      <span class="section__eyebrow">FAQ</span>
      <h1>Frequently asked questions</h1>
      <p>Answers to the questions we hear most often.</p>
    </div></section>
    <section class="section"><div class="container">
      <div class="faq">
        ${faqItems().map(([q,a]) => `<details><summary>${q}</summary><div class="faq__body">${a}</div></details>`).join('')}
      </div>
    </div></section>`;
  }

  /* ---------------- CONTACT ---------------- */
  async function renderContact() {
    return `
    <section class="page-hero"><div class="container">
      <span class="section__eyebrow">Contact</span>
      <h1>Get in touch</h1>
      <p>We're here to help — reach out with any question or to schedule a visit.</p>
    </div></section>
    <section class="section"><div class="container grid grid--2" style="align-items:start">
      <div class="card">
        <h3>Send us a message</h3>
        <form id="contactForm" novalidate>
          <div class="form-group">
            <label class="form-label" for="cName">Full Name *</label>
            <input class="form-control" id="cName" name="name" required>
            <div class="form-error">Please enter your name.</div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label" for="cEmail">Email *</label>
              <input class="form-control" id="cEmail" name="email" type="email" required>
              <div class="form-error">Enter a valid email.</div>
            </div>
            <div class="form-group">
              <label class="form-label" for="cPhone">Phone</label>
              <input class="form-control" id="cPhone" name="phone" type="tel">
            </div>
          </div>
          <div class="form-group">
            <label class="form-label" for="cSubject">Subject</label>
            <select class="form-control" id="cSubject" name="subject">
              <option>Appointment Inquiry</option><option>Insurance Question</option>
              <option>Treatment Information</option><option>Billing</option><option>Other</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label" for="cMsg">Message *</label>
            <textarea class="form-control" id="cMsg" name="message" required></textarea>
            <div class="form-error">Please write a message.</div>
          </div>
          <button class="btn btn--primary btn--lg" type="submit">Send Message</button>
        </form>
      </div>
      <div>
        <div class="card">
          <h3>Clinic details</h3>
          <p class="muted">123 Healthcare Drive<br>Medical District, ST 12345</p>
          <p><strong>Phone:</strong> <a href="tel:+15551234567">(555) 123-4567</a></p>
          <p><strong>Emergency:</strong> <a href="tel:+15559112273">(555) 911-CARE</a></p>
          <p><strong>Email:</strong> <a href="mailto:hello@smilecare.com">hello@smilecare.com</a></p>
          <p><strong>Hours</strong><br>Mon–Thu 8:00–18:00 · Fri 8:00–17:00 · Sat 9:00–14:00 · Sun Closed</p>
        </div>
        <div class="card" style="margin-top:1rem;padding:0;overflow:hidden">
          <iframe title="Map" src="https://www.google.com/maps?q=medical+district&output=embed" style="width:100%;height:280px;border:0" loading="lazy"></iframe>
        </div>
      </div>
    </div></section>`;
  }

  /* ---------------- BOOK APPOINTMENT ---------------- */
  async function renderBook() {
    const [docs, svcs] = await Promise.all([loadDoctors(), loadServices()]);
    const me = await fetch('/api/auth/me').then(r => r.ok ? r.json() : null).catch(() => null);
    const isPatient = me && me.user && me.user.role === 'patient';
    return `
    <section class="page-hero"><div class="container">
      <span class="section__eyebrow">Book</span>
      <h1>Book your appointment</h1>
      <p>${isPatient ? 'Choose your doctor, service and time — you\'ll receive a QR check-in code instantly.' : 'Sign in to your patient portal to book in seconds.'}</p>
    </div></section>
    <section class="section"><div class="container" style="max-width:760px">
      ${!isPatient ? `
        <div class="card center">
          <h3>Sign in to book</h3>
          <p class="muted">Booking requires a patient account so we can send your QR check-in and keep your records secure.</p>
          <a class="btn btn--primary btn--lg" href="portal.html">Go to Patient Portal</a>
        </div>` : `
      <form id="bookForm" class="card">
        <div class="form-group">
          <label class="form-label" for="bService">Service *</label>
          <select class="form-control" id="bService" required>
            <option value="">Choose a service…</option>
            ${svcs.map(s => `<option value="${s.id}">${UI.escape(s.category)} — ${UI.escape(s.name)} (${s.duration_minutes} min · $${s.price_min}–$${s.price_max})</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label" for="bDoctor">Doctor *</label>
          <select class="form-control" id="bDoctor" required>
            <option value="">Choose a doctor…</option>
            ${docs.map(d => `<option value="${d.id}">${UI.escape(d.name)} — ${UI.escape(d.specialty)}</option>`).join('')}
          </select>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label" for="bDate">Date *</label>
            <input type="date" class="form-control" id="bDate" required>
          </div>
          <div class="form-group">
            <label class="form-label" for="bTime">Available Time *</label>
            <select class="form-control" id="bTime" required disabled><option value="">Pick a date first</option></select>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label" for="bReason">Reason for visit</label>
          <textarea class="form-control" id="bReason" placeholder="Symptoms, concerns, or additional notes…"></textarea>
        </div>
        <button class="btn btn--primary btn--lg btn--full" type="submit">Confirm Appointment</button>
      </form>
      <div id="bookResult"></div>`}
    </div></section>`;
  }

  /* ---------------- LEGAL ---------------- */
  async function renderPrivacy() {
    return `<section class="page-hero"><div class="container"><h1>Privacy Policy</h1></div></section>
    <section class="section"><div class="container" style="max-width:820px">
      <div class="card"><h3>Your data, protected</h3>
      <p class="muted">We collect only the information necessary to provide dental care and manage your appointments. Patient medical data, reports and prescriptions are stored on encrypted infrastructure and accessible only to you and authorized clinic staff.</p>
      <h4>QR codes</h4>
      <p class="muted">Our QR codes contain a random, non-guessable token — never personal or medical data. Each token grants access to a single patient or appointment record and can be regenerated by the patient at any time.</p>
      <h4>Your rights</h4>
      <p class="muted">You may request access to, correction of, or deletion of your personal data at any time by contacting <a href="mailto:privacy@smilecare.com">privacy@smilecare.com</a>.</p>
      </div>
    </div></section>`;
  }
  async function renderTerms() {
    return `<section class="page-hero"><div class="container"><h1>Terms & Conditions</h1></div></section>
    <section class="section"><div class="container" style="max-width:820px">
      <div class="card"><h3>Appointments & cancellations</h3>
      <p class="muted">We require at least 24 hours\' notice for cancellations or rescheduling. Late cancellations and missed appointments may incur a fee.</p>
      <h3>Use of the patient portal</h3>
      <p class="muted">Your portal account and QR codes are personal. Do not share them. You are responsible for maintaining the confidentiality of your login credentials.</p>
      <h3>Medical disclaimer</h3>
      <p class="muted">Information on this site is general and does not replace professional dental advice. Always consult your dentist regarding your individual situation.</p>
      </div>
    </div></section>`;
  }

  /* ---------------- BINDINGS ---------------- */
  function bindPage(page) {
    // Reveal animations
    setTimeout(revealScroll, 50);
    window.addEventListener('scroll', revealScroll, { passive: true });

    if (page === 'contact') bindContactForm();
    if (page === 'book')   bindBookForm();
  }

  function revealScroll() {
    document.querySelectorAll('.reveal:not(.visible)').forEach(el => {
      const r = el.getBoundingClientRect();
      if (r.top < window.innerHeight - 60) el.classList.add('visible');
    });
  }

  function bindContactForm() {
    const f = document.getElementById('contactForm');
    if (!f) return;
    f.addEventListener('submit', e => {
      e.preventDefault();
      const name = f.name.value.trim(), email = f.email.value.trim(), msg = f.message.value.trim();
      let ok = true;
      setInvalid(f.name, !name); if (!name) ok = false;
      setInvalid(f.email, !/^\S+@\S+\.\S+$/.test(email)); if (!/^\S+@\S+\.\S+$/.test(email)) ok = false;
      setInvalid(f.message, !msg); if (!msg) ok = false;
      if (!ok) return;
      UI.toast('Message sent', 'Thanks — we\'ll be in touch shortly.', 'success');
      f.reset();
    });
  }

  async function bindBookForm() {
    const f = document.getElementById('bookForm');
    if (!f) return;
    const dateInput = f.bDate;
    const doctor = f.bDoctor;
    const time = f.bTime;
    const today = new Date().toISOString().slice(0, 10);
    dateInput.min = today;

    async function refreshSlots() {
      time.innerHTML = '<option value="">Loading…</option>';
      time.disabled = true;
      if (!doctor.value || !dateInput.value) { time.innerHTML = '<option value="">Pick a date first</option>'; return; }
      try {
        const { slots } = await API.get(`/availability?doctorId=${doctor.value}&date=${dateInput.value}`);
        if (!slots.length) { time.innerHTML = '<option value="">No slots available on this day</option>'; return; }
        time.innerHTML = '<option value="">Choose a time…</option>' + slots.map(s => `<option value="${s}">${UI.fmtTime(s)}</option>`).join('');
        time.disabled = false;
      } catch (e) { UI.toast('Could not load slots', e.message, 'error'); }
    }
    doctor.addEventListener('change', refreshSlots);
    dateInput.addEventListener('change', refreshSlots);

    f.addEventListener('submit', async e => {
      e.preventDefault();
      const btn = f.querySelector('button[type=submit]');
      const orig = btn.textContent;
      btn.disabled = true; btn.textContent = 'Booking…';
      try {
        const res = await API.post('/appointments', {
          doctorId: doctor.value, serviceId: f.bService.value,
          date: dateInput.value, time: time.value, reason: f.bReason.value
        });
        UI.toast('Appointment requested', 'Your QR check-in code is ready.', 'success');
        const result = document.getElementById('bookResult');
        result.innerHTML = `
          <div class="card" style="margin-top:1.5rem;text-align:center">
            <h3>Appointment confirmed — pending review</h3>
            <p class="muted">Reference <strong>#${res.appointment.id}</strong></p>
            <div class="qr-box" style="margin-top:1rem">
              <img src="${res.qrImage}" alt="Appointment QR code">
              <div class="qr-caption">${res.qrUrl}</div>
              <p class="muted" style="font-size:.85rem">Show this at reception for fast check-in. You can also find it anytime in your portal.</p>
            </div>
            <a class="btn btn--primary" href="portal.html#appointments">View in my portal</a>
          </div>`;
        f.reset(); time.disabled = true; time.innerHTML = '<option value="">Pick a date first</option>';
      } catch (err) { UI.toast('Booking failed', err.message, 'error'); }
      finally { btn.disabled = false; btn.textContent = orig; }
    });
  }

  function setInvalid(el, invalid) { if (el) el.classList.toggle('invalid', invalid); }

  /* ---------------- Router ---------------- */
  function init() {
    document.getElementById('navToggle')?.addEventListener('click', function () {
      this.classList.toggle('active');
      document.getElementById('navLinks').classList.toggle('open');
    });
    document.body.addEventListener('click', e => {
      const link = e.target.closest('[data-page]');
      if (link) { e.preventDefault(); location.hash = '#' + link.dataset.page; }
      // close mobile menu
      const nav = document.getElementById('navLinks');
      if (nav && nav.classList.contains('open') && !e.target.closest('.nav')) nav.classList.remove('open');
    });
    window.addEventListener('hashchange', () => navigate(location.hash.slice(1) || 'home'));
    navigate(location.hash.slice(1) || 'home');
  }

  return { init, navigate };
})();

document.addEventListener('DOMContentLoaded', App.init);