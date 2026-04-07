export function hapticLight() {
  if (typeof navigator !== "undefined" && navigator.vibrate) {
    navigator.vibrate(10);
  }
}

export function hapticSuccess() {
  if (typeof navigator !== "undefined" && navigator.vibrate) {
    navigator.vibrate([12, 40, 20]);
  }
}

export function hapticWarning() {
  if (typeof navigator !== "undefined" && navigator.vibrate) {
    navigator.vibrate([20, 30, 20, 30, 20]);
  }
}
