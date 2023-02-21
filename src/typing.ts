export type AnyObject = { [k: string | number | symbol]: any }

export enum EventStatus {
  IDLE = "idle",
  DISCONNECTED = "disconnected",
  PROCESSING = "processing",
}

const Cooldowns = new Set<string>()

/**
 * Listener Object
 */
export class Listener<T extends AnyObject, K extends keyof AnyObject = any> {
  private readonly symbol: symbol
  readonly event: K
  private readonly listener: T[K]

  /**
   * Creates Listener object
   *
   * @param {{event: string, listener: Function}} options
   */
  constructor({ event, listener }: { event: K; listener: T[K] }) {
    this.event = event
    this.symbol = Symbol()
    this.listener = listener
  }

  toString() {
    return `L(${new String(this.event)})`
  }

  /**
   * Wheter or not listeners are the same
   *
   * @param {Listener<any>} listener
   */
  is(listener: Listener<any>): boolean
  /**
   * Wheter or not listeners have the same event names
   *
   * @param {Listener<any>} listener
   */
  is(event: any): boolean
  is(arg1: string | Listener<any>): boolean {
    return arg1 instanceof Listener
      ? this.symbol === arg1.symbol
      : this.event === arg1
  }

  /**
   * Runs listening function
   *
   * @param {any} args
   */
  do(...args: Parameters<T[K]>) {
    this.listener(...args)
  }
}

export type ActionPayload<T> = T extends unknown
  ? { payload: any; date: Date }
  : { payload: T; date: Date }

export type MiddlewareFunction<E extends AnyObject> = (
  event: keyof E,
  action: ActionPayload<Parameters<E[keyof E]>>
) => void | false

export class Middleware<E extends AnyObject> {
  private _fn: MiddlewareFunction<E>

  /**
   * ! Not allowed
   * ! Create middlewares with EventMaker's method
   */
  constructor(fn: MiddlewareFunction<E>) {
    Object.defineProperty(this, "_fn", {
      enumerable: false,
      writable: true,
      value: fn,
    })
  }

  /**
   * ! Not allowed
   *
   * @param {any} args
   * @returns {any}
   */
  do(...args: Parameters<MiddlewareFunction<E>>) {
    return this._fn(...args)
  }

  /**
   * Can be used for cooldowning something by key
   *
   * @param {string} key any key
   * @param {number} ms milliseconds
   * @returns {boolean} cooldown - true
   *
   * @example
   * .middleware((event, args) => {
   *   // Allows event handling one time in 3 seconds
   *   if (Middleware.cooldown(event, 3000)) return false
   * })
   */
  static cooldown(key: string, ms: number): boolean {
    if (Cooldowns.has(key)) return true
    Cooldowns.add(key)
    const t = setTimeout(() => {
      Cooldowns.delete(key)
      clearTimeout(t)
    }, ms)
    return false
  }

  /**
   * Sets new values after filtering args
   *
   * @param {ActionPayload<T>} action
   * @param {Function} cb
   *
   * @example
   * .middleware((event, args) => {
   *
   *   Middleware.filter(args, (arg) => arg === "Mark")
   * })
   */
  static filter<T extends any>(
    action: ActionPayload<T>,
    cb: (val: T, index: number) => boolean
  ) {
    action.payload = action.payload.filter(cb)
  }

  /**
   * Sets new values after mapping args
   *
   * @param {ActionPayload<T>} action
   * @param {Function} cb
   *
   * @example
   * .middleware((event, args) => {
   *
   *   Middleware.map(args, (arg) => arg + 1)
   * })
   */
  static map<T extends any>(
    action: ActionPayload<T>,
    cb: (val: T, index: number) => any
  ) {
    action.payload = action.payload.map(cb)
  }
}
