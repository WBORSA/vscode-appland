import * as vscode from 'vscode';
import extensionSettings from '../configuration/extensionSettings';
import ProcessService from './processService';
import { WorkspaceService, WorkspaceServiceInstance } from './workspaceService';

class AutoIndexer extends ProcessService implements WorkspaceServiceInstance {
  async start(): Promise<void> {
    const command = extensionSettings.indexCommand();
    let commandArgs: [string, string[]];
    if (typeof command === 'string') {
      const tokens = command.split(' ');
      commandArgs = [tokens[0], tokens.slice(1)];
    } else {
      commandArgs = command;
    }

    return this.runProcess(commandArgs[0], commandArgs[1], {});
  }
}

export default class AutoIndexerService implements WorkspaceService {
  async create(folder: vscode.WorkspaceFolder): Promise<AutoIndexer> {
    const indexer = new AutoIndexer(folder);
    await indexer.start();
    return indexer;
  }
}
