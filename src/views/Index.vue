<script setup vapor lang="ts">
const brandLogo = '/dlbr-logo.svg';
const refusalJson = JSON.stringify({
	error: 'ERR_CLAIM_OUTSIDE_INTENDED_USE',
	message: 'The requested claim is not declared for the selected intended use',
}, null, 2);
</script>

<template>
  <main class="home-page">
    <header class="site-header"><a class="brand" href="/" aria-label="DLBR EID home"><img :src="brandLogo" width="42" height="26" alt="" aria-hidden="true"></a><a class="header-link" href="https://console.dlbr.app/">Log in ↗</a></header>
    <div class="hero">
      <p class="eyebrow">Pilot underway</p>
      <h1>The wallet request stops if the attribute was not declared.</h1>
      <p class="hero-detail">EUDI wallet verification for relying parties. A <code>birth_date</code> claim on an <code>is_over_18</code> use returns <code>403</code> and <code>ERR_CLAIM_OUTSIDE_INTENDED_USE</code>. No session, no QR code.</p>
      <div class="hero-actions"><a href="https://console.dlbr.app/signup" class="pill">Request pilot access <span aria-hidden="true">↗</span></a><a href="https://docs.dlbr.app/" class="text-link">Read the docs ↗</a></div>
    </div>
    <section aria-labelledby="refusal-heading"><h2 id="refusal-heading">The refusal</h2>
      <div class="refusal-card"><div class="refusal-meta"><span>POST /v1/sessions</span><strong>HTTP 403</strong></div><pre><code>{{ refusalJson }}</code></pre></div>
      <p class="section-copy"><code>is_over_18</code> on that use is accepted. Adding <code>birth_date</code> is refused before a session exists. The audit record returns the declared and requested attributes, never the claim. <a href="/declared-set">Read the declared-set check ↗</a></p>
    </section>
    <section aria-labelledby="flow-heading"><h2 id="flow-heading">How it works</h2>
      <ol class="step-list"><li class="step-row"><span class="step-number">01</span><p>The relying party declares the attributes for the use.</p></li><li class="step-row"><span class="step-number">02</span><p>The gateway refuses a claim outside that use. No QR code is issued.</p></li><li class="step-row"><span class="step-number">03</span><p>A request inside the use can continue to the wallet. The result returns to the existing flow.</p></li></ol>
    </section>
    <section aria-labelledby="uses-heading"><h2 id="uses-heading">Three uses</h2><div class="use-list">
      <article><h3>Age assurance</h3><p>Ask for an age predicate when a recognized issuer is available. Do not ask for the birth date.</p></article>
      <article><h3>Banking attributes</h3><p>Add a wallet step beside the onboarding check you already run. The bank keeps the other checks.</p></article>
      <article><h3>Mobility <span class="experimental-label">Experimental</span></h3><p>EU mobile driving licence issuer coverage is not in the trust store.</p></article>
    </div></section>
    <section aria-labelledby="data-heading"><h2 id="data-heading">Data handling</h2>
      <p class="section-copy">Verified claims stay in temporary session storage for up to 30 seconds, then they are deleted. Account, session and audit records sit in Cloudflare D1 in the EU region. The controller is DALIBOR GOGIC PR DLBR, Serbia. EU storage does not register the company as a relying party.</p>
      <p class="section-copy">Production terms are agreed with each pilot team. No production date is set.</p>
    </section>
    <footer class="site-footer"><h2>start a pilot</h2><p>Tell us about your verification use case and the rollout you have in mind.</p><div class="footer-actions"><a href="https://console.dlbr.app/signup" class="pill">Request pilot access <span aria-hidden="true">↗</span></a><a href="https://dlbr.app/contact/sales" class="text-link">Contact sales ↗</a></div><nav class="legal-links" aria-label="Legal information"><a href="/privacy">Privacy</a><a href="/impressum">Impressum</a><a href="/terms">Terms</a></nav><div class="meta"><span>© 2026 DLBR</span><a href="mailto:contact@dlbr.app">contact@dlbr.app ↗</a></div></footer>
  </main>
</template>

