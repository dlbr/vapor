import type { VaporComponent } from '@vue/runtime-vapor';
import { InjectionKey, Ref, ShallowRef, inject, markRaw, readonly, ref, shallowReadonly, shallowRef } from 'vue';

interface BrowserHistory {
  pushState(data: unknown, unused: string, url?: string | URL | null): void;
  replaceState(data: unknown, unused: string, url?: string | URL | null): void;
}

interface BrowserGlobal {
  location?: { pathname?: string };
  addEventListener?: (type: string, listener: () => void) => void;
  removeEventListener?: (type: string, listener: () => void) => void;
}

type RouteComponent = VaporComponent;
type AsyncRouteComponent = () => Promise<{ default: RouteComponent }>;

export interface RouteConfig {
  path: string;
  component?: RouteComponent | AsyncRouteComponent;
  redirect?: string;
}

/**
 * Reported by `resolve` so the server can answer with a real status code
 * instead of soft-200ing every unknown path.
 */
export interface ResolveResult {
  status: 200 | 302 | 404;
  redirect?: string;
}

export interface VaporRouter {
  currentPath: Readonly<Ref<string>>;
  currentComponent: Readonly<ShallowRef<RouteComponent | null>>;
  routeParams: Readonly<Ref<Record<string, string>>>;
  navigate: (path: string, options?: { replace?: boolean }) => Promise<void>;
  resolve: (path: string) => Promise<ResolveResult>;
  dispose: () => void;
}

const MAX_REDIRECTS = 10;

interface ProvideApp {
  provide<T>(key: InjectionKey<T>, value: T): unknown;
}

const routerKey: InjectionKey<VaporRouter> = Symbol('vapor-router');

function isAsyncRouteComponent(component: RouteConfig['component']): component is AsyncRouteComponent {
  return typeof component === 'function' && !('setup' in component) && !('render' in component);
}

/**
 * Builds a matcher from a route path. Literal segments are regex-escaped so a
 * path like `/item.detail` cannot match `/itemXdetail`; only `:param` and `*`
 * carry meaning.
 */
function compileRoute(routePath: string) {
  const paramNames: string[] = [];
  const source = routePath.replace(/:([^/]+)|(\*)|([^:*]+)/g, (segment, paramName: string | undefined, star: string | undefined) => {
    if (paramName) {
      paramNames.push(paramName);
      return '([^/]+)';
    }
    if (star) return '.*';
    return segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  });

  return { regex: new RegExp(`^${source}$`), paramNames };
}

const matcherCache = new Map<string, ReturnType<typeof compileRoute>>();

function getMatcher(routePath: string) {
  let matcher = matcherCache.get(routePath);
  if (!matcher) {
    matcher = compileRoute(routePath);
    matcherCache.set(routePath, matcher);
  }
  return matcher;
}

function safeDecode(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    // Malformed escapes (`/user/%`) must not reject the whole navigation.
    return value;
  }
}

function matchRoute(path: string, routes: RouteConfig[]) {
  for (const route of routes) {
    if (route.path === path) return { route, params: {} };

    const { regex, paramNames } = getMatcher(route.path);
    const match = path.match(regex);
    if (!match) continue;

    const params: Record<string, string> = {};
    paramNames.forEach((name, index) => {
      params[name] = safeDecode(match[index + 1] ?? '');
    });
    return { route, params };
  }

  return null;
}

async function resolveComponent(component: RouteConfig['component']) {
  if (!component) return null;
  if (isAsyncRouteComponent(component)) {
    return markRaw((await component()).default);
  }
  return markRaw(component);
}

export function createRouter(routeConfig: RouteConfig[], initialPath: string, history: BrowserHistory | null = null): VaporRouter {
  const routes = [...routeConfig];
  const currentPathRef = ref(initialPath);
  const currentComponentRef: ShallowRef<RouteComponent | null> = shallowRef(null);
  const routeParamsRef = ref<Record<string, string>>({});

  async function resolve(path: string, redirectCount = 0): Promise<ResolveResult> {
    const match = matchRoute(path, routes);

    if (!match) {
      routeParamsRef.value = {};
      currentComponentRef.value = null;
      return { status: 404 };
    }

    if (match.route.redirect) {
      // On the server a redirect is reported to the caller so it can answer
      // with a 302 rather than rendering the target under the wrong URL.
      if (!history) return { status: 302, redirect: match.route.redirect };

      if (redirectCount >= MAX_REDIRECTS) {
        throw new Error(`Redirect loop while resolving "${path}".`);
      }
      applyHistory(match.route.redirect, true);
      currentPathRef.value = match.route.redirect;
      return resolve(match.route.redirect, redirectCount + 1);
    }

    routeParamsRef.value = match.params;
    currentComponentRef.value = await resolveComponent(match.route.component);
    return { status: 200 };
  }

  function applyHistory(path: string, replace: boolean) {
    if (!history) return;
    history[replace ? 'replaceState' : 'pushState']({}, '', path);
  }

  async function navigate(path: string, options: { replace?: boolean } = {}) {
    applyHistory(path, Boolean(options.replace));
    currentPathRef.value = path;
    await resolve(path);
  }

  const browserGlobal = globalThis as unknown as BrowserGlobal;
  const onPopState = () => {
    const path = browserGlobal.location?.pathname ?? '/';
    currentPathRef.value = path;
    void resolve(path);
  };

  if (history && typeof browserGlobal.addEventListener === 'function') {
    browserGlobal.addEventListener('popstate', onPopState);
  }

  // Initial resolution is the caller's job: both entries need to await it
  // before rendering, and firing it here as well resolved every route twice.

  return {
    currentPath: readonly(currentPathRef),
    currentComponent: shallowReadonly(currentComponentRef),
    routeParams: readonly(routeParamsRef),
    navigate,
    resolve,
    dispose() {
      if (history && typeof browserGlobal.removeEventListener === 'function') {
        browserGlobal.removeEventListener('popstate', onPopState);
      }
    },
  };
}

export function provideRouter(app: ProvideApp, router: VaporRouter) {
  app.provide(routerKey, router);
}

export function useRouter() {
  const router = inject(routerKey);
  if (!router) throw new Error('Vapor router is not provided.');
  return router;
}