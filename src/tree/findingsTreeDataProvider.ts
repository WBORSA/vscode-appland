import { Event } from '@appland/models';
import * as vscode from 'vscode';
import FindingsIndex from '../services/findingsIndex';
import { ResolvedFinding } from '../services/resolvedFinding';
import generateTitle from '../lib/generateDisplayTitle';

export class FindingsTreeDataProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<undefined>();
  public readonly onDidChangeTreeData = this._onDidChangeTreeData.event;
  findingsIndex: FindingsIndex;

  constructor(findingsIndex: FindingsIndex) {
    this.findingsIndex = findingsIndex;
    this.findingsIndex.onChanged(() => this._onDidChangeTreeData.fire(undefined));
  }

  public getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
    return element;
  }

  public getParent(): Thenable<vscode.TreeItem | null> {
    return Promise.resolve(null);
  }

  public getChildren(): vscode.TreeItem[] {
    const uniqueFindings: { [key: string]: ResolvedFinding } = this.findingsIndex
      .findings()
      .reduce((acc, finding) => {
        acc[finding.finding.hash] = finding;
        return acc;
      }, {});

    return Object.values(uniqueFindings).map(
      (finding: ResolvedFinding): vscode.TreeItem => {
        const item = new vscode.TreeItem(generateTitle(finding));
        item.id = finding.finding.hash;
        if (finding.problemLocation) {
          item.command = {
            title: 'Open',
            command: 'vscode.open',
            arguments: [finding.problemLocation.uri],
          };
        }
        return item;
      }
    );
  }
}
