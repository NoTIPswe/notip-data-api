import { AppModule } from './app.module';

describe('AppModule', () => {
  const originalNodeEnv = process.env.NODE_ENV;

  function loadModuleImportsFor(nodeEnv: string): unknown[] {
    process.env.NODE_ENV = nodeEnv;

    let imports: unknown[] = [];
    jest.isolateModules(() => {
      const moduleExports =
        jest.requireActual<typeof import('./app.module')>('./app.module');

      imports =
        (Reflect.getMetadata(
          'imports',
          moduleExports.AppModule,
        ) as unknown[]) ?? [];
    });

    return imports;
  }

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    jest.resetModules();
  });

  it('should be defined', () => {
    expect(new AppModule()).toBeDefined();
  });

  it('does not include database module imports in test environment', () => {
    const imports = loadModuleImportsFor('test');

    expect(imports).toHaveLength(4);
  });

  it('includes database module imports outside test environment', () => {
    const imports = loadModuleImportsFor('development');

    expect(imports).toHaveLength(5);
  });
});
