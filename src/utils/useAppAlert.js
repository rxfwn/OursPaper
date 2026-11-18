import { useCallback, useState } from 'react';

export function useAppAlert() {
  const [config, setConfig] = useState(null);

  const showAlert = useCallback((title, message, buttons) => {
    setConfig({ title, message, buttons });
  }, []);

  const hideAlert = useCallback(() => setConfig(null), []);

  return {
    alertProps: {
      visible: !!config,
      title: config?.title,
      message: config?.message,
      buttons: config?.buttons,
      onRequestClose: hideAlert,
    },
    showAlert,
  };
}
