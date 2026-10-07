'use client'

import Link from 'next/link'
import Script from 'next/script'
import { useState } from 'react'
import { HOME_CTA_HREF, HOME_NAV_ITEMS } from '@/lib/landing/homepage-content'
import { landingStyles } from './landing-styles'

const landingCss = landingStyles.replace(/^\s*<style>/, '').replace(/<\/style>\s*$/, '')

const finishes = [
  ['01', 'Travertine', '/customize/materials/01_travertine_fine.png'],
  ['02', 'Bone', '/customize/materials/02_white.png'],
  ['03', 'Obsidian', '/customize/materials/03_black.png'],
  ['04', 'Graphite', '/customize/materials/04_graphite.png'],
  ['05', 'Terracotta', '/customize/materials/05_terracotta.png'],
  ['06', 'Mustard', '/customize/materials/06_mustard.png'],
  ['07', 'Oxblood', '/customize/materials/07_oxblood.png'],
  ['08', 'Walnut', '/customize/materials/08_walnut.png'],
  ['09', 'Natural Oak', '/customize/materials/09_natural_oak.png'],
  ['10', 'Concrete', '/customize/materials/10_concrete.png'],
  ['11', 'Porous Travertine', '/customize/materials/11_travertine_porous.png'],
  ['12', 'Ivory Marble', '/customize/materials/12_ivory_marble.png'],
] as const

const faqs = [
  ['Does the other person need an app?', 'No. Your IQ identity opens in the browser on a compatible phone.'],
  ['Does IQ Card work with iPhone and Android?', 'IQ is designed for modern NFC-enabled iPhone and Android devices. Your personal URL and QR give you a second way to share.'],
  ['Can I change my information later?', 'Yes. Your physical card points to your digital identity, so the profile can evolve without replacing the card.'],
  ['What happens when someone taps?', 'Their phone opens your IQ profile, where they can save your contact and continue to the links you choose to share.'],
  ['How much is an IQ Card?', 'The card is ₹799. Shipping is calculated separately.'],
  ['What if tapping is not convenient?', 'Share the same identity using your QR or personal IQ URL.'],
] as const

function CardFace({ name = 'Nikhil Rakesh', finish = 'Obsidian', serial }: { name?: string; finish?: string; serial?: string }) {
  return (
    <div className="iq-v3-card" data-finish={finish.toLowerCase().replaceAll(' ', '-')}>
      <span className="iq-v3-card__mark">iq</span>
      <strong>{name}</strong>
      {serial ? <small>{serial}</small> : null}
    </div>
  )
}