<style>
.home-page { width: min(100% - 32px, var(--page-max-width)); margin: auto; padding: 40px 0 32px; }
.home-page .site-header { display: flex; align-items: center; justify-content: space-between; }
.home-page .brand { display: inline-flex; align-items: center; min-width: 44px; min-height: 44px; }
.home-page .brand img { width: 42px; height: 26px; object-fit: contain; filter: invert(1); }
.home-page .header-link { color: var(--muted); font-size: 12px; }
.home-page .hero { margin-top: calc(var(--page-heading-offset) - 40px); }
.home-page .eyebrow, .home-page h2 { margin: 0 0 24px; color: var(--faint); font-size: 12px; font-weight: 500; line-height: 16px; letter-spacing: .04em; }
.home-page h2 { text-transform: uppercase; }
.home-page h1 { max-width: 500px; margin: 0 0 24px; font-size: clamp(33px, 7vw, 52px); font-weight: 500; letter-spacing: -.08em; line-height: 1.08; }
.home-page .hero-detail, .home-page .section-copy, .home-page .step-row p, .home-page .use-list p { color: var(--muted); font-size: 13px; line-height: 1.65; }
.home-page .hero-detail { max-width: 480px; margin: 0; }
.home-page .hero-detail code { padding: .08em .3em; border-radius: 3px; background: var(--surface); color: var(--text); font-size: .92em; }
.home-page .section-copy { max-width: 520px; margin: 20px 0 0; }
.home-page .section-copy a { color: var(--text); text-decoration: underline; text-decoration-color: var(--faint); text-underline-offset: 3px; }
.home-page .hero-actions, .home-page .footer-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 22px; margin-top: 26px; }
.home-page .pill { display: inline-flex; align-items: center; gap: 18px; padding: 10px 14px; border: 1px solid var(--line); border-radius: 999px; background: var(--surface); color: var(--text); font-size: 12px; line-height: 20px; box-shadow: inset 0 1px #ffffff0d; transition: background .18s ease; }
.home-page .pill:hover { background: var(--surface-hover); }
.home-page .text-link { color: var(--text); font-size: 12px; text-decoration: underline; text-decoration-color: var(--faint); text-underline-offset: 4px; }
.home-page section, .home-page .site-footer { margin-top: 100px; }
.home-page .step-list { margin: 0; padding: 0; list-style: none; }
.home-page .step-row { display: grid; grid-template-columns: 40px 1fr; gap: 12px; padding: 18px 0; border-top: 1px solid var(--line); }
.home-page .step-row:last-child { border-bottom: 1px solid var(--line); }
.home-page .step-number { color: var(--faint); font-size: 11px; }
.home-page h3 { margin: 0 0 5px; font-size: 14px; font-weight: 500; line-height: 1.4; }
.home-page .step-row p { margin: 0; }
.home-page .refusal-card { margin-top: 4px; padding: 18px; border: 1px solid var(--line); border-radius: 8px; background: var(--surface); }
.home-page .refusal-meta { display: flex; justify-content: space-between; gap: 16px; padding-bottom: 14px; border-bottom: 1px solid var(--line); color: var(--faint); font-size: 10px; }
.home-page .refusal-meta strong { color: var(--text); font-weight: 500; }
.home-page .refusal-card pre { overflow-x: auto; margin: 14px 0 0; color: var(--text); font: 12px/1.7 var(--font-mono, monospace); white-space: pre; }
.home-page .use-list { display: grid; }
.home-page .use-list article { padding: 18px 0; border-top: 1px solid var(--line); }
.home-page .use-list article:last-child { border-bottom: 1px solid var(--line); }
.home-page .use-list h3 { display: flex; align-items: baseline; gap: 10px; }
.home-page .use-list p { margin: 0; }
.home-page .experimental-label { color: var(--faint); font-size: 9px; font-weight: 500; letter-spacing: .06em; text-transform: uppercase; }
.home-page .site-footer { padding-bottom: 12px; }
.home-page .legal-links { display: flex; gap: 16px; margin-top: 42px; color: var(--muted); font-size: 11px; }
.home-page .legal-links a { text-decoration: underline; text-decoration-color: var(--faint); text-underline-offset: 3px; }
.home-page .site-footer > p { max-width: 380px; margin: 0; font-size: 20px; line-height: 1.4; }
.home-page .meta { display: flex; justify-content: space-between; gap: 16px; margin-top: 90px; color: var(--faint); font-size: 11px; }
@media (max-width: 480px) { .home-page { padding-top: 24px; } .home-page section, .home-page .site-footer { margin-top: 76px; } .home-page h1 { font-size: 38px; } }
</style>
