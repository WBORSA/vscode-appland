import { Event } from '@appland/models';
import * as vscode from 'vscode';
import FindingsIndex from '../services/findingsIndex';
import { ResolvedFinding } from '../services/resolvedFinding';

// Gets's name displayed in Findings bar
function getTreeName(finding: ResolvedFinding): string {
  const absPath = finding.problemLocation?.uri.path;
  const relPath = absPath ? vscode.workspace.asRelativePath(absPath) : '';

  return `${finding.finding.ruleTitle}: ${finding.finding.groupMessage ||
    finding.finding.message}, ${finding.finding.scope.path || relPath}:${finding.finding.scope
    .lineno ||
    finding.problemLocation?.range.start.line ||
    ''}`;
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
        const item = new vscode.TreeItem(getTreeName(finding));
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
