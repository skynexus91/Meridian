const fs = require('fs');
let css = fs.readFileSync('src/styles.css', 'utf8');
const add = `
/* Bottom sheet (Organic Maps style) */
.bottom-sheet {
  position: fixed;
  inset: 0;
  z-index: 60;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  background: rgba(0, 0, 0, 0.4);
}
.bottom-sheet .sheet-handle {
  width: 36px;
  height: 5px;
  background: var(--line);
  border-radius: 3px;
  margin: 10px auto 16px;
}
.bottom-sheet .sheet-content {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: var(--surface);
  border-radius: 20px 20px 0 0;
  padding: 24px 20px;
  box-shadow: 0 -20px 40px -10px rgba(0, 0, 0, 0.25);
  max-height: 70vh;
  overflow-y: auto;
}
.bottom-sheet .sheet-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--ink);
  margin-bottom: 16px;
}
.bottom-sheet .sheet-stats {
  display: flex;
  gap: 24px;
  margin-bottom: 20px;
}
.bottom-sheet .stat {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.bottom-sheet .stat-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--ink);
}
.bottom-sheet .stat-label {
  font-size: 0.875rem;
  color: var(--muted);
}
.bottom-sheet .sheet-actions {
  display: flex;
  gap: 10px;
}
.bottom-sheet .sheet-actions .btn {
  flex: 1;
  padding: 12px 16px;
  border-radius: 12px;
  font-size: 1rem;
  font-weight: 600;
  border: none;
  cursor: pointer;
  transition: background 0.15s;
}
.bottom-sheet .sheet-actions .btn-primary {
  background: var(--accent);
  color: var(--ink);
}
.bottom-sheet .sheet-actions .btn-primary:hover {
  filter: brightness(0.95);
}
.bottom-sheet .sheet-actions .btn-ghost {
  background: var(--surface-soft);
  color: var(--ink);
}
.bottom-sheet .sheet-actions .btn-ghost:hover {
  background: var(--line);
}
.bottom-sheet .sheet-close {
  position: absolute;
  top: 12px;
  right: 16px;
  background: none;
  border: none;
  color: var(--ink-2);
  cursor: pointer;
  padding: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.bottom-sheet .sheet-close:hover {
  color: var(--accent);
}
.btn:focus-visible, button:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
html[data-theme="dark"] .bottom-sheet .sheet-actions .btn-ghost {
  background: var(--surface-soft);
}
html[data-theme="dark"] .bottom-sheet .sheet-actions .btn-ghost:hover {
  background: var(--line);
}

`;
// Insert before the first @media or at end
if (css.includes('.bottom-sheet')) {
  console.log('Bottom sheet CSS already present');
} else {
  css += add;
  fs.writeFileSync('src/styles.css', css);
  console.log('Bottom sheet CSS added');
}
