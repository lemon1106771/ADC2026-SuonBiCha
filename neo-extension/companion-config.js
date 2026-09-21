globalThis.NEO_CONFIG = Object.freeze({
  defaults: { enabled: true, proactive: true, followCursor: true, demoMode: false, snoozeUntil: 0, aiEnabled: false },
  normal: { drift: 60_000, deepFocus: 25 * 60_000, fieldPause: 45_000, cooldown: 2 * 60_000 },
  demo: { drift: 8_000, deepFocus: 20_000, fieldPause: 12_000, cooldown: 20_000 }
});
