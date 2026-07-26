export type NovaMethod = "minify" | "balanced" | "maximum";

type TokenKind = "word" | "number" | "string" | "longstring" | "operator" | "symbol" | "expression";

type Token = {
  kind: TokenKind;
  value: string;
};

const identifierPattern = /^[A-Za-z_][A-Za-z0-9_]*/;
const numberPattern = /^(?:0[xX][0-9a-fA-F]+(?:\.[0-9a-fA-F]*)?(?:[pP][+-]?\d+)?|\d+(?:\.\d*)?(?:[eE][+-]?\d+)?|\.\d+(?:[eE][+-]?\d+)?)/;
const operators = ["...", "<<=", ">>=", "//=", "==", "~=", "<=", ">=", "..", "//", "<<", ">>", "::", "+=", "-=", "*=", "/=", "%=", "^=", "&=", "|=", "->"];

function longBracketLength(source: string, offset: number): number | null {
  if (source[offset] !== "[") return null;
  let cursor = offset + 1;
  while (source[cursor] === "=") cursor += 1;
  return source[cursor] === "[" ? cursor - offset + 1 : null;
}

function readLongBracket(source: string, offset: number, openLength: number): [string, number] {
  const equals = "=".repeat(openLength - 2);
  const close = `]${equals}]`;
  const closeIndex = source.indexOf(close, offset + openLength);
  if (closeIndex === -1) throw new Error("Nova could not find the end of a long string or comment.");
  const end = closeIndex + close.length;
  return [source.slice(offset, end), end];
}

function readQuotedString(source: string, offset: number): [string, number] {
  const quote = source[offset];
  let cursor = offset + 1;
  while (cursor < source.length) {
    if (source[cursor] === "\\") {
      cursor += source[cursor + 1] === "\r" && source[cursor + 2] === "\n" ? 3 : 2;
      continue;
    }
    if (source[cursor] === quote) return [source.slice(offset, cursor + 1), cursor + 1];
    cursor += 1;
  }
  throw new Error("Nova found an unterminated string literal.");
}

function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  let cursor = 0;
  while (cursor < source.length) {
    const character = source[cursor];
    if (/\s/.test(character)) {
      cursor += 1;
      continue;
    }
    if (source.startsWith("--", cursor)) {
      const longLength = longBracketLength(source, cursor + 2);
      if (longLength) {
        [, cursor] = readLongBracket(source, cursor + 2, longLength);
        continue;
      }
      cursor += 2;
      while (cursor < source.length && source[cursor] !== "\n" && source[cursor] !== "\r") cursor += 1;
      continue;
    }
    const longLength = longBracketLength(source, cursor);
    if (longLength) {
      const [value, end] = readLongBracket(source, cursor, longLength);
      tokens.push({ kind: "longstring", value });
      cursor = end;
      continue;
    }
    if (character === "\"" || character === "'") {
      const [value, end] = readQuotedString(source, cursor);
      tokens.push({ kind: "string", value });
      cursor = end;
      continue;
    }
    const identifier = source.slice(cursor).match(identifierPattern)?.[0];
    if (identifier) {
      tokens.push({ kind: "word", value: identifier });
      cursor += identifier.length;
      continue;
    }
    const number = source.slice(cursor).match(numberPattern)?.[0];
    if (number) {
      tokens.push({ kind: "number", value: number });
      cursor += number.length;
      continue;
    }
    const operator = operators.find((item) => source.startsWith(item, cursor));
    if (operator) {
      tokens.push({ kind: "operator", value: operator });
      cursor += operator.length;
      continue;
    }
    tokens.push({ kind: "symbol", value: character });
    cursor += 1;
  }
  return tokens;
}

