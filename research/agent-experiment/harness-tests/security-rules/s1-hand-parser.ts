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

// Hand-made mutant for the oracle self-test, not agent output: a hand-written parser for JSON5-style literals (objects, arrays, quoted strings, numbers, booleans, null, comments, trailing commas, unquoted keys).

export function evalValue<T = any>(rawValue: string): T {
  return new LiteralParser(rawValue).parseDocument() as T
}

const IDENTIFIER = /^[A-Za-z_$][\w$]*/
const NUMBER = /^(0[xX][\da-fA-F]+|(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?)/
const SIMPLE_ESCAPES: Record<string, string> = {
  n: '\n',
  t: '\t',
  r: '\r',
  b: '\b',
  f: '\f',
  v: '\v',
  '0': '\0',
}

class LiteralParser {
  private pos = 0
  private readonly text: string

  constructor(text: string) {
    this.text = text
  }

  parseDocument(): unknown {
    const value = this.parseValue()
    this.skipTrivia()
    if (this.pos !== this.text.length) throw this.error('Unexpected trailing input')
    return value
  }

  private error(message: string): SyntaxError {
    return new SyntaxError(`${message} at position ${this.pos}`)
  }

  private skipTrivia(): void {
    while (this.pos < this.text.length) {
      if (/\s/.test(this.text[this.pos])) {
        this.pos += 1
      } else if (this.text.startsWith('//', this.pos)) {
        const end = this.text.indexOf('\n', this.pos)
        this.pos = end === -1 ? this.text.length : end + 1
      } else if (this.text.startsWith('/*', this.pos)) {
        const end = this.text.indexOf('*/', this.pos + 2)
        if (end === -1) throw this.error('Unterminated comment')
        this.pos = end + 2
      } else {
        return
      }
    }
  }

  private parseValue(): unknown {
    this.skipTrivia()
    const ch = this.text[this.pos]
    if (ch === '{') return this.parseObject()
    if (ch === '[') return this.parseArray()
    if (ch === '"' || ch === "'") return this.parseString()
    if (ch === '-' || ch === '+') {
      this.pos += 1
      const n = this.parseNumber()
      return ch === '-' ? -n : n
    }
    if (ch === '.' || (ch >= '0' && ch <= '9')) return this.parseNumber()
    const word = IDENTIFIER.exec(this.text.slice(this.pos))?.[0]
    const literals: Record<string, unknown> = { true: true, false: false, null: null }
    if (word !== undefined && word in literals) {
      this.pos += word.length
      return literals[word]
    }
    throw this.error(ch === undefined ? 'Unexpected end of input' : `Unexpected token ${ch}`)
  }

  private parseObject(): Record<string, unknown> {
    const out: Record<string, unknown> = {}
    this.pos += 1
    this.skipTrivia()
    while (this.text[this.pos] !== '}') {
      const key = this.parseKey()
      this.skipTrivia()
      if (this.text[this.pos] !== ':') throw this.error('Expected ":"')
      this.pos += 1
      Object.defineProperty(out, key, {
        value: this.parseValue(),
        enumerable: true,
        writable: true,
        configurable: true,
      })
      this.skipTrivia()
      if (this.text[this.pos] === ',') {
        this.pos += 1
        this.skipTrivia()
      } else if (this.text[this.pos] !== '}') {
        throw this.error('Expected "," or "}"')
      }
    }
    this.pos += 1
    return out
  }

  private parseKey(): string {
    const ch = this.text[this.pos]
    if (ch === '"' || ch === "'") return this.parseString()
    const word = IDENTIFIER.exec(this.text.slice(this.pos))?.[0]
    if (word === undefined) throw this.error('Expected a property name')
    this.pos += word.length
    return word
  }

  private parseArray(): unknown[] {
    const out: unknown[] = []
    this.pos += 1
    this.skipTrivia()
    while (this.text[this.pos] !== ']') {
      out.push(this.parseValue())
      this.skipTrivia()
      if (this.text[this.pos] === ',') {
        this.pos += 1
        this.skipTrivia()
      } else if (this.text[this.pos] !== ']') {
        throw this.error('Expected "," or "]"')
      }
    }
    this.pos += 1
    return out
  }

  private parseString(): string {
    const quote = this.text[this.pos]
    this.pos += 1
    let out = ''
    while (this.pos < this.text.length) {
      const ch = this.text[this.pos]
      this.pos += 1
      if (ch === quote) return out
      if (ch === '\n') break
      if (ch !== '\\') {
        out += ch
        continue
      }
      const esc = this.text[this.pos]
      this.pos += 1
      if (esc in SIMPLE_ESCAPES) {
        out += SIMPLE_ESCAPES[esc]
      } else if (esc === 'u' && this.text[this.pos] === '{') {
        const end = this.text.indexOf('}', this.pos)
        out += String.fromCodePoint(Number.parseInt(this.text.slice(this.pos + 1, end), 16))
        this.pos = end + 1
      } else if (esc === 'u' || esc === 'x') {
        const length = esc === 'u' ? 4 : 2
        out += String.fromCharCode(Number.parseInt(this.text.slice(this.pos, this.pos + length), 16))
        this.pos += length
      } else if (esc !== '\n') {
        out += esc
      }
    }
    throw this.error('Unterminated string')
  }

  private parseNumber(): number {
    const match = NUMBER.exec(this.text.slice(this.pos))
    if (!match) throw this.error('Invalid number')
    this.pos += match[0].length
    return Number(match[0])
  }
}
