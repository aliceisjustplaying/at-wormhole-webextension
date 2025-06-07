import { describe, it, expect } from "vitest"
import { Effect, Layer, Context } from "effect"

/*
 * Understanding Layer.succeed
 * 
 * Let's break down what layers actually are and what
 * Layer.succeed does.
 */

// First, let's create a simple service to work with
interface CalculatorService {
  add: (a: number, b: number) => Effect.Effect<number>
}

class Calculator extends Context.Tag("Calculator")<
  Calculator,
  CalculatorService
>() {}

describe("Layer.succeed explained", () => {
  it("shows what Layer.succeed actually does", async () => {
    // This is our service implementation
    const CalculatorLive: CalculatorService = {
      add: (a, b) => Effect.succeed(a + b)
    }
    
    // Layer.succeed creates a layer that:
    // 1. Takes no dependencies (no input)
    // 2. Always succeeds (never fails)
    // 3. Provides the given service
    const CalculatorLayer = Layer.succeed(Calculator, CalculatorLive)
    
    // A Layer is like a "recipe" for providing a service
    // It doesn't DO anything until you use it
    
    const program = Effect.gen(function* () {
      const calc = yield* Calculator
      return yield* calc.add(2, 3)
    })
    
    // When we provide the layer, it "runs the recipe"
    const result = await Effect.runPromise(
      program.pipe(Effect.provide(CalculatorLayer))
    )
    
    expect(result).toBe(5)
  })
  
  it("shows the difference between Layer types", async () => {
    // Layer.succeed - for simple services with no dependencies
    const SimpleLayer = Layer.succeed(
      Calculator, 
      { add: (a, b) => Effect.succeed(a + b) }
    )
    
    // Layer.effect - for services that need async initialization
    const AsyncLayer = Layer.effect(
      Calculator,
      Effect.gen(function* () {
        // Could do async setup here
        yield* Effect.log("Initializing calculator...")
        yield* Effect.sleep("100 millis")
        
        return {
          add: (a, b) => Effect.succeed(a + b)
        }
      })
    )
    
    // Layer.scoped - for services that need cleanup
    const ScopedLayer = Layer.scoped(
      Calculator,
      Effect.gen(function* () {
        yield* Effect.log("Calculator starting")
        
        // Register cleanup
        yield* Effect.addFinalizer(() =>
          Effect.log("Calculator shutting down")
        )
        
        return {
          add: (a, b) => Effect.succeed(a + b)
        }
      })
    )
    
    // They all provide the same service, but with different setup
    const program = Calculator.pipe(
      Effect.flatMap(calc => calc.add(1, 1))
    )
    
    // All work the same from the user's perspective
    const r1 = await Effect.runPromise(
      Effect.provide(program, SimpleLayer)
    )
    expect(r1).toBe(2)
  })
  
  it("shows why layers are useful", async () => {
    // Let's show a simpler composition example
    // Imagine we have Config and Calculator services
    
    interface ConfigService {
      precision: number
    }
    
    class Config extends Context.Tag("Config")<Config, ConfigService>() {}
    
    // Simple layers
    const ConfigLayer = Layer.succeed(Config, { precision: 2 })
    
    const CalculatorLayer = Layer.succeed(Calculator, {
      add: (a, b) => Effect.succeed(a + b)
    })
    
    // Compose them into one layer
    const AppLayer = Layer.merge(ConfigLayer, CalculatorLayer)
    
    // Now a program can use BOTH services
    const program = Effect.gen(function* () {
      const config = yield* Config
      const calc = yield* Calculator
      
      const sum = yield* calc.add(1.234, 2.567)
      // Round to config precision
      return Math.round(sum * Math.pow(10, config.precision)) / Math.pow(10, config.precision)
    })
    
    const result = await Effect.runPromise(
      Effect.provide(program, AppLayer)
    )
    
    expect(result).toBe(3.8) // Rounded to 2 decimal places
  })
})

/*
 * Summary:
 * 
 * Layer.succeed creates a "simple recipe" that says:
 * "When someone needs this service, give them this implementation"
 * 
 * It's called "succeed" because it can't fail - there's no
 * async work, no initialization that could error.
 * 
 * Our ParserLayer = Layer.succeed(Parser, ParserLive) means:
 * "When someone needs a Parser, give them ParserLive"
 */