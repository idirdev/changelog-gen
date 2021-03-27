# changelog-gen

Generate a clean CHANGELOG.md from your git conventional commits history.

Genere un CHANGELOG.md propre a partir de votre historique de commits conventionnels.

---

## Features / Fonctionnalites

**English:**
- Parses conventional commits (feat, fix, docs, chore, refactor, perf, test, ci, build, style)
- Groups changes by version tags automatically
- Detects breaking changes (BREAKING CHANGE in body or ! in type)
- Links GitHub/GitLab issues (#123) automatically
- Supports date range filtering (--since, --until)
- Can append to an existing CHANGELOG instead of overwriting
- Supports custom config files (.changelogrc, .changelogrc.json, changelog.config.js)
- Auto-detects repository URL from git remote for commit/issue links
- Zero-config: works out of the box with sensible defaults

**Francais :**
- Analyse les commits conventionnels (feat, fix, docs, chore, refactor, perf, test, ci, build, style)
- Regroupe les changements par tags de version automatiquement
- Detecte les breaking changes (BREAKING CHANGE dans le body ou ! dans le type)
- Lie automatiquement les issues GitHub/GitLab (#123)
- Supporte le filtrage par plage de dates (--since, --until)
- Peut ajouter au CHANGELOG existant au lieu de le remplacer
- Supporte les fichiers de config personnalises (.changelogrc, .changelogrc.json, changelog.config.js)
- Detection automatique du repo URL depuis le remote git
- Zero-config : fonctionne directement avec des valeurs par defaut sensees

---

## Installation

```bash
# Global / Installation globale
npm install -g changelog-gen

# Or npx / Ou avec npx
npx changelog-gen
```

---

## Usage / Utilisation

```bash
# Generate CHANGELOG.md / Generer le CHANGELOG.md
changelog-gen

# Print to stdout / Afficher dans le terminal
changelog-gen --stdout

# Date range / Plage de dates
changelog-gen --since 2025-01-01 --until 2025-12-31

# Specific tag / Tag specifique
changelog-gen --tag v1.2.0

# Append / Ajouter au fichier existant
changelog-gen --append

# Custom output / Fichier de sortie personnalise
changelog-gen --output HISTORY.md

# Repo URL / URL du depot
changelog-gen --repo-url https://github.com/user/repo

# Different directory / Autre repertoire
changelog-gen --cwd /path/to/project
```

---

## Options

| Option | Short | Description (EN) | Description (FR) |
|--------|-------|-------------------|-------------------|
| --output file | -o | Output file (default: CHANGELOG.md) | Fichier de sortie (defaut: CHANGELOG.md) |
| --since date | -s | Include commits after this date | Inclure les commits apres cette date |
| --until date | -u | Include commits before this date | Inclure les commits avant cette date |
| --tag tag | -t | Generate for a specific tag only | Generer pour un tag specifique |
| --repo-url url | -r | Repository URL for links | URL du depot pour les liens |
| --append | -a | Append to existing file | Ajouter au fichier existant |
| --stdout | | Print to stdout | Afficher dans le terminal |
| --cwd path | -c | Working directory | Repertoire de travail |
| --version | -V | Show version | Afficher la version |
| --help | -h | Show help | Afficher aide |

---

## Conventional Commits / Commits Conventionnels

| Type | Section | Description (EN) | Description (FR) |
|------|---------|-------------------|-------------------|
| feat | Features | A new feature | Nouvelle fonctionnalite |
| fix | Bug Fixes | A bug fix | Correction de bug |
| docs | Documentation | Doc changes | Changements de docs |
| style | Styles | Code style changes | Changements de style |
| refactor | Code Refactoring | Refactoring | Refactorisation |
| perf | Performance | Perf improvement | Amelioration de perf |
| test | Tests | Test changes | Changements de tests |
| build | Build System | Build changes | Changements du build |
| ci | CI/CD | CI config changes | Changements de CI |
| chore | Chores | Maintenance | Maintenance |

### Commit format / Format de commit

```
type(scope): description

optional body

BREAKING CHANGE: description of breaking change
```

### Breaking changes / Changements majeurs

Detected two ways / Detectes de deux manieres :

1. Using ! after the type: feat!: remove old API
2. Using BREAKING CHANGE: or BREAKING-CHANGE: in the commit body

---

## Configuration

Create .changelogrc.json at project root / Creez .changelogrc.json a la racine :

```json
{
  "output": "CHANGELOG.md",
  "breakingLabel": "BREAKING CHANGES",
  "repoUrl": "https://github.com/user/repo",
  "types": {
    "feat": { "label": "New Features" },
    "fix": { "label": "Fixes" }
  }
}
```

Supported config files / Fichiers de config supportes :
- .changelogrc
- .changelogrc.json
- changelog.config.js

---

## Programmatic API / API Programmatique

```js
const { generate } = require("changelog-gen");

// Generate and write CHANGELOG.md
generate({ cwd: process.cwd(), output: "CHANGELOG.md" });

// Get markdown string / Recuperer le markdown
const md = generate({ cwd: "/path/to/repo", stdout: true });

// With date filters / Avec filtres de dates
generate({ since: "2025-06-01", until: "2025-12-31", append: true });
```

---

## Example Output / Exemple de Sortie

```markdown
# Changelog

## v1.2.0 (2026-03-01)

### Features

- **auth:** add OAuth2 login support (#42) (abc1234)
- add dark mode toggle (def5678)

### Bug Fixes

- **api:** fix rate limiting on /users endpoint (ghi9012)
```

---

## License / Licence

MIT - idirdev

See [LICENSE](./LICENSE) for details / Voir [LICENSE](./LICENSE) pour les details.
