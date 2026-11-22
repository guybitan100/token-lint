import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const scriptPath = fileURLToPath(import.meta.url);
const workspaceRoot = path.resolve(path.dirname(scriptPath), '..');
const packageJsonPath = path.join(workspaceRoot, 'package.json');
const packageLockPath = path.join(workspaceRoot, 'package-lock.json');
const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');
const noInstall = args.has('--no-install');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function run(command, commandArgs, options = {}) {
  const result = spawnSync(command, commandArgs, {
    cwd: workspaceRoot,
    encoding: 'utf8',
    stdio: options.capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
    env: { ...process.env, ...(options.env ?? {}) },
  });

  if (result.error) {
    throw result.error;
  }

  return result;
}

function runChecked(command, commandArgs, label) {
  const result = run(command, commandArgs);
  if (result.status !== 0) {
    throw new Error(`${label} failed with exit code ${result.status ?? 'unknown'}`);
  }
}

function commandExists(command) {
  const result = spawnSync(command, ['--version'], {
    cwd: workspaceRoot,
    encoding: 'utf8',
    stdio: 'ignore',
    env: process.env,
  });

  return !result.error && result.status === 0;
}

function npmCommand() {
  return process.platform === 'win32' ? 'npm.cmd' : 'npm';
}

function incrementPatch(version) {
  const segments = version.split('.').map((value) => Number.parseInt(value, 10));
  if (segments.length !== 3 || segments.some(Number.isNaN)) {
    throw new Error(`Unsupported semver version: ${version}`);
  }

  segments[2] += 1;
  return segments.join('.');
}

function hasRelevantChanges() {
  const result = run('git', ['status', '--porcelain', '--untracked-files=all'], { capture: true });
  if (result.status !== 0) {
    return false;
  }

  const ignoredPrefixes = ['node_modules/', 'out/', '.git/'];
  const ignoredSuffixes = ['.vsix'];

  return result.stdout
    .split('\n')
    .map((line) => line.trimEnd())
    .filter(Boolean)
    .some((line) => {
      const candidate = line.slice(3).replace(/^"|"$/g, '');
      return !ignoredPrefixes.some((prefix) => candidate.startsWith(prefix))
        && !ignoredSuffixes.some((suffix) => candidate.endsWith(suffix));
    });
}

function ensureDependenciesInstalled() {
  const tscBin = path.join(workspaceRoot, 'node_modules', '.bin', process.platform === 'win32' ? 'tsc.cmd' : 'tsc');
  const vsceBin = path.join(workspaceRoot, 'node_modules', '.bin', process.platform === 'win32' ? 'vsce.cmd' : 'vsce');

  if (fs.existsSync(tscBin) && fs.existsSync(vsceBin)) {
    return;
  }

  runChecked(npmCommand(), ['ci'], 'npm ci');
}

function findVsCodeCli() {
  const candidates = [];
  if (process.env.VSCODE_CLI) {
    candidates.push(process.env.VSCODE_CLI);
  }

  candidates.push(process.platform === 'win32' ? 'code.cmd' : 'code');

  if (process.platform === 'darwin') {
    candidates.push('/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code');
    candidates.push('/Applications/Visual Studio Code - Insiders.app/Contents/Resources/app/bin/code');
    candidates.push(path.join(process.env.HOME ?? '', 'Applications/Visual Studio Code.app/Contents/Resources/app/bin/code'));
    candidates.push(path.join(process.env.HOME ?? '', 'Applications/Visual Studio Code - Insiders.app/Contents/Resources/app/bin/code'));
  }

  if (process.platform === 'linux') {
    candidates.push('/usr/share/code/bin/code');
    candidates.push('/snap/bin/code');
  }

  if (process.platform === 'win32') {
    const localAppData = process.env.LOCALAPPDATA ?? '';
    const programFiles = process.env.ProgramFiles ?? '';
    const programFilesX86 = process.env['ProgramFiles(x86)'] ?? '';

    candidates.push(path.join(localAppData, 'Programs', 'Microsoft VS Code', 'bin', 'code.cmd'));
    candidates.push(path.join(localAppData, 'Programs', 'Microsoft VS Code Insiders', 'bin', 'code-insiders.cmd'));
    candidates.push(path.join(programFiles, 'Microsoft VS Code', 'bin', 'code.cmd'));
    candidates.push(path.join(programFilesX86, 'Microsoft VS Code', 'bin', 'code.cmd'));
  }

  for (const candidate of candidates) {
    if (commandExists(candidate)) {
      return candidate;
    }
  }

  return null;
}

function printSummary({ version, bump, vsixPath, install, notes }) {
  console.log(`Version: ${version}`);
  console.log(`Bump: ${bump ? 'yes' : 'no'}`);
  console.log(`VSIX: ${vsixPath}`);
  console.log(`Install: ${install}`);
  if (notes) {
    console.log(`Notes: ${notes}`);
  }
}

function main() {
  const initialPackageJson = readJson(packageJsonPath);
  const shouldBump = hasRelevantChanges();
  const plannedVersion = shouldBump ? incrementPatch(initialPackageJson.version) : initialPackageJson.version;
  const plannedVsixPath = path.join(workspaceRoot, `${initialPackageJson.name}-${plannedVersion}.vsix`);

  if (dryRun) {
    printSummary({
      version: plannedVersion,
      bump: shouldBump,
      vsixPath: plannedVsixPath,
      install: 'skipped',
      notes: noInstall ? 'Dry run only.' : 'Dry run only. Install would run unless --no-install is passed.',
    });
    return;
  }

  ensureDependenciesInstalled();
  runChecked(npmCommand(), ['run', 'test:coverage'], 'test:coverage');

  if (shouldBump) {
    runChecked(npmCommand(), ['version', 'patch', '--no-git-tag-version'], 'npm version patch');
  }

  const packageJson = readJson(packageJsonPath);
  if (fs.existsSync(packageLockPath)) {
    const packageLockJson = readJson(packageLockPath);
    if (packageLockJson.version !== packageJson.version) {
      throw new Error('package-lock.json version is out of sync with package.json after version bump');
    }
  }

  const vsixPath = path.join(workspaceRoot, `${packageJson.name}-${packageJson.version}.vsix`);
  fs.rmSync(vsixPath, { force: true });

  runChecked(npmCommand(), ['run', 'compile'], 'compile');
  runChecked(npmCommand(), ['exec', 'vsce', '--', 'package', '--out', vsixPath], 'vsce package');

  let install = 'skipped';
  let notes = '';

  if (!noInstall) {
    const vscodeCli = findVsCodeCli();
    if (!vscodeCli) {
      install = 'failed';
      notes = 'VS Code CLI not found. Install the Shell Command from VS Code or set VSCODE_CLI to the CLI path.';
    } else {
      const extensionId = `${packageJson.publisher}.${packageJson.name}`;
      run(vscodeCli, ['--uninstall-extension', extensionId]);
      const installResult = run(vscodeCli, ['--install-extension', vsixPath, '--force']);
      if (installResult.status === 0) {
        install = 'installed';
      } else {
        install = 'failed';
        notes = `VS Code CLI install failed with exit code ${installResult.status ?? 'unknown'}.`;
      }
    }
  }

  printSummary({
    version: packageJson.version,
    bump: shouldBump,
    vsixPath,
    install,
    notes: notes || undefined,
  });

  if (install === 'failed') {
    process.exitCode = 1;
  }
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}