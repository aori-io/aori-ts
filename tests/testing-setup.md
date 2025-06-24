# Aori TypeScript SDK - Testing & CI/CD Setup

This document outlines the comprehensive testing and automated release setup implemented for the Aori TypeScript SDK.

## 🏗️ Setup Overview

### Package Configuration
- **Production dependencies**: `axios`, `ethers`
- **Development dependencies**: Jest, ESLint, TypeScript, semantic-release, nock
- **Package distribution**: Only `dist/` folder and essential files
- **Node.js compatibility**: 18+

### Testing Framework
- **Unit tests**: Jest with TypeScript support
- **Integration tests**: nock for HTTP mocking
- **Coverage reporting**: lcov, HTML, and text formats
- **Custom matchers**: Ethereum address and order hash validation

### Code Quality
- **ESLint**: TypeScript-specific rules with recommended presets
- **TypeScript**: Strict mode with comprehensive type checking
- **Coverage thresholds**: 70% minimum for branches, functions, lines, statements

## 📁 File Structure

```
aori-ts/
├── src/                    # Source code
├── tests/
│   ├── setup.ts           # Global test configuration
│   ├── unit/              # Unit tests
│   │   ├── helpers.test.ts
│   │   └── core.test.ts
│   └── integration/       # Integration tests
│       └── api.test.ts
├── .github/workflows/
│   ├── test.yml           # Test & build workflow
│   └── release.yml        # Automated release workflow
├── jest.config.js         # Jest configuration
├── .eslintrc.js          # ESLint configuration  
├── tsconfig.json         # TypeScript build config
├── tsconfig.test.json    # TypeScript test config
├── release.config.js     # Semantic release config
└── .npmignore           # Files excluded from npm package
```

## 🧪 Testing Strategy

### Unit Tests (`tests/unit/`)

**helpers.test.ts**:
- Tests `fetchChains()`, `getChain()`, `getAddress()` functions
- Mocks axios requests with Jest
- Validates error handling and edge cases
- Tests case-insensitive string matching
- Verifies API key header inclusion

**core.test.ts**:
- Tests `Aori` class instantiation and methods
- Mocks WebSocket functionality
- Tests chain lookup by chainKey, chainId, and EID
- Validates quote request formatting

### Integration Tests (`tests/integration/`)

**api.test.ts**:
- Uses `nock` for realistic HTTP mocking
- Tests full API workflows end-to-end
- Validates request/response formats
- Tests error handling (4xx, 5xx responses)
- Tests API key authentication flows

### Test Utilities

**setup.ts**:
- Global Jest configuration
- Custom matchers for Ethereum addresses and order hashes
- Console mocking to reduce test noise
- Environment variable setup

## ⚙️ GitHub Actions Workflows

### Test Workflow (`.github/workflows/test.yml`)

**Triggers**: Push to main, PRs to main  
**Matrix strategy**: Node.js 18, 20, 22  
**Steps**:
1. Checkout code
2. Setup Node.js with npm cache
3. Install dependencies
4. Run type checking
5. Run linting
6. Run unit tests
7. Run integration tests (with API key)
8. Build package
9. Test package installation
10. Upload coverage to Codecov

### Release Workflow (`.github/workflows/release.yml`)

**Triggers**: Push to main branch  
**Permissions**: Full write access for releases  
**Steps**:
1. Checkout with full history
2. Setup Node.js with npm registry
3. Install dependencies and run tests
4. Build package
5. Run semantic-release for automated versioning and publishing

## 🚀 Semantic Release Configuration

**Conventional Commits**: Automatically determines version bumps
- `fix:` → patch version (1.0.1)
- `feat:` → minor version (1.1.0)  
- `BREAKING CHANGE:` → major version (2.0.0)

**Generated Artifacts**:
- Updated `package.json` version
- `CHANGELOG.md` with release notes  
- GitHub release with assets
- npm package publication
- Git tags and commit updates

## 📊 Code Quality Standards

### ESLint Rules
- TypeScript recommended presets
- No unused variables (except prefixed with `_`)
- Prefer const over let
- No console.log in production (warnings)
- Consistent naming conventions

### TypeScript Configuration
- **Build**: Excludes tests, strict mode, generates declarations
- **Test**: Includes test files, relaxed unused variable rules
- **Coverage**: Excludes index.ts barrel exports from metrics

## 🔄 Development Workflow

### Local Development
```bash
npm install
npm run test:watch    # Run tests in watch mode
npm run lint:fix      # Fix linting issues
npm run type-check    # Validate types
npm run build         # Build package
```

### Testing Commands
```bash
npm test                # Run all tests
npm run test:unit       # Run only unit tests  
npm run test:integration # Run only integration tests
npm run test:coverage   # Run tests with coverage report
```

### Release Process
1. **Development**: Create feature branch, write code and tests
2. **PR Review**: GitHub Actions run full test suite
3. **Merge to main**: Triggers semantic-release
4. **Automated release**: Version bump, changelog, npm publish, GitHub release

## 📋 Required GitHub Repository Settings

### Secrets
- `NPM_TOKEN`: npm authentication token for publishing
- `AORI_API_KEY`: Optional API key for integration tests

### Branch Protection Rules (main)
- Require pull request reviews
- Require status checks (GitHub Actions)
- Require branches to be up to date
- Restrict pushes to main branch

### Repository Settings
- Allow GitHub Actions to create releases
- Enable dependency vulnerability alerts
- Configure Codecov integration for coverage reports

## 🔧 Package Distribution

### Included in npm package:
- `dist/**/*` (compiled JavaScript and type definitions)
- `README.md`
- `LICENSE`
- `package.json`

### Excluded from npm package:
- Source TypeScript files (`src/`)
- Test files and configurations
- Development tooling configs
- CI/CD configurations
- Documentation files

## ✅ Benefits of This Setup

1. **Zero-maintenance releases**: Semantic versioning with conventional commits
2. **Comprehensive testing**: Unit and integration tests with high coverage
3. **Quality assurance**: Linting, type checking, and automated builds
4. **Professional distribution**: Clean npm packages with proper TypeScript support
5. **Developer experience**: Fast feedback loops with GitHub Actions
6. **Reliable automation**: Consistent releases with proper versioning and changelogs

This setup ensures the Aori TypeScript SDK maintains high quality standards while enabling rapid, reliable development and deployment cycles. 