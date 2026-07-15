'use client'

import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import s from './HeroAnimation.module.css'

/**
 * Looping A/B-test demo animation for the hero.
 * The stage is authored at 900x560 and scaled to the container width.
 */
export default function HeroAnimation() {
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const root = rootRef.current
    if (!root) return

    const $ = (name: string) => root.querySelector<HTMLElement>(`[data-el="${name}"]`)!

    const scaler = $('scaler'), stage = $('stage')
    const cardA = $('cardA'), cardB = $('cardB')
    const ctaA = $('ctaA'), h1A = $('h1A')
    const panel = $('panel'), inputB = $('inputB'), typed = $('typed')
    const caret = $('caret'), testBtn = $('testBtn')
    const scrollA = $('scrollA'), scrollB = $('scrollB')
    const buyA = $('buyA'), buyB = $('buyB')
    const picker = $('picker'), swGreen = $('swGreen'), testBtn2 = $('testBtn2')
    const convCard = $('convCard'), crown = $('crown')
    const numA = $('numA'), numB = $('numB'), sideA = $('sideA')
    const badgeA = $('badgeA'), badgeB = $('badgeB')
    const cursor = $('cursor'), ripple = $('ripple')

    /* ---- scale the 900x560 stage down to the container ---- */
    // Width can be 0 while the element is still detached; a scale(0) then sticks
    // because the observer only fires again on the next real size change.
    const fit = () => {
      const w = root.clientWidth
      if (w > 0) scaler.style.transform = `scale(${w / 900})`
    }
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(root)

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      gsap.set(stage, { autoAlpha: 1 })
      gsap.set([cardB, convCard, panel, picker, badgeA, badgeB, cursor], { autoAlpha: 0 })
      gsap.set([cardA, cardB, convCard], { xPercent: -50, yPercent: -50 })
      return () => ro.disconnect()
    }

    const ctx = gsap.context(() => {
      /* ---- initial states ---- */
      gsap.set([cardA, cardB, convCard], { xPercent: -50, yPercent: -50 })
      gsap.set(cardB, { autoAlpha: 0 })
      gsap.set(convCard, { autoAlpha: 0 })
      /* no scaleY here — panels must be measured unscaled, the open-tweens set their own start values */
      gsap.set([panel, picker], { xPercent: -50, autoAlpha: 0, transformOrigin: 'top center' })
      gsap.set(crown, { scale: 0, rotation: -18, transformOrigin: 'bottom center' })
      gsap.set([badgeA, badgeB], { autoAlpha: 0 })
      gsap.set(cursor, { x: 840, y: 565, autoAlpha: 1 })

      /* ---- measure click targets (stage-space coordinates) ---- */
      function pt(el: HTMLElement, dx = 0, dy = 0) {
        const st = stage.getBoundingClientRect()
        const r = el.getBoundingClientRect()
        const sc = st.width / 900
        return {
          x: (r.left + r.width / 2 - st.left) / sc + dx,
          y: (r.top + r.height / 2 - st.top) / sc + dy,
        }
      }
      const P_H1 = pt(h1A, 20, 4)
      const P_CTA = pt(ctaA)
      const P_INPUT = pt(inputB, -55, 0)
      const P_TEST = pt(testBtn)

      /* conversion card sits at the bottom edge of the cards: 50% overlap */
      const SC = stage.getBoundingClientRect().width / 900
      const CARD_H = cardA.getBoundingClientRect().height / SC
      const CONV_Y = CARD_H / 2
      gsap.set(convCard, { y: CONV_Y })

      /* phase 2 targets: buy button lives one viewport lower at measure time */
      const VH = cardA.querySelector(`.${s.viewport}`)!.getBoundingClientRect().height / SC
      const P_BUY = pt(buyA, 0, -VH)
      const P_SW = pt(swGreen)
      const P_TEST2 = pt(testBtn2)

      /* ---- helpers ---- */
      const TYPE_TEXT = 'Try for free'
      const HOVER_ON = '0 0 0 3px rgba(59,130,246,.9)'
      const HOVER_OFF = '0 0 0 0px rgba(59,130,246,0)'
      const GREEN = '#22c55e'

      function resetState() {
        typed.textContent = ''
        ctaA.textContent = 'Get Started'
        numA.textContent = '0'
        numB.textContent = '0'
        gsap.set(caret, { display: 'none' })
        gsap.set(cardB, { autoAlpha: 0, x: 0, scale: 1 })
        gsap.set(crown, { scale: 0, rotation: -18 })
        gsap.set(sideA, { opacity: 1 })
        gsap.set(numB, { scale: 1 })
        gsap.set([scrollA, scrollB], { y: 0 })
        gsap.set([buyA, buyB], { clearProps: 'backgroundColor' })
        gsap.set(swGreen, { clearProps: 'boxShadow' })
        gsap.set(cursor, { x: 840, y: 565, autoAlpha: 1 })
      }

      const tl = gsap.timeline({
        repeat: -1,
        defaults: { ease: 'power2.inOut' },
        onRepeat: resetState,
      })
      resetState()

      function click(t: number | string, pressTarget?: HTMLElement) {
        tl.fromTo(ripple, { scale: 0.2, opacity: 0.5 }, { scale: 1, opacity: 0, duration: 0.45, ease: 'power1.out' }, t)
        if (pressTarget) {
          tl.to(pressTarget, { scale: 0.94, duration: 0.09, yoyo: true, repeat: 1, ease: 'power1.inOut' }, t)
        }
      }

      /* ================= SCREEN 1 ================= */
      tl.fromTo(stage, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.45, ease: 'power1.out' }, 0)

      // cursor -> headline first: hover highlight signals "everything is testable"
      tl.to(cursor, { x: P_H1.x, y: P_H1.y, duration: 0.95 }, 0.55)
      tl.to(h1A, { boxShadow: HOVER_ON, duration: 0.18, ease: 'power1.out' }, 1.35)
      tl.to(h1A, { boxShadow: HOVER_OFF, duration: 0.3, ease: 'power1.out' }, 2.1)

      // cursor -> CTA, hover highlight, click
      tl.to(cursor, { x: P_CTA.x, y: P_CTA.y, duration: 0.55 }, 2.05)
      tl.to(ctaA, { boxShadow: HOVER_ON, duration: 0.18, ease: 'power1.out' }, 2.45)
      click(2.72, ctaA)
      tl.to(ctaA, { boxShadow: HOVER_OFF, duration: 0.3, ease: 'power1.out' }, 3.05)

      // dropdown opens
      tl.fromTo(panel, { autoAlpha: 0, scaleY: 0.85 }, { autoAlpha: 1, scaleY: 1, duration: 0.38, ease: 'back.out(1.6)' }, 3.02)

      // cursor -> input B, click, caret
      tl.to(cursor, { x: P_INPUT.x, y: P_INPUT.y, duration: 0.55 }, 3.55)
      click(4.2)
      tl.set(caret, { display: 'inline-block' }, 4.35)

      // typing
      const typer = { i: 0 }
      tl.fromTo(typer, { i: 0 }, {
        i: TYPE_TEXT.length, duration: 1.15, ease: 'none',
        snap: { i: 1 },
        onUpdate() { typed.textContent = TYPE_TEXT.slice(0, Math.round(typer.i)) },
      }, 4.55)

      // cursor -> "Test it", click
      tl.to(cursor, { x: P_TEST.x, y: P_TEST.y, duration: 0.5 }, 5.95)
      tl.set(caret, { display: 'none' }, 6.0)
      click(6.55, testBtn)

      // dropdown closes
      tl.to(panel, { autoAlpha: 0, scaleY: 0.9, duration: 0.28 }, 6.85)

      /* ================= SCREEN 2 — split ================= */
      tl.addLabel('split', 7.2)
      tl.set(cardB, { autoAlpha: 1, x: 0 }, 'split')
      tl.to(cardA, { x: -192, duration: 0.85, ease: 'power3.inOut' }, 'split')
      tl.to(cardB, { x: 192, duration: 0.85, ease: 'power3.inOut' }, 'split')
      tl.fromTo([badgeA, badgeB], { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.35, stagger: 0.08 }, 'split+=.55')
      tl.to(cursor, { autoAlpha: 0, x: '+=70', y: '+=90', duration: 0.5, ease: 'power1.in' }, 'split')

      /* ================= SCREEN 3 — conversions ================= */
      tl.fromTo(convCard, { autoAlpha: 0, y: CONV_Y + 26, scale: 0.92 },
        { autoAlpha: 1, y: CONV_Y, scale: 1, duration: 0.5, ease: 'back.out(1.5)' }, 'split+=1.05')

      tl.addLabel('count', 'split+=1.7')
      const cA = { v: 0 }, cB = { v: 0 }
      tl.fromTo(cA, { v: 0 }, {
        v: 118, duration: 3, ease: 'power1.inOut', snap: { v: 1},
        onUpdate() { numA.textContent = String(Math.round(cA.v)) },
      }, 'count')
      tl.fromTo(cB, { v: 0 }, {
        v: 197, duration: 3, ease: 'power2.inOut', snap: { v: 1},
        onUpdate() { numB.textContent = String(Math.round(cB.v)) },
      }, 'count')

      // B wins: crown + highlight
      tl.addLabel('win', 'count+=3.15')
      tl.fromTo(crown, { scale: 0, rotation: -18 }, { scale: 1, rotation: 0, duration: 0.55, ease: 'back.out(2.5)' }, 'win')
      tl.fromTo(numB, { scale: 1 }, { scale: 1.12, duration: 0.4, ease: 'back.out(3)' }, 'win')
      tl.to(sideA, { opacity: 0.4, duration: 0.4 }, 'win')

      /* ================= SCREEN 4 — winner applied ================= */
      tl.addLabel('final', 'win+=1.35')
      tl.to(convCard, { autoAlpha: 0, y: CONV_Y + 14, duration: 0.45 }, 'final')
      // variant A disappears, winner B moves into focus
      tl.to(cardA, { autoAlpha: 0, scale: 0.94, duration: 0.45 }, 'final')
      tl.to(badgeA, { autoAlpha: 0, duration: 0.25 }, 'final')
      tl.to(cardB, { x: 0, duration: 0.8, ease: 'power3.inOut' }, 'final+=.15')
      tl.to(badgeB, { autoAlpha: 0, duration: 0.35 }, 'final+=.6')
      // seamless handover back to card A (pixel-identical at this moment)
      tl.call(() => { ctaA.textContent = 'Try for free' }, undefined, 'final+=1.0')
      tl.set(cardA, { autoAlpha: 1, x: 0, scale: 1 }, 'final+=1.02')
      tl.set(cardB, { autoAlpha: 0 }, 'final+=1.02')

      /* ================= PHASE 2 — optimization never stops ================= */
      tl.addLabel('p2', 'final+=2.1')

      // cursor returns and scrolls the page down
      tl.set(cursor, { x: 660, y: 470, autoAlpha: 0 }, 'p2')
      tl.to(cursor, { autoAlpha: 1, x: 462, y: 300, duration: 0.7, ease: 'power2.out' }, 'p2')
      tl.to(scrollA, { y: -VH, duration: 0.9 }, 'p2+=.85')
      tl.to(cursor, { y: '+=16', duration: 0.9 }, 'p2+=.85')

      // select the buy button (Pro plan)
      tl.to(cursor, { x: P_BUY.x, y: P_BUY.y, duration: 0.5 }, 'p2+=1.95')
      tl.to(buyA, { boxShadow: HOVER_ON, duration: 0.18, ease: 'power1.out' }, 'p2+=2.35')
      click('p2+=2.62', buyA)
      tl.to(buyA, { boxShadow: HOVER_OFF, duration: 0.3, ease: 'power1.out' }, 'p2+=2.95')

      // color picker opens
      tl.fromTo(picker, { autoAlpha: 0, scaleY: 0.85 }, { autoAlpha: 1, scaleY: 1, duration: 0.35, ease: 'back.out(1.6)' }, 'p2+=2.95')

      // pick green
      tl.to(cursor, { x: P_SW.x, y: P_SW.y, duration: 0.45 }, 'p2+=3.4')
      click('p2+=3.95')
      tl.to(swGreen, { boxShadow: '0 0 0 2px #fff, 0 0 0 3.5px #0a0a0a', duration: 0.15 }, 'p2+=3.98')

      // test it
      tl.to(cursor, { x: P_TEST2.x, y: P_TEST2.y, duration: 0.4 }, 'p2+=4.4')
      click('p2+=4.9', testBtn2)
      tl.to(picker, { autoAlpha: 0, scaleY: 0.9, duration: 0.25 }, 'p2+=5.15')

      /* --- split 2 --- */
      tl.addLabel('split2', 'p2+=5.45')
      tl.set(scrollB, { y: -VH }, 'split2')
      tl.set(buyB, { backgroundColor: GREEN }, 'split2')
      tl.set(cardB, { autoAlpha: 1, x: 0, scale: 1 }, 'split2')
      tl.to(cardA, { x: -192, duration: 0.8, ease: 'power3.inOut' }, 'split2')
      tl.to(cardB, { x: 192, duration: 0.8, ease: 'power3.inOut' }, 'split2')
      tl.fromTo([badgeA, badgeB], { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3, stagger: 0.08 }, 'split2+=.5')
      tl.to(cursor, { autoAlpha: 0, x: '+=60', y: '+=80', duration: 0.45, ease: 'power1.in' }, 'split2')

      /* --- conversions 2 (shortened) --- */
      tl.call(() => { numA.textContent = '0'; numB.textContent = '0' }, undefined, 'split2+=.6')
      tl.set(crown, { scale: 0, rotation: -18 }, 'split2+=.6')
      tl.set(sideA, { opacity: 1 }, 'split2+=.6')
      tl.set(numB, { scale: 1 }, 'split2+=.6')
      tl.fromTo(convCard, { autoAlpha: 0, y: CONV_Y + 26, scale: 0.92 },
        { autoAlpha: 1, y: CONV_Y, scale: 1, duration: 0.45, ease: 'back.out(1.5)' }, 'split2+=.9')

      tl.addLabel('count2', 'split2+=1.4')
      const cA2 = { v: 0 }, cB2 = { v: 0 }
      tl.fromTo(cA2, { v: 0 }, {
        v: 74, duration: 2, ease: 'power1.inOut', snap: { v: 1 },
        onUpdate() { numA.textContent = String(Math.round(cA2.v)) },
      }, 'count2')
      tl.fromTo(cB2, { v: 0 }, {
        v: 132, duration: 2, ease: 'power2.inOut', snap: { v: 1 },
        onUpdate() { numB.textContent = String(Math.round(cB2.v)) },
      }, 'count2')

      tl.addLabel('win2', 'count2+=2.15')
      tl.fromTo(crown, { scale: 0, rotation: -18 }, { scale: 1, rotation: 0, duration: 0.5, ease: 'back.out(2.5)' }, 'win2')
      tl.fromTo(numB, { scale: 1 }, { scale: 1.12, duration: 0.35, ease: 'back.out(3)' }, 'win2')
      tl.to(sideA, { opacity: 0.4, duration: 0.35 }, 'win2')

      /* --- winner applied: buy button turns green --- */
      tl.addLabel('final2', 'win2+=1.15')
      tl.to(convCard, { autoAlpha: 0, y: CONV_Y + 14, duration: 0.4 }, 'final2')
      // variant A disappears, winner B moves into focus
      tl.to(cardA, { autoAlpha: 0, scale: 0.94, duration: 0.4 }, 'final2')
      tl.to(badgeA, { autoAlpha: 0, duration: 0.25 }, 'final2')
      tl.to(cardB, { x: 0, duration: 0.7, ease: 'power3.inOut' }, 'final2+=.1')
      tl.to(badgeB, { autoAlpha: 0, duration: 0.3 }, 'final2+=.5')
      // seamless handover back to card A (buy button already green)
      tl.set(buyA, { backgroundColor: GREEN }, 'final2+=.85')
      tl.set(cardA, { autoAlpha: 1, x: 0, scale: 1 }, 'final2+=.87')
      tl.set(cardB, { autoAlpha: 0 }, 'final2+=.87')

      // hold, then fade back to screen 1 — the process never ends
      tl.to({}, { duration: 2.2 })
      tl.to(stage, { autoAlpha: 0, duration: 0.55, ease: 'power1.in' })
    }, root)

    return () => {
      ro.disconnect()
      ctx.revert()
    }
  }, [])

  return (
    <div ref={rootRef} className={s.root} aria-hidden="true">
      <div className={s.scaler} data-el="scaler">
        <div className={s.stage} data-el="stage">

          {/* Card A */}
          <div className={s.card} data-el="cardA">
            <div className={s.badge} data-el="badgeA">A</div>
            <div className={s.chrome}>
              <span className={s.dot} /><span className={s.dot} /><span className={s.dot} />
              <div className={s.url}>yoursite.com</div>
            </div>
            <div className={s.cardBody}>
              <div className={s.viewport}>
                <div data-el="scrollA">
                  <section className={s.sec}>
                    <h1 data-el="h1A">Your Live Site</h1>
                    <button className={s.cta} data-el="ctaA">Get Started</button>
                  </section>
                  <section className={s.sec}>
                    <div className={s.secTitle}>Compare Plans</div>
                    <div className={s.plans}>
                      <div className={s.plan}>
                        <div className={s.planName}>Basic</div>
                        <div className={s.planPrice}>$9</div>
                        <div className={s.bar} /><div className={`${s.bar} ${s.barShort}`} />
                        <button className={s.buyBtn}>Buy</button>
                      </div>
                      <div className={s.plan}>
                        <div className={s.planName}>Pro</div>
                        <div className={s.planPrice}>$29</div>
                        <div className={s.bar} /><div className={`${s.bar} ${s.barShort}`} />
                        <button className={s.buyBtn} data-el="buyA">Buy</button>
                      </div>
                    </div>
                  </section>
                </div>
              </div>

              <div className={s.panel} data-el="panel">
                <div className={s.field}>
                  <label>Variante A</label>
                  <div className={s.input}>Get Started</div>
                </div>
                <div className={s.field}>
                  <label>Variante B</label>
                  <div className={`${s.input} ${s.focusable}`} data-el="inputB">
                    <span data-el="typed" /><span className={s.caret} data-el="caret" />
                  </div>
                </div>
                <button className={s.testBtn} data-el="testBtn">Test it</button>
              </div>

              <div className={s.panel} data-el="picker">
                <div className={s.field}>
                  <label>Button Color</label>
                  <div className={s.swatches}>
                    <span className={s.sw} style={{ background: '#0a0a0a' }} />
                    <span className={s.sw} data-el="swGreen" style={{ background: '#22c55e' }} />
                    <span className={s.sw} style={{ background: '#eab308' }} />
                    <span className={s.sw} style={{ background: '#8b5cf6' }} />
                    <span className={s.sw} style={{ background: '#ec4899' }} />
                  </div>
                </div>
                <button className={s.testBtn} data-el="testBtn2">Test it</button>
              </div>
            </div>
          </div>

          {/* Card B */}
          <div className={s.card} data-el="cardB">
            <div className={s.badge} data-el="badgeB">B</div>
            <div className={s.chrome}>
              <span className={s.dot} /><span className={s.dot} /><span className={s.dot} />
              <div className={s.url}>yoursite.com</div>
            </div>
            <div className={s.cardBody}>
              <div className={s.viewport}>
                <div data-el="scrollB">
                  <section className={s.sec}>
                    <h1>Your Live Site</h1>
                    <button className={s.cta}>Try for free</button>
                  </section>
                  <section className={s.sec}>
                    <div className={s.secTitle}>Compare Plans</div>
                    <div className={s.plans}>
                      <div className={s.plan}>
                        <div className={s.planName}>Basic</div>
                        <div className={s.planPrice}>$9</div>
                        <div className={s.bar} /><div className={`${s.bar} ${s.barShort}`} />
                        <button className={s.buyBtn}>Buy</button>
                      </div>
                      <div className={s.plan}>
                        <div className={s.planName}>Pro</div>
                        <div className={s.planPrice}>$29</div>
                        <div className={s.bar} /><div className={`${s.bar} ${s.barShort}`} />
                        <button className={s.buyBtn} data-el="buyB">Buy</button>
                      </div>
                    </div>
                  </section>
                </div>
              </div>
            </div>
          </div>

          {/* Conversion card */}
          <div className={s.convCard} data-el="convCard">
            <svg className={s.crown} data-el="crown" viewBox="0 0 24 24">
              <path
                d="M11.562 3.266a.5.5 0 0 1 .876 0L15.39 8.87a1 1 0 0 0 1.516.294L21.183 5.5a.5.5 0 0 1 .798.519l-2.834 10.246a1 1 0 0 1-.956.735H5.81a1 1 0 0 1-.957-.735L2.02 6.02a.5.5 0 0 1 .798-.519l4.276 3.664a1 1 0 0 0 1.516-.294z"
                fill="var(--gold)"
              />
              <path d="M5.5 20.5h13" stroke="var(--gold)" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <div className={s.convTitle}>Conversions</div>
            <div className={s.convGrid}>
              <div className={s.convSide} data-el="sideA">
                <div className={s.num} data-el="numA">0</div>
              </div>
              <div className={s.divider} />
              <div className={s.convSide}>
                <div className={s.num} data-el="numB">0</div>
              </div>
            </div>
          </div>

          {/* Cursor */}
          <div className={s.cursor} data-el="cursor">
            <div className={s.ripple} data-el="ripple" />
            <svg width="20" height="22" viewBox="0 0 13 20">
              <polygon
                points="0,0 0,16.5 4.4,12.6 7.2,19 10,17.8 7.2,11.5 12.6,11"
                fill="#0a0a0a"
                stroke="#ffffff"
                strokeWidth="1"
              />
            </svg>
          </div>

        </div>
      </div>
    </div>
  )
}
