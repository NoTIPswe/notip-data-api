describe('main bootstrap', () => {
  afterEach(() => {
    jest.resetModules();
    delete process.env.PORT;
  });

  it('creates the app and listens on the default port', async () => {
    const listen = jest.fn().mockResolvedValue(undefined);
    const create = jest.fn().mockResolvedValue({ listen });

    jest.doMock('@nestjs/core', () => ({
      NestFactory: { create },
    }));

    jest.doMock('./app.module', () => ({
      AppModule: class AppModule {},
    }));

    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('./main');
    });

    await Promise.resolve();

    expect(create).toHaveBeenCalledTimes(1);
    expect(listen).toHaveBeenCalledWith(3000);
  });

  it('uses the configured port when PORT is provided', async () => {
    process.env.PORT = '4000';

    const listen = jest.fn().mockResolvedValue(undefined);
    const create = jest.fn().mockResolvedValue({ listen });

    jest.doMock('@nestjs/core', () => ({
      NestFactory: { create },
    }));

    jest.doMock('./app.module', () => ({
      AppModule: class AppModule {},
    }));

    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('./main');
    });

    await Promise.resolve();

    expect(listen).toHaveBeenCalledWith('4000');
  });
});
