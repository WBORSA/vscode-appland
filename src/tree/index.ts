import * as vscode from 'vscode';
import AppMapCollectionFile from '../appmapCollectionFile';
import { AppMapTreeDataProvider } from './appmap/AppMapTreeDataProvider';
import { LinkTreeDataProvider } from './linkTreeDataProvider';
import Links from './links';
// import { MilestoneTreeDataProvider } from './milestoneTreeDataProvider';
import { QuickstartDocsTreeDataProvider } from './quickstartDocsTreeDataProvider';
import ProjectWatcher from '../projectWatcher';
function showQuickstartAppmaps(localAppMaps: AppMapCollectionFile) {
  // Disabled for now.
  return;

  if (localAppMaps.allAppMaps().length && !showQuickstartAppmaps.showed) {
    vscode.commands.executeCommand('appmap.openQuickstartDocsOpenAppmaps');
    showQuickstartAppmaps.showed = true;
  }
}
showQuickstartAppmaps.showed = false;

export default function registerTrees(
  context: vscode.ExtensionContext,
  localAppMaps: AppMapCollectionFile,
  projects: readonly ProjectWatcher[]
): Record<string, vscode.TreeView<vscode.TreeItem>> {
  const localTreeProvider = new AppMapTreeDataProvider(localAppMaps);
  const localTree = vscode.window.createTreeView('appmap.views.local', {
    treeDataProvider: localTreeProvider,
  });

  LinkTreeDataProvider.registerCommands(context);

  const documentationTreeProvider = new LinkTreeDataProvider(context, Links.Documentation);
  const documentation = vscode.window.createTreeView('appmap.views.documentation', {
    treeDataProvider: documentationTreeProvider,
  });

  /*
  const milestoneTreeProvider = new MilestoneTreeDataProvider(context, projects);
  const milestoneTree = vscode.window.createTreeView('appmap.views.milestones', {
    treeDataProvider: milestoneTreeProvider,
  });

  MilestoneTreeDataProvider.registerCommands(context);
  */

  const quickstartDocsTreeProvider = new QuickstartDocsTreeDataProvider();
  const quickstartDocsTree = vscode.window.createTreeView('appmap.views.milestones', {
    treeDataProvider: quickstartDocsTreeProvider,
  });

  quickstartDocsTree.onDidChangeVisibility(() => {
    showQuickstartAppmaps(localAppMaps);
  });

  localAppMaps.onUpdated(() => {
    showQuickstartAppmaps(localAppMaps);
  });

  context.subscriptions.push(
    vscode.commands.registerCommand('appmap.focus', () => {
      localTree.reveal(localAppMaps.appMaps[0], { select: false });
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('appmap.focusQuickstartDocs', (index = 0) => {
      setTimeout(() => {
        quickstartDocsTree.reveal(quickstartDocsTreeProvider.items[index]);
      }, 0);
    })
  );

  return { localTree, documentation /*, milestoneTree*/ };
}
