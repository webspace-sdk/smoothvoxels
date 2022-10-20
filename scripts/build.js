const { join, basename } = require('path')
const { realpathSync, readFileSync, writeFileSync, renameSync } = require('fs')
const { spawnSync } = require('child_process')
const esbuild = require('esbuild')

const buildConfig = {
  basePath: join(__dirname, '..'),
  bundle: true,
  constants: {},
  entry: 'src/index.js',
  format: 'iife',
  minify: true,
  outdir: 'dist',
  platform: { name: 'browser', target: 'chrome', version: 96 }
}

const pkg = require(realpathSync(`${buildConfig.basePath}/package.json`, { encoding: 'utf-8' }))

class Builder {
  config = {
    production: false,
    verbose: false
  }

  write (msg) {
    process.stdout.write(`${msg}`.toString())
  }

  writeln (msg) {
    this.write(`${msg}\n`)
  }

  async compile () {
    const result = await esbuild.build({
      absWorkingDir: buildConfig.basePath,
      allowOverwrite: true,
      bundle: buildConfig.bundle,
      define: {
        __APP_VERSION__: `'${pkg.version}'`,
        __COMPILED_AT__: `'${new Date().toUTCString()}'`,
        ...buildConfig.constants
      },
      entryPoints: [buildConfig.entry],
      format: buildConfig.format,
      logLevel: 'silent',
      metafile: true,
      minify: buildConfig.minify,
      outdir: buildConfig.outdir,
      platform: buildConfig.platform.name,
      plugins: [],
      target: `${buildConfig.platform.target}${buildConfig.platform.version}`
    })

    return new Promise(resolve => resolve(result))
  }

  sizeForDisplay (bytes) {
    return `${bytes / 1024}`.slice(0, 4) + ' kb'
  }

  reportCompileResults (results) {
    results.errors.forEach(errorMsg => this.writeln(`* Error: ${errorMsg}`))
    results.warnings.forEach(msg => this.writeln(`* Warning: ${msg}`))

    Object.keys(results.metafile.outputs).forEach(fn => {
      this.writeln(`*   » created '${fn}' (${this.sizeForDisplay(results.metafile.outputs[fn].bytes)})`)
    })
  }

  processArgv () {
    const argMap = {
      '--prod': { name: 'production', value: true },
      '--production': { name: 'production', value: true },
      '--verbose': { name: 'verbose', value: true },
      '-p': { name: 'production', value: true },
      '-v': { name: 'verbose', value: true }
    }

    process.argv
      .slice(2)
      .map(arg => {
        const hasMappedArg = typeof argMap[arg] === 'undefined'
        return hasMappedArg ? { name: arg.replace(/^-+/, ''), value: true } : argMap[arg]
      })
      .forEach(data => (this.config[data.name] = data.value))
  }

  convertToProductionFile () {
    const filename = basename(buildConfig.entry).replace(/\.ts$/, '.js')
    const newFilename = `${pkg.name}.js`
    const contents = readFileSync(`${buildConfig.outdir}/${filename}`, { encoding: 'utf-8' })

    spawnSync('chmod', ['+x', `${buildConfig.outdir}/${filename}`], { stdio: 'ignore' })
    writeFileSync(`${buildConfig.outdir}/${filename}`, `#!/usr/bin/node\n\n${contents}`, { encoding: 'utf-8' })
    renameSync(`${buildConfig.outdir}/${filename}`, `${buildConfig.outdir}/${newFilename}`)
  }

  async run () {
    this.processArgv()

    if (this.config.verbose) {
      this.writeln(`* Using esbuild v${esbuild.version}.`)
    }

    this.write(`* Compiling application...${this.config.verbose ? '\n' : ''}`)

    const startedTs = new Date().getTime()
    const results = await this.compile()
    const finishedTs = new Date().getTime()

    if (this.config.verbose) {
      this.reportCompileResults(results)
    }

    this.writeln((this.config.verbose ? '* D' : 'd') + `one. (${finishedTs - startedTs} ms)`)

    if (this.config.production) {
      this.convertToProductionFile()
    }
  }
}

new Builder().run()
