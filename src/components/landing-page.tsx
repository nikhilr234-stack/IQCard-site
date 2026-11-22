import Image from 'next/image'
import Link from 'next/link'
import { FiArrowDown, FiArrowRight, FiArrowUpRight, FiCheck, FiLink, FiPlus, FiRadio, FiUserPlus } from 'react-icons/fi'
import { HOME_CTA_HREF, HOME_NAV_ITEMS, HOME_FAQS } from '@/lib/landing/homepage-content'
import { CARD_BASE_PRICE } from '@/lib/customizer/card-configuration'
import { LandingMaterials } from './landing-materials'
import styles from './landing-page.module.css'

const price = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(CARD_BASE_PRICE)

function DesignLink({ light = false }: { light?: boolean }) {
  return <Link className={`${styles.button} ${light ? styles.buttonLight : ''}`} href={HOME_CTA_HREF}>Design your card <FiArrowUpRight aria-hidden="true" /></Link>
}

export function LandingPage() {
  return (
    <div className={styles.page}>
      <a className={styles.skip} href="#main-content">Skip to content</a>
      <header className={styles.header}>
        <div className={`${styles.container} ${styles.nav}`}>
          <Link href="/" className={styles.brand} aria-label="IQ Card home">iq</Link>
          <nav className={styles.navLinks} aria-label="Main navigation">{HOME_NAV_ITEMS.map(item => <a key={item.href} href={item.href}>{item.label}</a>)}</nav>
          <div className={styles.navActions}><Link className={styles.login} href="/login">Log in</Link><DesignLink /></div>
        </div>
      </header>
      <main id="main-content" className={styles.main}>
        <section id="iq-opening-scene" className={`${styles.container} ${styles.hero}`} aria-labelledby="home-heading">
          <div className={styles.heroCopy}>
            <p className={styles.category}>The NFC business card</p>
            <h1 id="home-heading">Your business card.<br /><span>One tap.</span><br />Everything shared.</h1>
            <p className={styles.heroDescription}>A personalised card that opens your contact details, portfolio and social links on someone’s phone.</p>
            <div className={styles.heroActions}><DesignLink /><a className={styles.textLink} href="#how-it-works">See how it works <FiArrowDown aria-hidden="true" /></a></div>
            <p className={styles.price}><strong>{price}</strong><span>Your card. Your digital profile.</span></p>
            <p className={styles.heroNote}>Tap to share. No app needed to view your profile.</p>
          </div>
          <figure className={styles.heroVisual}>
            <p className={styles.tapNote}><i aria-hidden="true" /> A tap opens your profile.</p>
            <Image src="/homepage/card-and-profile.webp" alt="Illustration of a personalised walnut-finish IQ Card beside a phone showing contact details, a portfolio and social links" width={1254} height={1254} sizes="(max-width: 760px) 100vw, 52vw" preload />
            <figcaption>Illustrative card &amp; profile</figcaption>
          </figure>
        </section>
        <section id="how-it-works" className={styles.stepsSection} aria-labelledby="steps-heading">
          <div className={`${styles.container} ${styles.steps}`}>
            <div><h2 id="steps-heading">One card.<br />Three simple steps.</h2><p>Made for the moment you meet.</p></div>
            <ol>
              <li><span>01</span><div><h3>Make it yours</h3><p>Choose a finish.<br />Add your name.</p></div></li>
              <li><span>02</span><div><h3>Tap to share</h3><p>They tap your card<br />with their phone.</p></div></li>
              <li><span>03</span><div><h3>Stay connected</h3><p>They save your details<br />and explore your links.</p></div></li>
            </ol>
          </div>
        </section>
        <section className={`${styles.container} ${styles.included}`} aria-labelledby="included-heading">
          <div className={styles.sectionHeading}><h2 id="included-heading">A physical card.<br /><span>A profile that stays current.</span></h2><p>A considered object for the first hello. A digital home for everything that comes after.</p></div>
          <div className={styles.includedGrid}>
            <div className={styles.includedCard}>
              <div className={styles.flatCard} aria-label="Example black IQ Card"><span className={styles.cardMark}>iq</span><strong>Nikhil Rakesh</strong><FiRadio aria-hidden="true" /></div>
              <div className={styles.includedCaption}><span>In your pocket</span><h3>Your personalised NFC card</h3><p>Your name, your chosen finish, ready to share your profile when you meet someone.</p></div>
            </div>
            <div className={styles.includedProfile}>
              <div className={styles.profileSlip} aria-label="Example digital profile links"><div><span>iqcard.in/yourname</span><FiLink aria-hidden="true" /></div><strong>Your work.<br />Your details.<br />Your next connection.</strong><p><FiUserPlus aria-hidden="true" /> Save contact <FiArrowUpRight aria-hidden="true" /></p></div>
              <div className={styles.includedCaption}><span>On their phone</span><h3>Your editable digital profile</h3><p>Contact details, portfolio and social links in one place. Update your profile as your world changes.</p></div>
            </div>
          </div>
          <p className={styles.includedFootnote}><FiCheck aria-hidden="true" /> The card and digital profile work together. <span>Designed to keep the introduction simple.</span></p>
        </section>
        <section id="iq-customize-tease" className={styles.materialSection} aria-labelledby="materials-heading">
          <div className={`${styles.container} ${styles.materialLayout}`}>
            <div className={styles.materialIntro}><h2 id="materials-heading">Feels like you.<br /><span>Before the first tap.</span></h2><p>Quiet black. Warm walnut. A little terracotta. Find a finish that belongs in your pocket.</p><p>Twelve finishes. Your name. One unmistakably personal card.</p><a className={styles.textLink} href={HOME_CTA_HREF}>Open the card designer <FiArrowUpRight aria-hidden="true" /></a></div>
            <LandingMaterials />
          </div>
        </section>
        <section id="iq-identity-receive" className={styles.profileSection} aria-labelledby="profile-heading">
          <div className={`${styles.container} ${styles.profileLayout}`}>
            <div className={styles.profileStage}>
              <article className={styles.demoProfile} aria-label="Illustrative digital profile">
                <div className={styles.demoCover}><span>iq</span><span>EXAMPLE PROFILE</span></div>
                <div className={styles.demoIdentity}><span className={styles.initials} aria-hidden="true">NR</span><h3>Nikhil Rakesh</h3><p>Architect · Urban Designer</p><p>Bengaluru, India</p></div>
                <Link className={styles.demoSave} href="https://iqcard.in/nikhil"><FiUserPlus aria-hidden="true" /> Explore the live profile <FiArrowUpRight aria-hidden="true" /></Link>
                <div className={styles.demoLinks}><span>Portfolio <FiArrowUpRight aria-hidden="true" /></span><span>WhatsApp <FiArrowUpRight aria-hidden="true" /></span><span>LinkedIn <FiArrowUpRight aria-hidden="true" /></span></div>
                <p className={styles.demoUrl}>One link. A fuller introduction.</p>
              </article>
              <span className={styles.profileAnnotation}>This is where the conversation continues.</span>
            </div>
            <div className={styles.profileCopy}><h2 id="profile-heading">The card opens<br />the door.<br /><span>Your profile<br />does the rest.</span></h2><p>Give someone more than a name and a number. Let them see your work, find the right link and keep your details.</p><ul><li><FiCheck aria-hidden="true" /> Contact details they can save</li><li><FiCheck aria-hidden="true" /> Your portfolio, website and social links</li><li><FiCheck aria-hidden="true" /> A profile you can edit from your dashboard</li><li><FiCheck aria-hidden="true" /> Your own shareable IQ Card URL</li></ul><Link className={styles.textLink} href="https://iqcard.in/nikhil">Explore a live profile <FiArrowUpRight aria-hidden="true" /></Link></div>
          </div>
        </section>
        <section id="iq-sharing" className={`${styles.container} ${styles.sharing}`} aria-labelledby="sharing-heading">
          <div className={styles.sharingHeading}><h2 id="sharing-heading">Good introductions<br /><span>travel in more ways.</span></h2><p>Across the table or across the internet. Your profile goes where the conversation does.</p></div>
          <div className={styles.sharingGrid}>
            <article><div className={styles.shareSymbol}><FiRadio aria-hidden="true" /></div><h3>Tap.</h3><p>Hold your card near the NFC reader on a compatible phone. They open the notification to view your profile.</p><span>For the in-person hello</span></article>
            <article><div className={styles.shareSymbol}><FiUserPlus aria-hidden="true" /></div><h3>Save.</h3><p>They can save your contact details from your profile, so your name and number stay close after the meeting.</p><span>For the follow-up that matters</span></article>
            <article><div className={styles.shareSymbol}><FiLink aria-hidden="true" /></div><h3>Send.</h3><p>Paste your personal IQ Card link into a message, email signature or social bio. Your profile is a click away.</p><span>For every hello online</span></article>
          </div>
          <p className={styles.compatibility}>NFC sharing requires a compatible NFC-enabled phone. Your profile link offers another way to connect.</p>
        </section>
        <section className={styles.faqSection} aria-labelledby="faq-heading">
          <div className={`${styles.container} ${styles.faqLayout}`}><div><h2 id="faq-heading">A few things<br /><span>worth knowing.</span></h2><p>A little clarity before your first card.</p></div><div className={styles.faqs}>{HOME_FAQS.map(faq => <details key={faq.question}><summary>{faq.question}<FiPlus aria-hidden="true" /></summary><p>{faq.answer}</p></details>)}</div></div>
        </section>
        <section id="iq-final-cta" className={styles.closing} aria-labelledby="closing-heading"><div className={styles.container}><p>Your next introduction, considered.</p><h2 id="closing-heading">Make it<br /><span>unmistakably yours.</span></h2><div className={styles.closingActions}><DesignLink light /><span>{price} <i aria-hidden="true">·</i> Your card + digital profile</span></div></div><span className={styles.closingMark} aria-hidden="true">iq</span></section>
      </main>
      <footer className={styles.footer}><div className={`${styles.container} ${styles.footerInner}`}><Link href="/" className={styles.brand} aria-label="IQ Card home">iq</Link><p>A better way to stay connected.</p><nav aria-label="Footer navigation">{HOME_NAV_ITEMS.map(item => <a key={item.href} href={item.href}>{item.label}</a>)}<Link href="/login">Log in <FiArrowRight aria-hidden="true" /></Link></nav><small>Designed by NRG STUDIO</small></div></footer>
    </div>
  )
}
