// Supabase 호환성 스텁: 시스템은 Neon PostgreSQL과 Server Actions로 완전히 전환되었습니다.
export const supabase = {
  from: (_tableName?: string) => ({
    select: (_cols?: string) => ({
      eq: function (_col: string, _val: any) {
        return this;
      },
      gte: function (_col: string, _val: any) {
        return this;
      },
      lte: function (_col: string, _val: any) {
        return this;
      },
      order: function (_col: string, _opts?: any) {
        return this;
      },
      single: () => Promise.resolve({ data: null, error: null }),
      then: (resolve: any) => Promise.resolve({ data: [], error: null }).then(resolve),
    }),
    insert: (_rows: any) => Promise.resolve({ data: null, error: null }),
    update: (_vals: any) => ({
      eq: () => Promise.resolve({ data: null, error: null }),
    }),
    upsert: (_rows: any, _opts?: any) => Promise.resolve({ data: null, error: null }),
    delete: () => ({
      eq: () => Promise.resolve({ data: null, error: null }),
    }),
  }),
};
