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
  padding: 14px 28px;
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  background: var(--glass-bg);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border: 1px solid var(--glass-border);
  border-radius: 14px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  overflow: hidden;
  transition: transform 250ms ease, box-shadow 250ms ease, opacity 250ms ease, background 250ms ease;
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
      rgba(255, 255, 255, 0.25),
      transparent
    );
    transition: left 0.6s ease;
  }

  &:hover {
    transform: scale(1.02) translateY(-2px);
    box-shadow: 0 16px 40px rgba(0, 0, 0, 0.15);

    &::before {
      left: 100%;
    }
  }

  &:active {
    transform: scale(0.97) translateY(0);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  }

  &:disabled {
    opacity: 0.5;
    pointer-events: none;
    transform: none;
    box-shadow: none;
  }

  &.primary {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-color: transparent;
    color: white;
    box-shadow: 0 8px 24px rgba(102, 126, 234, 0.35);

    &:hover {
      box-shadow: 0 16px 36px rgba(102, 126, 234, 0.45);
    }

    &:active {
      box-shadow: 0 4px 16px rgba(102, 126, 234, 0.3);
    }
  }

  &.success {
    background: linear-gradient(135deg, #34C759 0%, #30B350 100%);
    border-color: transparent;
    color: white;
    box-shadow: 0 8px 24px rgba(52, 199, 89, 0.35);

    &:hover {
      box-shadow: 0 16px 36px rgba(52, 199, 89, 0.45);
    }
  }

  &.danger {
    background: linear-gradient(135deg, #FF3B30 0%, #E02D24 100%);
    border-color: transparent;
    color: white;
    box-shadow: 0 8px 24px rgba(255, 59, 48, 0.35);

    &:hover {
      box-shadow: 0 16px 36px rgba(255, 59, 48, 0.45);
    }
  }

  &.warning {
    background: linear-gradient(135deg, #FF9500 0%, #E08600 100%);
    border-color: transparent;
    color: white;
    box-shadow: 0 8px 24px rgba(255, 149, 0, 0.35);

    &:hover {
      box-shadow: 0 16px 36px rgba(255, 149, 0, 0.45);
    }
  }
}

.btn-loader {
  width: 18px;
  height: 18px;
}

.btn-loader::before {
  content: '';
  width: 18px;
  height: 18px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.btn-content {
  display: flex;
  align-items: center;
  gap: 8px;
}
</style>