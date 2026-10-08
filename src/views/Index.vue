<script setup vapor lang="ts">
const brandLogo = '/dlbr-logo.svg';
const steps = [
  { number: '01', title: 'Customer', description: 'Your customer confirms a request in an EUDI Wallet.' },
  { number: '02', title: 'Verification', description: 'The gateway checks the credential, issuer and request.' },
  { number: '03', title: 'Your application', description: 'Your existing flow receives a clear verification result.' },
]
const benefits = [
  { title: 'Fit your onboarding', description: 'Add an OID4VP wallet step to the journey you already run.' },
  { title: 'Ask for less', description: 'Request a verified fact instead of source data where supported.' },
  { title: 'Plan the rollout', description: 'Review access, data handling and commercial terms during the pilot.' },
]
const useCases = [
  { category: 'Financial services', title: 'Verify onboarding attributes', description: 'Let customers present trusted identity and eligibility evidence.', href: 'https://dlbr.app/use-cases/banking' },
  { category: 'Mobility', title: 'Check driving eligibility', description: 'Review supported mobile driving licence evidence before a handoff.', href: 'https://dlbr.app/use-cases/mobility' },
  { category: 'Age assurance', title: 'Prove an age threshold', description: 'Ask for an age predicate when a recognized issuer is available.', href: 'https://dlbr.app/use-cases/age-verification' },
]
</script>

<template>
  <main class="home-page">
    <header class="site-header"><a class="brand" href="/" aria-label="DLBR EID home"><img :src="brandLogo" width="42" height="26" alt="" aria-hidden="true"></a><a class="header-link" href="https://console.dlbr.app/">Log in ↗</a></header>
    <div class="hero">
      <p class="eyebrow"><span class="status-dot" aria-hidden="true"></span> Pilot underway</p>
      <h1>EUDI WALLET VERIFICATION FOR RELYING PARTIES.</h1>
      <p class="hero-lead">Bring wallet verification into the customer journey you already own.</p>
      <p class="hero-detail">DLBR EID connects OpenID4VP presentations to your onboarding flow through one API and a typed TypeScript SDK. Support for mDOC and SD-JWT VC is planned.</p>
      <div class="hero-actions"><a href="https://console.dlbr.app/signup" class="pill">Request pilot access <span aria-hidden="true">↗</span></a><a href="https://docs.dlbr.app/" class="text-link">Read the docs ↗</a></div>
    </div>
    <section aria-labelledby="flow-heading"><h2 id="flow-heading">how it works</h2><p class="section-intro">From a wallet request to a result your application can use.</p>
      <ol class="step-list"><li v-for="step in steps" :key="step.number" class="step-row"><span class="step-number">{{ step.number }}</span><div><h3>{{ step.title }}</h3><p>{{ step.description }}</p></div></li></ol>
      <div class="result-card"><span>ILLUSTRATIVE RESULT</span><strong>VERIFIED</strong><code>age_over_18: true</code></div>
    </section>
    <section aria-labelledby="benefits-heading"><h2 id="benefits-heading">why wallet verification</h2><div class="detail-list"><article v-for="benefit in benefits" :key="benefit.title"><h3>{{ benefit.title }}</h3><p>{{ benefit.description }}</p></article></div></section>
    <section aria-labelledby="business-heading"><h2 id="business-heading">built for business</h2><p class="section-intro">The control of an API, with practical answers for the teams reviewing it.</p>
      <div class="detail-list"><article><h3>Clear commercial terms</h3><p>We discuss expected volume, rollout and support with each pilot team before confirming production terms.</p></article><article><h3>Data minimization</h3><p>Verified claims stay in temporary session storage for up to 30 seconds while the result is delivered. Account data is stored in the EU region.</p></article><article><h3>Operational controls</h3><p>Separate test and production keys, audit records, usage visibility and team roles support a reviewed rollout.</p></article></div>
      <a class="inline-link" href="https://dlbr.app/privacy">Privacy and data handling ↗</a>
    </section>
    <section aria-labelledby="cases-heading"><h2 id="cases-heading">selected use cases</h2><div class="case-list"><a v-for="useCase in useCases" :key="useCase.category" :href="useCase.href" class="case-card"><span>{{ useCase.category }}</span><h3>{{ useCase.title }} <span aria-hidden="true">↗</span></h3><p>{{ useCase.description }}</p></a></div><a class="inline-link" href="/use-cases">Explore all use cases ↗</a></section>
    <section aria-labelledby="developers-heading"><h2 id="developers-heading">for developers</h2><p class="section-intro">Technical detail for the team building your verification flow.</p><nav class="resource-links" aria-label="Developer resources"><a href="https://docs.dlbr.app/sdk/quickstarts">Integration guides <span aria-hidden="true">↗</span></a><a href="https://docs.dlbr.app/sdk/api-reference">TypeScript SDK <span aria-hidden="true">↗</span></a><a href="https://docs.dlbr.app/api/">Gateway API <span aria-hidden="true">↗</span></a><a href="https://community.dlbr.app/">Community <span aria-hidden="true">↗</span></a></nav></section>
    <footer class="site-footer"><h2>start a pilot</h2><p>Tell us about your verification use case and the rollout you have in mind.</p><div class="footer-actions"><a href="https://console.dlbr.app/signup" class="pill">Request pilot access <span aria-hidden="true">↗</span></a><a href="https://dlbr.app/contact/sales" class="text-link">Contact sales ↗</a></div><nav class="legal-links" aria-label="Legal information"><a href="/privacy">Privacy</a><a href="/terms">Terms</a></nav><div class="meta"><span>© 2026 DLBR</span><a href="mailto:contact@dlbr.app">contact@dlbr.app ↗</a></div></footer>
  </main>
