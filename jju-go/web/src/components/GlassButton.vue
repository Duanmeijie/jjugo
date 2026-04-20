<template>
  <button
    :class="['glass-btn', variant, { 'is-loading': loading }]"
    :disabled="disabled || loading"
    :type="type"
    @click="handleClick"
  >
    <span v-if="loading" class="glass-loader btn-loader"></span>
    <span v-else class="btn-content">
      <slot></slot>
    </span>
  </button>
</template>

<script setup>
defineProps({
  type: {
    type: String,
    default: 'button'
  },
  variant: {
    type: String,
    default: '',
    validator: (v) => ['', 'primary', 'success', 'danger', 'warning'].includes(v)
  },
  disabled: {
    type: Boolean,
    default: false
  },
  loading: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['click'])

const handleClick = (e) => {
  if (!e.target.closest('.is-loading')) {
    emit('click', e)
  }
}
</script>

<style lang="scss" scoped>
.glass-btn {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 12px 24px;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  background: var(--glass-bg);
  backdrop-filter: blur(18px) saturate(180%);
  -webkit-backdrop-filter: blur(18px) saturate(180%);
  border: 1px solid var(--glass-border);
  border-radius: 14px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
  cursor: pointer;
  overflow: hidden;
  transition: transform 150ms ease, box-shadow 150ms ease, opacity 150ms ease;
  will-change: transform, box-shadow;
  user-select: none;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(255, 255, 255, 0.3),
      transparent
    );
    transition: left 0.5s ease;
  }

  &:hover {
    transform: scale(1.02);
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.12);

    &::before {
      left: 100%;
    }
  }

  &:active {
    transform: scale(0.98);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  }

  &:disabled {
    opacity: 0.5;
    pointer-events: none;
    transform: none;
  }

  &.primary {
    background: #007AFF;
    border-color: #007AFF;
    color: white;
  }

  &.success {
    background: #34C759;
    border-color: #34C759;
    color: white;
  }

  &.danger {
    background: #FF3B30;
    border-color: #FF3B30;
    color: white;
  }

  &.warning {
    background: #FF9500;
    border-color: #FF9500;
    color: white;
  }
}

.btn-loader {
  width: 18px;
  height: 18px;
}

.btn-content {
  display: flex;
  align-items: center;
  gap: 8px;
}
</style>