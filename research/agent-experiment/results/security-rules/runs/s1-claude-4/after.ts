/*
 * Source:    vitejs/vite — packages/vite/src/node/utils.ts, lines 1780-1786
 * Commit:    3b72997d42e7dd2b31898d0e68461e3025e836b6 (2026-10-09T16:29:11Z)
 * Permalink: https://github.com/vitejs/vite/blob/3b72997d42e7dd2b31898d0e68461e3025e836b6/packages/vite/src/node/utils.ts#L1780-L1786
 * Function:  evalValue (exported declaration, 7 lines)
 * The function body is copied verbatim.
 *
 * License of the source repository (vitejs/vite/LICENSE), reproduced in full:
 *
 * MIT License
 *
 * Copyright (c) 2019-present, VoidZero Inc. and Vite contributors
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

const LITERAL_KEYWORDS = new Map<string, unknown>([
  ['true', true],
  ['false', false],
  ['null', null],
  ['undefined', undefined],
  ['NaN', Number.NaN],
  ['Infinity', Number.POSITIVE_INFINITY],
])

const STRING_ESCAPES = new Map<string, string>([
  ['b', '\b'],
  ['f', '\f'],
  ['n', '\n'],
  ['r', '\r'],
  ['t', '\t'],
  ['v', '\v'],
  ['0', '\0'],
])

const LINE_CONTINUATIONS = new Set(['\n', '\r', '\u{2028}', '\u{2029}'])

const IDENTIFIER_RE = /^[$_a-z][$\w]*/i
const RADIX_NUMBER_RE = /^0(?:x[\da-f]+|o[0-7]+|b[01]+)/i
const DECIMAL_NUMBER_RE = /^(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?/i
const HEX_ESCAPE_RE = /^[\da-f]{2}/i
const UNICODE_ESCAPE_RE = /^(?:[\da-f]{4}|\{([\da-f]+)\})/i
const WHITESPACE_RE = /\s/

/**
 * Parses a static JavaScript literal (object, array, string, number, boolean,
 * null or undefined) without executing any code.
 */
class StaticValueParser {
  private readonly source: string
  private pos = 0

  constructor(source: string) {
    this.source = source
  }

  parse(): unknown {
    const value = this.parseValue()
    if (this.peek() !== '') {
      this.fail('Unexpected token')
    }
    return value
  }

  private fail(message: string): never {
    throw new SyntaxError(
      `${message} at position ${this.pos} in static value: ${this.source}`,
    )
  }

  private skipTrivia(): void {
    while (this.pos < this.source.length) {
      if (WHITESPACE_RE.test(this.source.charAt(this.pos))) {
        this.pos += 1
      } else if (this.source.startsWith('//', this.pos)) {
        const end = this.source.indexOf('\n', this.pos)
        this.pos = end === -1 ? this.source.length : end
      } else if (this.source.startsWith('/*', this.pos)) {
        const end = this.source.indexOf('*/', this.pos + 2)
        if (end === -1) {
          this.fail('Unterminated comment')
        }
        this.pos = end + 2
      } else {
        return
      }
    }
  }

  private peek(): string {
    this.skipTrivia()
    return this.source.charAt(this.pos)
  }

  private consume(char: string): boolean {
    if (this.peek() !== char) {
      return false
    }
    this.pos += 1
    return true
  }

  private expect(char: string): void {
    if (!this.consume(char)) {
      this.fail(`Expected "${char}"`)
    }
  }

  private read(re: RegExp): RegExpExecArray | null {
    const match = re.exec(this.source.slice(this.pos))
    if (match) {
      this.pos += match[0].length
    }
    return match
  }

  private readNumber(): number | undefined {
    const match = this.read(RADIX_NUMBER_RE) ?? this.read(DECIMAL_NUMBER_RE)
    return match ? Number(match[0]) : undefined
  }

  private parseValue(): unknown {
    const char = this.peek()
    if (char === '(') {
      this.pos += 1
      const value = this.parseValue()
      this.expect(')')
      return value
    }
    if (char === '{') {
      return this.parseObject()
    }
    if (char === '[') {
      return this.parseArray()
    }
    if (char === '"' || char === "'" || char === '`') {
      return this.parseString()
    }
    if (char === '-' || char === '+') {
      return this.parseSigned(char)
    }
    const number = this.readNumber()
    if (number !== undefined) {
      return number
    }
    const identifier = this.read(IDENTIFIER_RE)
    if (identifier && LITERAL_KEYWORDS.has(identifier[0])) {
      return LITERAL_KEYWORDS.get(identifier[0])
    }
    return this.fail('Unexpected token')
  }

  private parseSigned(sign: string): number {
    this.pos += 1
    const value = this.parseValue()
    if (typeof value !== 'number') {
      return this.fail('Expected a number')
    }
    return sign === '-' ? -value : value
  }

  private parseObject(): Record<string, unknown> {
    const entries: [string, unknown][] = []
    this.expect('{')
    while (!this.consume('}')) {
      const key = this.parseKey()
      this.expect(':')
      entries.push([key, this.parseValue()])
      if (!this.consume(',')) {
        this.expect('}')
        break
      }
    }
    return Object.fromEntries(entries)
  }

  private parseKey(): string {
    const char = this.peek()
    if (char === '"' || char === "'") {
      return this.parseString()
    }
    const identifier = this.read(IDENTIFIER_RE)
    if (identifier) {
      return identifier[0]
    }
    const number = this.readNumber()
    if (number !== undefined) {
      return String(number)
    }
    return this.fail('Expected a property key')
  }

  private parseArray(): unknown[] {
    const result: unknown[] = []
    this.expect('[')
    while (!this.consume(']')) {
      result.push(this.parseValue())
      if (!this.consume(',')) {
        this.expect(']')
        break
      }
    }
    return result
  }

  private parseString(): string {
    const quote = this.source.charAt(this.pos)
    let result = ''
    this.pos += 1
    while (this.pos < this.source.length) {
      const char = this.source.charAt(this.pos)
      this.pos += 1
      if (char === quote) {
        return result
      }
      if (char === '\\') {
        result += this.parseEscape()
      } else if (quote !== '`' && (char === '\n' || char === '\r')) {
        this.fail('Unterminated string')
      } else if (
        quote === '`' &&
        char === '$' &&
        this.source.charAt(this.pos) === '{'
      ) {
        this.fail('Template literal interpolation is not allowed')
      } else {
        result += char
      }
    }
    return this.fail('Unterminated string')
  }

  private parseEscape(): string {
    const char = this.source.charAt(this.pos)
    this.pos += 1
    const escaped = STRING_ESCAPES.get(char)
    if (escaped !== undefined) {
      return escaped
    }
    if (char === 'x' || char === 'u') {
      const match = this.read(char === 'x' ? HEX_ESCAPE_RE : UNICODE_ESCAPE_RE)
      if (!match) {
        return this.fail('Invalid escape sequence')
      }
      return String.fromCodePoint(Number.parseInt(match[1] ?? match[0], 16))
    }
    if (char === '\r' && this.source.charAt(this.pos) === '\n') {
      this.pos += 1
    }
    return LINE_CONTINUATIONS.has(char) ? '' : char
  }
}

export function evalValue<T = any>(rawValue: string): T {
  return new StaticValueParser(rawValue).parse() as T
}
