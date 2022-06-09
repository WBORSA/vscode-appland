import * as vscode from 'vscode';
import * as path from 'path';
import NodeRunner, { ProcessOutput } from './nodeRunner';
import { DEBUG_EXCEPTION, Telemetry } from '../telemetry';
import { mkdirSync, writeFileSync } from 'fs';
import { retry } from '../util';

export default class DependencyInstaller {
  protected node: NodeRunner;
  protected yarnPath: string;

  constructor(context: vscode.ExtensionContext) {
    this.yarnPath = path.join(context.extensionUri.fsPath, 'extern', 'yarn.js');
    this.node = new NodeRunner(context.globalStorageUri.fsPath);
    mkdirSync(context.globalStorageUri.fsPath, { recursive: true });
    writeFileSync(
      path.join(context.globalStorageUri.fsPath, '.yarnrc.yml'),
      ['nodeLinker: node-modules', 'npmRegistryServer: "https://registry.npmjs.org"'].join('\n')
    );
    for (let index = 0; index < 20; index++) {
      console.log(context.globalStorageUri.fsPath);
    }
  }

  async install(...dependencies: string[]): Promise<void> {
    await this.node.exec(this.yarnPath, 'init');
    await Promise.all(
      dependencies.map(async (dependency) => {
        const processOutput = await this.node.exec(this.yarnPath, 'add', dependency);
        if (processOutput.signal || (processOutput.exitCode && processOutput.exitCode !== 0)) {
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

  async exec(...args: string[]): Promise<ProcessOutput> {
    return this.node.exec(this.yarnPath, ...args);
  }

  async startService(...args: string[]): Promise<void> {
    let crashTimer = 0;
    let crashClearTimer: NodeJS.Timeout | undefined;

    for (;;) {
      await this.node.exec(this.yarnPath, ...args);

      if (crashTimer++ > 3) {
        vscode.window.showErrorMessage(`Service "${args[0]}" crashed too many times. Exiting.`);
        break;
      }

      // Start a timer. If it fires, we'll restart the crash count.
      // We don't want to kill the service if we've crashed 4 times in 4 hours.
      if (!crashClearTimer) {
        crashClearTimer = setTimeout(() => {
          crashTimer = 0;
          crashClearTimer = undefined;
        }, 3 * 60 * 1000);
      }
    }
  }
}
