<script setup vapor lang="ts">
import { useRouter } from '../router';
import '../styles/routes/setup.css';

const { navigate } = useRouter();
</script>

<template>
  <main class="screen setup-screen">
    <section class="panel setup-panel">
      <p class="eyebrow">Hardware</p>
      <h1>Setup</h1>
      <p class="copy">Configure the local fiscal helper before opening the register.</p>
      <button class="primary-button" type="button" @click="navigate('/')">Back to register</button>
    </section>
  </main>
</template>