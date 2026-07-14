describe('Jest configuration', () => {
  it('excludes compiled output from module discovery', () => {
    const jestConfig = jest.requireActual<{
      modulePathIgnorePatterns?: string[];
    }>('../../../jest.config.js');

    expect(jestConfig.modulePathIgnorePatterns).toContain('<rootDir>/build/');
  });

  it('only transforms TypeScript file extensions', () => {
    const jestConfig = jest.requireActual<{
      transform?: Record<string, unknown>;
    }>('../../../jest.config.js');

    expect(Object.keys(jestConfig.transform ?? {})).toContain('^.+\\.tsx?$');
  });
});
