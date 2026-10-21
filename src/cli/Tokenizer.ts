export class Tokenizer {
  public tokenize(line: string): string[] {
    const input = line.trim();

    if (input.length === 0 || input.startsWith("#")) {
      return [];
    }

    const tokens: string[] = [];
    let token = "";
    let quoted = false;
    let started = false;

    for (const character of input) {
      if (character === '"') {
        quoted = !quoted;
        started = true;
        continue;
      }

      if (!quoted && /\s/u.test(character)) {
        if (started) {
          tokens.push(token);
          token = "";
          started = false;
        }

        continue;
      }

      token += character;
      started = true;
    }

    if (quoted) {
      throw new SyntaxError("unterminated quoted argument");
    }

    if (started) {
      tokens.push(token);
    }

    return tokens;
  }
}
