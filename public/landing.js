const MATERIALS = new Set(['walnut', 'paper', 'ebony', 'carbon']);

const DEFAULT_POSE = Object.freeze({
  x: 0,
  y: 0,
  z: 0,
  rotateX: 8,
  rotateY: 18,
  rotateZ: -4,
  scale: 1,
  opacity: 1,
});

function clampNumber(value, fallback) {
  return Number.isFinite(value) ? value : fallback;
}

function normalizePose(next, current) {
  return {
    x: clampNumber(next.x, current.x),
    y: clampNumber(next.y, current.y),
    z: clampNumber(next.z, current.z),
    rotateX: clampNumber(next.rotateX, current.rotateX),
    rotateY: clampNumber(next.rotateY, current.rotateY),
    rotateZ: clampNumber(next.rotateZ, current.rotateZ),
    scale: clampNumber(next.scale, current.scale),
    opacity: clampNumber(next.opacity, current.opacity),
  };
}

function cardMarkup() {
  return `
    <div class="iq-object__skin iq-object__front" data-iq-card-layer="front-skin">
      <div class="iq-object__content">
        <div class="iq-object__mark">iq</div>
        <div class="iq-object__micro">IQ / 01</div>
        <div class="iq-object__name" data-card-name>Nikhil Rakesh</div>
      </div>
    </div>
    <div class="iq-object__layer iq-object__front-adhesive" data-iq-card-layer="front-adhesive"></div>
    <div class="iq-object__layer iq-object__front-core"></div>
    <div class="iq-object__core" data-iq-card-layer="core"></div>
    <div class="iq-object__layer iq-object__back-core"></div>
    <div class="iq-object__layer iq-object__back-adhesive" data-iq-card-layer="back-adhesive"></div>
    <div class="iq-object__skin iq-object__back" data-iq-card-layer="back-skin">
      <div class="iq-object__content">
        <div class="iq-object__back-name" data-card-back-name>Nikhil Rakesh</div>
        <div class="iq-object__back-label">TAP TO CONNECT · NFC</div>
      </div>
    </div>
    <div class="iq-object__edge iq-object__edge--top"></div>
    <div class="iq-object__edge iq-object__edge--bottom"></div>
    <div class="iq-object__edge iq-object__edge--left"></div>
    <div class="iq-object__edge iq-object__edge--right"></div>
  `;
}

/**
 * @typedef {'walnut'|'paper'|'ebony'|'carbon'} HomepageMaterial
 * @typedef {{ x:number, y:number, z:number, rotateX:number, rotateY:number, rotateZ:number, scale:number, opacity:number }} CardPose
 * @typedef {{ setPose(pose: Partial<CardPose>): void, setMaterial(material: HomepageMaterial): void, setName(name: string): void, destroy(): void }} IqCardController
 */
function mountIqCard(host, options = {}) {
  if (!(host instanceof HTMLElement)) throw new TypeError('mountIqCard requires an HTMLElement host');

  const object = document.createElement('div');
  object.className = 'iq-object';
  object.dataset.iqCardObject = '';
  object.dataset.material = MATERIALS.has(options.material) ? options.material : 'walnut';
  object.innerHTML = cardMarkup();
  host.append(object);

  let pose = { ...DEFAULT_POSE };
  const applyPose = () => {
    object.style.transform = `translate3d(calc(-50% + ${pose.x}px), calc(-50% + ${pose.y}px), ${pose.z}px) rotateX(${pose.rotateX}deg) rotateY(${pose.rotateY}deg) rotateZ(${pose.rotateZ}deg) scale(${pose.scale})`;
    object.style.opacity = String(pose.opacity);
  };

  const controller = {
    setPose(next) {
      pose = normalizePose(next, pose);
      applyPose();
    },
    setMaterial(material) {
      if (!MATERIALS.has(material)) throw new RangeError(`Unsupported homepage material: ${material}`);
      object.dataset.material = material;
    },
    setName(name) {
      const safeName = String(name || '');
      object.querySelector('[data-card-name]').textContent = safeName;
      object.querySelector('[data-card-back-name]').textContent = safeName;
    },
    destroy() {
      object.remove();
    },
  };

  controller.setName(options.name || 'Nikhil Rakesh');
  controller.setPose(options.pose || {});
  return controller;
}


