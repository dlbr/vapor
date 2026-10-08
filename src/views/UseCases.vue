<script setup vapor lang="ts">
const brandLogo = '/dlbr-logo.svg';
const useCases = [
  {
    number: '01',
    category: 'Financial services',
    title: 'Verify onboarding attributes',
    description: 'Let customers present trusted identity and eligibility evidence as part of an existing onboarding journey.',
    detail: 'Request only the verified attributes your flow needs, then use a clear verification result to guide the next step.',
  },
  {
    number: '02',
    category: 'Mobility',
    title: 'Check driving eligibility',
    description: 'Review supported mobile driving licence evidence before a customer collects a vehicle or completes a handoff.',
    detail: 'Keep the experience in your existing product while the gateway checks the presentation and returns the result.',
  },
  {
    number: '03',
    category: 'Age assurance',
    title: 'Prove an age threshold',
    description: 'Ask a customer to prove an age threshold when a recognized issuer and supported credential are available.',
    detail: 'Use a verified age predicate where supported, without asking for a copy of the source identity document.',
  },
];
</script>

<template>
  <main class="use-cases-page">
    <header class="site-header"><a class="brand" href="/" aria-label="DLBR EID home"><img :src="brandLogo" width="42" height="26" alt="" aria-hidden="true"></a><a class="header-link" href="https://console.dlbr.app/">Log in ↗</a></header>
    <div class="hero">
      <p class="eyebrow">DLBR EID / USE CASES</p>
      <h1>WALLET VERIFICATION FOR REAL CUSTOMER JOURNEYS.</h1>
      <p class="hero-lead">Add a trusted verification step to the product and onboarding flow you already run.</p>
      <p class="hero-detail">DLBR EID connects OpenID4VP wallet presentations to your application through one API and a typed TypeScript SDK. Start with a specific use case, then review supported credentials and rollout needs with our team.</p>
      <div class="hero-actions"><a href="https://console.dlbr.app/signup" class="pill">Request pilot access <span aria-hidden="true">↗</span></a><a href="https://docs.dlbr.app/" class="text-link">Read the docs ↗</a></div>
    </div>
    <section aria-labelledby="use-cases-heading">
      <h2 id="use-cases-heading">use cases</h2>
      <p class="section-intro">A few ways relying parties can use wallet verification in an existing flow.</p>
      <div class="use-case-list" aria-label="Use cases" tabindex="0">
        <article v-for="useCase in useCases" :key="useCase.number" class="use-case-row">
          <span class="use-case-number">{{ useCase.number }}</span>
          <div class="use-case-content">
            <p class="use-case-category">{{ useCase.category }}</p>
            <h3>{{ useCase.title }}</h3>
            <p class="use-case-description">{{ useCase.description }}</p>
            <p class="use-case-detail">{{ useCase.detail }}</p>
          </div>
        </article>
      </div>
    </section>
    <section aria-labelledby="integration-heading">
      <h2 id="integration-heading">one integration, your flow</h2>
      <p class="section-intro">Your customer confirms a request in their wallet. The gateway checks the presentation, and your application receives a result it can use.</p>
      <ol class="step-list">
        <li class="step-row"><span class="step-number">01</span><div><h3>Request the evidence</h3><p>Choose the attributes needed for your customer journey.</p></div></li>
        <li class="step-row"><span class="step-number">02</span><div><h3>Verify the presentation</h3><p>DLBR EID checks the credential, issuer and request.</p></div></li>
        <li class="step-row"><span class="step-number">03</span><div><h3>Continue your journey</h3><p>Use the verification result in your existing application flow.</p></div></li>
      </ol>
    </section>
    <footer class="site-footer">
      <h2>explore a use case</h2>
      <p>Tell us about your customer journey and the verification step you want to add.</p>
      <div class="footer-actions"><a href="https://console.dlbr.app/signup" class="pill">Request pilot access <span aria-hidden="true">↗</span></a><a href="https://dlbr.app/contact/sales" class="text-link">Contact sales ↗</a></div>
      <div class="meta"><span>© 2026 DLBR</span><a href="mailto:contact@dlbr.app">contact@dlbr.app ↗</a></div>
    </footer>
  </main>
</template>

