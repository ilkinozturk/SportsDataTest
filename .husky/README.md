# Git Hooks Setup Guide

This directory contains Git hooks powered by Husky for maintaining code quality.

## Hooks Overview

### 🔄 pre-commit
- Runs **lint-staged** on staged files
- Automatically fixes ESLint issues
- Formats code with Prettier
- Only processes staged files for performance

### 🚀 pre-push  
- Runs full code quality checks (`npm run code-quality`)
- Runs tests if Jest is configured
- Prevents broken code from being pushed

### 💬 commit-msg
- Validates commit message format
- Enforces conventional commits standard
- Required format: `<type>[scope]: <description>`

## Supported Commit Types

- **feat**: New feature
- **fix**: Bug fix
- **docs**: Documentation changes
- **style**: Code style changes (formatting, etc.)
- **refactor**: Code refactoring
- **test**: Adding or updating tests
- **chore**: Maintenance tasks
- **perf**: Performance improvements
- **ci**: CI/CD changes
- **build**: Build system changes
- **revert**: Reverting changes

## Usage Examples

```bash
# ✅ Valid commit messages
git commit -m "feat: add user authentication"
git commit -m "fix(api): handle null response properly"
git commit -m "docs: update installation guide"
git commit -m "refactor(utils): optimize cache manager"

# ❌ Invalid commit messages
git commit -m "updated files"
git commit -m "fix bug"
git commit -m "WIP: working on feature"
```

## Manual Hook Testing

```bash
# Test pre-commit hook
npm run hooks:pre-commit

# Test code quality (pre-push equivalent)
npm run code-quality

# Install hooks manually
npm run hooks:install
```

## Bypassing Hooks (Use Sparingly)

```bash
# Skip pre-commit hook
git commit --no-verify -m "fix: emergency hotfix"

# Skip pre-push hook  
git push --no-verify
```

## Troubleshooting

### Hook not running?
1. Check if `.husky` directory exists
2. Verify hook files are executable: `chmod +x .husky/*`
3. Run `npm run hooks:install`

### Permission denied error?
```bash
chmod +x .husky/pre-commit
chmod +x .husky/pre-push  
chmod +x .husky/commit-msg
chmod +x .husky/_/husky.sh
```

### Disable hooks temporarily
```bash
export HUSKY=0  # Disable all hooks
git commit -m "..."
unset HUSKY     # Re-enable hooks
```

## Files Processed by lint-staged

- **JavaScript files (`*.js`)**: ESLint + Prettier
- **JSON, Markdown, HTML, CSS**: Prettier only
- **Ignored**: Test files, build outputs, node_modules

## Performance Notes

- Pre-commit only processes **staged files** (fast)
- Pre-push runs **full project checks** (comprehensive)
- Hooks can be bypassed in emergencies with `--no-verify`