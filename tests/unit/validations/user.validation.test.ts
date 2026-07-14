import { queryUsersSchema } from '../../../src/validations/user.validation';

describe('queryUsersSchema', () => {
  it('applies pagination and sorting defaults when query values are omitted', () => {
    expect(queryUsersSchema.query.parse({})).toEqual({
      page: 1,
      limit: 10,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });
  });

  it('coerces valid pagination query strings to numbers', () => {
    expect(
      queryUsersSchema.query.parse({
        page: '3',
        limit: '25',
        sortBy: 'name',
        sortOrder: 'asc',
      })
    ).toMatchObject({
      page: 3,
      limit: 25,
      sortBy: 'name',
      sortOrder: 'asc',
    });
  });

  it.each([
    ['page', '0'],
    ['page', '-1'],
    ['page', '1.5'],
    ['page', 'not-a-number'],
    ['limit', '0'],
    ['limit', '101'],
    ['limit', '1.5'],
    ['limit', 'not-a-number'],
  ])('rejects an invalid %s value of %s', (field, value) => {
    expect(() => queryUsersSchema.query.parse({ [field]: value })).toThrow();
  });
});