const PHASES = ['intrigue', 'tease', 'approach', 'tension', 'tap', 'identity', 'bloom', 'handoff'];
const PHASE_BOUNDARIES = [0, 0.15, 0.30, 0.45, 0.50, 0.60, 0.75, 0.88, 1];

function clamp01(n) { return Math.max(0, Math.min(1, n)); }
function lerp(a, b, t) { return a + (b - a) * t; }
function smoothstep(t) {
  const p = clamp01(t);
  return p * p * (3 - 2 * p);
}
function mixPose(a, b, t) {
  const eased = smoothstep(t);
  return Object.fromEntries(Object.keys(a).map(key => [key, lerp(a[key], b[key], eased)]));
}
function getPhaseForProgress(progress) {
  const p = clamp01(progress);
  for (let i = 0; i < PHASES.length; i += 1) {
    if (p < PHASE_BOUNDARIES[i + 1]) return { index: i, name: PHASES[i] };
  }
  return { index: PHASES.length - 1, name: PHASES.at(-1) };
}

if (typeof document !== 'undefined') {
  const opening = document.querySelector('#iq-opening-scene');
  const sticky = opening?.querySelector('.iq-opening__sticky');
  const atmosphere = opening?.querySelector('.iq-opening__atmosphere');
  const cardHost = document.querySelector('[data-card-host]');
  const phone = document.querySelector('[data-phone]');
  const pulse = document.querySelector('[data-tap-pulse]');
  const bloom = document.querySelector('[data-profile-bloom]');
  const copy = document.querySelector('[data-opening-copy]');
  const label = document.querySelector('[data-opening-label]');

  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

  const card = cardHost ? mountIqCard(cardHost, {
    material: 'walnut',
    name: 'Nikhil Rakesh',
    pose: { x: 610, y: -12, rotateX: 12, rotateY: 89, rotateZ: -10, scale: .94, opacity: .01 },
  }) : null;

  // The opening never gives away the complete front face. It is one physical path:
  // edge enters -> approaches -> touches -> withdraws. Full product payoff remains later.
  const poses = {
    intrigue: { x: 640, y: -18, rotateX: 12, rotateY: 89, rotateZ: -10, scale: .92, opacity: .008 },
    tease:    { x: 520, y: -14, rotateX: 11, rotateY: 87, rotateZ: -10, scale: .94, opacity: .30 },
    approach: { x: 390, y: -10, rotateX: 10, rotateY: 83, rotateZ: -9,  scale: .96, opacity: .72 },
    tension:  { x: 318, y: -6,  rotateX: 9,  rotateY: 79, rotateZ: -8,  scale: .97, opacity: .94 },
    tap:      { x: 284, y: -3,  rotateX: 8,  rotateY: 75, rotateZ: -7,  scale: .975, opacity: 1 },
    identity: { x: 324, y: -24, rotateX: 9,  rotateY: 77, rotateZ: -7,  scale: .95, opacity: .58 },
    bloom:    { x: 395, y: -54, rotateX: 10, rotateY: 79, rotateZ: -8,  scale: .91, opacity: .28 },
    handoff:  { x: 470, y: -66, rotateX: 12, rotateY: 72, rotateZ: -9,  scale: .88, opacity: .10 },
  };


  // Mobile is an art-directed edit, not the desktop camera squeezed smaller.
  // The card follows a shorter, straighter path with less perspective while preserving the same story beats.
  const mobilePoses = {
    intrigue: { x: 320, y: -8,  rotateX: 5, rotateY: 89, rotateZ: -4, scale: .88, opacity: .006 },
    tease:    { x: 270, y: -7,  rotateX: 5, rotateY: 87, rotateZ: -4, scale: .90, opacity: .28 },
    approach: { x: 205, y: -5,  rotateX: 4, rotateY: 83, rotateZ: -3, scale: .92, opacity: .70 },
    tension:  { x: 158, y: -3,  rotateX: 4, rotateY: 79, rotateZ: -3, scale: .94, opacity: .94 },
    tap:      { x: 132, y: -1,  rotateX: 3, rotateY: 76, rotateZ: -2, scale: .95, opacity: 1 },
    identity: { x: 150, y: -13, rotateX: 4, rotateY: 78, rotateZ: -2, scale: .92, opacity: .54 },
    bloom:    { x: 184, y: -26, rotateX: 4, rotateY: 80, rotateZ: -3, scale: .88, opacity: .24 },
    handoff:  { x: 220, y: -34, rotateX: 5, rotateY: 76, rotateZ: -3, scale: .84, opacity: .08 },
  };

  let openingIsVisible = true;

  function segment(progress, start, end) {
    return smoothstep((progress - start) / Math.max(.001, end - start));
  }

  function getProgress() {
    if (!opening) return 0;
    const max = Math.max(1, opening.offsetHeight - innerHeight);
    return clamp01((scrollY - opening.offsetTop) / max);
  }

  function setCue(progress) {
    if (!label) return;
    if (progress < .15) label.textContent = '';
    else if (progress < .60) label.textContent = 'Bring it closer.';
    else label.textContent = 'There you are.';
  }

  function renderReducedMotion() {
    if (!opening) return;
    opening.dataset.openingPhase = 'bloom';
    opening.style.setProperty('--opening-darkness', '0%');
    const reducedPoses = innerWidth <= 700 ? mobilePoses : poses;
    card?.setPose(reducedPoses.bloom);
    phone?.setAttribute('data-active', 'true');
    phone?.style.setProperty('--iq-screen-wake', '1');
    pulse?.setAttribute('data-active', 'false');
    bloom?.setAttribute('data-active', 'true');
    if (bloom) {
      bloom.style.opacity = '1';
      bloom.style.transform = 'translate(-50%,-50%) translateY(-44px) scale(1)';
    }
    if (label) label.textContent = 'There you are.';
  }

  function render() {
    if (!opening || reducedMotion.matches) {
      renderReducedMotion();
      return;
    }

    if (!openingIsVisible) return;
    const progress = getProgress();
    const { index, name } = getPhaseForProgress(progress);
    opening.dataset.openingPhase = name;

    const start = PHASE_BOUNDARIES[index];
    const end = PHASE_BOUNDARIES[index + 1];
    const local = clamp01((progress - start) / Math.max(.001, end - start));
    const nextName = PHASES[Math.min(index + 1, PHASES.length - 1)];
    const isMobileOpening = innerWidth <= 700;
    const activePoses = isMobileOpening ? mobilePoses : poses;
    card?.setPose(mixPose(activePoses[name], activePoses[nextName], local));

    // Hero copy relinquishes the stage slowly; the product movement remains the focal event.
    if (copy) {
      const fade = segment(progress, .07, .27);
      copy.style.opacity = String(1 - fade);
      copy.style.transform = innerWidth <= 900
        ? `translateY(-${fade * 20}px)`
        : `translateY(calc(-50% - ${fade * 34}px))`;
    }

    // The phone is not introduced by a slide. Light, scale and perspective reveal an object
    // that feels as though it was already sitting in the scene.
    const phoneIn = segment(progress, .27, .43);
    const phoneSettle = segment(progress, .43, .50);
    if (phone) {
      phone.setAttribute('data-active', String(progress >= .27));
      phone.style.opacity = String(phoneIn);
      const y = isMobileOpening ? lerp(-40, -48, phoneIn) : lerp(-42, -50, phoneIn);
      const rx = isMobileOpening ? lerp(20, 10, phoneIn) : lerp(64, 54, phoneIn);
      const rz = isMobileOpening ? lerp(6, 2, phoneIn) : lerp(18, 14, phoneIn);
      const sc = (isMobileOpening ? lerp(.94, 1.03, phoneIn) : lerp(.88, 1, phoneIn)) + phoneSettle * .008;
      phone.style.transform = `translate(-50%,${y}%) rotateX(${rx}deg) rotateZ(${rz}deg) scale(${sc})`;
    }

    // Screen wakes exactly from the tap, not when the phone first enters.
    const screenWake = segment(progress, .50, .62);
    phone?.style.setProperty('--iq-screen-wake', String(screenWake));

    // One scroll-scrubbed NFC wave; no looping neon animation.
    const pulseIn = segment(progress, .485, .515);
    const pulseOut = segment(progress, .515, .565);
    const pulseOpacity = pulseIn * (1 - pulseOut);
    const pulseScale = lerp(.7, 8.5, segment(progress, .49, .56));
    if (pulse) {
      pulse.setAttribute('data-active', String(progress >= .485 && progress <= .565));
      pulse.style.setProperty('--pulse-opacity', String(pulseOpacity));
      pulse.style.setProperty('--pulse-scale', String(pulseScale));
    }

    // Identity grows out of the phone after contact; the card quietly withdraws.
    const bloomIn = segment(progress, .585, .76);
    const bloomLift = lerp(36, -48, bloomIn);
    const bloomScale = lerp(.86, 1, bloomIn);
    if (bloom) {
      bloom.setAttribute('data-active', String(progress >= .585));
      bloom.style.opacity = String(bloomIn);
      bloom.style.transform = `translate(-50%,-50%) translateY(${bloomLift}px) scale(${bloomScale})`;
    }

    // Final 12% is a tonal handoff into the black identity section below.
    const handoff = segment(progress, .88, 1);
    opening.style.setProperty('--opening-darkness', `${handoff * 100}%`);
    if (atmosphere) {
      atmosphere.style.opacity = String(lerp(1, .32, handoff));
      atmosphere.style.transform = `scale(${lerp(1.08, 1.18, handoff)})`;
    }
    if (sticky) sticky.style.setProperty('--opening-profile-dim', String(handoff));

    setCue(progress);
  }

  let raf = 0;
  function requestRender() {
    if (raf || (!openingIsVisible && !reducedMotion.matches)) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      render();
    });
  }

  if ('IntersectionObserver' in window && opening) {
    const openingObserver = new IntersectionObserver(entries => {
      openingIsVisible = entries.some(entry => entry.isIntersecting);
      if (openingIsVisible) requestRender();
    }, { rootMargin: '120px 0px 120px 0px' });
    openingObserver.observe(opening);
  }

  addEventListener('scroll', requestRender, { passive: true });
  addEventListener('resize', requestRender);
  reducedMotion.addEventListener?.('change', requestRender);
  render();
}


