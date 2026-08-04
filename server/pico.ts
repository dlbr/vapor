import type { Fetch, Handler, PicoType, Route } from './pico-types'

export const Pico = (): PicoType => {
  const routes: Route[] = []
  const f: {
    fetch: Fetch
    on: (method: string, path: string, handler: Handler) => void
  } = {
    fetch: (req, env, executionContext) => {
      const m = req.method
      for (let i = 0, len = routes.length; i < len; i++) {
        const route = routes[i]
        if (route.m !== m && route.m !== 'ALL') continue
        const result = route.p.exec(req.url)
        if (result) return route.h({
          req,
          env,
          executionContext,
          result,
        })
      }
      return new Response('Not Found', { status: 404 })
    },
    on: (method, path, handler) => {
      routes.push({
        p: new URLPattern({
          pathname: path,
        }),
        m: method.toUpperCase(),
        h: handler,
      })
    },
  }
  const p = new Proxy({} as PicoType, {
    get:
      (_, prop: string, receiver) => {
        if (prop === 'routes') return routes
        return (...args: unknown[]) => {
          if (prop === 'fetch' || prop === 'on') {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            return f[prop](...args)
          }
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          f['on'](prop, ...args)
          return receiver
        }
      },
  })

  return p as PicoType
}