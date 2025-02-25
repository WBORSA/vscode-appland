import * as vscode from 'vscode';
import assert from 'assert';
import { exists, rename } from 'fs';
import { join } from 'path';
import { promisify } from 'util';
import {
  initializeWorkspace,
  waitFor,
  ProjectA,
  hasNoDiagnostics,
  getDiagnosticsForAppMap,
  ExampleAppMap,
  ExampleAppMapIndexDir,
  executeWorkspaceOSCommand,
  repeatUntil,
  waitForAppMapServices,
} from '../util';

describe('Scanner', () => {
  beforeEach(initializeWorkspace);
  beforeEach(() =>
    waitForAppMapServices(
      'tmp/appmap/minitest/Microposts_controller_can_get_microposts_as_JSON.appmap.json'
    )
  );
  afterEach(initializeWorkspace);

  it('is performed as AppMaps are modified', async () => {
    await promisify(rename)(
      join(ProjectA, 'appmap-findings.json'),
      join(ProjectA, 'appmap-findings.json.bak')
    );

    await vscode.commands.executeCommand('appmap.deleteAllAppMaps');
    await waitFor('Diagnostics were not cleared', hasNoDiagnostics);

    await waitFor(
      `AppMap index dir should be removed`,
      async () => !(await promisify(exists)(ExampleAppMapIndexDir))
    );

    await repeatUntil(
      async () =>
        await executeWorkspaceOSCommand(
          `git show HEAD:./tmp/appmap/minitest/Microposts_controller_can_get_microposts_as_JSON.appmap.json > ./tmp/appmap/minitest/Microposts_controller_can_get_microposts_as_JSON.appmap.json`,
          ProjectA
        ),
      `AppMap should be reindexed`,
      async () => promisify(exists)(join(ExampleAppMapIndexDir, 'mtime'))
    );

    await waitFor(
      'No Diagnostics were created for Microposts_controller_can_get_microposts_as_JSON',
      async () => {
        return getDiagnosticsForAppMap(ExampleAppMap).length > 0;
      }
    );

    const diagnostic = getDiagnosticsForAppMap(ExampleAppMap)[0];
    assert.strictEqual(
      diagnostic.uri.fsPath,
      join(ProjectA, 'app/controllers/microposts_controller.rb')
    );
  });
});
