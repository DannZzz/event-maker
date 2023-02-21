# Event System

- Event
- Listeners
- Easy handling
- Middlewares

## Installation

```sh
npm install @onlydann/event-maker
```

or

```sh
yarn add @onlydann/event-maker
```

## Get Started

```ts
import { EventMaker, Listener, Middleware } from "@onlydann/event-maker"

interface Events {
  hello: (name: string) => void
}

const event = new EventMaker<Events>({
  logs: true,
  name: "Tokens",
})

event.on("hello", (name) => console.log(`Hello ${name}`))

event.middleware((event, action) => {
  if (event === "hello") {
    action.payload = action.payload.map((arg) => "Mr " + arg)
  }
})

event.setDisconnectAfterOffline(6000)

event.emit("hello", "Mark")
/// Hello Mr Mark
```