if (typeof document !== 'undefined') {
  const identityProfile = document.querySelector('[data-identity-profile]');
  const featureButtons = [...document.querySelectorAll('[data-profile-feature]')];

  const identityViews = {
    contact: `
      <div class="iq-profile-view iq-profile-view--contact" data-contact-preview>
        <div class="iq-profile-view__eyebrow">SAVE CONTACT</div>
        <div class="iq-contact-card">
          <div><span>Mobile</span><strong>+91 98765 43210</strong></div>
          <div><span>Email</span><strong>hello@iqcard.in</strong></div>
          <div><span>Studio</span><strong>Bengaluru, India</strong></div>
        </div>
        <button type="button" class="iq-profile-view__cta">Add to Contacts <span>+</span></button>
      </div>`,
    portfolio: `
      <div class="iq-profile-view iq-profile-view--portfolio" data-portfolio-preview>
        <div class="iq-profile-view__eyebrow">SELECTED WORK</div>
        <div class="iq-portfolio-stack">
          <article><span>01</span><strong>Architecture</strong><i></i></article>
          <article><span>02</span><strong>Urban Design</strong><i></i></article>
          <article><span>03</span><strong>Research</strong><i></i></article>
        </div>
        <div class="iq-profile-view__foot">Open portfolio <span>↗</span></div>
      </div>`,
    message: `
      <div class="iq-profile-view iq-profile-view--message" data-message-preview>
        <div class="iq-profile-view__eyebrow">CONTINUE THE CONVERSATION</div>
        <div class="iq-message-thread">
          <p>Great meeting you today.</p>
          <p>Likewise — here is everything in one place.</p>
        </div>
        <button type="button" class="iq-profile-view__cta">Message on WhatsApp <span>↗</span></button>
      </div>`,
  };

  function renderIdentityProfile(active = 'contact') {
    if (!identityProfile || !(active in identityViews)) return;
    identityProfile.dataset.activeFeature = active;
    identityProfile.innerHTML = `
      <div class="iq-live-profile">
        <div class="iq-live-profile__top">
          <span class="iq-live-profile__mark">iq</span>
          <p>YOUR IDENTITY</p>
        </div>
        <div class="iq-live-profile__person">
          <strong>Nikhil Rakesh</strong>
          <span>Architect · Urban Designer</span>
        </div>
        <div class="iq-live-profile__viewport" aria-live="polite">
          ${identityViews[active]}
        </div>
        <div class="iq-live-profile__footer"><span>LinkedIn</span><span>Website</span><i>iq</i></div>
      </div>`;
  }

  function setIdentityFeature(feature) {
    if (!(feature in identityViews)) return;
    featureButtons.forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.profileFeature === feature));
    });
    renderIdentityProfile(feature);
  }

  featureButtons.forEach(button => {
    button.setAttribute('aria-pressed', 'false');
    button.addEventListener('click', () => setIdentityFeature(button.dataset.profileFeature));
    button.addEventListener('mouseenter', () => setIdentityFeature(button.dataset.profileFeature));
    button.addEventListener('focus', () => setIdentityFeature(button.dataset.profileFeature));
  });
  if (featureButtons.length) setIdentityFeature('contact');

  const shareButtons = [...document.querySelectorAll('[data-share-mode]')];
  const shareVisual = document.querySelector('[data-sharing-visual]');
  const shareModeOrder = ['tap', 'scan', 'send', 'save'];
  const shareViews = {
    tap: `
      <div class="iq-share-scene iq-share-scene--tap" data-share-scene="tap">
        <div class="iq-share-stage iq-share-stage--tap">
          <div class="iq-share-card" data-share-card aria-hidden="true">
            <span class="iq-share-card__mark">iq</span>
            <strong>Nikhil Rakesh</strong>
            <small>NFC / IQ</small>
          </div>
          <div class="iq-share-tap-pulse" data-share-tap-pulse aria-hidden="true"></div>
          <div class="iq-share-device iq-share-device--tap" aria-hidden="true">
            <i class="iq-share-device__island"></i>
            <div class="iq-share-device__idle"><span>iq</span><small>READY</small></div>
            <div class="iq-share-profile-preview" data-share-profile-preview>
              <span>iq</span>
              <strong>Nikhil Rakesh</strong>
              <small>Architect · Urban Designer</small>
              <i></i><i></i><i></i>
            </div>
          </div>
        </div>
        <div class="iq-share-caption"><span>NFC</span><strong>One tap. Your identity opens.</strong><p>The physical card disappears from the conversation. You remain.</p></div>
      </div>`,
    scan: `
      <div class="iq-share-scene iq-share-scene--scan" data-share-scene="scan">
        <div class="iq-share-stage iq-share-stage--scan">
          <div class="iq-share-qr-card" data-share-qr aria-label="IQ QR code preview">
            <span class="iq-share-qr-card__mark">iq</span>
            <div class="iq-qr"><i></i><i></i><i></i></div>
            <small>SCAN TO CONNECT</small>
          </div>
          <div class="iq-share-camera" data-share-camera aria-hidden="true">
            <i class="iq-share-camera__corner iq-share-camera__corner--a"></i>
            <i class="iq-share-camera__corner iq-share-camera__corner--b"></i>
            <i class="iq-share-camera__corner iq-share-camera__corner--c"></i>
            <i class="iq-share-camera__corner iq-share-camera__corner--d"></i>
            <span class="iq-share-scan-beam"></span>
            <div class="iq-share-scan-confirm" data-share-scan-confirm><span>iq</span><strong>Profile found</strong></div>
          </div>
        </div>
        <div class="iq-share-caption"><span>QR</span><strong>Point. Recognize. Open.</strong><p>When tapping is not convenient, the same identity is one scan away.</p></div>
      </div>`,
    send: `
      <div class="iq-share-scene iq-share-scene--send" data-share-scene="send">
        <div class="iq-share-stage iq-share-stage--send">
          <div class="iq-share-link-origin"><span>YOUR IQ URL</span><strong>iqcard.in/nikhil</strong></div>
          <div class="iq-share-url" data-share-url>iqcard.in/nikhil <span>↗</span></div>
          <div class="iq-share-message-device" aria-hidden="true">
            <i></i>
            <div class="iq-share-message-bubble" data-share-message-bubble>
              <span>IQ Card</span>
              <strong>iqcard.in/nikhil</strong>
              <small>Tap to open identity</small>
            </div>
          </div>
        </div>
        <div class="iq-share-caption"><span>LINK</span><strong>Your identity travels with the conversation.</strong><p>Text it. Email it. Drop it into a group chat. The profile stays current.</p></div>
      </div>`,
    save: `
      <div class="iq-share-scene iq-share-scene--save" data-share-scene="save">
        <div class="iq-share-stage iq-share-stage--save">
          <div class="iq-share-profile-chip" data-share-profile-chip>
            <span>iq</span><strong>Nikhil Rakesh</strong><small>Architect · Urban Designer</small>
          </div>
          <div class="iq-share-contact-book" data-share-contact-book aria-hidden="true">
            <span>CONTACTS</span>
            <div class="iq-share-contact-row"><i>NR</i><div><strong>Nikhil Rakesh</strong><small>Mobile · Email · Website</small></div></div>
            <div class="iq-share-contact-row iq-share-contact-row--ghost"><i>AS</i><div><strong>Arjun Shah</strong><small>Mobile</small></div></div>
          </div>
        </div>
        <div class="iq-share-caption"><span>CONTACT</span><strong>From introduction to saved person.</strong><p>No transcription. No spelling your name. The useful details land together.</p></div>
      </div>`,
  };

  function setShareMode(mode, { focus = false } = {}) {
    if (!(mode in shareViews) || !shareVisual) return;
    shareButtons.forEach(button => {
      const selected = button.dataset.shareMode === mode;
      button.setAttribute('aria-selected', String(selected));
      button.tabIndex = selected ? 0 : -1;
      if (selected && focus) button.focus({ preventScroll: true });
    });
    shareVisual.dataset.shareModeActive = mode;
    shareVisual.innerHTML = shareViews[mode];
  }

  function moveShareMode(direction, shouldFocus = false) {
    const current = shareVisual?.dataset.shareModeActive || 'tap';
    const index = Math.max(0, shareModeOrder.indexOf(current));
    const next = shareModeOrder[(index + direction + shareModeOrder.length) % shareModeOrder.length];
    setShareMode(next, { focus: shouldFocus });
  }

  shareButtons.forEach(button => {
    button.addEventListener('click', () => setShareMode(button.dataset.shareMode));
    button.addEventListener('mouseenter', () => {
      if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) setShareMode(button.dataset.shareMode);
    });
    button.addEventListener('focus', () => setShareMode(button.dataset.shareMode));
    button.addEventListener('keydown', event => {
      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
        event.preventDefault();
        moveShareMode(1, true);
      }
      if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
        event.preventDefault();
        moveShareMode(-1, true);
      }
    });
  });

  let shareSwipeStartX = null;
  if (shareVisual) {
    shareVisual.addEventListener('pointerdown', event => {
      if (event.pointerType === 'mouse') return;
      shareSwipeStartX = event.clientX;
    });
    shareVisual.addEventListener('pointerup', event => {
      if (shareSwipeStartX === null || event.pointerType === 'mouse') return;
      const delta = event.clientX - shareSwipeStartX;
      shareSwipeStartX = null;
      if (Math.abs(delta) < 44) return;
      moveShareMode(delta < 0 ? 1 : -1);
    });
    shareVisual.addEventListener('pointercancel', () => { shareSwipeStartX = null; });
  }
  if (shareButtons.length) setShareMode('tap');

  const revealSection = document.querySelector('#iq-physical-reveal');
  const revealHost = document.querySelector('[data-reveal-card-host]');
  const materialButtons = [...document.querySelectorAll('[data-material-preview]')];
  const materialCards = [...document.querySelectorAll('[data-material-card]')];
  const materialGallery = document.querySelector('[data-material-gallery]');
  const revealCard = revealHost ? mountIqCard(revealHost, {
    material: 'walnut',
    name: 'Nikhil Rakesh',
    pose: { x: 0, y: 0, rotateX: 7, rotateY: -18, rotateZ: -4, scale: .98, opacity: 1 },
  }) : null;

  const clampReveal = value => Math.min(1, Math.max(0, value));
  let revealIsVisible = true;
  function updateRevealScene() {
    if (!revealSection || !revealCard || !revealIsVisible) return;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const mobileReveal = window.matchMedia('(max-width: 700px)').matches;
    const rect = revealSection.getBoundingClientRect();
    const distance = Math.max(1, revealSection.offsetHeight - window.innerHeight);
    const revealProgress = reduceMotion ? 1 : clampReveal(-rect.top / distance);
    const desktopRevealRotateY = -18 + revealProgress * 13;
    const revealRotateY = mobileReveal ? -8 + revealProgress * 5 : desktopRevealRotateY;
    const revealDetailOpacity = clampReveal((revealProgress - .48) / .18);
    const revealLinkOpacity = clampReveal((revealProgress - .66) / .16);
    revealSection.style.setProperty('--reveal-progress', revealProgress.toFixed(3));
    revealSection.style.setProperty('--reveal-detail-opacity', revealDetailOpacity.toFixed(3));
    revealSection.style.setProperty('--reveal-link-opacity', revealLinkOpacity.toFixed(3));
    const revealDesignLink = revealSection.querySelector('[data-reveal-design-link]');
    if (revealDesignLink) {
      revealDesignLink.style.pointerEvents = revealLinkOpacity > .5 ? 'auto' : 'none';
      revealDesignLink.tabIndex = revealLinkOpacity > .5 ? 0 : -1;
    }
    revealCard.setPose({
      x: revealProgress * 14,
      y: revealProgress * -8,
      rotateX: 7 - revealProgress * 3,
      rotateY: revealRotateY,
      rotateZ: -4 + revealProgress * 3,
      scale: .98 + revealProgress * .06,
      opacity: 1,
    });
  }
  if (revealSection && revealCard) {
    let revealFrame = 0;
    const queueRevealUpdate = () => {
      if (revealFrame || !revealIsVisible) return;
      revealFrame = requestAnimationFrame(() => { revealFrame = 0; updateRevealScene(); });
    };
    if ('IntersectionObserver' in window) {
      const revealObserver = new IntersectionObserver(entries => {
        revealIsVisible = entries.some(entry => entry.isIntersecting);
        if (revealIsVisible) queueRevealUpdate();
      }, { rootMargin: '160px 0px 160px 0px' });
      revealObserver.observe(revealSection);
    }
    updateRevealScene();
    window.addEventListener('scroll', queueRevealUpdate, { passive: true });
    window.addEventListener('resize', queueRevealUpdate, { passive: true });
  }

  const materialCardControllers = materialCards.map((host, index) => {
    const material = host.dataset.materialCard;
    const cardHost = host.querySelector('[data-material-card-host]');
    const rotateY = [-8, -16, 10, 18][index] ?? 0;
    const rotateX = [8, 10, 9, 10][index] ?? 9;
    return {
      host,
      material,
      controller: cardHost ? mountIqCard(cardHost, {
        material,
        name: 'Nikhil Rakesh',
        pose: { x: 0, y: 0, rotateX, rotateY, rotateZ: 0, scale: 1, opacity: 1 },
      }) : null,
    };
  });

  function setPreviewMaterial(material) {
    materialCardControllers.forEach(card => {
      const active = card.material === material;
      card.host.dataset.active = String(active);
      card.host.setAttribute('aria-pressed', String(active));
    });
    materialButtons.forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.materialPreview === material));
    });
  }

  materialButtons.forEach(button => button.addEventListener('click', () => setPreviewMaterial(button.dataset.materialPreview)));
  materialCards.forEach(card => {
    card.addEventListener('click', () => setPreviewMaterial(card.dataset.materialCard));
    card.addEventListener('mouseenter', () => {
      if (window.matchMedia('(min-width: 901px)').matches) setPreviewMaterial(card.dataset.materialCard);
    });
    card.addEventListener('focus', () => setPreviewMaterial(card.dataset.materialCard));
  });

  let materialSwipeStartX = null;
  if (materialGallery) {
    materialGallery.addEventListener('pointerdown', event => {
      if (event.pointerType === 'mouse' || !window.matchMedia('(max-width: 700px)').matches) return;
      materialSwipeStartX = event.clientX;
    });
    materialGallery.addEventListener('pointerup', event => {
      if (materialSwipeStartX === null || event.pointerType === 'mouse') return;
      const delta = event.clientX - materialSwipeStartX;
      materialSwipeStartX = null;
      if (Math.abs(delta) < 42) return;
      const activeIndex = Math.max(0, materialCardControllers.findIndex(card => card.host.dataset.active === 'true'));
      const nextIndex = (activeIndex + (delta < 0 ? 1 : -1) + materialCardControllers.length) % materialCardControllers.length;
      setPreviewMaterial(materialCardControllers[nextIndex].material);
    });
    materialGallery.addEventListener('pointercancel', () => { materialSwipeStartX = null; });
  }
  if (materialButtons.length || materialCards.length) setPreviewMaterial('walnut');
}


