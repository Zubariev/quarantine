// Mock Supabase client for testing
const supabase = {
  auth: {
    session: () => null,
  },
  from: () => ({
    select: () => ({
      eq: () => ({
        single: () => ({ data: null, error: null }),
      }),
    }),
    update: () => ({
      eq: () => ({ error: null }),
    }),
  }),
};

export { supabase }; 