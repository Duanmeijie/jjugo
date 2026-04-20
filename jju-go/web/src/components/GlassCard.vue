<template>
  <div :class="['glass-card', { clickable }]" @click="handleClick">
    <div class="card-glow-border"></div>
    <slot></slot>
  </div>
</template>

<script setup>
defineProps({
  clickable: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['click'])

const handleClick = (e) => {
  if (emit('click')) {
    emit('click', e)
  }
}
</script>

<style lang="scss" scoped>
.glass-card {
  position: relative;
  background: var(--glass-bg);
  backdrop-filter: blur(18px) saturate(180%);
  -webkit-backdrop-filter: blur(18px) saturate(180%);
  border: 1px solid var(--glass-border);
  border-radius: 20px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
  padding: 20px;
  transition: transform 200ms ease, box-shadow 200ms ease;
  will-change: transform, box-shadow;
  overflow: hidden;

  &.clickable {
    cursor: pointer;

    &:hover {
      transform: translateY(-4px);
      box-shadow: 0 16px 48px rgba(0, 0, 0, 0.12);
    }

    &:active {
      transform: translateY(-2px) scale(0.99);
    }
  }
}

.card-glow-border {
  position: absolute;
  inset: 0;
  border-radius: 20px;
  padding: 1px;
  background: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0.3),
    rgba(255, 255, 255, 0)
  );
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  pointer-events: none;
  animation: border-glow 3s ease-in-out infinite;
}

@keyframes border-glow {
  0%, 100% {
    opacity: 0.5;
  }
  50% {
    opacity: 1;
  }
}

:global(:root), :global([data-theme="dark"]) {
  --glass-bg: rgba(30, 30, 30, 0.65);
  --glass-border: rgba(255, 255, 255, 0.15);
}

:root {
  --glass-bg: rgba(255, 255, 255, 0.12);
  --glass-border: rgba(255, 255, 255, 0.25);
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --glass-bg: rgba(30, 30, 30, 0.65);
    --glass-border: rgba(255, 255, 255, 0.15);
  }
}
</style>