const nav = document.querySelector('[data-nav]');
const featureList = document.querySelector('.iq-feature-list');
const identityProfile = document.querySelector('[data-identity-profile]');
const identityButtons = [...document.querySelectorAll('[data-profile-feature]')];
const shareButtons = [...document.querySelectorAll('[data-share-mode]')];
const shareVisual = document.querySelector('[data-sharing-visual]');
const opening = document.querySelector('#iq-opening-scene');

function setIdentitySemantics() {
  if (!featureList || !identityProfile || !identityButtons.length) return;

  featureList.setAttribute('role', 'tablist');
  featureList.setAttribute('aria-label', 'IQ profile actions');
  identityProfile.id = 'iq-identity-profile-panel';
  identityProfile.setAttribute('role', 'tabpanel');

  const syncIdentityTabs = () => {
    const active = identityButtons.find(button => button.getAttribute('aria-pressed') === 'true') || identityButtons[0];
    identityButtons.forEach((button, index) => {
      const selected = button === active;
      button.setAttribute('role', 'tab');
      button.setAttribute('aria-selected', String(selected));
      button.setAttribute('aria-controls', 'iq-identity-profile-panel');
      button.id ||= `iq-identity-tab-${index + 1}`;
      button.tabIndex = selected ? 0 : -1;
    });
    if (active) identityProfile.setAttribute('aria-labelledby', active.id);
  };

  const focusIdentityTab = index => {
    const count = identityButtons.length;
    const target = identityButtons[(index + count) % count];
    target?.focus({ preventScroll: true });
  };

  identityButtons.forEach((button, index) => {
    button.addEventListener('keydown', event => {
      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
        event.preventDefault();
        focusIdentityTab(index + 1);
      } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
        event.preventDefault();
        focusIdentityTab(index - 1);
      } else if (event.key === 'Home') {
        event.preventDefault();
        focusIdentityTab(0);
      } else if (event.key === 'End') {
        event.preventDefault();
        focusIdentityTab(identityButtons.length - 1);
      }
    });

    new MutationObserver(syncIdentityTabs).observe(button, {
      attributes: true,
      attributeFilter: ['aria-pressed'],
    });
  });

  syncIdentityTabs();
}

