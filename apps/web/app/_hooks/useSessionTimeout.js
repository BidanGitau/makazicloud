"use client";

import { useEffect, useRef, useCallback, useState } from "react";

const IDLE_TIMEOUT_MS = 25 * 60 * 1000;
const WARNING_DURATION_S = 5 * 60;

const ACTIVITY_EVENTS = ["mousemove", "mousedown", "keydown", "touchstart", "scroll", "click"];

export function useSessionTimeout(onLogout) {
  const [showWarning, setShowWarning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(WARNING_DURATION_S);

  const idleTimer = useRef(null);
  const countdownTimer = useRef(null);

  const clearTimers = () => {
    clearTimeout(idleTimer.current);
    clearInterval(countdownTimer.current);
  };

  const startCountdown = useCallback(() => {
    setSecondsLeft(WARNING_DURATION_S);
    setShowWarning(true);

    let remaining = WARNING_DURATION_S;
    countdownTimer.current = setInterval(() => {
      remaining -= 1;
      setSecondsLeft(remaining);
      if (remaining <= 0) {
        clearInterval(countdownTimer.current);
        setShowWarning(false);
        onLogout();
      }
    }, 1000);
  }, [onLogout]);

  const resetIdleTimer = useCallback(() => {
    if (showWarning) return;
    clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(startCountdown, IDLE_TIMEOUT_MS);
  }, [showWarning, startCountdown]);

  const stayLoggedIn = useCallback(() => {
    clearTimers();
    setShowWarning(false);
    idleTimer.current = setTimeout(startCountdown, IDLE_TIMEOUT_MS);
  }, [startCountdown]);

  useEffect(() => {
    idleTimer.current = setTimeout(startCountdown, IDLE_TIMEOUT_MS);

    ACTIVITY_EVENTS.forEach((e) => window.addEventListener(e, resetIdleTimer, { passive: true }));

    return () => {
      clearTimers();
      ACTIVITY_EVENTS.forEach((e) => window.removeEventListener(e, resetIdleTimer));
    };
  }, [resetIdleTimer, startCountdown]);

  return { showWarning, secondsLeft, stayLoggedIn };
}
