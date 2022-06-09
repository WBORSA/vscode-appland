import * as vscode from 'vscode';

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

      const document = await vscode.workspace.openTextDocument({
        language: 'yaml',
        content: '---\n#Insert OpenAPI here',
      });

      vscode.window.showTextDocument(document, viewColumn);
    }
  );

  context.subscriptions.push(command);
}
