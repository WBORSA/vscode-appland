import * as vscode from 'vscode';
import { exec } from 'child_process';
import { close, open, utimes } from 'fs';
import { join } from 'path';

export const FixtureDir = join(__dirname, '../../../test/fixtures');
export const ProjectA = join(__dirname, '../../../test/fixtures/workspaces/project-a');
export const ProjectWithEchoCommand = join(
  __dirname,
  '../../../test/fixtures/workspaces/project-with-echo-command'
);
export const ExampleAppMap = join(
  ProjectA,
  'tmp/appmap/minitest/Microposts_controller_can_get_microposts_as_JSON.appmap.json'
);
export const ExampleAppMapIndexDir = join(
  ProjectA,
  'tmp/appmap/minitest/Microposts_controller_can_get_microposts_as_JSON'
);

export type DiagnosticForUri = {
  uri: vscode.Uri;
  diagnostics: vscode.Diagnostic[];
};

export async function repeatUntil(
  fn: () => Promise<void | void[]>,
  message: string,
  test: () => boolean | Promise<boolean>
): Promise<void> {
  const actionInterval = setInterval(fn, 1000);

  try {
    await waitFor(message, test);
  } finally {
    clearInterval(actionInterval);
  }
}

function makeDiagnosticForUri(d: [vscode.Uri, vscode.Diagnostic[]]): DiagnosticForUri {
  return {
    uri: d[0],
    diagnostics: d[1],
  };
}

export function diagnosticAppMap(diagnostic: vscode.Diagnostic): string | undefined {
  return (diagnostic.relatedInformation || []).find((r) =>
    r.location.uri.fsPath.endsWith('.appmap.json')
  )?.location.uri.fsPath;
}

export function getDiagnostics(): DiagnosticForUri[] {
  return vscode.languages.getDiagnostics().map(makeDiagnosticForUri);
}

export function getDiagnosticsForAppMap(appMapFilePath: string): DiagnosticForUri[] {
  return vscode.languages
    .getDiagnostics()
    .map(makeDiagnosticForUri)
    .filter((ds) => ds.diagnostics.find((d) => diagnosticAppMap(d) === appMapFilePath));
}

export function hasDiagnostics(): boolean {
  return getDiagnostics().filter((d: DiagnosticForUri) => d.diagnostics.length > 0).length > 0;
}

export function hasNoDiagnostics(): boolean {
  return !hasDiagnostics();
}

export async function initializeWorkspace(): Promise<void> {
  await closeAllEditors();
  await cleanWorkspace();
}

async function closeAllEditors(): Promise<void> {
  await vscode.commands.executeCommand('workbench.action.closeAllEditors');
}

export async function executeWorkspaceOSCommand(cmd: string, workspaceName: string): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    exec(cmd, { cwd: workspaceName }, (err, stdout, stderr) => {
      if (err) {
        console.log(stdout);
        console.warn(stderr);
        return reject(err);
      }
      resolve();
    });
  });
}

async function cleanWorkspace(): Promise<void> {
  await executeWorkspaceOSCommand(`git clean -fd .`, ProjectA);
  await executeWorkspaceOSCommand(`git restore .`, ProjectA);
  await executeWorkspaceOSCommand(`git clean -fd .`, ProjectWithEchoCommand);
  await executeWorkspaceOSCommand(`git restore .`, ProjectWithEchoCommand);
}

export async function waitForExtension(): Promise<void> {
  await waitFor(
    `Extension not available`,
    () => !!vscode.extensions.getExtension('appland.appmap')
  );
  await waitFor(
    `Extension not active`,
    () => !!vscode.extensions.getExtension('appland.appmap')?.isActive
  );
}

export async function waitFor(
  message: string,
  test: () => boolean | Promise<boolean>,
  timeout = 30000
): Promise<void> {
  const startTime = Date.now();
  let delay = 100;
  while (!(await test())) {
    const elapsed = Date.now() - startTime;
    if (elapsed > timeout) {
      throw new Error(message);
    }

    delay = delay * 2;
    console.log(`Waiting ${delay}ms because: ${message}`);
    await wait(delay);
  }
}

export async function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export async function touch(path: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const time = new Date();
    utimes(path, time, time, (err) => {
      if (err) {
        return open(path, 'w', (err, fd) => {
          if (err) return reject(err);
          close(fd, (err) => (err ? reject(err) : resolve()));
        });
      }
      resolve();
    });
  });
}

export async function mtimeFiles(): Promise<vscode.Uri[]> {
  return vscode.workspace.findFiles(`**/mtime`);
}

export async function appmapFiles(): Promise<vscode.Uri[]> {
  return vscode.workspace.findFiles(`**/*.appmap.json`);
}