export function LandingPage() {
  const [activeFinish, setActiveFinish] = useState(2)

  return (
    <div className="iq-landing-page iq-v3">
      <style dangerouslySetInnerHTML={{ __html: landingCss }} />
      <style>{v3Css}</style>
      <Script src="/landing.js" strategy="afterInteractive" />

      <header className="iq-nav" data-nav>
        <Link className="iq-nav__brand" href="/" aria-label="IQ Card home">iq</Link>
        <nav className="iq-nav__links" aria-label="Primary navigation">
          {HOME_NAV_ITEMS.map(item => <a key={item.href} href={item.href}>{item.label}</a>)}
        </nav>
        <div className="iq-nav__actions">
          <Link className="iq-button iq-button--secondary" href="/login">Log in</Link>
          <Link className="iq-button iq-button--dark" href={HOME_CTA_HREF}>Create yours <span>₹799</span></Link>
        </div>
      </header>

      <main data-iq-home>
        <section id="iq-opening-scene" className="iq-opening" data-opening-scene data-opening-phase="intrigue">
          <div className="iq-opening__sticky">
            <div className="iq-opening__atmosphere" aria-hidden="true" />
            <div className="iq-opening__copy" data-opening-copy>
              <p className="iq-v3-kicker">IQ CARD / BENGALURU</p>
              <h1>An introduction,<br />redesigned.</h1>
              <p className="iq-opening__subcopy">A physical expression of your digital identity.</p>
              <div className="iq-v3-hero-actions">
                <Link className="iq-button iq-button--dark iq-opening__cta" href={HOME_CTA_HREF}>Create yours <span>₹799</span></Link>
                <a className="iq-v3-text-link" href="#iq-object">See how it works <span>↓</span></a>
              </div>
              <p className="iq-v3-proof">Card + digital profile <i /> No app required <i /> iPhone + Android</p>
            </div>
            <div className="iq-stage" aria-label="IQ Card tap demonstration">
              <div id="iq-card-host" className="iq-card-host" data-card-host />
              <div className="iq-phone" data-phone aria-hidden="true">
                <div className="iq-phone__hardware" />
                <div className="iq-phone__screen">
                  <div className="iq-phone__island" />
                  <div className="iq-profile-mini" data-profile-mini>
                    <span className="iq-profile-mini__mark">iq</span>
                    <div className="iq-profile-mini__identity"><strong>Nikhil Rakesh</strong><span>Architect · Urban Designer</span></div>
                    <div className="iq-profile-mini__lines"><i /><i /><i /></div>
                  </div>
                </div>
              </div>
              <div className="iq-tap-pulse" data-tap-pulse data-active="false" aria-hidden="true" />
              <div className="iq-profile-bloom" data-profile-bloom data-active="false" aria-hidden="true">
                <p className="iq-profile-bloom__eyebrow">There you are.</p>
                <div className="iq-profile-bloom__card">
                  <div className="iq-profile-bloom__head"><span className="iq-profile-bloom__mark">iq</span><span className="iq-profile-bloom__status">LIVE IDENTITY</span></div>
                  <strong>Nikhil Rakesh</strong><span>Architect · Urban Designer</span>
                  <ul><li>Save contact <b>↗</b></li><li>Portfolio <b>↗</b></li><li>WhatsApp <b>↗</b></li><li>LinkedIn <b>↗</b></li><li>Website <b>↗</b></li></ul>
                </div>
              </div>
            </div>
            <div className="iq-opening__cue" data-opening-cue><span data-opening-label /><i aria-hidden="true" /></div>
          </div>
        </section>

        <section id="iq-object" className="iq-v3-object">
          <div className="iq-v3-section-head">
            <p className="iq-eyebrow iq-eyebrow--pink">THE OBJECT</p>
            <h2>Made to be held.<br />Designed to be remembered.</h2>
          </div>
          <div className="iq-v3-object-stage">
            <div className="iq-v3-object-card-wrap"><CardFace /></div>
            <div className="iq-v3-object-note iq-v3-object-note--a"><span>01</span><strong>PERSONALISED</strong><p>Your name. Your object.</p></div>
            <div className="iq-v3-object-note iq-v3-object-note--b"><span>02</span><strong>NFC ENABLED</strong><p>The technology stays out of sight.</p></div>
            <div className="iq-v3-object-note iq-v3-object-note--c"><span>03</span><strong>12 FINISHES</strong><p>Choose the one that feels like you.</p></div>
          </div>
        </section>

        <section id="iq-tap" className="iq-v3-tap">
          <p className="iq-eyebrow iq-eyebrow--pink">THE TAP</p>
          <h2>The technology<br />disappears.</h2>
          <div className="iq-v3-tap-line"><span className="iq-v3-tap-card"><CardFace /></span><i /><span className="iq-v3-tap-phone"><b>iq</b><small>Nikhil Rakesh<br />Architect · Urban Designer</small></span></div>
          <p className="iq-v3-center-copy">One quiet interaction. Your identity opens instantly.</p>
        </section>

        <section id="iq-identity-receive" className="iq-dark-section">
          <div className="iq-section-copy">
            <p className="iq-eyebrow iq-eyebrow--pink">THE IDENTITY</p>
            <h2>You appear.<br />Not a link page.</h2>
            <p>Your IQ profile is the digital half of the object: designed with the same care, and built to continue the introduction.</p>
          </div>
          <div className="iq-identity-demo" data-identity-demo>
            <div className="iq-identity-profile" data-identity-profile aria-label="Example IQ profile" />
            <div className="iq-feature-list" aria-label="Live IQ profile actions">
              <button type="button" data-profile-feature="contact"><strong>Save Contact</strong><span>Keep the details that matter.</span></button>
              <button type="button" data-profile-feature="portfolio"><strong>Portfolio</strong><span>Let your work continue the introduction.</span></button>
              <button type="button" data-profile-feature="message"><strong>WhatsApp</strong><span>Move naturally into conversation.</span></button>
            </div>
          </div>
        </section>

        <section id="iq-how-it-works" className="iq-v3-how">
          <p className="iq-eyebrow">HOW IT WORKS</p>
          <div className="iq-v3-how-grid">
            <article><span>01</span><h3>Design yours.</h3><p>Choose the finish and details that feel like you.</p></article>
            <article><span>02</span><h3>We make it.</h3><p>Your physical IQ Card is produced as your personal object.</p></article>
            <article><span>03</span><h3>Tap.</h3><p>Bring the card near a compatible phone. No app required.</p></article>
            <article><span>04</span><h3>You&apos;re connected.</h3><p>Your digital identity opens and the introduction continues.</p></article>
          </div>
        </section>

        <section id="iq-people" className="iq-v3-people">
          <div className="iq-v3-section-head">
            <p className="iq-eyebrow iq-eyebrow--pink">THE PEOPLE</p>
            <h2>Made for people<br />worth remembering.</h2>
          </div>
          <div className="iq-v3-people-grid">
            <article><div className="iq-v3-person-stage"><CardFace name="Nikhil Rakesh" /><div className="iq-v3-person-profile"><b>NR</b><strong>Nikhil Rakesh</strong><span>Architect · Urban Designer</span><i>iqcard.in/nikhil</i></div></div><p><span>01</span>Nikhil Rakesh</p></article>
            <article><div className="iq-v3-person-stage"><CardFace name="Yatish" finish="Bone" /><div className="iq-v3-person-profile iq-v3-person-profile--light"><b>Y</b><strong>Yatish</strong><span>Aspiring F1 Driver</span><i>iqcard.in/yatish</i></div></div><p><span>02</span>Yatish</p></article>
          </div>
        </section>

        <section id="iq-collection" className="iq-v3-collection">
          <div className="iq-v3-collection-copy">
            <p className="iq-eyebrow iq-eyebrow--pink">THE COLLECTION</p>
            <h2>Material.<br />Finish.<br />Name.<br />Detail.</h2>
            <p>Not twelve colours. Twelve starting points for something that becomes yours.</p>
            <Link className="iq-v3-text-link" href={HOME_CTA_HREF}>Explore in the Atelier <span>↗</span></Link>
          </div>
          <div className="iq-v3-finish-stage">
            <div className="iq-v3-finish-card">
              <img src={finishes[activeFinish][2]} alt="" />
              <span className="iq-v3-finish-iq">iq</span><strong>Nikhil Rakesh</strong>
            </div>
            <div className="iq-v3-finish-meta"><span>{finishes[activeFinish][0]} / 12</span><strong>{finishes[activeFinish][1]}</strong></div>
          </div>
          <div className="iq-v3-finish-rail" aria-label="IQ Card finishes">
            {finishes.map((finish, index) => <button key={finish[1]} type="button" aria-pressed={index === activeFinish} onClick={() => setActiveFinish(index)}><img src={finish[2]} alt="" /><span>{finish[0]}</span><strong>{finish[1]}</strong></button>)}
          </div>
        </section>

        <section className="iq-v3-editions">
          <p className="iq-eyebrow">IQ / EDITIONS</p>
          <h2>More than a card.<br /><em>A collectible identity.</em></h2>
          <div className="iq-v3-edition-stage">
            <div className="iq-v3-edition-card"><CardFace name="Nikhil Rakesh" serial="FOUNDING / 027" /></div>
            <div className="iq-v3-edition-copy"><span>CONCEPT / FUTURE EDITIONS</span><h3>Founding Series<br />001—100</h3><p>Some objects mean more because of when they were made, who they belonged to, and the story they carry.</p><small>NRG EDITION 01 · ARCHITECT SERIES · STUDIO EDITION</small></div>
          </div>
        </section>

        <section id="iq-atelier" className="iq-v3-atelier">
          <div className="iq-v3-atelier-copy">
            <p className="iq-eyebrow iq-eyebrow--pink">THE ATELIER</p>
            <h2>Configure<br />your identity.</h2>
            <p>Material → Finish → Name → Detail</p>
            <Link className="iq-button iq-button--light" href={HOME_CTA_HREF}>Enter the Atelier <span>→</span></Link>
          </div>
          <div className="iq-v3-atelier-stage">
            <div className="iq-v3-layer iq-v3-layer--1">MATERIAL</div><div className="iq-v3-layer iq-v3-layer--2">FINISH</div><div className="iq-v3-layer iq-v3-layer--3">NAME</div>
            <div className="iq-v3-layer iq-v3-layer--card"><CardFace /></div>
          </div>
        </section>

        <section className="iq-v3-offer">
          <p className="iq-eyebrow">IQ CARD</p>
          <h2>One card.<br />₹799. Yours.</h2>
          <div className="iq-v3-offer-grid"><span>Physical IQ Card</span><span>Personal digital profile</span><span>No app required</span><span>iPhone + Android</span><span>Shipping calculated separately</span></div>
          <Link className="iq-button iq-button--dark" href={HOME_CTA_HREF}>Create yours <span>₹799</span></Link>
        </section>

        <section id="iq-faq" className="iq-v3-faq">
          <div><p className="iq-eyebrow iq-eyebrow--pink">QUESTIONS</p><h2>Everything you<br />need to know.</h2></div>
          <div className="iq-v3-faq-list">{faqs.map(([q, a]) => <details key={q}><summary>{q}<span>+</span></summary><p>{a}</p></details>)}</div>
        </section>

        <section id="iq-final-cta" className="iq-final-section iq-v3-final">
          <div className="iq-final-section__inner"><p className="iq-eyebrow">IQ CARD</p><h2>Make your introduction<br />unmistakably yours.</h2><Link className="iq-button iq-button--dark" href={HOME_CTA_HREF}>Create yours <span>₹799</span></Link></div>
          <div className="iq-final-footnote"><span>Physical.</span><span>Digital.</span><span>Yours.</span><small>Designed by NRG STUDIO</small></div>
        </section>
      </main>
    </div>
  )
}

