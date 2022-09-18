const mockDB = {
  any: async (_query: string) => [
    { id: 1, title: 'Love it', body: "It's my new favoriate thing" }
  ],
  one: async (_query: string, _data: { [key: string]: any }) => ({})
};
export const db = mockDB;
