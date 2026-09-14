import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export function getPythonBin() {
  const isWin = process.platform === 'win32'
  const rootPath = path.resolve(__dirname, '../../../')
  if (isWin) {
    if (fs.existsSync(path.resolve(rootPath, 'venv'))) {
      return '.\\venv\\Scripts\\python.exe'
    }
    if (fs.existsSync(path.resolve(rootPath, '.venv'))) {
      return '.\\.venv\\Scripts\\python.exe'
    }
    return 'python'
  } else {
    if (fs.existsSync(path.resolve(rootPath, 'venv'))) {
      return './venv/bin/python'
    }
    if (fs.existsSync(path.resolve(rootPath, '.venv'))) {
      return './.venv/bin/python'
    }
    return 'python3'
  }
}
