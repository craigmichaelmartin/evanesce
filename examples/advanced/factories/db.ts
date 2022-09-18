const products = [
  { id: '1', slug: 'fibity-foo', label: 'Fibity Foo', quantity: 1 },
  { id: '2', slug: 'bibity-bar', label: 'Bibity Bar', quantity: 2 }
];
const reviews = [
  { id: 1, title: 'Love it', body: "It's my new favoriate thing", productId: 1 }
];
const mockDB = {
  many: (_query: string) => products,
  any: (_query: string) => reviews,
  one: (query: string, { id }: { id: string }) =>
    products.find((x) => x.id === id),
  result: (_query: string, _data: { [key: string]: any }) => ({})
};
export const db = mockDB;