const v3Css = `
.iq-v3 { --v3-gutter:clamp(22px,4.7vw,76px); --v3-max:1600px; }
.iq-v3 .iq-nav__actions{justify-self:end;display:flex;align-items:center;gap:9px}.iq-v3 .iq-nav__actions .iq-button span{margin-left:10px;opacity:.55}
.iq-v3-kicker{margin:0 0 18px;font-size:9px;font-weight:700;letter-spacing:.18em;color:#8b8b91}.iq-v3-hero-actions{display:flex;align-items:center;gap:24px}.iq-v3-text-link{display:inline-flex;gap:10px;align-items:center;font-size:12px;font-weight:650}.iq-v3-text-link span{transition:transform .25s var(--iq-ease)}.iq-v3-text-link:hover span{transform:translate(3px,-2px)}.iq-v3-proof{display:flex;align-items:center;gap:9px;margin:22px 0 0;color:#8c8c91;font-size:9px;letter-spacing:.04em}.iq-v3-proof i{width:2px;height:2px;border-radius:50%;background:#bbb}
.iq-v3 section:not(.iq-opening){padding-left:var(--v3-gutter);padding-right:var(--v3-gutter)}.iq-v3-section-head{max-width:1100px}.iq-v3-section-head h2,.iq-v3-object h2,.iq-v3-tap h2,.iq-v3-how h2,.iq-v3-people h2,.iq-v3-collection h2,.iq-v3-editions h2,.iq-v3-atelier h2,.iq-v3-offer h2,.iq-v3-faq h2{margin:0;font-size:clamp(58px,7vw,116px);line-height:.88;letter-spacing:-.072em;font-weight:600}
.iq-v3-object{min-height:125svh;padding-top:150px;padding-bottom:120px;background:#f4f3f0;overflow:hidden}.iq-v3-object-stage{position:relative;min-height:720px;margin-top:60px}.iq-v3-object-card-wrap{position:absolute;width:min(62vw,920px);left:50%;top:50%;transform:translate(-50%,-45%) rotate(-4deg);filter:drop-shadow(0 50px 55px rgba(0,0,0,.14))}.iq-v3-card{position:relative;aspect-ratio:1.586;border-radius:clamp(20px,3vw,42px);overflow:hidden;background:linear-gradient(120deg,#08080a,#242427 48%,#0b0b0d);box-shadow:inset 0 1px rgba(255,255,255,.14),inset 0 0 0 1px rgba(255,255,255,.05);color:#f7f7f5}.iq-v3-card:after{content:"";position:absolute;inset:0;background:radial-gradient(circle at 28% 16%,rgba(255,255,255,.12),transparent 24%),repeating-linear-gradient(104deg,rgba(255,255,255,.018) 0 1px,transparent 1px 8px);pointer-events:none}.iq-v3-card__mark{position:absolute;left:6%;top:9%;font-size:clamp(30px,4vw,58px);font-weight:700;letter-spacing:-.12em}.iq-v3-card>strong{position:absolute;left:6%;bottom:10%;font-size:clamp(24px,4.3vw,66px);letter-spacing:-.065em;line-height:.9}.iq-v3-card>small{position:absolute;right:6%;top:11%;font-size:9px;letter-spacing:.16em}.iq-v3-card[data-finish="bone"]{background:linear-gradient(120deg,#e8e2d8,#fffdf7 50%,#ddd4c6);color:#161616}.iq-v3-object-note{position:absolute;max-width:180px;border-top:1px solid rgba(17,17,19,.22);padding-top:12px}.iq-v3-object-note span{font-size:9px;color:#8c8c91}.iq-v3-object-note strong{display:block;margin:8px 0;font-size:10px;letter-spacing:.13em}.iq-v3-object-note p{margin:0;font-size:12px;line-height:1.5;color:#6d6d72}.iq-v3-object-note--a{left:2%;top:23%}.iq-v3-object-note--b{right:1%;top:40%}.iq-v3-object-note--c{left:8%;bottom:4%}
.iq-v3-tap{min-height:100svh;padding-top:150px;padding-bottom:130px;background:#fff;text-align:center;display:flex;flex-direction:column;align-items:center;justify-content:center}.iq-v3-tap h2{font-size:clamp(64px,8vw,132px)}.iq-v3-tap-line{width:min(950px,86vw);height:300px;margin:70px auto 28px;display:grid;grid-template-columns:1fr 130px 1fr;align-items:center}.iq-v3-tap-line>i{height:1px;background:linear-gradient(90deg,transparent,var(--iq-pink),transparent);box-shadow:0 0 20px rgba(255,79,154,.32);animation:iqV3Pulse 3.4s ease-in-out infinite}.iq-v3-tap-card{display:block;transform:rotate(-8deg)}.iq-v3-tap-phone{justify-self:center;width:180px;aspect-ratio:.5;border:7px solid #151517;border-radius:34px;background:#f7f7f7;box-shadow:0 30px 55px rgba(0,0,0,.14);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:30px}.iq-v3-tap-phone b{font-size:28px;letter-spacing:-.12em}.iq-v3-tap-phone small{font-size:10px;line-height:1.5}.iq-v3-center-copy{color:#737379;font-size:13px}
.iq-v3-how{padding-top:150px;padding-bottom:150px;background:#fff}.iq-v3-how>.iq-eyebrow{margin-bottom:70px}.iq-v3-how-grid{display:grid;grid-template-columns:repeat(4,1fr);border-top:1px solid var(--iq-line)}.iq-v3-how article{min-height:320px;padding:25px 28px 20px 0;border-right:1px solid var(--iq-line)}.iq-v3-how article+article{padding-left:28px}.iq-v3-how article span{font-size:10px;color:#999}.iq-v3-how h3{margin:100px 0 16px;font-size:clamp(27px,2.6vw,44px);letter-spacing:-.05em}.iq-v3-how article p{max-width:240px;margin:0;color:#777;font-size:13px;line-height:1.55}
.iq-v3-people{padding-top:150px;padding-bottom:160px;background:#f5f5f3}.iq-v3-people-grid{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-top:80px}.iq-v3-people-grid article>p{display:flex;gap:18px;margin:14px 0 0;font-size:11px}.iq-v3-people-grid article>p span{color:#aaa}.iq-v3-person-stage{position:relative;min-height:650px;overflow:hidden;background:#e7e5df}.iq-v3-person-stage>.iq-v3-card{position:absolute;width:62%;left:8%;top:14%;transform:rotate(-7deg);box-shadow:0 35px 70px rgba(0,0,0,.17)}.iq-v3-person-profile{position:absolute;right:8%;bottom:8%;width:42%;min-height:55%;padding:34px 26px;border-radius:28px;background:#0b0b0c;color:#fff;box-shadow:0 30px 60px rgba(0,0,0,.18);display:flex;flex-direction:column}.iq-v3-person-profile b{width:48px;height:48px;border-radius:50%;display:grid;place-items:center;background:#242426;font-size:12px}.iq-v3-person-profile strong{margin-top:auto;font-size:24px;letter-spacing:-.04em}.iq-v3-person-profile span{margin-top:7px;color:#aaa;font-size:11px}.iq-v3-person-profile i{margin-top:28px;font-style:normal;color:var(--iq-pink);font-size:9px}.iq-v3-person-profile--light{background:#fff;color:#111}.iq-v3-person-profile--light b{background:#eee}
.iq-v3-collection{padding-top:160px;padding-bottom:120px;background:#fff;display:grid;grid-template-columns:.72fr 1.28fr;gap:60px;overflow:hidden}.iq-v3-collection-copy{align-self:center}.iq-v3-collection-copy>p:not(.iq-eyebrow){max-width:360px;margin:34px 0;color:#737379;line-height:1.6}.iq-v3-finish-stage{position:relative;min-height:680px;display:grid;place-items:center}.iq-v3-finish-card{position:relative;width:min(48vw,720px);aspect-ratio:1.586;border-radius:36px;overflow:hidden;box-shadow:0 48px 90px rgba(0,0,0,.18);transform:rotate(-5deg);transition:transform .65s var(--iq-ease)}.iq-v3-finish-card:hover{transform:rotate(-2deg) translateY(-8px)}.iq-v3-finish-card img{position:absolute;width:100%;height:100%;object-fit:cover}.iq-v3-finish-iq,.iq-v3-finish-card>strong{position:absolute;z-index:2;color:#fff;text-shadow:0 1px 8px rgba(0,0,0,.28)}.iq-v3-finish-iq{left:6%;top:9%;font-size:48px;font-weight:700;letter-spacing:-.12em}.iq-v3-finish-card>strong{left:6%;bottom:10%;font-size:clamp(28px,4vw,58px);letter-spacing:-.06em}.iq-v3-finish-meta{position:absolute;right:4%;bottom:8%;display:grid;text-align:right;gap:7px}.iq-v3-finish-meta span{font-size:9px;color:#999}.iq-v3-finish-meta strong{font-size:13px}.iq-v3-finish-rail{grid-column:1/-1;display:flex;gap:9px;overflow-x:auto;padding:22px 0 8px;scrollbar-width:none}.iq-v3-finish-rail::-webkit-scrollbar{display:none}.iq-v3-finish-rail button{flex:0 0 132px;padding:0 0 12px;border:0;border-bottom:1px solid var(--iq-line);background:none;text-align:left;cursor:pointer;opacity:.45;transition:opacity .25s,transform .25s}.iq-v3-finish-rail button[aria-pressed="true"]{opacity:1;transform:translateY(-4px);border-bottom-color:#111}.iq-v3-finish-rail img{width:100%;height:72px;object-fit:cover;margin-bottom:10px}.iq-v3-finish-rail span{display:block;font-size:8px;color:#aaa}.iq-v3-finish-rail strong{font-size:10px}
.iq-v3-editions{padding-top:150px;padding-bottom:160px;background:#0a0a0b;color:#fff}.iq-v3-editions h2{font-size:clamp(60px,8vw,126px)}.iq-v3-editions h2 em{font-style:normal;color:#606064}.iq-v3-edition-stage{display:grid;grid-template-columns:1.2fr .8fr;gap:8vw;align-items:center;margin-top:100px}.iq-v3-edition-card{transform:rotate(6deg)}.iq-v3-edition-copy>span{font-size:9px;color:var(--iq-pink);letter-spacing:.16em}.iq-v3-edition-copy h3{font-size:clamp(38px,4vw,66px);line-height:.95;letter-spacing:-.055em}.iq-v3-edition-copy p{max-width:420px;color:#9a9a9f;line-height:1.65}.iq-v3-edition-copy small{display:block;margin-top:60px;color:#55555a;font-size:8px;letter-spacing:.13em}
.iq-v3-atelier{min-height:110svh;padding-top:150px;padding-bottom:140px;background:#080809;color:#fff;display:grid;grid-template-columns:.75fr 1.25fr;align-items:center;overflow:hidden}.iq-v3-atelier-copy h2{font-size:clamp(72px,8vw,132px)}.iq-v3-atelier-copy>p:not(.iq-eyebrow){margin:30px 0 44px;color:#777;letter-spacing:.08em;font-size:11px}.iq-button--light{background:#fff;color:#111}.iq-v3-atelier-stage{position:relative;min-height:680px;perspective:1300px}.iq-v3-layer{position:absolute;left:50%;top:50%;width:min(44vw,650px);aspect-ratio:1.586;border:1px solid rgba(255,255,255,.18);border-radius:32px;display:grid;place-items:center;font-size:9px;letter-spacing:.18em;color:#777;transition:transform .8s var(--iq-ease)}.iq-v3-layer--1{transform:translate(-50%,-50%) translate3d(-100px,-85px,-90px) rotate(-8deg)}.iq-v3-layer--2{transform:translate(-50%,-50%) translate3d(-32px,-30px,-30px) rotate(-3deg)}.iq-v3-layer--3{transform:translate(-50%,-50%) translate3d(42px,28px,30px) rotate(3deg)}.iq-v3-layer--card{border:0;transform:translate(-50%,-50%) translate3d(110px,90px,100px) rotate(8deg)}.iq-v3-atelier:hover .iq-v3-layer--1{transform:translate(-50%,-50%) translate3d(-45px,-40px,-45px) rotate(-4deg)}.iq-v3-atelier:hover .iq-v3-layer--2{transform:translate(-50%,-50%) translate3d(-16px,-14px,-15px) rotate(-2deg)}.iq-v3-atelier:hover .iq-v3-layer--3{transform:translate(-50%,-50%) translate3d(16px,14px,15px) rotate(2deg)}.iq-v3-atelier:hover .iq-v3-layer--card{transform:translate(-50%,-50%) translate3d(45px,40px,45px) rotate(4deg)}
.iq-v3-offer{padding-top:170px;padding-bottom:170px;background:#f3f2ef}.iq-v3-offer h2{font-size:clamp(72px,9vw,145px)}.iq-v3-offer-grid{max-width:820px;margin:60px 0 50px;display:grid;grid-template-columns:1fr 1fr;border-top:1px solid rgba(17,17,19,.15)}.iq-v3-offer-grid span{padding:18px 0;border-bottom:1px solid rgba(17,17,19,.15);font-size:11px}.iq-v3-offer-grid span:nth-child(even){padding-left:30px;border-left:1px solid rgba(17,17,19,.15)}
.iq-v3-faq{padding-top:150px;padding-bottom:160px;background:#fff;display:grid;grid-template-columns:.8fr 1.2fr;gap:8vw}.iq-v3-faq h2{font-size:clamp(54px,6vw,94px)}.iq-v3-faq-list{border-top:1px solid var(--iq-line)}.iq-v3-faq details{border-bottom:1px solid var(--iq-line)}.iq-v3-faq summary{min-height:78px;display:flex;align-items:center;justify-content:space-between;gap:20px;cursor:pointer;font-size:15px;list-style:none}.iq-v3-faq summary::-webkit-details-marker{display:none}.iq-v3-faq summary span{font-size:20px;font-weight:300;transition:transform .25s}.iq-v3-faq details[open] summary span{transform:rotate(45deg)}.iq-v3-faq details p{max-width:600px;margin:0;padding:0 50px 28px 0;color:#777;font-size:13px;line-height:1.6}.iq-v3-final{padding-top:120px!important;padding-bottom:30px!important}
@keyframes iqV3Pulse{0%,100%{opacity:.28;transform:scaleX(.5)}50%{opacity:1;transform:scaleX(1)}}
@media(max-width:900px){.iq-v3-people-grid,.iq-v3-collection,.iq-v3-edition-stage,.iq-v3-atelier,.iq-v3-faq{grid-template-columns:1fr}.iq-v3-how-grid{grid-template-columns:1fr 1fr}.iq-v3-object-stage{min-height:600px}.iq-v3-person-stage{min-height:580px}.iq-v3-collection{gap:30px}.iq-v3-finish-stage{min-height:560px}.iq-v3-finish-card{width:min(82vw,680px)}.iq-v3-atelier-stage{min-height:580px}.iq-v3-layer{width:min(76vw,620px)}}
@media(max-width:700px){.iq-v3 .iq-nav__actions .iq-button--secondary{display:none}.iq-v3 .iq-nav__actions .iq-button{font-size:10px;padding:0 13px}.iq-v3-kicker{display:none}.iq-v3-hero-actions{align-items:flex-start;flex-direction:column;gap:14px}.iq-v3-proof{max-width:270px;flex-wrap:wrap}.iq-v3-object{min-height:auto;padding-top:110px;padding-bottom:90px}.iq-v3-object-stage{min-height:520px;margin-top:30px}.iq-v3-object-card-wrap{width:92vw;left:55%;top:45%}.iq-v3-object-note{max-width:140px}.iq-v3-object-note--a{top:4%;left:0}.iq-v3-object-note--b{top:auto;bottom:2%;right:0}.iq-v3-object-note--c{display:none}.iq-v3-tap{padding-top:110px;padding-bottom:100px}.iq-v3-tap-line{height:350px;width:100%;grid-template-columns:1fr 40px 1fr;margin-top:30px}.iq-v3-tap-phone{width:120px;border-radius:25px}.iq-v3-center-copy{max-width:250px}.iq-v3-how{padding-top:100px;padding-bottom:100px}.iq-v3-how>.iq-eyebrow{margin-bottom:35px}.iq-v3-how-grid{grid-template-columns:1fr}.iq-v3-how article{min-height:190px;border-right:0;border-bottom:1px solid var(--iq-line);padding:20px 0!important}.iq-v3-how h3{margin:55px 0 10px}.iq-v3-people{padding-top:100px;padding-bottom:100px}.iq-v3-people-grid{margin-top:45px}.iq-v3-person-stage{min-height:480px}.iq-v3-person-stage>.iq-v3-card{width:78%;left:2%;top:10%}.iq-v3-person-profile{width:54%;right:4%;bottom:5%;min-height:52%;padding:24px 18px;border-radius:22px}.iq-v3-person-profile strong{font-size:18px}.iq-v3-collection{padding-top:105px;padding-bottom:85px}.iq-v3-finish-stage{min-height:430px}.iq-v3-finish-card{width:88vw;border-radius:24px}.iq-v3-finish-meta{bottom:1%}.iq-v3-finish-rail{margin-right:-22px;padding-right:22px}.iq-v3-finish-rail button{flex-basis:105px}.iq-v3-editions{padding-top:100px;padding-bottom:100px}.iq-v3-edition-stage{margin-top:55px;gap:65px}.iq-v3-edition-card{width:105%;margin-left:-10%;}.iq-v3-atelier{min-height:auto;padding-top:110px;padding-bottom:100px}.iq-v3-atelier-stage{min-height:430px}.iq-v3-layer{width:84vw;border-radius:22px}.iq-v3-offer{padding-top:110px;padding-bottom:110px}.iq-v3-offer-grid{grid-template-columns:1fr}.iq-v3-offer-grid span:nth-child(even){padding-left:0;border-left:0}.iq-v3-faq{padding-top:100px;padding-bottom:110px;gap:55px}.iq-v3-faq summary{min-height:72px;font-size:13px}.iq-v3-section-head h2,.iq-v3-object h2,.iq-v3-tap h2,.iq-v3-how h2,.iq-v3-people h2,.iq-v3-collection h2,.iq-v3-editions h2,.iq-v3-atelier h2,.iq-v3-offer h2,.iq-v3-faq h2{font-size:clamp(50px,14vw,70px)}}
@media(prefers-reduced-motion:reduce){.iq-v3 *{animation:none!important;transition-duration:.001ms!important}}
`
