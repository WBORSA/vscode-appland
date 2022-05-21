import * as cp from 'child_process';
import {
  downloadAndUnzipVSCode,
  resolveCliArgsFromVSCodeExecutablePath,
  runTests as runTestsInElectron,
} from '@vscode/test-electron';
import { existsSync } from 'fs';
import { promisify } from 'util';
import { glob } from 'glob';
import { resolve } from 'path';
import assert from 'assert';

(async function() {
  const projectRootDir = resolve(__dirname, '..');
  const testDir = resolve(__dirname, '../out/test/integration');

  let fileArgs = process.argv.slice(1).filter((arg) => arg.match(/\.test\.(?:js|ts)$/));
  if (fileArgs.length > 0) {
    console.log(
      `Running specific tests provided by command line arguments:\n\t${fileArgs.join('\n\t')}`
    );
  }

  if (fileArgs.length === 0) {
    console.log(`Running all integration tests`);
    fileArgs = (await promisify(glob)('**/*.test.js', { cwd: testDir })).map((file) =>
      resolve(testDir, file)
    );
  }

  const resolvedTestFiles = fileArgs.map((file) => {
    // Accept file paths relative to the project root or to the test dir.
    return [(resolve(testDir, file), resolve(projectRootDir, file))].find((fullPath) =>
      existsSync(fullPath)
    );
  });
  fileArgs.forEach((file, index) => {
    if (!resolvedTestFiles[index]) {
      console.warn(`Could not find test file ${file}`);
    }
  });
  const testFiles = resolvedTestFiles.map((path) => {
    if (!path) throw new Error(`File path must be truthy`);
    if (path.endsWith('.js')) return path;
    const tokens = path.slice(projectRootDir.length).split('/');
    return resolve(
      testDir,
      tokens.slice(3, -1).join('/'),
      tokens[tokens.length - 1].replace('.ts', '.js')
    );
  }) as string[];

  testFiles.forEach((testFile) => assert(existsSync(testFile)));

  console.log(`Resolved test paths:\n\t${testFiles.join('\n\t')}`);

  // TODO: Use existing version in dev
  const vscodeVersion = process.env.TEST_VSCODE_VERSION;
  // TODO: Obtain platform name
  const vscodePlatform = process.env.TEST_VSCODE_PLATFORM || process.platform;

  const extensionDevelopmentPath = resolve(__dirname, '..');
  const userDataDir = resolve(__dirname, '../.vscode-test/user-data');

  const vscodeExecutablePath = await downloadAndUnzipVSCode.call(
    null,
    ...[vscodeVersion, vscodePlatform]
  );
  const [cliPath] = resolveCliArgsFromVSCodeExecutablePath(vscodeExecutablePath);

  const testWorkspaces = [
    'test/fixtures/workspaces/project-a',
    'test/fixtures/workspaces/project-b',
  ];

  if (process.env.TEST_YARN_INSTALL !== 'false') {
    await Promise.all(
      testWorkspaces.map(async (testWorkspace) => {
        await new Promise<void>((resolve, reject) => {
          const proc = cp.exec(`yarn install`, { cwd: testWorkspace });
          proc.on('exit', (code) => {
            if (code !== 0) return reject(code);

            resolve();
          });
        });
      })
    );
  }

  cp.spawnSync(
    cliPath,
    [
      '--extensions-dir',
      extensionDevelopmentPath,
      '--user-data-dir',
      userDataDir,
      '--install-extension',
      'appland.appmap',
      '--force',
    ],
    {
      encoding: 'utf-8',
      stdio: 'inherit',
    }
  );

  const runTests = async (testFile: string) => {
    await runTestsInElectron({
      vscodeExecutablePath,
      extensionDevelopmentPath,
      // TEST_PATH env var sends the actual test names. index.js is a wrapper which loads Mocha, etc.
      extensionTestsPath: resolve(testDir, 'index.js'),
      version: [vscodeVersion || 'stable', process.platform].join('-'),
      extensionTestsEnv: {
        TEST_FILE: testFile,
      },
      launchArgs: [
        '--user-data-dir',
        userDataDir,
        // '--disable-extensions',
        '--disable-gpu',
        testWorkspaces[0],
      ],
    });
  };

  for (const testFile of testFiles) {
    console.log(`Running integration test: ${testFile}`);
    try {
      await runTests(testFile);
    } catch (e) {
      console.warn(`Test ${testFile} failed: ${e}`);
    }
  }
})();
