# Adapter reference

EnvTrail uses transparent static patterns. It does not execute application code.

## Source adapters

| Language | Recognized examples |
| --- | --- |
| JavaScript / TypeScript | `process.env.PORT`, `process.env["PORT"]`, destructuring, `import.meta.env.VITE_API`, `Bun.env.PORT`, `Deno.env.get("PORT")` |
| Python | `os.getenv("PORT")`, `os.environ["PORT"]`, `os.environ.get("PORT")` |
| Go | `os.Getenv("PORT")`, `os.LookupEnv("PORT")` |
| Rust | `std::env::var("PORT")`, `env!("PORT")`, `option_env!("PORT")` |
| Ruby | `ENV["PORT"]`, `ENV.fetch("PORT")` |
| PHP | `getenv("PORT")`, `$_ENV["PORT"]` |
| Java | `System.getenv("PORT")` |
| .NET | `Environment.GetEnvironmentVariable("PORT")` |
| Shell | `$PORT`, `${PORT}`, `${PORT:-3000}` in `.sh`, `.bash`, and `.zsh` |

Non-literal JavaScript, Python, Go, and Deno lookups produce `EVT005` instead of
an invented variable name.

## Documentation adapters

The default safe templates are:

- `.env.example`
- `.env.sample`
- `.env.template`
- `.env.defaults`
- `.env.<environment>.example`
- `.env.<environment>.sample`
- `.env.<environment>.template`

Only keys and preceding `# comments` are retained. Values are discarded at the
scanner boundary.

## Provider adapters

- Dockerfile `ARG` and `ENV`
- Docker Compose service `environment`
- GitHub Actions `env` blocks
- GitLab CI `variables` blocks
- Kubernetes container `env` entries

Provider facts mean “wired in repository deployment configuration.” They do not
prove that a production runtime currently supplies a valid value.

## Known limits

- Wrapper functions such as `config.require("PORT")` need a future framework
  adapter.
- YAML anchors are parsed, but a fact may point to the nearest visible key
  rather than the anchor definition.
- `envFrom` and generated manifests cannot expose individual key names
  statically.
- Shell scanning intentionally accepts uppercase variables only.
- Template languages embedded inside unknown file extensions are not scanned.

Please open an adapter request with a minimal real-world syntax example.
