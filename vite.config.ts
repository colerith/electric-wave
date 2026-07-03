import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

function getGitHubPagesBasePath() {
  const explicitBasePath = process.env.VITE_BASE_PATH;
  if (explicitBasePath) {
    return explicitBasePath;
  }

  if (!process.env.GITHUB_ACTIONS) {
    return '/';
  }

  const repository = process.env.GITHUB_REPOSITORY;
  if (!repository) {
    return '/';
  }

  const [, repoName] = repository.split('/');
  if (!repoName || repoName.endsWith('.github.io')) {
    return '/';
  }

  return `/${repoName}/`;
}

export default defineConfig({
  plugins: [react()],
  // GitHub Pages repo sites need a repo-prefixed base path, while local and custom-domain deploys stay at root.
  base: getGitHubPagesBasePath(),
  define: {
    'process.env.API_KEY': JSON.stringify(process.env.VITE_API_KEY)
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false
  }
});
