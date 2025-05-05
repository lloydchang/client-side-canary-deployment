import terser from '@rollup/plugin-terser';

export default {
  input: 'frontend/assets/js/index.js',
  output: {
    file: 'frontend/assets/js/bundle.js',
    format: 'iife',
    name: 'canaryDeployment'
  }
};
