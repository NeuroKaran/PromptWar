/**
 * Tab Visibility Manager
 * Pauses game loops when the browser tab is hidden to conserve resources.
 * Per Games-skills.md: "Pause when hidden" for tab throttling constraint.
 */

type VisibilityCallback = (isVisible: boolean) => void;

class TabVisibilityManager {
  private callbacks: Set<VisibilityCallback> = new Set();
  private _isVisible: boolean = true;

  constructor() {
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', this.handleChange);
      this._isVisible = !document.hidden;
    }
  }

  private handleChange = () => {
    this._isVisible = !document.hidden;
    this.callbacks.forEach((cb) => cb(this._isVisible));
  };

  get isVisible(): boolean {
    return this._isVisible;
  }

  subscribe(callback: VisibilityCallback): () => void {
    this.callbacks.add(callback);
    return () => this.callbacks.delete(callback);
  }

  destroy() {
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.handleChange);
    }
    this.callbacks.clear();
  }
}

// Singleton
let instance: TabVisibilityManager | null = null;

export function getTabVisibility(): TabVisibilityManager {
  if (!instance) {
    instance = new TabVisibilityManager();
  }
  return instance;
}

export { TabVisibilityManager };
