import terser from '@rollup/plugin-terser';

export default {
  input: 'src/index.js',
  output: [
    {
      file: 'dist/canary.js',
      format: 'iife',
      name: 'canary'
    },
    {
      file: 'dist/canary.min.js',
      format: 'iife',
      name: 'canary',
      plugins: [terser()]
    }
  ]
};
