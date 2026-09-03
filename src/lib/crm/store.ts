export interface KeyValueStore {
  get(key: string): string | null;
  set(key: string, value: string): void;
  delete(key: string): void;
}

export class MemoryStore implements KeyValueStore {
  private readonly data = new Map<string, string>();

  get(key: string): string | null {
    return this.data.get(key) ?? null;
  }

  set(key: string, value: string): void {
    this.data.set(key, value);
  }

  delete(key: string): void {
    this.data.delete(key);
  }
}

export class PrefixedStore implements KeyValueStore {
  constructor(
    private readonly inner: KeyValueStore,
    private readonly prefix: string,
  ) {}

  get(key: string): string | null {
    return this.inner.get(this.prefix + key);
  }

  set(key: string, value: string): void {
    this.inner.set(this.prefix + key, value);
  }

  delete(key: string): void {
    this.inner.delete(this.prefix + key);
  }
}

export class WebStorageStore implements KeyValueStore {
  constructor(private readonly storage: Pick<Storage, "getItem" | "setItem" | "removeItem">) {}

  get(key: string): string | null {
    return this.storage.getItem(key);
  }

  set(key: string, value: string): void {
    this.storage.setItem(key, value);
  }

  delete(key: string): void {
    this.storage.removeItem(key);
  }
}

export function createBrowserStore(): KeyValueStore {
  try {
    const probe = "__spoorlinde_probe";
    window.localStorage.setItem(probe, "1");
    window.localStorage.removeItem(probe);
    return new WebStorageStore(window.localStorage);
  } catch {
    return new MemoryStore();
  }
}