function setSharingSemantics() {
  if (!shareVisual || !shareButtons.length) return;

  shareVisual.id = 'iq-sharing-panel';
  shareVisual.setAttribute('role', 'tabpanel');

  const syncSharePanel = () => {
    const selected = shareButtons.find(button => button.getAttribute('aria-selected') === 'true') || shareButtons[0];
    shareButtons.forEach((button, index) => {
      button.id ||= `iq-sharing-tab-${index + 1}`;
      button.setAttribute('aria-controls', 'iq-sharing-panel');
    });
    if (selected) shareVisual.setAttribute('aria-labelledby', selected.id);
  };

  shareButtons.forEach((button, index) => {
    button.addEventListener('keydown', event => {
      if (event.key === 'Home') {
        event.preventDefault();
        shareButtons[0]?.focus({ preventScroll: true });
      } else if (event.key === 'End') {
        event.preventDefault();
        shareButtons.at(-1)?.focus({ preventScroll: true });
      }
    });

    new MutationObserver(syncSharePanel).observe(button, {
      attributes: true,
      attributeFilter: ['aria-selected'],
    });
  });

  syncSharePanel();
}

function setNavPolish() {
  if (!nav) return;

  const navLinks = [...nav.querySelectorAll('a[href^="#"]')];
  let frame = 0;

  const updateNav = () => {
    frame = 0;
    const probeY = Math.min(window.innerHeight - 1, Math.round(nav.getBoundingClientRect().bottom + 2));
    const probe = document.elementFromPoint(Math.round(window.innerWidth / 2), probeY);
    const section = probe?.closest('section');
    const openingHandoff = opening?.dataset.openingPhase === 'handoff';
    const dark = section?.id === 'iq-identity-receive' || openingHandoff;

    nav.dataset.navTheme = dark ? 'dark' : 'light';
    nav.dataset.navCondensed = String(window.scrollY > 24);

    navLinks.forEach(link => {
      const active = section && link.getAttribute('href') === `#${section.id}`;
      if (active) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  };

  const requestNavUpdate = () => {
    if (frame) return;
    frame = requestAnimationFrame(updateNav);
  };

  window.addEventListener('scroll', requestNavUpdate, { passive: true });
  window.addEventListener('resize', requestNavUpdate, { passive: true });

  if (opening) {
    new MutationObserver(requestNavUpdate).observe(opening, {
      attributes: true,
      attributeFilter: ['data-opening-phase'],
    });
  }

  updateNav();
}

setIdentitySemantics();
setSharingSemantics();
setNavPolish();

