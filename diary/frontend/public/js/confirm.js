// Подтверждение действий внутри приложения (модалка вместо window.confirm).
// Использование:
//   const { confirmState, askConfirm, resolveConfirm } = useConfirm();
//   const ok = await askConfirm({ title, message, confirmText, danger });
import { ref } from 'vue';

export function useConfirm() {
  const confirmState = ref({
    show: false,
    title: '',
    message: '',
    confirmText: 'Подтвердить',
    cancelText: 'Отмена',
    danger: true,
  });

  let resolver = null;

  function askConfirm(options = {}) {
    confirmState.value = {
      show: true,
      title: 'Подтвердите действие',
      message: '',
      confirmText: 'Подтвердить',
      cancelText: 'Отмена',
      danger: true,
      ...options,
    };
    return new Promise((resolve) => {
      resolver = resolve;
    });
  }

  function resolveConfirm(ok) {
    confirmState.value = { ...confirmState.value, show: false };
    if (resolver) {
      resolver(ok);
      resolver = null;
    }
  }

  return { confirmState, askConfirm, resolveConfirm };
}
