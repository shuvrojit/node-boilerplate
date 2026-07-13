import { existsSync, readFileSync } from 'fs';
import path from 'path';

const rootDir = path.resolve(__dirname, '../../..');

const readProjectFile = (file: string): string =>
  readFileSync(path.join(rootDir, file), 'utf8');

describe('Docker configuration', () => {
  it('excludes local secrets and development artifacts from images', () => {
    const dockerignorePath = path.join(rootDir, '.dockerignore');

    expect(existsSync(dockerignorePath)).toBe(true);

    const patterns = readFileSync(dockerignorePath, 'utf8').split(/\r?\n/);
    expect(patterns).toEqual(
      expect.arrayContaining(['.env', '.env.*', '.git', 'node_modules'])
    );
    expect(patterns).toContain('!.env.example');
  });

  it('keeps MongoDB private in production and loopback-only in development', () => {
    const baseCompose = readProjectFile('docker-compose.yml');
    const developmentCompose = readProjectFile('docker-compose.dev.yml');

    expect(baseCompose).not.toContain('27017:27017');
    expect(developmentCompose).toContain('127.0.0.1:27017:27017');
  });

  it('builds compiled application code inside the image', () => {
    const dockerfile = readProjectFile('Dockerfile');

    expect(dockerfile).toContain('yarn install --frozen-lockfile');
    expect(dockerfile).toContain('RUN yarn build');
  });

  it('uses container-reachable services and a consistent application port', () => {
    const baseCompose = readProjectFile('docker-compose.yml');
    const productionCompose = readProjectFile('docker-compose.prod.yml');
    const exampleEnv = readProjectFile('.env.example');

    expect(baseCompose).toContain(
      'MONGODB_URL: mongodb://dbdata:27017/ai-linguist'
    );
    expect(baseCompose).toContain('PORT: 8000');
    expect(productionCompose).toContain('@dbdata:27017/');
    expect(exampleEnv).toMatch(/^PORT=8000$/m);
  });
});
