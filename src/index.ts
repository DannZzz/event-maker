import colors from "colors"
import {
  ActionPayload,
  AnyObject,
  EventStatus,
  Listener,
  Middleware,
  MiddlewareFunction,
} from "./typing.js"
export { Listener, Middleware, MiddlewareFunction } from "./typing.js"

type DefaultEvents<T extends { [k: string]: (...args: any[]) => void }> = T & {
  disconnect: (event: EventMaker<T>) => void
  connect: (event: EventMaker<T>) => void
}

/**
 * Main Class Event Maker
 */
export class EventMaker<T extends AnyObject = {}> {
  private _status: EventStatus
  private _logs: boolean
  private name: string
  private _disconnectAfter: number
  private _disconnectTimer
  private _listeners: Array<Listener<DefaultEvents<T>>>
  private _listenersOnce: Array<Listener<DefaultEvents<T>>>
  private _middlewares: Array<Middleware<DefaultEvents<T>>>

  /**
   * Creates new EventMaker class
   */
  constructor()
  /**
   * Creates new EventMaker class
   * Enabling Logs and giving a name
   * @param {{ logs?: boolean; name?: string }} options
   */
  constructor(options: { logs?: boolean; name?: string })
  constructor(options: { logs?: boolean; name?: string } = {}) {
    Object.defineProperty(this, "_logs", {
      enumerable: false,
      writable: true,
      value: Boolean(options?.logs),
    })
    Object.defineProperty(this, "_status", {
      enumerable: false,
      writable: true,
      value: EventStatus.IDLE,
    })
    Object.defineProperty(this, "_disconnectAfter", {
      enumerable: false,
      writable: true,
      value: null,
    })
    Object.defineProperty(this, "_disconnectTimer", {
      enumerable: false,
      writable: true,
      value: null,
    })
    Object.defineProperty(this, "_status", {
      enumerable: false,
      writable: true,
      value: EventStatus.IDLE,
    })
    Object.defineProperty(this, "_listeners", {
      enumerable: false,
      writable: true,
      value: [],
    })
    Object.defineProperty(this, "_listenersOnce", {
      enumerable: false,
      writable: true,
      value: [],
    })
    Object.defineProperty(this, "_middlewares", {
      enumerable: false,
      writable: true,
      value: [],
    })

    if (options?.name) this.name = options.name
  }

  /**
   * Gets all listeners
   * @type {Listener<any, any>[]}
   */
  get listeners(): Listener<DefaultEvents<T>, any>[] {
    return [...this._listeners, ...this._listenersOnce]
  }

  /**
   * Removes specified listener
   *
   * @param {Listener<any, any>} listener
   */
  removeListener(listener: Listener<any>) {
    this._listeners = this._listeners.filter((lst) => lst.is(listener))
    this._listenersOnce = this._listenersOnce.filter((lst) => lst.is(listener))
    this.log(`Listener "${listener}" was removed`)
  }

  /**
   * Removes listeners by event name
   *
   * @param {string} event
   */
  removeListeners(event: keyof DefaultEvents<T>) {
    const oldCount = this.listeners.length
    this._listeners = this._listeners.filter((lst) => lst.is(event))
    this._listenersOnce = this._listenersOnce.filter((lst) => lst.is(event))
    this.log(
      `${oldCount - this.listeners.length} Listeners for "${new String(
        event
      )}" were removed`
    )
  }

  /**
   * Removes all listeners
   */
  removeAllListeners() {
    this._listeners = []
    this._listenersOnce = []
    this.log("All listeners were removed")
  }

  /**
   * Creates middleware function
   * How it works?
   * emit --> middleware --> listener
   *
   * @param {MiddlewareFunction<DefaultEvents<T>>} fn
   */
  middleware(fn: MiddlewareFunction<DefaultEvents<T>>) {
    // @ts-ignore
    const mid = new Middleware(fn)
    this._middlewares.push(mid)
    this.log("Middleware function was registered")
  }

  /**
   * Register an existing listener
   *
   * @param {Listener<any>} listener
   * @returns {Listener<any>} the same listener
   */
  on<K extends keyof DefaultEvents<T>>(
    listener: Listener<DefaultEvents<T>, K>
  ): Listener<DefaultEvents<T>, K>
  /**
   * Creates an event listener
   *
   * @param {string} event event name
   * @param {Function} listener listening function
   * @returns {Listener<any>} listener class
   */
  on<K extends keyof DefaultEvents<T>>(
    event: K,
    listener: DefaultEvents<T>[K]
  ): Listener<DefaultEvents<T>, K>
  on<K extends keyof DefaultEvents<T>>(
    event: K | Listener<DefaultEvents<T>, K>,
    listener?: DefaultEvents<T>[K]
  ): Listener<DefaultEvents<T>, K> {
    this.log(`Listener for ${new String(event)} was registered`)
    if (event instanceof Listener) {
      this._listeners.push(event)
      return event
    } else {
      const _ = new Listener({ event, listener })
      this._listeners.push(_)
      return _
    }
  }

