export function updateAnimationLayout(app: HTMLElement): void {
  const layout = app.querySelector<HTMLElement>('.app-layout');
  const topPanel = app.querySelector<HTMLElement>('.top-panel');
  const stage = app.querySelector<HTMLElement>('.stage');

  if (!layout || !topPanel || !stage) {
    return;
  }

  const layoutHeight = layout.clientHeight;
  const topHeight = topPanel.offsetHeight;
  const availableHeight = Math.max(layoutHeight - topHeight - 4, 100);
  const availableWidth = Math.max(stage.clientWidth, 100);
  const size = Math.floor(Math.min(availableWidth, availableHeight) * 0.98);

  layout.style.setProperty('--anim-size', `${size}px`);
}

export function bindAnimationLayout(app: HTMLElement): void {
  const layout = app.querySelector<HTMLElement>('.app-layout');
  if (!layout) {
    return;
  }

  const observer = new ResizeObserver(() => {
    updateAnimationLayout(app);
  });

  observer.observe(layout);
  window.addEventListener('resize', () => updateAnimationLayout(app));
}
