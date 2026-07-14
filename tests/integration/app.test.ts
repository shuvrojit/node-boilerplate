import request from 'supertest';

import app from '../../src/app';

describe('App integration', () => {
  it('serves the root endpoint', async () => {
    const response = await request(app).get('/');

    expect(response.status).toBe(200);
    expect(response.text).toBe('root');
  });

  it('returns the standard error response for an unknown route', async () => {
    const response = await request(app).get('/does-not-exist');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      status: 'error',
      message: 'Not found: /does-not-exist',
    });
  });
});
