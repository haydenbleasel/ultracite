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

const WHITESPACE_RE = /\s/u
const NEWLINE_RE = /[\n\r]/u
const LINE_TERMINATOR_RE = /[\n\r  ]/u
const NUMBER_START_RE = /[\d.]/u
const NUMBER_RE = /^[\w.]+(?:[+-][\w.]+)?/u
const IDENTIFIER_START_RE = /[$A-Z_a-z]/u
const IDENTIFIER_PART_RE = /[\w$]/u
const HEX_DIGITS_RE = /^[\da-f]+$/iu

const KEYWORD_VALUES = new Map<string, unknown>([
  ['Infinity', Number.POSITIVE_INFINITY],
  ['NaN', Number.NaN],
  ['false', false],
  ['null', null],
  ['true', true],
  ['undefined', undefined],
])

const SIMPLE_ESCAPES = new Map([
  ['0', '\0'],
  ['b', '\b'],
  ['f', '\f'],
  ['n', '\n'],
  ['r', '\r'],
  ['t', '\t'],
  ['v', '\v'],
])

// Parses static JavaScript literals (objects, arrays, strings, numbers and
// keywords) without executing any code.
class StaticValueParser {
  private readonly source: string
  private index = 0

  constructor(source: string) {
    this.source = source
  }

  parse(): unknown {
    const value = this.parseValue()
    this.skipTrivia()
    if (this.index < this.source.length) {
      throw this.unexpected()
    }
    return value
  }

  private peek(offset = 0): string {
    return this.source.charAt(this.index + offset)
  }

  private unexpected(): SyntaxError {
    const char = this.peek()
    return new SyntaxError(
      char
        ? `Unexpected token '${char}' in static value at position ${this.index}`
        : 'Unexpected end of static value',
    )
  }

  private expect(char: string): void {
    this.skipTrivia()
    if (this.peek() !== char) {
      throw this.unexpected()
    }
    this.index += 1
  }

  private skipTrivia(): void {
    let start = -1
    while (start !== this.index) {
      start = this.index
      while (WHITESPACE_RE.test(this.peek())) {
        this.index += 1
      }
      if (this.source.startsWith('//', this.index)) {
        const end = this.source.indexOf('\n', this.index)
        this.index = end === -1 ? this.source.length : end
      } else if (this.source.startsWith('/*', this.index)) {
        const end = this.source.indexOf('*/', this.index + 2)
        if (end === -1) {
          throw new SyntaxError('Unterminated comment in static value')
        }
        this.index = end + 2
      }
    }
  }

  private parseValue(): unknown {
    this.skipTrivia()
    const char = this.peek()
    switch (char) {
      case '{':
        return this.parseObject()
      case '[':
        return this.parseArray()
      case '(': {
        this.index += 1
        const value = this.parseValue()
        this.expect(')')
        return value
      }
      case '"':
      case "'":
      case '`':
        return this.parseString(char)
      case '+':
      case '-': {
        this.index += 1
        const operand = Number(this.parseValue())
        return char === '-' ? -operand : operand
      }
      default:
        if (NUMBER_START_RE.test(char)) {
          return this.parseNumber()
        }
        if (IDENTIFIER_START_RE.test(char)) {
          return this.parseKeyword()
        }
        throw this.unexpected()
    }
  }

  private parseList(close: string, parseItem: () => void): void {
    this.index += 1
    this.skipTrivia()
    while (this.peek() !== close) {
      parseItem()
      this.skipTrivia()
      if (this.peek() !== ',') {
        break
      }
      this.index += 1
      this.skipTrivia()
    }
    this.expect(close)
  }

  private parseObject(): Record<string, unknown> {
    const entries: [string, unknown][] = []
    this.parseList('}', () => {
      const key = this.parseKey()
      this.expect(':')
      entries.push([key, this.parseValue()])
    })
    return Object.fromEntries(entries)
  }

  private parseArray(): unknown[] {
    const array: unknown[] = []
    this.parseList(']', () => {
      if (this.peek() === ',') {
        array.length += 1
      } else {
        array.push(this.parseValue())
      }
    })
    return array
  }

  private parseKey(): string {
    const char = this.peek()
    if (char === '"' || char === "'") {
      return this.parseString(char)
    }
    if (NUMBER_START_RE.test(char)) {
      return String(this.parseNumber())
    }
    if (IDENTIFIER_START_RE.test(char)) {
      return this.readIdentifier()
    }
    throw this.unexpected()
  }

  private readIdentifier(): string {
    const start = this.index
    while (IDENTIFIER_PART_RE.test(this.peek())) {
      this.index += 1
    }
    return this.source.slice(start, this.index)
  }

  private parseKeyword(): unknown {
    const name = this.readIdentifier()
    if (!KEYWORD_VALUES.has(name)) {
      throw new SyntaxError(
        `Unexpected identifier '${name}': only static values are supported`,
      )
    }
    return KEYWORD_VALUES.get(name)
  }

  private parseNumber(): number {
    const raw = NUMBER_RE.exec(this.source.slice(this.index))?.[0] ?? ''
    const value = Number(raw.replaceAll('_', ''))
    if (Number.isNaN(value)) {
      throw new SyntaxError(`Invalid number '${raw}' in static value`)
    }
    this.index += raw.length
    return value
  }

  private parseString(quote: string): string {
    this.index += 1
    let value = ''
    while (this.peek() !== quote) {
      const char = this.peek()
      if (!char || (quote !== '`' && NEWLINE_RE.test(char))) {
        throw new SyntaxError('Unterminated string in static value')
      }
      if (quote === '`' && char === '$' && this.peek(1) === '{') {
        throw new SyntaxError(
          'Template literal expressions are not supported in static values',
        )
      }
      this.index += 1
      value += char === '\\' ? this.parseEscape() : char
    }
    this.index += 1
    return value
  }

  private parseEscape(): string {
    const char = this.peek()
    this.index += 1
    if (char === 'x') {
      return String.fromCodePoint(this.readHex(this.index + 2))
    }
    if (char === 'u') {
      return String.fromCodePoint(this.parseUnicodeEscape())
    }
    if (char === '\r' && this.peek() === '\n') {
      this.index += 1
    }
    if (LINE_TERMINATOR_RE.test(char)) {
      return ''
    }
    return SIMPLE_ESCAPES.get(char) ?? char
  }

  private parseUnicodeEscape(): number {
    if (this.peek() !== '{') {
      return this.readHex(this.index + 4)
    }
    this.index += 1
    const codePoint = this.readHex(this.source.indexOf('}', this.index))
    this.index += 1
    return codePoint
  }

  private readHex(end: number): number {
    const digits = this.source.slice(this.index, end)
    if (
      end < this.index ||
      end > this.source.length ||
      !HEX_DIGITS_RE.test(digits)
    ) {
      throw new SyntaxError('Invalid escape sequence in static value')
    }
    this.index = end
    return Number.parseInt(digits, 16)
  }
}

export function evalValue<T = any>(rawValue: string): T {
  return new StaticValueParser(rawValue).parse() as T
}
