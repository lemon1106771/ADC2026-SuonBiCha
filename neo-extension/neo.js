/* Shared quiet presence for Minh and Lan. No network, diagnosis, or tracking. */
window.Neo = (() => {
  const mascot = document.getElementById('neo');
  const bubble = document.getElementById('neo-bubble');
  const ring = document.getElementById('neo-ring');
  let target = null;
  function position() {
    if (!target || !target.isConnected || !target.getClientRects().length) return;
    const rect = target.getBoundingClientRect();
    const left = Math.max(8, Math.min(rect.right + 12, innerWidth - 62));
    const top = Math.max(12, Math.min(rect.top + rect.height / 2 - 22, innerHeight - 64));
    mascot.style.left = `${left}px`; mascot.style.top = `${top}px`;
    bubble.style.left = `${Math.max(12, Math.min(left - 275, innerWidth - 310))}px`;
    bubble.style.top = `${Math.max(12, top - 88)}px`;
    Object.assign(ring.style, { left: `${rect.left - 9}px`, top: `${rect.top - 9}px`, width: `${rect.width + 18}px`, height: `${rect.height + 18}px` });
    const ellipse = ring.querySelector('ellipse');
    ellipse.setAttribute('cx', (rect.width + 18) / 2); ellipse.setAttribute('cy', (rect.height + 18) / 2);
    ellipse.setAttribute('rx', (rect.width + 12) / 2); ellipse.setAttribute('ry', (rect.height + 12) / 2);
  }
  function rest() { target = null; mascot.classList.add('resting'); mascot.style.left = ''; mascot.style.top = ''; bubble.hidden = true; ring.hidden = true; }
  function point(element, message, highlight = true) {
    target = element; mascot.classList.remove('resting');
    document.getElementById('neo-message').textContent = message || '';
    bubble.hidden = !message; ring.hidden = !highlight;
    ring.classList.remove('draw'); void ring.getBoundingClientRect(); ring.classList.add('draw'); position();
  }
  document.getElementById('dismiss-neo').addEventListener('click', rest);
  window.addEventListener('resize', position); window.addEventListener('scroll', position, true);
  return { point, rest };
})();
