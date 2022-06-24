import { ResolvedFinding } from '../services/resolvedFinding';
import * as vscode from 'vscode';

// Gets's name displayed in Findings bar
export default (finding: ResolvedFinding): string => {
  const absPath = finding.problemLocation?.uri.path;
  const relPath = absPath ? vscode.workspace.asRelativePath(absPath) : undefined;

  const rule = finding.finding.ruleTitle;
  const context = finding.finding.groupMessage || finding.finding.message;
  const lineno = finding.problemLocation?.range.start.line;

  const fullPathString = finding.problemLocation ? `, ${relPath}:${lineno}` : '';

  return `${rule}: ${context}${fullPathString}`;
};
