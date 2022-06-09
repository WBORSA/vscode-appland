import * as vscode from 'vscode';
import * as path from 'path';
import NodeRunner from './nodeRunner';
import { DEBUG_EXCEPTION, Telemetry } from '../telemetry';
import { mkdirSync } from 'fs';

export default class DependencyInstaller {
  protected node: NodeRunner;
  protected yarnPath: string;

  constructor(context: vscode.ExtensionContext) {
    this.yarnPath = path.join(context.extensionUri.fsPath, 'extern', 'yarn.js');
    this.node = new NodeRunner(context.globalStorageUri.fsPath);
    mkdirSync(context.globalStorageUri.fsPath, { recursive: true });
  }

  async install(...dependencies: string[]): Promise<void> {
    await Promise.all(
      dependencies.map(async (dependency) => {
        const processOutput = await this.node.exec(this.yarnPath, 'add', dependency);
        if (processOutput.signal || processOutput.exitCode !== 0) {
          const message = [
            `Failed to install dependency ${dependency}`,
            `Exit code: ${processOutput.exitCode}`,
            `Signal: ${processOutput.signal}`,
            ...processOutput.log.map((log) => `${log.type}: ${log.data}`),
          ].join('\n');
          const exception = new Error(message);
          Telemetry.sendEvent(DEBUG_EXCEPTION, { exception });
          throw exception;
        }
      })
    );
  }
}