  /**
   * Register an existing listener which will work once
   *
   * @param {Listener<any>} listener
   * @returns {Listener<any>} the same listener
   */
  once<K extends keyof DefaultEvents<T>>(
    listener: Listener<DefaultEvents<T>, K>
  ): Listener<DefaultEvents<T>, K>
  /**
   * Creates an event listener whick will work once
   *
   * @param {string} event event name
   * @param {Function} listener listening function
   * @returns {Listener<any>} listener class
   */
  once<K extends keyof DefaultEvents<T>>(
    event: K,
    listener: DefaultEvents<T>[K]
  ): Listener<DefaultEvents<T>, K>
  once<K extends keyof DefaultEvents<T>>(
    event: K | Listener<DefaultEvents<T>, K>,
    listener?: DefaultEvents<T>[K]
  ): Listener<DefaultEvents<T>, K> {
    this.log(`Listener for ${new String(event)} was registered`)
    if (event instanceof Listener) {
      this._listenersOnce.push(event)
      return event
    } else {
      const _ = new Listener({ event, listener })
      this._listenersOnce.push(_)
      return _
    }
  }

  /**
   * Emits data
   *
   * @param {string} event event name
   * @param args arguments (data)
   */
  emit<K extends keyof DefaultEvents<T>>(
    event: K,
    ...args: Parameters<DefaultEvents<T>[K]>
  ) {
    if (!this.isDisconnected() || this.listeners.length === 0) {
      this.log(`Accepted data for "${new String(event)}": ${args}`)

      const action = {
        payload: args,
        date: new Date(),
      } as ActionPayload<typeof args>

      for (let md of this._middlewares) {
        // @ts-ignore
        const retType = md.do(event, action)
        if (retType === false) {
          this.log("Middleware Function stopped the process", "red")
          return
        }
      }

      let count = 0
      this._status = EventStatus.PROCESSING
      const listeners = this._listeners.filter((listener) => listener.is(event))

      listeners.forEach((lst) => {
        lst.do(...action.payload)
      })

      const listenersOnce = this._listenersOnce.filter((listener) =>
        listener.is(event)
      )
      listenersOnce.forEach((listener) => {
        listener.do(...action.payload)
      })
      this._listenersOnce = this._listenersOnce.filter(
        (listener) => !listener.is(event)
      )
      count = listeners.length + listenersOnce.length
      if (!this.isDisconnected()) this._status = EventStatus.IDLE
      if (count > 0) this.updateTimer()
      this.log(`Processed for ${count} listeners`)
    } else {
      this.log("Emit failed (disconnected)", "red")
    }
  }

  /**
   * Sets time in ms
   * EventMaker will be disconnected if no one listener will work after last activity
   *
   * @param {number} ms milliseconds
   * @returns {EventMaker}
   */
  setDisconnectAfterOffline(ms: number): this {
    if (typeof ms === "number") {
      this._disconnectAfter = ms
      this.log(`Idling time was setted: ${ms} ms`)
    }
    this.updateTimer()
    return this
  }

  /**
   * Wheter the EventMaker is currently processing data
   *
   * @returns {boolean}
   */
  isProcessing(): boolean {
    return this._status === EventStatus.PROCESSING
  }

  /**
   * Wheter the EventMaker is currently idling
   *
   * @returns {boolean}
   */
  isIdling(): boolean {
    return this._status === EventStatus.IDLE
  }

  /**
   * Wheter the EventMaker is disconnected
   *
   * @returns {boolean}
   */
  isDisconnected(): boolean {
    return this._status === EventStatus.DISCONNECTED
  }

  /**
   * Disconnects EventMaker
   */
  disconnect(): void
  /**
   * Disconnects EventMaker after ms
   *
   * @param {number} timeout milliseconds
   */
  disconnect(timeout: number): void
  disconnect(timeout?: number) {
    if (typeof timeout !== "number") {
      this._disconnectTimer = null
      ;(this.emit as any)("disconnect", this)
      this._status = EventStatus.DISCONNECTED
      this.log("Disconnected", "gray")
    } else {
      const t = setTimeout(() => {
        this.disconnect()
        clearTimeout(t)
      }, timeout)
    }
  }

  /**
   * Connects EventMaker
   */
  connect(): void
  /**
   * Connects EventMaker after ms
   *
   * @param {number} timeout string
   */
  connect(timeout: number): void
  connect(timeout?: number) {
    if (typeof timeout !== "number") {
      ;(this.emit as any)("connect", this)
      this._status = EventStatus.IDLE
      this.log("Connected", "gray")
      this.updateTimer()
    } else {
      const t = setTimeout(() => {
        this.connect()
        clearTimeout(t)
      }, timeout)
    }
  }

  /**
   * Creates a Listener object
   *
   * @param {string} event event name
   * @param {Function} listener listening function
   * @returns {Listener<any>}
   */
  createListener<K extends keyof DefaultEvents<T>>(
    event: K,
    listener: DefaultEvents<T>[K]
  ): Listener<DefaultEvents<T>, K> {
    return new Listener({ event, listener })
  }

  private updateTimer() {
    if (typeof this._disconnectAfter === "number") {
      clearTimeout(this._disconnectTimer)
      this._disconnectTimer = setTimeout(() => {
        this.disconnect()
        this.log(
          `No data processed for the last ${this._disconnectAfter} ms`,
          "red"
        )
      }, this._disconnectAfter)
    }
  }

  private log(msg: string, color: string = "green") {
    if (this._logs)
      console.log(
        colors[color](`EventMaker${this.name ? `(${this.name})` : ""} | ${msg}`)
      )
  }

  toString() {
    return `EventMaker${this.name ? `(${this.name})` : ""}`
  }
}
