// ABDUCTION — the one joke in the room, and the only thing here that is not work.
//
// Type MADRE into the box, alone, and send it. Not @madre: that is the local agent and it has a
// turn to answer. Just the word, nothing else in the field, nothing attached. The room takes it
// as being called by name, and what answers is a flying saucer with a cat in it.
//
// It never reaches a provider, never enters the ledger, never costs a token. The field comes back
// exactly as it was. Everything here is drawn in this file: no images, no fonts, no network.

// Called by name: the word on its own, in any casing, with nothing around it but space. An @ in
// front is an agent being addressed and belongs to the room, not here.
export function calledByName(text, { attachments = 0 } = {}) {
  if (attachments > 0) return false;
  return /^\s*madre\s*$/i.test(String(text ?? ''));
}

const PHASES = { arrive: 700, beam: 1050, lift: 2000, swallow: 2400, leave: 3000, done: 3400 };
const ease = (t) => (t < 0 ? 0 : t > 1 ? 1 : t * t * (3 - 2 * t));
const span = (now, from, to) => ease((now - from) / (to - from));
const bounce = (t) => 1 + 0.22 * Math.sin(Math.PI * 2 * t) * (1 - t);

// The saucer, and the passenger. Local space is 0..900 across, 0..520 down; the belly the beam
// comes out of is (450, 392), which is the one number the page positions everything else from.
function shipSVG(doc) {
  const svg = doc.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 900 520');
  svg.setAttribute('class', 'ab-svg');
  svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML = `
    <defs>
      <linearGradient id="ab-hull" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#cfd8e2"/>
        <stop offset=".3" stop-color="#8c9aab"/>
        <stop offset=".62" stop-color="#4a5666"/>
        <stop offset="1" stop-color="#232c38"/>
      </linearGradient>
      <linearGradient id="ab-rim" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#f2f6fa"/>
        <stop offset=".5" stop-color="#9fb0c2"/>
        <stop offset="1" stop-color="#596675"/>
      </linearGradient>
      <radialGradient id="ab-glass" cx=".36" cy=".26" r=".8">
        <stop offset="0" stop-color="#ffffff" stop-opacity=".55"/>
        <stop offset=".45" stop-color="#bfe8ff" stop-opacity=".18"/>
        <stop offset="1" stop-color="#8ed0f0" stop-opacity=".1"/>
      </radialGradient>
      <linearGradient id="ab-fur" x1=".3" y1="0" x2=".6" y2="1">
        <stop offset="0" stop-color="#cdf266"/>
        <stop offset=".35" stop-color="#8ad434"/>
        <stop offset=".78" stop-color="#4f9c1c"/>
        <stop offset="1" stop-color="#2f6d12"/>
      </linearGradient>
      <linearGradient id="ab-muzzle" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#e2fb93"/>
        <stop offset="1" stop-color="#9ad93e"/>
      </linearGradient>
      <radialGradient id="ab-bulb">
        <stop offset="0" stop-color="#ffffff"/>
        <stop offset=".4" stop-color="#dcff7a"/>
        <stop offset="1" stop-color="#7ac41f"/>
      </radialGradient>
      <linearGradient id="ab-beam" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#d9ff8a" stop-opacity=".85"/>
        <stop offset=".45" stop-color="#9ee23f" stop-opacity=".34"/>
        <stop offset="1" stop-color="#7ac41f" stop-opacity=".06"/>
      </linearGradient>
      <!-- fur: the silhouette's edge is pushed about by noise, which is cheaper and softer than
           drawing several hundred hairs, and it never looks repeated -->
      <filter id="ab-furry" x="-15%" y="-15%" width="130%" height="130%">
        <feTurbulence type="fractalNoise" baseFrequency="0.09" numOctaves="3" seed="7" result="n"/>
        <feDisplacementMap in="SourceGraphic" in2="n" scale="9" xChannelSelector="R" yChannelSelector="G"/>
      </filter>
      <filter id="ab-soft" x="-40%" y="-40%" width="180%" height="180%">
        <feGaussianBlur stdDeviation="14"/>
      </filter>
    </defs>

    <g class="ab-ship">
      <!-- the glow the hull sits in -->
      <ellipse cx="450" cy="372" rx="300" ry="54" fill="#9ee23f" opacity=".25" filter="url(#ab-soft)"/>

      <!-- the glass dome, and the passenger inside it -->
      <g class="ab-cabin">
        <path d="M250 320 C 250 176 340 86 450 86 C 560 86 650 176 650 320 Z" fill="#0b1118" opacity=".55"/>
        <g class="ab-cat">
          <!-- antennae -->
          <g class="ab-antennae">
            <path d="M392 196 C 376 160 366 134 364 110" fill="none" stroke="#7ac41f" stroke-width="11" stroke-linecap="round"/>
            <path d="M508 196 C 524 160 534 134 536 110" fill="none" stroke="#7ac41f" stroke-width="11" stroke-linecap="round"/>
            <circle class="ab-bulb" cx="364" cy="102" r="14" fill="url(#ab-bulb)"/>
            <circle class="ab-bulb" cx="536" cy="102" r="14" fill="url(#ab-bulb)"/>
          </g>
          <!-- head and body, one furry silhouette -->
          <g filter="url(#ab-furry)">
            <path d="M450 302 C 370 302 338 272 338 224 C 338 162 384 126 450 126 C 516 126 562 162 562 224 C 562 272 530 302 450 302 Z" fill="url(#ab-fur)"/>
            <path d="M398 288 C 372 300 356 318 352 340 L548 340 C 544 318 528 300 502 288 Z" fill="url(#ab-fur)"/>
          </g>
          <!-- muzzle -->
          <ellipse cx="450" cy="252" rx="46" ry="26" fill="url(#ab-muzzle)" opacity=".5"/>
          <!-- the eyes: big, black, almond, and the only part that has to be exactly right -->
          <g class="ab-eyes">
            <ellipse class="ab-eye" cx="410" cy="224" rx="33" ry="24" fill="#06120a" transform="rotate(-17 410 224)"/>
            <ellipse class="ab-eye" cx="490" cy="224" rx="33" ry="24" fill="#06120a" transform="rotate(17 490 224)"/>
            <circle cx="399" cy="214" r="7" fill="#ffffff" opacity=".92"/>
            <circle cx="479" cy="214" r="7" fill="#ffffff" opacity=".92"/>
            <circle cx="421" cy="232" r="3.4" fill="#ffffff" opacity=".45"/>
            <circle cx="501" cy="232" r="3.4" fill="#ffffff" opacity=".45"/>
          </g>
          <!-- the lids, dropped only to blink -->
          <g class="ab-lids">
            <ellipse class="ab-lid" cx="410" cy="224" rx="35" ry="26" fill="url(#ab-fur)" transform="rotate(-17 410 224)"/>
            <ellipse class="ab-lid" cx="490" cy="224" rx="35" ry="26" fill="url(#ab-fur)" transform="rotate(17 490 224)"/>
          </g>
          <path d="M443 248 L457 248 L450 256 Z" fill="#2f6d12"/>
          <path d="M450 256 C 450 264 442 266 436 262" fill="none" stroke="#2f6d12" stroke-width="3" stroke-linecap="round"/>
          <path d="M450 256 C 450 264 458 266 464 262" fill="none" stroke="#2f6d12" stroke-width="3" stroke-linecap="round"/>
          <g stroke="#e8ffb4" stroke-width="2" stroke-linecap="round" opacity=".6">
            <path d="M408 254 L356 246"/><path d="M408 260 L358 262"/>
            <path d="M492 254 L544 246"/><path d="M492 260 L542 262"/>
          </g>
          <!-- paws on the glass -->
          <ellipse cx="398" cy="336" rx="22" ry="13" fill="url(#ab-fur)"/>
          <ellipse cx="502" cy="336" rx="22" ry="13" fill="url(#ab-fur)"/>
        </g>
        <path d="M250 320 C 250 176 340 86 450 86 C 560 86 650 176 650 320 Z" fill="url(#ab-glass)"/>
        <path d="M300 300 C 302 196 352 120 430 104 C 372 136 334 210 330 300 Z" fill="#ffffff" opacity=".3"/>
        <path d="M250 320 C 250 176 340 86 450 86 C 560 86 650 176 650 320" fill="none" stroke="#dfeaf4" stroke-opacity=".7" stroke-width="4"/>
      </g>

      <!-- the hull -->
      <ellipse cx="450" cy="322" rx="330" ry="34" fill="url(#ab-rim)"/>
      <path d="M120 322 C 120 362 258 392 450 392 C 642 392 780 362 780 322 Z" fill="url(#ab-hull)"/>
      <path d="M140 330 C 180 352 300 368 450 368 C 600 368 720 352 760 330" fill="none" stroke="#0e141c" stroke-opacity=".35" stroke-width="6"/>
      <g class="ab-lamps"></g>
      <!-- the emitter the beam leaves from -->
      <ellipse cx="450" cy="388" rx="58" ry="14" fill="#0a0f15"/>
      <ellipse class="ab-emitter" cx="450" cy="386" rx="46" ry="10" fill="#c9ff79"/>
    </g>`;
  return svg;
}

