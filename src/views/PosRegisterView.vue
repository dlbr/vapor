<script setup vapor lang="ts">
import { useRouter } from '../router';
import '../styles/routes/register.css';

const { navigate } = useRouter();
</script>

<template>
  <main class="screen register-screen">
    <section class="panel register-panel">
      <p class="eyebrow">DLBR POS</p>
      <h1>Register</h1>
      <p class="copy">Vapor client runtime with a Nitro API edge shell.</p>
      <button class="primary-button" type="button" @click="navigate('/setup')">Setup</button>
    </section>
  </main>
</template>