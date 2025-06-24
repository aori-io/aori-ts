module.exports = {
  branches: [
    'main',
    { name: 'ci', prerelease: false }
  ],
  plugins: [
    '@semantic-release/commit-analyzer',
    '@semantic-release/release-notes-generator',
    [
      '@semantic-release/changelog',
      {
        changelogFile: 'CHANGELOG.md'
      }
    ],
    '@semantic-release/npm',
    [
      '@semantic-release/github',
      {
        assets: [
          'dist/**/*.js',
          'dist/**/*.d.ts',
          'package.json',
          'README.md',
          'CHANGELOG.md'
        ]
      }
    ],
    [
      '@semantic-release/git',
      {
        assets: ['package.json', 'CHANGELOG.md'],
        message: 'chore(release): ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}'
      }
    ]
  ]
}; 