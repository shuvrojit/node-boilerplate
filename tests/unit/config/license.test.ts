import { readFileSync } from 'fs';
import path from 'path';

const rootDir = path.resolve(__dirname, '../../..');
const readProjectFile = (file: string): string =>
  readFileSync(path.join(rootDir, file), 'utf8');

describe('License metadata', () => {
  it('points package consumers to the repository license terms', () => {
    const packageJson = JSON.parse(readProjectFile('package.json')) as {
      license?: string;
    };

    expect(packageJson.license).toBe('SEE LICENSE IN LICENSE');
  });

  it('describes the non-commercial license consistently in the README', () => {
    const license = readProjectFile('LICENSE');
    const readme = readProjectFile('README.md');
    const readmeLicenseSection = readme.match(
      /## License\s+([\s\S]*?)(?=\n## |$)/
    )?.[1];

    expect(license).toContain('Attribution-NonCommercial 4.0');
    expect(readmeLicenseSection).toMatch(/non-commercial/i);
    expect(readmeLicenseSection).toContain('[LICENSE](LICENSE)');
    expect(readmeLicenseSection).not.toMatch(/\bMIT\b/);
  });
});