// The lamps around the rim, placed along the hull rather than typed out one by one: evenly spaced,
// and they chase around the ring instead of all blinking together.
function growLamps(svg) {
  const host = svg.querySelector('.ab-lamps');
  if (!host) return [];
  const lamps = [];
  const count = 11;
  for (let i = 0; i < count; i += 1) {
    const t = (i + 0.5) / count;
    const angle = Math.PI * t;
    const lamp = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    lamp.setAttribute('cx', String(450 - Math.cos(angle) * 300));
    lamp.setAttribute('cy', String(344 + Math.sin(angle) * 26));
    lamp.setAttribute('r', '8');
    lamp.setAttribute('fill', '#c9ff79');
    host.append(lamp);
    lamps.push(lamp);
  }
  return lamps;
}

function styleOnce(doc) {
  if (doc.querySelector('#ab-style')) return;
  const style = doc.createElement('style');
  style.id = 'ab-style';
  style.textContent = `
    .ab-stage { position: fixed; inset: 0; z-index: 60; pointer-events: none; opacity: 0; overflow: hidden; }
    .ab-sky { position: absolute; inset: 0; background: radial-gradient(90% 60% at 50% 0%, rgba(120,190,60,.18), rgba(0,0,0,0) 70%); opacity: 0; }
    .ab-wrap { position: absolute; will-change: transform; }
    .ab-svg { display: block; width: 100%; height: 100%; overflow: visible; filter: drop-shadow(0 26px 50px rgba(0,0,0,.35)); }
    .ab-beam { position: absolute; transform-origin: 50% 0%; will-change: transform, opacity; }
    .ab-mote { position: absolute; width: 7px; height: 7px; border-radius: 50%; background: #b7ec5a; box-shadow: 0 0 10px #9ee23f; will-change: transform, opacity; }
    .ab-taken { will-change: transform, filter, opacity; }
    @media (prefers-reduced-motion: reduce) { .ab-svg { filter: none; } }`;
  doc.head.append(style);
}

