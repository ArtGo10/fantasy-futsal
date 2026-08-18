import { useEffect, useRef } from "react";
import { Keyboard } from "react-native";

export function useDismissKeyboardOnChange(dependencies: readonly unknown[]) {
  const hasMountedRef = useRef(false);

  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }

    Keyboard.dismiss();
  }, dependencies);
}
