'use client'

import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import s from './AIWorkflowAnimation.module.css'

/**
 * Looping demo: the AI agent runs the four steps of an A/B test end to end —
 * analyze, hypothesize, test, choose the winner. Same card/browser visual
 * language as HeroAnimation, but full-width and driven by an AI character
 * instead of a mouse cursor. Stage authored at 1040x600, scaled to container.
 */
export default function AIWorkflowAnimation() {
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const root = rootRef.current
    if (!root) return

    const $ = (name: string) => root.querySelector<HTMLElement>(`[data-el="${name}"]`)!

    const scaler = $('scaler'), stage = $('stage')
    const segs = [$('seg1'), $('seg2'), $('seg3'), $('seg4')]
    const labels = [$('label1'), $('label2'), $('label3'), $('label4')]
    const cardA = $('cardA'), cardB = $('cardB')
    const clipA = $('clipA')
    const badgeA = $('badgeA'), badgeB = $('badgeB')
    const h1A = $('h1A'), subA = $('subA'), ctaA = $('ctaA')
    const h1B = $('h1B'), subB = $('subB'), ctaB = $('ctaB'), cta2B = $('cta2B')
    const markH1 = $('markH1'), markSub = $('markSub'), markCta = $('markCta')
    const scanLine = $('scanLine')
    const aiChar = $('aiChar')
    const convCard = $('convCard'), crown = $('crown')
    const numA = $('numA'), numB = $('numB'), sideA = $('sideA')

    /* ---- scale the 1040x600 stage down to the container ---- */
    const fit = () => {
      const w = root?.clientWidth ?? 0
      if (w > 0) scaler.style.transform = `scale(${w / 1040})`
    }
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(root!)

    let ctx: gsap.Context | undefined
    let widthRo: ResizeObserver | undefined

    function buildTimeline() {
      return gsap.context(() => {
      /* ---- initial states ---- */
      gsap.set([cardA, cardB, convCard], { xPercent: -50, yPercent: -50 })
      gsap.set(cardB, { autoAlpha: 0 })
      gsap.set(convCard, { autoAlpha: 0 })
      gsap.set([badgeA, badgeB], { autoAlpha: 0 })
      gsap.set([markH1, markSub, markCta], { xPercent: -50, yPercent: -50, autoAlpha: 0 })
      gsap.set(scanLine, { autoAlpha: 0 })
      gsap.set(aiChar, { autoAlpha: 0 })

      /* ---- measure targets (stage-space coordinates, authored units) ---- */
      const SC = () => stage.getBoundingClientRect().width / 1040
      function pt(el: HTMLElement, dx = 0, dy = 0) {
        const st = stage.getBoundingClientRect()
        const r = el.getBoundingClientRect()
        const sc = SC()
        return {
          x: (r.left + r.width / 2 - st.left) / sc + dx,
          y: (r.top + r.height / 2 - st.top) / sc + dy,
        }
      }

      const SPLIT_OFFSET = 260
      const HOVER_DY = -34 // AI character floats above the element it's pointing at, never over its text
      const P_H1 = pt(h1A)
      const P_SUB = pt(subA)
      const P_CTA = pt(ctaA, 30, 0)
      const P_H1B = pt(h1B, SPLIT_OFFSET, HOVER_DY)
      const P_CTAB = pt(ctaB, SPLIT_OFFSET + 30, HOVER_DY)
      const AI_PARK = { x: P_H1.x + 260, y: P_H1.y + HOVER_DY }

      gsap.set(markH1, { x: P_H1.x, y: P_H1.y })
      gsap.set(markSub, { x: P_SUB.x, y: P_SUB.y })
      gsap.set(markCta, { x: P_CTA.x, y: P_CTA.y })

      const clipRectH = clipA.getBoundingClientRect().height / SC()
      /* conversion card sits at the bottom edge of the cards: ~50% overlap */
      const CARD_H = clipRectH + 14
      const CONV_Y = CARD_H / 2 + 6

      const GLOW_ON = '0 0 0 3px rgba(10,10,10,.16)'
      const GLOW_OFF = '0 0 0 0px rgba(10,10,10,0)'

      const H1_ORIGINAL = 'Grow Your Revenue'
      const SUB_ORIGINAL = 'Data-driven decisions, not guesswork.'
      const CTA_ORIGINAL = 'Get Started'
      const CTA2_ORIGINAL = 'Learn More'

      function setStep(n: number, t: string | number) {
        segs.forEach((seg, i) => {
          tl.to(seg, { scaleX: i < n ? 1 : 0, duration: 0.45, ease: i < n ? 'power2.out' : 'power2.in' }, t)
        })
        labels.forEach((label, i) => {
          const opacity = i === n - 1 ? 1 : i < n - 1 ? 0.6 : 0.35
          tl.to(label, { opacity, duration: 0.3 }, t)
          tl.fromTo(label, { scale: 1 }, { scale: i === n - 1 ? 1.04 : 1, duration: 0.3, ease: 'back.out(2)' }, t)
        })
      }

      function resetState() {
        h1B.textContent = H1_ORIGINAL
        subB.textContent = SUB_ORIGINAL
        ctaB.textContent = CTA_ORIGINAL
        cta2B.textContent = CTA2_ORIGINAL
        gsap.set(cardA, { autoAlpha: 1, x: 0, scale: 1 })
        gsap.set(cardB, { autoAlpha: 0, x: 0, scale: 1 })
        gsap.set([badgeA, badgeB], { autoAlpha: 0 })
        gsap.set([markH1, markSub, markCta], { autoAlpha: 0 })
        gsap.set(scanLine, { autoAlpha: 0, y: 0 })
        gsap.set(aiChar, { autoAlpha: 0, x: AI_PARK.x + 120, y: AI_PARK.y - 60 })
        gsap.set(convCard, { autoAlpha: 0 })
        gsap.set(crown, { scale: 0, rotation: -18 })
        gsap.set(sideA, { opacity: 1 })
        gsap.set(numB, { scale: 1 })
        numA.textContent = '0'
        numB.textContent = '0'
        gsap.set([h1B, ctaB, cta2B], { boxShadow: GLOW_OFF, scale: 1 })
        segs.forEach((seg, i) => gsap.set(seg, { scaleX: i === 0 ? 1 : 0 }))
        labels.forEach((label, i) => gsap.set(label, { opacity: i === 0 ? 1 : 0.35, scale: 1 }))
      }

      const tl = gsap.timeline({ repeat: -1, defaults: { ease: 'power2.inOut' }, onRepeat: resetState })
      resetState()

      /* ================= STEP 1 — Analyze the page ================= */
      tl.fromTo(stage, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.45, ease: 'power1.out' }, 0)
      tl.to(aiChar, { autoAlpha: 1, x: AI_PARK.x, y: AI_PARK.y, duration: 0.6, ease: 'power2.out' }, 0.3)

      tl.to(scanLine, { autoAlpha: 1, duration: 0.25 }, 0.35)
      tl.fromTo(scanLine, { y: 0 }, { y: clipRectH, duration: 1.5, ease: 'power1.inOut' }, 0.35)
      tl.to(scanLine, { autoAlpha: 0, duration: 0.3 }, 1.65)

      tl.to(aiChar, { y: P_H1.y + HOVER_DY, duration: 0.4 }, 0.75)
      tl.fromTo(markH1, { autoAlpha: 0, scale: 0.7 }, { autoAlpha: 1, scale: 1, duration: 0.3, ease: 'back.out(2.2)' }, 0.8)

      tl.to(aiChar, { y: P_SUB.y + HOVER_DY, duration: 0.4 }, 1.2)
      tl.fromTo(markSub, { autoAlpha: 0, scale: 0.7 }, { autoAlpha: 1, scale: 1, duration: 0.3, ease: 'back.out(2.2)' }, 1.25)

      tl.to(aiChar, { y: P_CTA.y + HOVER_DY, duration: 0.4 }, 1.6)
      tl.fromTo(markCta, { autoAlpha: 0, scale: 0.7 }, { autoAlpha: 1, scale: 1, duration: 0.3, ease: 'back.out(2.2)' }, 1.65)

      tl.to({}, { duration: 0.55 }, 2.0)
      tl.to([markH1, markSub, markCta], { autoAlpha: 0, duration: 0.3, stagger: 0.06 }, 2.55)
      tl.to(aiChar, { autoAlpha: 0, duration: 0.25 }, 2.6)

      /* ================= STEP 2 — Create a hypothesis ================= */
      tl.addLabel('hypothesis', 2.95)
      setStep(2, 'hypothesis')
      tl.set(cardB, { autoAlpha: 1, x: 0 }, 'hypothesis')
      tl.to(cardA, { x: -SPLIT_OFFSET, duration: 0.85, ease: 'power3.inOut' }, 'hypothesis')
      tl.to(cardB, { x: SPLIT_OFFSET, duration: 0.85, ease: 'power3.inOut' }, 'hypothesis')
      tl.fromTo([badgeA, badgeB], { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.35, stagger: 0.08 }, 'hypothesis+=0.55')

      tl.addLabel('edit', 'hypothesis+=1.15')
      tl.to(aiChar, { autoAlpha: 1, x: P_H1B.x, y: P_H1B.y, duration: 0.55, ease: 'power2.out' }, 'edit')
      tl.to(h1B, { boxShadow: GLOW_ON, duration: 0.18 }, 'edit+=0.5')
      tl.to(h1B, { autoAlpha: 0.25, duration: 0.15 }, 'edit+=0.68')
      tl.call(() => { h1B.textContent = 'Grow Revenue 3x Faster' }, undefined, 'edit+=0.83')
      tl.to(h1B, { autoAlpha: 1, duration: 0.2 }, 'edit+=0.83')
      tl.to(h1B, { boxShadow: GLOW_OFF, duration: 0.3 }, 'edit+=1.1')

      tl.to(aiChar, { x: P_CTAB.x, y: P_CTAB.y, duration: 0.5 }, 'edit+=1.35')
      tl.to([ctaB, cta2B], { boxShadow: GLOW_ON, duration: 0.18, stagger: 0.05 }, 'edit+=1.8')
      tl.call(() => { ctaB.textContent = 'Start Free Trial'; cta2B.textContent = 'See How It Works' }, undefined, 'edit+=1.98')
      tl.fromTo([ctaB, cta2B], { scale: 0.92 }, { scale: 1, duration: 0.35, ease: 'back.out(2.4)' }, 'edit+=1.98')
      tl.to([ctaB, cta2B], { boxShadow: GLOW_OFF, duration: 0.3 }, 'edit+=2.25')
      tl.to(aiChar, { autoAlpha: 0, duration: 0.3 }, 'edit+=2.55')

      /* ================= STEP 3 — Test it ================= */
      tl.addLabel('test', 'edit+=2.95')
      setStep(3, 'test')
      tl.fromTo(convCard, { autoAlpha: 0, y: CONV_Y + 26, scale: 0.92 },
        { autoAlpha: 1, y: CONV_Y, scale: 1, duration: 0.5, ease: 'back.out(1.5)' }, 'test')

      tl.addLabel('count', 'test+=0.55')
      const cA = { v: 0 }, cB = { v: 0 }
      tl.fromTo(cA, { v: 0 }, {
        v: 96, duration: 2.6, ease: 'power1.inOut', snap: { v: 1 },
        onUpdate() { numA.textContent = String(Math.round(cA.v)) },
      }, 'count')
      tl.fromTo(cB, { v: 0 }, {
        v: 164, duration: 2.6, ease: 'power2.inOut', snap: { v: 1 },
        onUpdate() { numB.textContent = String(Math.round(cB.v)) },
      }, 'count')

      tl.addLabel('win', 'count+=2.75')
      tl.fromTo(crown, { scale: 0, rotation: -18 }, { scale: 1, rotation: 0, duration: 0.55, ease: 'back.out(2.5)' }, 'win')
      tl.fromTo(numB, { scale: 1 }, { scale: 1.12, duration: 0.4, ease: 'back.out(3)' }, 'win')
      tl.to(sideA, { opacity: 0.4, duration: 0.4 }, 'win')

      /* ================= STEP 4 — Choose the winner ================= */
      tl.addLabel('winner', 'win+=1.25')
      setStep(4, 'winner')
      tl.to(convCard, { autoAlpha: 0, y: CONV_Y + 14, duration: 0.45 }, 'winner')
      tl.to(cardA, { autoAlpha: 0, scale: 0.94, duration: 0.45 }, 'winner')
      tl.to(badgeA, { autoAlpha: 0, duration: 0.25 }, 'winner')
      tl.to(cardB, { x: 0, duration: 0.8, ease: 'power3.inOut' }, 'winner+=0.15')
      tl.to(badgeB, { autoAlpha: 0, duration: 0.35 }, 'winner+=0.6')

      /* hold, then fade to black and loop — the agent starts the next test */
      tl.to({}, { duration: 2.0 })
      tl.to(stage, { autoAlpha: 0, duration: 0.55, ease: 'power1.in' })
      }, root!)
    }

    // Defer until fonts are loaded + first paint done. Without this, pt()
    // measures against fallback fonts and the AI char lands ~470px off.
    function startTimeline() {
      if ((root?.clientWidth ?? 0) > 0) {
        fit()
        ctx = buildTimeline()
      } else {
        widthRo = new ResizeObserver(() => {
          if ((root?.clientWidth ?? 0) > 0) {
            widthRo!.disconnect()
            fit()
            ctx = buildTimeline()
          }
        })
        widthRo.observe(root!)
      }
    }

    setTimeout(() => startTimeline(), 100)

    return () => {
      ro.disconnect()
      widthRo?.disconnect()
      ctx?.revert()
    }
  }, [])

  return (
    <div ref={rootRef} className={s.root} aria-hidden="true">
      <div className={s.scaler} data-el="scaler">
        <div className={s.stage} data-el="stage">

          {/* Step tracker — segmented progress bar */}
          <div className={s.stepper}>
            <div className={s.track}>
              <div className={s.segment}><div className={s.segmentFill} data-el="seg1" /></div>
              <div className={s.segment}><div className={s.segmentFill} data-el="seg2" /></div>
              <div className={s.segment}><div className={s.segmentFill} data-el="seg3" /></div>
              <div className={s.segment}><div className={s.segmentFill} data-el="seg4" /></div>
            </div>
            <div className={s.labels}>
              <span className={s.stepLabel} data-el="label1">Analyze the page</span>
              <span className={s.stepLabel} data-el="label2">Create a hypothesis</span>
              <span className={s.stepLabel} data-el="label3">Test it</span>
              <span className={s.stepLabel} data-el="label4">Choose the winner</span>
            </div>
          </div>

          {/* Card A */}
          <div className={s.card} data-el="cardA">
            <div className={s.badge} data-el="badgeA">A</div>
            <div className={s.clip} data-el="clipA">
              <div className={s.chrome}>
                <span className={s.dot} /><span className={s.dot} /><span className={s.dot} />
                <div className={s.url}>yoursite.com</div>
              </div>
              <div className={s.cardBody}>
                <h1 className={s.h1} data-el="h1A">Grow Your Revenue</h1>
                <p className={s.sub} data-el="subA">Data-driven decisions, not guesswork.</p>
                <div className={s.btnRow}>
                  <button className={`${s.btn} ${s.btnPrimary}`} data-el="ctaA">Get Started</button>
                  <button className={`${s.btn} ${s.btnSecondary}`} data-el="cta2A">Learn More</button>
                </div>
              </div>

              {/* AI scan sweep */}
              <div className={s.scanLine} data-el="scanLine">
                <div className={s.scanCore} />
              </div>
            </div>
          </div>

          {/* Card B */}
          <div className={s.card} data-el="cardB">
            <div className={s.badge} data-el="badgeB">B</div>
            <div className={s.clip}>
              <div className={s.chrome}>
                <span className={s.dot} /><span className={s.dot} /><span className={s.dot} />
                <div className={s.url}>yoursite.com</div>
              </div>
              <div className={s.cardBody}>
                <h1 className={s.h1} data-el="h1B">Grow Your Revenue</h1>
                <p className={s.sub} data-el="subB">Data-driven decisions, not guesswork.</p>
                <div className={s.btnRow}>
                  <button className={`${s.btn} ${s.btnPrimary}`} data-el="ctaB">Get Started</button>
                  <button className={`${s.btn} ${s.btnSecondary}`} data-el="cta2B">Learn More</button>
                </div>
              </div>
            </div>
          </div>

          {/* Identified-opportunity markers (AI reads Card A) */}
          <div className={s.marker} data-el="markH1" style={{ left: 0, top: 0 }}>
            <span className={s.markerDot} />
            <span className={s.markerTag}>Generic headline</span>
          </div>
          <div className={s.marker} data-el="markSub" style={{ left: 0, top: 0 }}>
            <span className={s.markerDot} />
            <span className={s.markerTag}>Vague subheading</span>
          </div>
          <div className={s.marker} data-el="markCta" style={{ left: 0, top: 0 }}>
            <span className={s.markerDot} />
            <span className={s.markerTag}>Low-contrast CTA</span>
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

          {/* AI character — the Panda from the logo */}
          <div className={s.aiChar} data-el="aiChar" style={{ left: 0, top: 0 }}>
            <div className={s.aiRing} />
            <svg width="32" height="32" viewBox="0 0 128 128" fill="none">
              <path d="M89 26.8148C101.437 32.6945 109.416 38.1355 118.166 51C123.656 44.1389 123.999 37.1064 114.22 27.1578C103.583 18.41 95.8626 19.6107 89 26.8148Z" fill="black" stroke="black" strokeWidth="6" strokeLinejoin="round" />
              <path d="M38 26.8148C25.563 32.6945 17.5836 38.1355 8.83371 51C3.34366 44.1389 3.00052 37.1064 12.7798 27.1578C23.4169 18.41 31.1374 19.6107 38 26.8148Z" fill="black" stroke="black" strokeWidth="6" strokeLinejoin="round" />
              <path d="M100.374 70.7676C94.6058 62.3564 84.9606 59.9934 79.127 63.7549C77.5207 64.7907 76.2455 66.2719 75.3672 68.0518C76.624 66.1783 78.7874 64.9708 81.1768 64.9707C84.9265 64.9707 88.1258 67.941 88.126 71.7988C88.126 75.6568 84.9266 78.6279 81.1768 78.6279C77.4271 78.6277 74.2285 75.6567 74.2285 71.7988C74.2285 71.7048 74.2326 71.6115 74.2363 71.5186C73.4836 75.6378 74.4387 80.5849 77.626 85.2324C83.3942 93.6436 93.0394 96.0066 98.873 92.2451C104.611 88.5452 106.134 79.1669 100.374 70.7676Z" fill="black" stroke="black" strokeWidth="6" strokeLinejoin="round" />
              <path d="M26.626 70.7676C32.3942 62.3564 42.0394 59.9934 47.873 63.7549C49.4793 64.7907 50.7545 66.2719 51.6328 68.0518C50.376 66.1783 48.2126 64.9708 45.8232 64.9707C42.0735 64.9707 38.8742 67.941 38.874 71.7988C38.874 75.6568 42.0734 78.6279 45.8232 78.6279C49.5729 78.6277 52.7715 75.6567 52.7715 71.7988C52.7715 71.7048 52.7674 71.6115 52.7637 71.5186C53.5164 75.6378 52.5613 80.5849 49.374 85.2324C43.6058 93.6436 33.9606 96.0066 28.127 92.2451C22.3894 88.5452 20.8659 79.1669 26.626 70.7676Z" fill="black" stroke="black" strokeWidth="6" strokeLinejoin="round" />
              <path d="M62.5 101C64.7803 101 66.6982 101.444 67.9336 102.029C68.3203 102.213 68.5766 102.374 68.7451 102.5C68.5766 102.626 68.3203 102.787 67.9336 102.971C66.6982 103.556 64.7803 104 62.5 104C60.2197 104 58.3018 103.556 57.0664 102.971C56.6792 102.787 56.4225 102.626 56.2539 102.5C56.4225 102.374 56.6792 102.213 57.0664 102.029C58.3018 101.444 60.2197 101 62.5 101Z" fill="black" stroke="black" strokeWidth="6" />
              <path d="M62.8148 107V112.44M62.8148 112.44C57.127 118.268 53.8914 118.767 48 112.44M62.8148 112.44C68.9431 118.349 72.2784 118.662 78 112.44" stroke="black" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>

        </div>
      </div>
    </div>
  )
}
