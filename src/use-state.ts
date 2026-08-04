import { getCurrentInstance, inject, ref, watch, type InjectionKey, type Ref } from 'vue';

type StateInitializer<T> = T | (() => T);

interface UseStateOptions {
  persist?: boolean;
}

type StateRegistry = Map<string, Ref<unknown>>;
type StopPersistence = () => void;

interface ProvideApp {
  provide<T>(key: InjectionKey<T>, value: T): unknown;
}

const registryKey: InjectionKey<StateRegistry> = Symbol('dlbr-state-registry');

/**
 * Module scope on a Worker outlives a single request — isolates are reused
 * across users. Anything server-rendered therefore gets a per-request registry
 * provided by the app; the module-level map is a browser-only convenience so
 * `useState` still works outside a component (see `main.ts`).
 */
const clientRegistry: StateRegistry = new Map();
const persistenceStops = new Map<string, StopPersistence>();
const STATE_STORAGE_PREFIX = 'dlbr:state:';

export function provideStateRegistry(app: ProvideApp): StateRegistry {
  const registry: StateRegistry = new Map();
  app.provide(registryKey, registry);
  return registry;
}

function getRegistry(key: string): StateRegistry {
  if (getCurrentInstance()) {
    const scoped = inject(registryKey, null);
    if (scoped) return scoped;
  }

  if (import.meta.env.SSR) {
    throw new Error(
      `useState("${key}") ran on the server without a request-scoped registry. `
      + 'Call provideStateRegistry(app) per request, and only call useState from component setup during SSR.',
    );
  }

  return clientRegistry;
}

function getStorage() {
  if (typeof localStorage === 'undefined') return null;

  try {
    return localStorage;
  } catch {
    return null;
  }
}

export function useState<T>(key: string, initialState: StateInitializer<T>, options: UseStateOptions = {}): Ref<T> {
  const stateRegistry = getRegistry(key);
  const existingState = stateRegistry.get(key);
  if (existingState) return existingState as Ref<T>;

  const storage = options.persist ? getStorage() : null;
  const storageKey = `${STATE_STORAGE_PREFIX}${key}`;
  let persistedValue: string | null = null;
  let stateValue!: T;
  let restored = false;

  try {
    persistedValue = storage?.getItem(storageKey) ?? null;
  } catch {
    persistedValue = null;
  }

  if (persistedValue !== null) {
    try {
      stateValue = JSON.parse(persistedValue) as T;
      restored = true;
    } catch {
      try {
        storage?.removeItem(storageKey);
      } catch {
        // Ignore invalid or unavailable persisted state.
      }
    }
  }

  if (!restored) {
    stateValue = typeof initialState === 'function'
      ? (initialState as () => T)()
      : initialState;
  }

  const state = ref(stateValue) as Ref<T>;
  stateRegistry.set(key, state as Ref<unknown>);

  if (storage) {
    const stop = watch(state, (nextValue) => {
      try {
        storage.setItem(storageKey, JSON.stringify(nextValue));
      } catch {
        // Storage can reject writes when it is full or blocked by privacy settings.
      }
    }, { deep: true });
    persistenceStops.set(key, stop);
  }

  return state;
}

export function clearState(key?: string) {
  const storage = getStorage();

  if (key) {
    persistenceStops.get(key)?.();
    persistenceStops.delete(key);
    clientRegistry.delete(key);
    try {
      storage?.removeItem(`${STATE_STORAGE_PREFIX}${key}`);
    } catch {
      // Storage can be unavailable; the in-memory drop already happened.
    }
    return;
  }

  for (const stop of persistenceStops.values()) stop();
  persistenceStops.clear();

  for (const registryKeyName of clientRegistry.keys()) {
    try {
      storage?.removeItem(`${STATE_STORAGE_PREFIX}${registryKeyName}`);
    } catch {
      // Ignore storage failures while clearing.
    }
  }
  clientRegistry.clear();
}