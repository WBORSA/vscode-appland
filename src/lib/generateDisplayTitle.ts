import { ResolvedFinding } from '../services/resolvedFinding';
import * as vscode from 'vscode';

// Gets's name displayed in Findings bar
export default (finding: ResolvedFinding): string => {
  const absPath = finding.problemLocation?.uri.path;
  const relPath = absPath ? vscode.workspace.asRelativePath(absPath) : '';

  return `${finding.finding.ruleTitle}: ${finding.finding.groupMessage ||
    finding.finding.message}, ${finding.finding.scope.path || relPath}:${finding.finding.scope
    .lineno ||
    finding.problemLocation?.range.start.line ||
    ''}`;
};
