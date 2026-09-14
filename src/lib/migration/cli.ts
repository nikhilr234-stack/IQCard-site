export type MigrationCliArgs = {
  mode: 'dry-run' | 'import'
  slugs: string[]
  json: boolean
}

export function parseMigrationArgs(argv: string[]): MigrationCliArgs {
  let mode: MigrationCliArgs['mode'] = 'dry-run'
  const slugs: string[] = []
  let json = false

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--dry-run') {
      mode = 'dry-run'
      continue
    }
    if (arg === '--import') {
      mode = 'import'
      continue
    }
    if (arg === '--json') {
      json = true
      continue
    }
    if (arg === '--slug') {
      const slug = argv[index + 1]?.trim().toLowerCase()
      if (!slug) throw new Error('--slug requires a value')
      slugs.push(slug)
      index += 1
      continue
    }
    throw new Error(`Unknown migration option: ${arg}`)
  }

  return { mode, slugs, json }
}
