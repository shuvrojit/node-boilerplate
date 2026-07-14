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

  it('provides a private, health-checked Redis service to the application', () => {
    const baseCompose = readProjectFile('docker-compose.yml');

    expect(baseCompose).toContain('image: redis:7.4-alpine');
    expect(baseCompose).toContain("test: ['CMD', 'redis-cli', 'ping']");
    expect(baseCompose).toContain('condition: service_healthy');
    expect(baseCompose).toContain('REDIS_HOST: redis');
    expect(baseCompose).toContain('REDIS_PORT: 6379');
    expect(baseCompose).not.toContain('6379:6379');
  });

  it('only exposes Redis to the development loopback interface', () => {
    const developmentCompose = readProjectFile('docker-compose.dev.yml');
    const testCompose = readProjectFile('docker-compose.test.yml');
    const productionCompose = readProjectFile('docker-compose.prod.yml');

    expect(developmentCompose).toContain('127.0.0.1:6379:6379');
    expect(testCompose).not.toContain('6379:6379');
    expect(productionCompose).not.toContain('6379:6379');
  });

  it('uses an isolated, non-persistent Redis database for tests', () => {
    const testCompose = readProjectFile('docker-compose.test.yml');

    expect(testCompose).toContain('REDIS_DB: 1');
    expect(testCompose).toContain('- --save');
    expect(testCompose).toContain('- --appendonly');
    expect(testCompose).toContain("- 'no'");
  });

  it('requires authentication and persistence for production Redis', () => {
    const productionCompose = readProjectFile('docker-compose.prod.yml');

    expect(productionCompose).toContain(
      'REDIS_PASSWORD: ${REDIS_PASSWORD:?Set REDIS_PASSWORD}'
    );
    expect(productionCompose).toContain(
      'REDISCLI_AUTH: ${REDIS_PASSWORD:?Set REDIS_PASSWORD}'
    );
    expect(productionCompose).toContain('- --requirepass');
    expect(productionCompose).toContain('redisdata-prod:/data');
  });

  it('documents all Redis environment settings', () => {
    const exampleEnv = readProjectFile('.env.example');

    expect(exampleEnv).toMatch(/^REDIS_HOST=localhost$/m);
    expect(exampleEnv).toMatch(/^REDIS_PORT=6379$/m);
    expect(exampleEnv).toMatch(/^REDIS_PASSWORD=$/m);
    expect(exampleEnv).toMatch(/^REDIS_DB=0$/m);
  });
});