<style scoped>
.use-cases-page { width: min(100% - 32px, 520px); margin: auto; padding: 40px 0 32px; }
.site-header { display: flex; align-items: center; justify-content: space-between; }
.brand { display: inline-flex; align-items: center; min-width: 44px; min-height: 44px; }
.brand img { width: 42px; height: 26px; object-fit: contain; filter: invert(1); }
.header-link { color: var(--muted); font-size: 12px; }
.hero { margin-top: min(18vh, 150px); }
.eyebrow, h2 { margin: 0 0 24px; color: var(--faint); font-size: 12px; font-weight: 500; line-height: 16px; text-transform: uppercase; letter-spacing: .04em; }
h1 { max-width: 500px; margin: 0 0 24px; font-size: clamp(33px, 7vw, 52px); font-weight: 500; letter-spacing: -.08em; line-height: 1.08; }
.hero-lead { margin: 0 0 16px; color: var(--text); font-size: 17px; line-height: 1.5; }
.hero-detail, .section-intro, .use-case-description, .use-case-detail, .step-row p { color: var(--muted); font-size: 13px; line-height: 1.65; }
.hero-detail { max-width: 480px; margin: 0; }
.hero-actions, .footer-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 22px; margin-top: 26px; }
.pill { display: inline-flex; align-items: center; gap: 18px; padding: 10px 14px; border: 1px solid var(--line); border-radius: 999px; background: var(--surface); color: var(--text); font-size: 12px; line-height: 20px; box-shadow: inset 0 1px #ffffff0d; transition: background .18s ease; }
.pill:hover { background: var(--surface-hover); }
.text-link { color: var(--text); font-size: 12px; text-decoration: underline; text-decoration-color: var(--faint); text-underline-offset: 4px; }
section, .site-footer { margin-top: 100px; }
.section-intro { margin: -8px 0 28px; font-size: 15px; }
.use-case-list { display: flex; gap: 12px; width: calc(100vw - max(16px, (100vw - 520px) / 2)); margin-right: calc(-1 * max(16px, (100vw - 520px) / 2)); overflow-x: auto; overscroll-behavior-inline: contain; scroll-snap-type: x mandatory; scroll-padding-inline: 2px; padding: 2px 16px 14px 2px; scrollbar-width: thin; }
.use-case-row { display: flex; flex: 0 0 min(82%, 680px); flex-direction: column; min-height: 330px; scroll-snap-align: start; scroll-snap-stop: always; padding: 28px; border: 1px solid #fff; border-radius: 10px; background: #fff; color: #111; }
.use-case-number { color: #737373; font-size: 11px; }
.use-case-content { display: flex; flex: 1; flex-direction: column; align-items: flex-start; padding-top: 42px; }
.use-case-category { margin: 0 0 12px; color: #737373; font-size: 10px; text-transform: uppercase; letter-spacing: .04em; }
h3 { margin: 0 0 8px; font-size: 15px; font-weight: 500; line-height: 1.4; }
.use-case-description { max-width: 420px; margin: 0; color: #333; font-size: 15px; line-height: 1.6; }
.use-case-detail { max-width: 420px; margin: auto 0 0; padding-top: 22px; color: #737373; font-size: 12px; }
.step-list { margin: 0; padding: 0; list-style: none; }
.step-row { display: grid; grid-template-columns: 40px 1fr; gap: 12px; padding: 18px 0; border-top: 1px solid var(--line); }
.step-row:last-child { border-bottom: 1px solid var(--line); }
.step-number { color: var(--faint); font-size: 11px; }
.step-row p { margin: 0; }
.site-footer { padding-bottom: 12px; }
.site-footer > p { max-width: 380px; margin: 0; font-size: 20px; line-height: 1.4; }
.meta { display: flex; justify-content: space-between; gap: 16px; margin-top: 90px; color: var(--faint); font-size: 11px; }
@media (max-width: 480px) { .use-cases-page { padding-top: 24px; } .hero { margin-top: min(15vh, 110px); } section, .site-footer { margin-top: 76px; } h1 { font-size: 38px; } .use-case-row { flex-basis: 84%; min-height: 290px; padding: 22px; } .use-case-content { padding-top: 28px; } }
</style>
