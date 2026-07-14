import { readFileSync } from 'fs';
import path from 'path';

const rootDir = path.resolve(__dirname, '../../..');

describe('TypeScript runtime target', () => {
  it('matches the Node.js 22 container baseline', () => {
    const tsconfig = JSON.parse(
      readFileSync(path.join(rootDir, 'tsconfig.json'), 'utf8')
    ) as {
      compilerOptions: {
        target?: string;
        lib?: string[];
      };
    };
    const dockerfile = readFileSync(path.join(rootDir, 'Dockerfile'), 'utf8');

    expect(dockerfile).toMatch(/^FROM node:22-alpine/m);
    expect(tsconfig.compilerOptions.target?.toLowerCase()).toBe('es2022');
    expect(
      tsconfig.compilerOptions.lib?.map((library) => library.toLowerCase())
    ).toContain('es2022');
  });
});
