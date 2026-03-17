import { z } from 'zod';

const literalSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
]);

export type ExecutionData = Record<string, any>;

type TokenType =
  | 'IDENT'
  | 'NUMBER'
  | 'STRING'
  | 'OP'
  | 'LPAREN'
  | 'RPAREN'
  | 'COMMA';

interface Token {
  type: TokenType;
  value: string;
}

const OPERATORS = ['==', '!=', '<=', '>=', '<', '>', '&&', '||'] as const;

function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < input.length) {
    const ch = input[i];

    if (/\s/.test(ch)) {
      i += 1;
      continue;
    }

    if (ch === '(') {
      tokens.push({ type: 'LPAREN', value: ch });
      i += 1;
      continue;
    }

    if (ch === ')') {
      tokens.push({ type: 'RPAREN', value: ch });
      i += 1;
      continue;
    }

    if (ch === ',') {
      tokens.push({ type: 'COMMA', value: ch });
      i += 1;
      continue;
    }

    if (ch === '"' || ch === "'") {
      const quote = ch;
      i += 1;
      let str = '';
      while (i < input.length && input[i] !== quote) {
        if (input[i] === '\\' && i + 1 < input.length) {
          const next = input[i + 1];
          if (next === quote || next === '\\') {
            str += next;
            i += 2;
            continue;
          }
        }
        str += input[i];
        i += 1;
      }
      i += 1;
      tokens.push({ type: 'STRING', value: str });
      continue;
    }

    if (/[0-9]/.test(ch)) {
      let num = ch;
      i += 1;
      while (i < input.length && /[0-9.]/.test(input[i])) {
        num += input[i];
        i += 1;
      }
      tokens.push({ type: 'NUMBER', value: num });
      continue;
    }

    const twoChar = input.slice(i, i + 2);
    const op = OPERATORS.find((o) => o === twoChar);
    if (op) {
      tokens.push({ type: 'OP', value: op });
      i += 2;
      continue;
    }

    if ('<>=!&|'.includes(ch)) {
      tokens.push({ type: 'OP', value: ch });
      i += 1;
      continue;
    }

    if (/[A-Za-z_.]/.test(ch)) {
      let id = ch;
      i += 1;
      while (i < input.length && /[A-Za-z0-9_.]/.test(input[i])) {
        id += input[i];
        i += 1;
      }
      tokens.push({ type: 'IDENT', value: id });
      continue;
    }

    throw new Error(`Unexpected character in condition: '${ch}'`);
  }

  return tokens;
}

interface ASTNodeBase {
  type: string;
}

interface IdentifierNode extends ASTNodeBase {
  type: 'Identifier';
  name: string;
}

interface LiteralNode extends ASTNodeBase {
  type: 'Literal';
  value: z.infer<typeof literalSchema>;
}

interface BinaryOpNode extends ASTNodeBase {
  type: 'BinaryExpression';
  operator: string;
  left: ASTNode;
  right: ASTNode;
}

interface CallExpressionNode extends ASTNodeBase {
  type: 'CallExpression';
  callee: string;
  args: ASTNode[];
}

type ASTNode = IdentifierNode | LiteralNode | BinaryOpNode | CallExpressionNode;

class Parser {
  private pos = 0;

  constructor(private readonly tokens: Token[]) {}

  parse(): ASTNode {
    const expr = this.parseOr();
    if (this.pos !== this.tokens.length) {
      throw new Error('Unexpected tokens after end of expression');
    }
    return expr;
  }

  private current(): Token | undefined {
    return this.tokens[this.pos];
  }

  private eat(): Token {
    const t = this.tokens[this.pos];
    this.pos += 1;
    return t;
  }

  private match(type: TokenType, value?: string): boolean {
    const t = this.current();
    if (!t || t.type !== type) return false;
    if (value !== undefined && t.value !== value) return false;
    return true;
  }

  private parseOr(): ASTNode {
    let node = this.parseAnd();
    while (this.match('OP', '||')) {
      this.eat();
      const right = this.parseAnd();
      node = { type: 'BinaryExpression', operator: '||', left: node, right };
    }
    return node;
  }