</template>

<style>
.home-page { width: min(100% - 32px, 520px); margin: auto; padding: 40px 0 32px; }
.home-page .site-header { display: flex; align-items: center; justify-content: space-between; }
.home-page .brand { display: inline-flex; align-items: center; min-width: 44px; min-height: 44px; }
.home-page .brand img { width: 42px; height: 26px; object-fit: contain; filter: invert(1); }
.home-page .header-link { color: var(--muted); font-size: 12px; }
.home-page .hero { margin-top: min(30vh, 240px); }
.home-page .eyebrow, .home-page h2 { margin: 0 0 24px; color: var(--faint); font-size: 12px; font-weight: 500; line-height: 16px; text-transform: uppercase; letter-spacing: .04em; }
.home-page .eyebrow { display: flex; align-items: center; gap: 9px; }
.home-page .status-dot { width: 6px; height: 6px; border-radius: 50%; background: #a7c994; box-shadow: 0 0 0 3px #a7c99420; }
.home-page h1 { max-width: 500px; margin: 0 0 24px; font-size: clamp(33px, 7vw, 52px); font-weight: 500; letter-spacing: -.08em; line-height: 1.08; }
.home-page .hero-lead { margin: 0 0 16px; color: var(--text); font-size: 17px; line-height: 1.5; }
.home-page .hero-detail, .home-page .hero-note, .home-page .section-intro, .home-page .detail-list p, .home-page .step-row p, .home-page .case-card p { color: var(--muted); font-size: 13px; line-height: 1.65; }
.home-page .hero-detail { max-width: 480px; margin: 0; }
.home-page .hero-actions, .home-page .footer-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 22px; margin-top: 26px; }
.home-page .pill { display: inline-flex; align-items: center; gap: 18px; padding: 10px 14px; border: 1px solid var(--line); border-radius: 999px; background: var(--surface); color: var(--text); font-size: 12px; line-height: 20px; box-shadow: inset 0 1px #ffffff0d; transition: background .18s ease; }
.home-page .pill:hover { background: var(--surface-hover); }
.home-page .text-link, .home-page .inline-link { color: var(--text); font-size: 12px; text-decoration: underline; text-decoration-color: var(--faint); text-underline-offset: 4px; }
.home-page .hero-note { margin: 22px 0 0; color: var(--faint); font-size: 11px; }
.home-page section, .home-page .site-footer { margin-top: 100px; }
.home-page .section-intro { margin: -8px 0 28px; font-size: 15px; }
.home-page .step-list { margin: 0; padding: 0; list-style: none; }
.home-page .step-row { display: grid; grid-template-columns: 40px 1fr; gap: 12px; padding: 18px 0; border-top: 1px solid var(--line); }
.home-page .step-row:last-child { border-bottom: 1px solid var(--line); }
.home-page .step-number { color: var(--faint); font-size: 11px; }
.home-page h3 { margin: 0 0 5px; font-size: 14px; font-weight: 500; line-height: 1.4; }
.home-page .step-row p, .home-page .detail-list p, .home-page .case-card p { margin: 0; }
.home-page .result-card { display: grid; grid-template-columns: 1fr auto; gap: 14px; margin-top: 20px; padding: 20px; border: 1px solid var(--line); border-radius: 10px; background: var(--surface); }
.home-page .result-card span { color: var(--faint); font-size: 10px; }
.home-page .result-card strong { color: #a7c994; font-size: 11px; font-weight: 500; }
.home-page .result-card code { grid-column: 1 / -1; color: var(--muted); font-size: 12px; }
.home-page .detail-list { display: grid; }
.home-page .detail-list article { padding: 18px 0; border-top: 1px solid var(--line); }
.home-page .detail-list article:last-child { border-bottom: 1px solid var(--line); }
.home-page .inline-link { display: inline-block; margin-top: 20px; }
.home-page .case-list { display: flex; gap: 12px; overflow-x: auto; overscroll-behavior-inline: contain; scroll-snap-type: x mandatory; scroll-padding-inline: 2px; padding: 2px 2px 12px; scrollbar-width: thin; }
.home-page .case-card { display: flex; flex: 0 0 82%; flex-direction: column; min-height: 190px; scroll-snap-align: start; scroll-snap-stop: always; padding: 20px; border: 1px solid var(--line); border-radius: 10px; background: var(--surface); transition: background .18s ease; }
.home-page .case-card:hover { background: var(--surface-hover); }
.home-page .case-card > span { display: block; margin-bottom: 22px; color: var(--faint); font-size: 10px; text-transform: uppercase; }
.home-page .case-card h3 { display: flex; justify-content: space-between; gap: 12px; }
.home-page .case-card h3 span { color: var(--faint); }
.home-page .case-card p { margin-top: auto; padding-top: 18px; }
.home-page .resource-links { display: grid; border-top: 1px solid var(--line); }
.home-page .resource-links a { display: flex; justify-content: space-between; padding: 16px 0; border-bottom: 1px solid var(--line); font-size: 13px; }
.home-page .resource-links span { color: var(--faint); }
.home-page .site-footer { padding-bottom: 12px; }
.home-page .legal-links { display: flex; gap: 16px; margin-top: 42px; color: var(--muted); font-size: 11px; }
.home-page .legal-links a { text-decoration: underline; text-decoration-color: var(--faint); text-underline-offset: 3px; }
.home-page .site-footer > p { max-width: 380px; margin: 0; font-size: 20px; line-height: 1.4; }
.home-page .meta { display: flex; justify-content: space-between; gap: 16px; margin-top: 90px; color: var(--faint); font-size: 11px; }
@media (max-width: 480px) { .home-page { padding-top: 24px; } .home-page .hero { margin-top: min(25vh, 180px); } .home-page section, .home-page .site-footer { margin-top: 76px; } .home-page h1 { font-size: 38px; } }
</style>