function decodeLuaString(value: string): number[] | null {
  const body = value.slice(1, -1);
  const bytes: number[] = [];
  for (let cursor = 0; cursor < body.length; cursor += 1) {
    const character = body[cursor];
    if (character !== "\\") {
      const code = body.charCodeAt(cursor);
      if (code > 255) return null;
      bytes.push(code);
      continue;
    }
    cursor += 1;
    if (cursor >= body.length) return null;
    const escaped = body[cursor];
    const simple: Record<string, number> = { a: 7, b: 8, f: 12, n: 10, r: 13, t: 9, v: 11, "\\": 92, "\"": 34, "'": 39 };
    if (escaped in simple) {
      bytes.push(simple[escaped]);
      continue;
    }
    if (escaped === "\n") {
      bytes.push(10);
      continue;
    }
    if (escaped === "\r") {
      if (body[cursor + 1] === "\n") cursor += 1;
      bytes.push(10);
      continue;
    }
    if (escaped === "z") {
      while (/\s/.test(body[cursor + 1] ?? "")) cursor += 1;
      continue;
    }
    if (escaped === "x") {
      const hex = body.slice(cursor + 1, cursor + 3);
      if (!/^[0-9a-fA-F]{2}$/.test(hex)) return null;
      bytes.push(Number.parseInt(hex, 16));
      cursor += 2;
      continue;
    }
    if (/\d/.test(escaped)) {
      const digits = body.slice(cursor, cursor + 3).match(/^\d{1,3}/)?.[0];
      if (!digits) return null;
      const byte = Number(digits);
      if (byte > 255) return null;
      bytes.push(byte);
      cursor += digits.length - 1;
      continue;
    }
    return null;
  }
  return bytes;
}

function chooseName(tokens: Token[], base: string): string {
  const used = new Set(tokens.filter((token) => token.kind === "word").map((token) => token.value));
  let name = base;
  let suffix = 1;
  while (used.has(name)) {
    name = `${base}_${suffix}`;
    suffix += 1;
  }
  return name;
}

function numberExpression(value: string, index: number): string | null {
  if (!/^\d+$/.test(value)) return null;
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number > 2_147_483_647) return null;
  const left = (number * 31 + index * 17) % 97;
  const right = number - left;
  if (right < 0) return `(${left}-${Math.abs(right)})`;
  return `(${left}+${right})`;
}

function canJoinWithoutSpace(previous: Token | undefined, current: Token): boolean {
  if (!previous) return false;
  const previousNeedsSpace = previous.kind === "word" || previous.kind === "number";
  const currentNeedsSpace = current.kind === "word" || current.kind === "number" || current.kind === "string" || current.kind === "longstring";
  if (previousNeedsSpace && currentNeedsSpace) return true;
  if (previous.value === "-" && current.value === "-") return true;
  if (previous.value === "+" && current.value === "+") return true;
  if (previous.value === "-" && current.value === "+") return true;
  return false;
}

function printTokens(tokens: Token[]): string {
  let output = "";
  let previous: Token | undefined;
  for (const token of tokens) {
    if (canJoinWithoutSpace(previous, token)) output += " ";
    output += token.value;
    previous = token;
  }
  return output;
}

export function normalizeNovaMethod(value: unknown): NovaMethod {
  if (value === "balanced" || value === "bytestrings") return "balanced";
  if (value === "maximum" || value === "bytestrings,transformnums,minify" || value === "MinifyAll") return "maximum";
  return "minify";
}

export function obfuscateLua(source: string, requestedMethod: unknown = "balanced"): { code: string; method: NovaMethod } {
  const method = normalizeNovaMethod(requestedMethod);
  const tokens = tokenize(source);
  const encodeStrings = method === "balanced" || method === "maximum";
  const transformNumbers = method === "maximum";
  const helperName = encodeStrings ? chooseName(tokens, "__nova_char") : "";
  const outputTokens: Token[] = [];
  let encodedStringCount = 0;

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (encodeStrings && token.kind === "string") {
      const bytes = decodeLuaString(token.value);
      if (bytes) {
        outputTokens.push({ kind: "expression", value: `${helperName}(${bytes.join(",")})` });
        encodedStringCount += 1;
        continue;
      }
    }
    if (transformNumbers && token.kind === "number") {
      const expression = numberExpression(token.value, index);
      if (expression) {
        outputTokens.push({ kind: "expression", value: expression });
        continue;
      }
    }
    outputTokens.push(token);
  }

  const body = printTokens(outputTokens);
  const prefix = encodedStringCount ? `local ${helperName}=string.char;` : "";
  const code = `${prefix}${body}`;
  return { code, method };
}

export function novaObfuscatorSummary(method: NovaMethod): { encodeStrings: boolean; transformNumbers: boolean } {
  return { encodeStrings: method !== "minify", transformNumbers: method === "maximum" };
}