export async function abduct({ composer, shell = document.querySelector('.shell'), doc = document, reduced = false } = {}) {
  if (!composer) return;
  styleOnce(doc);
  const box = composer.getBoundingClientRect();
  const stage = doc.createElement('div');
  stage.className = 'ab-stage';
  const sky = doc.createElement('div');
  sky.className = 'ab-sky';

  const shipW = Math.min(760, Math.max(420, box.width * 0.62));
  const scale = shipW / 900;
  const shipH = 520 * scale;
  const wrap = doc.createElement('div');
  wrap.className = 'ab-wrap';
  wrap.style.width = `${shipW}px`;
  wrap.style.height = `${shipH}px`;
  // Centred over the field, hovering a ship's height above it: the beam has to have somewhere to
  // fall through, and the cat has to be able to see what it is taking.
  const centreX = box.left + box.width / 2;
  const bellyY = Math.max(96, box.top - shipH * 0.52);
  wrap.style.left = `${centreX - shipW / 2}px`;
  wrap.style.top = `${bellyY - 388 * scale}px`;
  const svg = shipSVG(doc);
  wrap.append(svg);

  // The beam: a cone, widening from the emitter down to the field.
  const beam = doc.createElement('div');
  beam.className = 'ab-beam';
  const beamH = Math.max(40, box.top + box.height / 2 - bellyY);
  beam.style.left = `${centreX - box.width * 0.34}px`;
  beam.style.top = `${bellyY}px`;
  beam.style.width = `${box.width * 0.68}px`;
  beam.style.height = `${beamH}px`;
  beam.style.clipPath = 'polygon(42% 0%, 58% 0%, 100% 100%, 0% 100%)';
  beam.style.background = 'linear-gradient(to bottom, rgba(217,255,138,.9), rgba(158,226,63,.34) 45%, rgba(122,196,31,.06))';
  beam.style.opacity = '0';

  stage.append(sky, beam, wrap);
  doc.body.append(stage);
  const lamps = growLamps(svg);
  const lids = [...svg.querySelectorAll('.ab-lid')];
  const emitter = svg.querySelector('.ab-emitter');
  const cat = svg.querySelector('.ab-cat');
  composer.classList.add('ab-taken');

  // Motes drifting up the beam, which is what sells a beam as a beam.
  const motes = [];
  const drift = () => {
    const mote = doc.createElement('div');
    mote.className = 'ab-mote';
    const spread = box.width * 0.3;
    mote.style.left = `${centreX + (Math.random() - 0.5) * spread}px`;
    mote.style.top = `${box.top + box.height / 2}px`;
    stage.append(mote);
    mote.animate([
      { transform: 'translate(0,0) scale(1)', opacity: .9 },
      { transform: `translate(${(Math.random() - .5) * 40}px, ${-beamH}px) scale(.3)`, opacity: 0 },
    ], { duration: 900 + Math.random() * 500, easing: 'cubic-bezier(.3,.1,.5,1)', fill: 'forwards' });
    motes.push(mote);
  };

  const total = reduced ? 1500 : PHASES.done;
  const started = performance.now();
  let lastMote = 0;
  let blinked = false;

  await new Promise((resolve) => {
    const frame = (stamp) => {
      const now = reduced ? ((stamp - started) / total) * PHASES.done : stamp - started;
      stage.style.opacity = String(Math.min(1, span(now, 0, 160) + 0.001));
      sky.style.opacity = String(0.9 * span(now, 80, PHASES.beam) * (1 - span(now, PHASES.leave, PHASES.done)));

      // The ship drops in, holds while it works, then tips and goes.
      const arrive = span(now, 0, PHASES.arrive);
      const gone = span(now, PHASES.leave, PHASES.done);
      const hover = Math.sin(now / 420) * 6 * (1 - gone);
      wrap.style.transform = `translate(${260 * gone}px, ${-shipH * 1.6 * (1 - arrive) + hover - shipH * 2.2 * gone}px) rotate(${-2 + 4 * Math.sin(now / 700) - 16 * gone}deg)`;

      // Rim lamps chase around the ring; the emitter breathes while the beam is on.
      for (const [i, lamp] of lamps.entries()) {
        const phase = (now / 420 + i / lamps.length) % 1;
        lamp.setAttribute('opacity', String(0.25 + 0.75 * Math.max(0, Math.sin(phase * Math.PI * 2))));
      }
      const live = span(now, PHASES.arrive, PHASES.beam) * (1 - span(now, PHASES.swallow, PHASES.leave));
      if (emitter) emitter.setAttribute('opacity', String(0.3 + 0.7 * live));

      // The beam opens, then shuts once the field is aboard.
      beam.style.opacity = String(live * (0.75 + 0.25 * Math.sin(now / 90)));
      beam.style.transform = `scaleX(${0.2 + 0.8 * live}) scaleY(${0.3 + 0.7 * live})`;

      // One blink, while it waits. Cats blink.
      const blink = Math.max(0, Math.sin((now - PHASES.beam - 150) / 90));
      const lidOn = now > PHASES.beam + 150 && now < PHASES.beam + 430;
      for (const lid of lids) lid.setAttribute('opacity', String(lidOn ? blink : 0));
      if (!blinked && lidOn) blinked = true;
      // It leans toward what it is taking.
      if (cat) cat.setAttribute('transform', `translate(0 ${6 * live}) rotate(${1.5 * Math.sin(now / 520)} 450 230)`);

      // The field goes up. It wobbles on the way, because nothing rides a tractor beam steadily.
      const rise = span(now, PHASES.beam, PHASES.lift);
      const eaten = span(now, PHASES.lift, PHASES.swallow);
      const backHome = span(now, PHASES.leave, PHASES.done);
      const climbed = (box.top + box.height / 2 - bellyY) * rise;
      const shrink = (1 - 0.72 * rise) * (1 - eaten) * bounce(rise);
      if (backHome > 0) {
        composer.style.transform = '';
        composer.style.opacity = '';
        composer.style.filter = '';
      } else {
        composer.style.transform = `translateY(${-climbed}px) scale(${Math.max(0.001, shrink)}) rotate(${Math.sin(now / 130) * 3 * rise}deg)`;
        composer.style.opacity = String(1 - eaten);
        composer.style.filter = `drop-shadow(0 0 ${18 * rise}px rgba(158,226,63,.75)) brightness(${1 + 0.35 * rise})`;
      }

      if (!reduced && live > 0.4 && now - lastMote > 70 && eaten < 1) { lastMote = now; drift(); }
      if (now < total) { requestAnimationFrame(frame); return; }
      resolve();
    };
    requestAnimationFrame(frame);
  });

  // Nothing of this survives: the field is exactly as it was before the word was typed.
  for (const mote of motes) mote.remove();
  stage.remove();
  composer.classList.remove('ab-taken');
  for (const property of ['transform', 'opacity', 'filter']) composer.style[property] = '';
}
