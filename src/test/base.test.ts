describe('environment', () => {
  it('has a base URL ending in a slash', () => {
    expect(import.meta.env.BASE_URL.endsWith('/')).toBe(true);
  });
});
