import * as vscode from 'vscode';
import DependencyInstaller from '../services/dependencyInstaller';
import { ProcessOutputType } from '../services/nodeRunner';

export const GenerateOpenApi = 'appmap.generateOpenApi';

export default async function generateOpenApi(context: vscode.ExtensionContext): Promise<void> {
  const command = vscode.commands.registerCommand(
    GenerateOpenApi,
    async (
      viewColumn: vscode.ViewColumn = vscode.ViewColumn.Active,
      workspaceFolder?: vscode.WorkspaceFolder
    ) => {
      if (!workspaceFolder) {
        if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length === 0) {
          vscode.window.showErrorMessage('No workspace is available.');
          return;
        }

        if (vscode.workspace.workspaceFolders.length === 1) {
          workspaceFolder = vscode.workspace.workspaceFolders[0];
        } else {
          // Let the user pick a workspace folder
          const workspaceName = await vscode.window.showQuickPick(
            vscode.workspace.workspaceFolders.map((folder) => folder.name),
            { placeHolder: 'Select a directory' }
          );

          if (!workspaceName) {
            return;
          }

          workspaceFolder = vscode.workspace.workspaceFolders.find(
            (folder) => folder.name === workspaceName
          );
        }
      }

      vscode.window.withProgress(
        { location: vscode.ProgressLocation.Notification, title: 'Generating OpenAPI definitions' },
        async () => {
          if (!workspaceFolder) {
            return;
          }

          const installer = new DependencyInstaller(context);
          await installer.install('@appland/appmap');
          const output = await installer.exec(
            'appmap',
            'openapi',
            '-d',
            workspaceFolder.uri.fsPath
          );

          console.log(output.log.map((line) => `[${line.type}] ${line.data}`).join('\n'));
          const document = await vscode.workspace.openTextDocument({
            language: 'yaml',
            content: output.log
              .filter((line) => line.type === ProcessOutputType.Stdout)
              .map((line) => line.data)
              .join('\n'),
          });

          vscode.window.showTextDocument(document, viewColumn);
        }
      );
    }
  );

  context.subscriptions.push(command);
}
