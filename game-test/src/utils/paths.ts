// This file defines path aliases to resolve import issues
export const paths = {
  components: './components',
  utils: './utils'
};

// Helper function to resolve path aliases
export const resolvePath = (path: string): string => {
  const [prefix, ...rest] = path.split('/');
  if (prefix in paths) {
    return `${paths[prefix as keyof typeof paths]}/${rest.join('/')}`;
  }
  return path;
}; 