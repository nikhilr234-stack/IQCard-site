import Link from 'next/link'
import Script from 'next/script'
import { HOME_CTA_HREF, HOME_NAV_ITEMS } from '@/lib/landing/homepage-content'
import { landingStyles } from './landing-styles'

const landingCss = landingStyles.replace(/^\s*<style>/, '').replace(/<\/style>\s*$/, '')

export function LandingPage() {
  return (
    <div className="iq-landing-page">
      <style dangerouslySetInnerHTML={{ __html: landingCss }} />
      <style>{`
        .iq-material-native-section { min-height:105svh; display:grid; align-content:center; border-top:1px solid var(--iq-line); background:#fff; }
        .iq-material-native-grid { width:100%; display:grid; grid-template-columns:minmax(420px,.78fr) minmax(620px,1.22fr); align-items:center; gap:clamp(48px,6vw,100px); }
        .iq-material-native-copy h2 { margin:0; font-size:clamp(72px,7vw,112px); line-height:.86; letter-spacing:-.075em; font-weight:650; }
        .iq-material-native-copy .iq-text-link { margin-top:54px; }
        .iq-opening__copy .iq-button { margin-top: 28px; }
        .iq-opening__cta { gap: 10px; }
        .iq-material-native-visual { position:relative; min-height:640px; overflow:hidden; border:0; border-radius:0; background:transparent; }
        .iq-material-native-visual::after { content:""; position:absolute; left:8%; right:8%; bottom:8%; height:20%; background:radial-gradient(ellipse,rgba(0,0,0,.20),transparent 68%); filter:blur(27px); pointer-events:none; }
        .iq-material-native-card { position:absolute; width:42%; aspect-ratio:1.586; border-radius:25px; border:1px solid rgba(0,0,0,.12); box-shadow:0 28px 44px rgba(0,0,0,.16), inset 0 1px 0 rgba(255,255,255,.30); }
        .iq-material-native-card span { position:absolute; inset:0; border-radius:inherit; opacity:.24; background:repeating-linear-gradient(105deg,rgba(255,255,255,.1) 0 1px,transparent 1px 9px); }
        .iq-material-native-card--walnut { left:0%; top:56%; transform:rotate(-6deg); background:linear-gradient(120deg,#663119,#b5763e 45%,#6a341d); z-index:4; }
        .iq-material-native-card--black { left:18%; top:42%; transform:rotate(5deg); background:linear-gradient(120deg,#09090a,#27272a 48%,#101012); z-index:3; }
        .iq-material-native-card--terracotta { left:36%; top:29%; transform:rotate(10deg); background:linear-gradient(120deg,#823124,#b5553c 48%,#8b3528); z-index:2; }
        .iq-material-native-card--travertine { left:54%; top:14%; transform:rotate(14deg); background:linear-gradient(120deg,#bbaa91,#e1d2bc 48%,#c6b59c); z-index:1; }
        @media (max-width:900px) { .iq-material-native-grid { grid-template-columns:1fr; } .iq-material-native-visual { min-height:560px; } }
        @media (max-width:560px) { .iq-material-native-section { padding-top:90px; padding-bottom:90px; } .iq-material-native-copy h2 { font-size:clamp(58px,15vw,78px); } .iq-material-native-visual { min-height:420px; } .iq-material-native-card { width:52%; border-radius:18px; } }
      `}</style>
      <style>{`
        .iq-landing-page > main[data-iq-home] { width: 100%; max-width: none; margin: 0; padding: 0; }
        .iq-nav__actions { justify-self: end; display: flex; align-items: center; gap: 10px; }
        .iq-button--secondary { border: 1px solid var(--iq-line); background: rgba(255,255,255,.56); color: var(--iq-ink); }
        .iq-nav[data-nav-theme="dark"] .iq-button--secondary { border-color: rgba(255,255,255,.24); background: rgba(255,255,255,.06); color: #fff; }
        @media (max-width: 560px) {
          .iq-nav__actions { gap: 6px; }
          .iq-nav__actions .iq-button { min-height: 44px; padding: 0 13px; font-size: 10px; }
        }
      `}</style>
      <Script src="/landing.js" strategy="afterInteractive" />

      <header className="iq-nav" data-nav>
        <Link className="iq-nav__brand" data-iq-brand="primary" href="/" aria-label="IQ Card home">iq</Link>
        <nav className="iq-nav__links" aria-label="Primary navigation">
          {HOME_NAV_ITEMS.map((item) => <a key={item.href} href={item.href}>{item.label}</a>)}
        </nav>
        <div className="iq-nav__actions">
          <Link className="iq-button iq-button--secondary" href="/login">Log in</Link>
          <Link className="iq-button iq-button--dark" href={HOME_CTA_HREF}>Get your IQ Card</Link>
        </div>
      </header>

      <main data-iq-home>
        <section id="iq-opening-scene" className="iq-opening" data-opening-scene data-opening-phase="intrigue">
          <div className="iq-opening__sticky">
            <div className="iq-opening__atmosphere" aria-hidden="true" />
            <div className="iq-opening__copy" data-opening-copy>
              <h1>An introduction,<br />redesigned.</h1>
              <p className="iq-opening__subcopy">A premium physical card that opens your digital identity with one tap.</p>
              <Link className="iq-button iq-button--dark iq-opening__cta" href={HOME_CTA_HREF}>Get your IQ Card <span aria-hidden="true">→</span></Link>
            </div>

            <div className="iq-stage" aria-label="IQ Card tap demonstration">
              <div id="iq-card-host" className="iq-card-host" data-card-host />

              <div className="iq-phone" data-phone aria-hidden="true">
                <div className="iq-phone__hardware" />
                <div className="iq-phone__screen">
                  <div className="iq-phone__island" />
                  <div className="iq-profile-mini" data-profile-mini>
                    <span className="iq-profile-mini__mark">iq</span>
                    <div className="iq-profile-mini__identity">
                      <strong>Nikhil Rakesh</strong>
                      <span>Architect · Urban Designer</span>
                    </div>
                    <div className="iq-profile-mini__lines"><i /><i /><i /></div>
                  </div>
                </div>
              </div>

              <div className="iq-tap-pulse" data-tap-pulse data-active="false" aria-hidden="true" />

              <div className="iq-profile-bloom" data-profile-bloom data-active="false" aria-hidden="true">
                <p className="iq-profile-bloom__eyebrow">There you are.</p>
                <div className="iq-profile-bloom__card">
                  <div className="iq-profile-bloom__head">
                    <span className="iq-profile-bloom__mark">iq</span>
                    <span className="iq-profile-bloom__status">LIVE IDENTITY</span>
                  </div>
                  <strong>Nikhil Rakesh</strong>
                  <span>Architect · Urban Designer</span>
                  <ul>
                    <li>Save contact <b>↗</b></li>
                    <li>Portfolio <b>↗</b></li>
                    <li>WhatsApp <b>↗</b></li>
                    <li>LinkedIn <b>↗</b></li>
                    <li>Website <b>↗</b></li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="iq-opening__cue" data-opening-cue>
              <span data-opening-label />
              <i aria-hidden="true" />
            </div>
          </div>
        </section>

        <section id="iq-identity-receive" className="iq-dark-section">
          <div className="iq-section-copy">
            <p className="iq-eyebrow iq-eyebrow--pink">WHAT PEOPLE SEE</p>
            <h2>A digital profile that<br />actually looks premium.</h2>
            <p>Most digital cards feel generic. IQ Card is designed to feel intentional, elevated, and fast.</p>
          </div>

          <div className="iq-identity-demo" data-identity-demo>
            <div className="iq-identity-profile" data-identity-profile aria-label="Example IQ profile" />
            <div className="iq-feature-list" aria-label="Live IQ profile actions">
              <button type="button" data-profile-feature="contact"><strong>Save Contact</strong><span>One tap and they keep the details that matter.</span></button>
              <button type="button" data-profile-feature="portfolio"><strong>Portfolio</strong><span>Let the right work continue the introduction.</span></button>
              <button type="button" data-profile-feature="message"><strong>Message</strong><span>Move naturally from meeting to conversation.</span></button>
              <button type="button" data-profile-feature="book"><strong>Book</strong><span>Turn attention into a meeting while it is still fresh.</span></button>
              <button type="button" data-profile-feature="pay"><strong>Pay</strong><span>When action matters, remove the extra steps.</span></button>
            </div>
          </div>
        </section>

        <section id="iq-sharing" className="iq-sharing-section">
          <div className="iq-sharing-heading">
            <p className="iq-eyebrow iq-eyebrow--pink">YOUR IDENTITY, READY TO MOVE</p>
            <h2>However you meet,<br />IQ goes with you.</h2>
          </div>

          <div className="iq-sharing-modes" role="tablist" aria-label="Ways to share your IQ identity">
            <button type="button" role="tab" aria-selected="true" data-share-mode="tap"><strong>Tap</strong><span>NFC card to phone.</span></button>
            <button type="button" role="tab" aria-selected="false" data-share-mode="scan"><strong>Scan</strong><span>QR when tapping is not convenient.</span></button>
            <button type="button" role="tab" aria-selected="false" data-share-mode="send"><strong>Send</strong><span>Your personal IQ URL anywhere.</span></button>
            <button type="button" role="tab" aria-selected="false" data-share-mode="save"><strong>Save</strong><span>Your details become a contact.</span></button>
          </div>
          <div className="iq-sharing-visual" data-sharing-visual aria-live="polite" />
          <div className="iq-proof-line" aria-label="IQ Card essentials">
            <span>No app required</span>
            <span>Always updated</span>
            <span>iPhone + Android</span>
          </div>
        </section>

        <section id="iq-customize-tease" className="iq-customize-section iq-material-native-section">
          <div className="iq-material-native-grid">
            <div className="iq-material-native-copy">
              <p className="iq-eyebrow iq-eyebrow--pink">YOUR CARD</p>
              <h2>Material.<br />Finish.<br />Name.<br />Detail.</h2>
              <Link className="iq-text-link" href={HOME_CTA_HREF}>Design yours <span aria-hidden="true">→</span></Link>
            </div>
            <div className="iq-material-native-visual" aria-label="Four IQ Card material samples">
              <div className="iq-material-native-card iq-material-native-card--walnut"><span /></div>
              <div className="iq-material-native-card iq-material-native-card--black"><span /></div>
              <div className="iq-material-native-card iq-material-native-card--terracotta"><span /></div>
              <div className="iq-material-native-card iq-material-native-card--travertine"><span /></div>
            </div>
          </div>
        </section>

        <section id="iq-final-cta" className="iq-final-section">
          <div className="iq-final-section__inner">
            <p className="iq-eyebrow">IQ CARD</p>
            <h2>Make your introduction<br />unmistakably yours.</h2>
            <Link className="iq-button iq-button--dark" href={HOME_CTA_HREF}>Get your IQ Card</Link>
          </div>
          <div className="iq-final-footnote"><span>Physical.</span><span>Digital.</span><span>Yours.</span></div>
        </section>
      </main>
    </div>
  )
}
