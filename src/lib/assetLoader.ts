/**
 * Progressive Asset Loader
 * Per Games-skills.md:
 * - Startup: Core assets, <2MB
 * - Gameplay: Stream on demand
 * - Background: Prefetch next level
 * Anti-pattern: "Load all assets upfront → Progressive loading"
 */

export interface AssetManifest {
  id: string;
  src: string;
  priority: 'startup' | 'gameplay' | 'background';
}

// Define all game assets with loading priorities
export const ASSET_MANIFEST: AssetManifest[] = [
  // Startup: Title screen needs Map.png
  { id: 'map', src: '/assets/Map.webp', priority: 'startup' },
  // Gameplay: Loaded when entering scenes
  { id: 'home', src: '/assets/Home.webp', priority: 'gameplay' },
  { id: 'cafe', src: '/assets/Cafe.webp', priority: 'gameplay' },
  { id: 'office', src: '/assets/Office.webp', priority: 'gameplay' },
];

// Fallback to PNG if WebP fails
const FALLBACK_EXT = '.png';

class AssetLoader {
  private cache: Map<string, HTMLImageElement> = new Map();
  private loading: Map<string, Promise<HTMLImageElement>> = new Map();
  private _progress: number = 0;
  private _total: number = 0;
  private _loaded: number = 0;
  private listeners: Set<(progress: number) => void> = new Set();

  get progress(): number {
    return this._total > 0 ? this._loaded / this._total : 0;
  }

  /**
   * Load assets by priority tier.
   */
  async loadByPriority(priority: 'startup' | 'gameplay' | 'background'): Promise<void> {
    const assets = ASSET_MANIFEST.filter((a) => a.priority === priority);
    this._total += assets.length;
    await Promise.all(assets.map((a) => this.loadAsset(a.id, a.src)));
  }

  /**
   * Load a single asset with WebP fallback to PNG.
   */
  async loadAsset(id: string, src: string): Promise<HTMLImageElement> {
    // Return cached
    if (this.cache.has(id)) {
      return this.cache.get(id)!;
    }

    // Return in-flight
    if (this.loading.has(id)) {
      return this.loading.get(id)!;
    }

    const loadPromise = new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => {
        this.cache.set(id, img);
        this._loaded++;
        this.notifyProgress();
        resolve(img);
      };

      img.onerror = () => {
        // Try PNG fallback
        if (src.endsWith('.webp')) {
          const fallbackSrc = src.replace('.webp', FALLBACK_EXT);
          img.onerror = () => reject(new Error(`Failed to load asset: ${id}`));
          img.src = fallbackSrc;
        } else {
          reject(new Error(`Failed to load asset: ${id}`));
        }
      };

      img.src = src;
    });

    this.loading.set(id, loadPromise);
    
    try {
      const result = await loadPromise;
      this.loading.delete(id);
      return result;
    } catch (error) {
      this.loading.delete(id);
      throw error;
    }
  }

  /**
   * Get a cached asset image element.
   */
  getAsset(id: string): HTMLImageElement | null {
    return this.cache.get(id) ?? null;
  }

  /**
   * Get asset source URL (with WebP → PNG fallback awareness).
   */
  getAssetSrc(id: string): string {
    const manifest = ASSET_MANIFEST.find((a) => a.id === id);
    if (!manifest) return '';
    // Check if WebP version loaded, otherwise use PNG fallback
    const cached = this.cache.get(id);
    if (cached) return cached.src;
    return manifest.src;
  }

  /**
   * Prefetch assets for upcoming scenes.
   */
  prefetchForScene(sceneId: string): void {
    const sceneAssetMap: Record<string, string[]> = {
      morning: ['home'],
      commute: ['map'],
      lunch: ['cafe'],
      afternoon_event: ['office', 'cafe', 'map', 'home'],
      evening: ['home'],
      explore: ['map'],
    };

    const assetIds = sceneAssetMap[sceneId] ?? [];
    assetIds.forEach((id) => {
      const manifest = ASSET_MANIFEST.find((a) => a.id === id);
      if (manifest && !this.cache.has(id)) {
        this.loadAsset(id, manifest.src).catch(() => {
          // Silently fail prefetch
        });
      }
    });
  }

  onProgress(callback: (progress: number) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private notifyProgress(): void {
    const p = this.progress;
    this.listeners.forEach((cb) => cb(p));
  }

  isLoaded(id: string): boolean {
    return this.cache.has(id);
  }

  get allStartupLoaded(): boolean {
    return ASSET_MANIFEST
      .filter((a) => a.priority === 'startup')
      .every((a) => this.cache.has(a.id));
  }
}

// Singleton
let loaderInstance: AssetLoader | null = null;

export function getAssetLoader(): AssetLoader {
  if (!loaderInstance) {
    loaderInstance = new AssetLoader();
  }
  return loaderInstance;
}

export { AssetLoader };
