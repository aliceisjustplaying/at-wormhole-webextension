import { Layer } from "effect"
import { Parser, ParserLive } from "./parser"

/*
 * Parser Layer
 * 
 * This provides the Parser service to our application.
 * Since Parser doesn't have any dependencies yet,
 * we can use Layer.succeed for simple instantiation.
 */

export const ParserLayer = Layer.succeed(Parser, ParserLive)

/*
 * As we build more services that depend on Parser,
 * or when Parser needs external dependencies (like
 * API clients for handle resolution), we'll update
 * this layer to handle those compositions.
 */