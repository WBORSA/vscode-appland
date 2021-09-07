import { PathLike } from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import AppMapCollectionFile from '../appmapCollectionFile';
import ProjectWatcher from '../projectWatcher';
import { getNonce } from '../util';
import { Telemetry, MILESTONE_OPEN_WEBVIEW } from '../telemetry';

interface AppMapListItem {
  path: PathLike;
  name?: string;
  requests?: number;
  sqlQueries?: number;
  functions?: number;
}

function getGoodAppMaps(
  appmaps: AppMapCollectionFile,
  workspaceFolder: vscode.WorkspaceFolder
): AppMapListItem[] {
  return appmaps
    .allAppMapsForWorkspaceFolder(workspaceFolder)
    .map(({ descriptor }) => ({
      path: descriptor.resourceUri.fsPath,
      name: descriptor.metadata?.name as string,
      requests: descriptor.numRequests as number,
      sqlQueries: descriptor.numQueries as number,
      functions: descriptor.numFunctions as number,
    }))
    .sort((a, b) => {
      const scoreA = a.requests * 100 + a.sqlQueries * 100 + a.functions * 100;
      const scoreB = b.requests * 100 + b.sqlQueries * 100 + b.functions * 100;
      return scoreB - scoreA;
    })
    .slice(0, 10);
}

export default class QuickstartWebview {
  public static readonly viewType = 'appmap.views.quickstart';
  public static readonly command = 'appmap.openQuickstartDocsOpenAppmaps';

  // Keyed by project root directory
  private static readonly openWebviews = new Map<string, vscode.WebviewPanel>();

  public static register(
    context: vscode.ExtensionContext,
    projects: readonly ProjectWatcher[],
    appmaps: AppMapCollectionFile
  ): void {
    const project = projects[0];
    if (!project) {
      // No project, so no quickstart
      return;
    }

    context.subscriptions.push(
      vscode.commands.registerCommand(this.command, () => {
        // Attempt to re-use an existing webview for this project if one exists
        const existingPanel: vscode.WebviewPanel = this.openWebviews[
          project.rootDirectory as string
        ];
        if (existingPanel) {
          existingPanel.reveal(vscode.ViewColumn.One);
          return;
        }

        const panel = vscode.window.createWebviewPanel(
          this.viewType,
          'Quickstart: Open AppMaps',
          vscode.ViewColumn.One,
          {
            enableScripts: true,
            retainContextWhenHidden: true,
          }
        );

        // Cache this panel so we can reuse it later if the user clicks another quickstart milestone from the tree view
        this.openWebviews[project.rootDirectory as string] = panel;

        // If the user closes the panel, make sure it's no longer cached
        panel.onDidDispose(() => {
          delete this.openWebviews[project.rootDirectory as string];
        });

        panel.webview.html = getWebviewContent(panel.webview, context);

        const eventListener = project.onAppMapCreated(() => {
          // TODO.
          // This could be made a lot more efficient by only sending the list item that's new, not the entire snapshot.
          // This also won't be triggered if AppMaps are deleted (BUG).
          panel.webview.postMessage({
            type: 'appmapSnapshot',
            appmaps: getGoodAppMaps(appmaps, project.workspaceFolder),
          });
        });

        panel.onDidDispose(() => {
          eventListener.dispose();
        });

        panel.webview.onDidReceiveMessage(async (message) => {
          switch (message.command) {
            case 'preInitialize':
              {
                // The webview has been created but may not be ready to receive all messages yet.
                panel.webview.postMessage({
                  type: 'init',
                  appmaps: getGoodAppMaps(appmaps, project.workspaceFolder),
                });
              }
              break;
            case 'openFile':
              {
                const { file } = message;
                let filePath = file;

                if (!path.isAbsolute(file)) {
                  // If the file is not absolute, it's relative to the workspace folder
                  filePath = path.join(project.rootDirectory as string, file);
                }

                vscode.commands.executeCommand('vscode.open', vscode.Uri.file(filePath));
              }
              break;
            case 'clickLink':
              Telemetry.reportOpenUri(message.uri);
              break;
            case 'postInitialize':
              Telemetry.sendEvent(MILESTONE_OPEN_WEBVIEW, {
                milestone: project.milestones.VIEW_APPMAP,
              });
              break;
            default:
              break;
          }
        });

        vscode.commands.executeCommand('appmap.focusQuickstartDocs', 3);
      })
    );
  }
}

function getWebviewContent(webview: vscode.Webview, context: vscode.ExtensionContext): string {
  const scriptUri = webview.asWebviewUri(
    vscode.Uri.file(path.join(context.extensionPath, 'out', 'app.js'))
  );
  const nonce = getNonce();

  return ` <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">

    <title>AppLand Scenario</title>
  </head>
  <body>
    <div id="app">
    </div>
    <script nonce="${nonce}" src="${scriptUri}"></script>
    <script type="text/javascript" nonce="${nonce}">
      AppLandWeb.mountQuickstartOpenAppmaps();
    </script>1
  </body>
  </html>`;
}
