import { Event } from '@appland/models';
import * as vscode from 'vscode';
import FindingsIndex from '../services/findingsIndex';
import { ResolvedFinding } from '../services/resolvedFinding';
import { Finding } from '@appland/scanner/built/cli';

function getTreeName(finding: Finding): string {
  return `${finding.ruleTitle}: ${finding.groupMessage || finding.message}, ${finding.stack[0]}`;
}

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
        const item = new vscode.TreeItem(getTreeName(finding.finding));
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
