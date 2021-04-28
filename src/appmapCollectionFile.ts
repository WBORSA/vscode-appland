import * as vscode from 'vscode';
import { promises as fs } from 'fs';
import AppMapDescriptor from './appmapDescriptor';
import AppMapDescriptorFile from './appmapDescriptorFile';
import AppMapCollection from './appmapCollection';

export default class AppMapCollectionFile implements AppMapCollection {
  private static readonly GLOB_PATTERN = '**/*.appmap.json';
  private _onUpdated: vscode.EventEmitter<AppMapCollection> = new vscode.EventEmitter<AppMapCollection>();
  public readonly onUpdated: vscode.Event<AppMapCollection> = this._onUpdated.event;
  private _onContentChanged: vscode.EventEmitter<AppMapDescriptorFile> = new vscode.EventEmitter<
    AppMapDescriptorFile
  >();
  public readonly onContentChanged: vscode.Event<AppMapDescriptorFile> = this._onContentChanged.event;

  private descriptors: Map<string, AppMapDescriptorFile> = new Map<string, AppMapDescriptorFile>();

  constructor() {
    const { workspaceFolders } = vscode.workspace;
    if (!workspaceFolders) {
      return;
    }

    workspaceFolders.forEach((dir) => {
      const appmapPattern = new vscode.RelativePattern(dir, `**/*.appmap.json`);
      const watcher = vscode.workspace.createFileSystemWatcher(appmapPattern);
      watcher.onDidChange((e) => this.onChange(e));
      watcher.onDidCreate((e) => this.onCreate(e));
      watcher.onDidDelete((e) => this.onDelete(e));
    });
  }

  static async getMetadata(uri: vscode.Uri): Promise<Record<string, unknown> | null> {
    try {
      const buf = await fs.readFile(uri.fsPath);
      const appmapJson = JSON.parse(buf.toString());
      return appmapJson.metadata;
    } catch (e) {
      console.error(e);
      console.trace();
    }

    return null;
  }

  async initialize(): Promise<void> {
    const { workspaceFolders } = vscode.workspace;
    if (!workspaceFolders) {
      return;
    }

    const files = await Promise.all(
      workspaceFolders.map(async (dir) => {
        const appmapPattern = new vscode.RelativePattern(dir, '**/*.appmap.json');
        return await vscode.workspace.findFiles(appmapPattern);
      })
    );

    await Promise.all(
      files.flat().map(async (uri) => {
        const metadata = await AppMapCollectionFile.getMetadata(uri);
        if (metadata) {
          this.descriptors[uri.fsPath] = new AppMapDescriptorFile(uri, metadata);
        }
      })
    );

    this._onUpdated.fire(this);
  }

  public appmapDescriptors(): AppMapDescriptor[] {
    return Object.values(this.descriptors);
  }

  private async onChange(uri: vscode.Uri): Promise<void> {
    const metadata = await AppMapCollectionFile.getMetadata(uri);
    if (metadata) {
      const descriptor = new AppMapDescriptorFile(uri, metadata);
      this.descriptors[uri.fsPath] = descriptor;
      this._onContentChanged.fire(descriptor);
    } else {
      this.onDelete(uri);
    }
    this._onUpdated.fire(this);
  }

  private async onCreate(uri: vscode.Uri): Promise<void> {
    const metadata = await AppMapCollectionFile.getMetadata(uri);
    if (metadata) {
      const descriptor = new AppMapDescriptorFile(uri, metadata);
      this.descriptors[uri.fsPath] = descriptor;
      this._onUpdated.fire(this);
      this._onContentChanged.fire(descriptor);
    }
  }

  private async onDelete(uri: vscode.Uri): Promise<void> {
    delete this.descriptors[uri.fsPath];
    this._onUpdated.fire(this);
  }
}