  private parseAnd(): ASTNode {
    let node = this.parseComparison();
    while (this.match('OP', '&&')) {
      this.eat();
      const right = this.parseComparison();
      node = { type: 'BinaryExpression', operator: '&&', left: node, right };
    }
    return node;
  }

  private parseComparison(): ASTNode {
    let node = this.parsePrimary();
    while (
      this.match('OP', '==') ||
      this.match('OP', '!=') ||
      this.match('OP', '<') ||
      this.match('OP', '>') ||
      this.match('OP', '<=') ||
      this.match('OP', '>=')
    ) {
      const op = this.eat().value;
      const right = this.parsePrimary();
      node = { type: 'BinaryExpression', operator: op, left: node, right };
    }
    return node;
  }

  private parsePrimary(): ASTNode {
    const t = this.current();
    if (!t) throw new Error('Unexpected end of expression');

    if (this.match('LPAREN')) {
      this.eat();
      const expr = this.parseOr();
      if (!this.match('RPAREN')) {
        throw new Error('Expected closing parenthesis');
      }
      this.eat();
      return expr;
    }

    if (this.match('NUMBER')) {
      const value = Number(this.eat().value);
      return { type: 'Literal', value };
    }

    if (this.match('STRING')) {
      const value = this.eat().value;
      return { type: 'Literal', value };
    }

    if (this.match('IDENT')) {
      const ident = this.eat().value;
      if (this.match('LPAREN')) {
        this.eat();
        const args: ASTNode[] = [];
        if (!this.match('RPAREN')) {
          while (true) {
            args.push(this.parseOr());
            if (this.match('COMMA')) {
              this.eat();
              continue;
            }
            break;
          }
        }
        if (!this.match('RPAREN')) {
          throw new Error('Expected closing parenthesis in call');
        }
        this.eat();
        return { type: 'CallExpression', callee: ident, args };
      }
      if (ident === 'true') return { type: 'Literal', value: true };
      if (ident === 'false') return { type: 'Literal', value: false };
      if (ident === 'null') return { type: 'Literal', value: null };
      return { type: 'Identifier', name: ident };
    }

    throw new Error(`Unexpected token: ${t.type} '${t.value}'`);
  }
}

function getPath(obj: any, path: string): any {
  const parts = path.split('.');
  let value = obj;
  for (const part of parts) {
    if (value == null) return undefined;
    value = value[part];
  }
  return value;
}

function evaluateNode(node: ASTNode, data: ExecutionData): any {
  switch (node.type) {
    case 'Literal':
      return node.value;
    case 'Identifier':
      return getPath(data, node.name);
    case 'BinaryExpression': {
      const left = evaluateNode(node.left, data);
      const right = evaluateNode(node.right, data);
      switch (node.operator) {
        case '&&':
          return Boolean(left) && Boolean(right);
        case '||':
          return Boolean(left) || Boolean(right);
        case '==':
          return left == right;
        case '!=':
          return left != right;
        case '<':
          return Number(left) < Number(right);
        case '>':
          return Number(left) > Number(right);
        case '<=':
          return Number(left) <= Number(right);
        case '>=':
          return Number(left) >= Number(right);
        default:
          throw new Error(`Unsupported operator: ${node.operator}`);
      }
    }
    case 'CallExpression': {
      const args = node.args.map((a) => evaluateNode(a, data));
      const [field, value] = args;
      const fieldStr = typeof field === 'string' ? field : String(field ?? '');
      const valueStr = typeof value === 'string' ? value : String(value ?? '');
      switch (node.callee) {
        case 'contains':
          return fieldStr.includes(valueStr);
        case 'startsWith':
          return fieldStr.startsWith(valueStr);
        case 'endsWith':
          return fieldStr.endsWith(valueStr);
        default:
          throw new Error(`Unknown function: ${node.callee}`);
      }
    }
    default:
      // Exhaustive check
      throw new Error(`Unknown AST node type: ${(node as any).type}`);
  }
}

export function evaluateCondition(condition: string, data: ExecutionData): boolean {
  const trimmed = condition.trim();
  if (!trimmed || trimmed.toUpperCase() === 'DEFAULT') {
    return false;
  }
  const tokens = tokenize(trimmed);
  const parser = new Parser(tokens);
  const ast = parser.parse();
  return Boolean(evaluateNode(ast, data));
}

