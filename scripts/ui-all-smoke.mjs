import { spawn } from 'node:child_process'

const scripts = ['ui-smoke.mjs', 'ui-settings-smoke.mjs', 'ui-public-smoke.mjs', 'ui-typography-smoke.mjs', 'ui-workflows-smoke.mjs']
for (const script of scripts) {
  const exitCode = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [`scripts/${script}`], { stdio: 'inherit' })
    child.once('error', reject)
    child.once('exit', code => resolve(code ?? 1))
  })
  if (exitCode !== 0) process.exit(exitCode)
}
