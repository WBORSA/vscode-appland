import { ResolvedFinding } from '../services/resolvedFinding';
import * as vscode from 'vscode';

// Gets's name displayed in Findings bar
export default (finding: ResolvedFinding): string => {
  const absPath = finding.problemLocation?.uri.path;
  const relPath = absPath ? vscode.workspace.asRelativePath(absPath) : undefined;

  const rule = finding.finding.ruleTitle;
  const context = finding.finding.groupMessage || finding.finding.message;
  const path = finding.finding.scope.path || relPath;
  const lineno = finding.finding.scope.lineno || finding.problemLocation?.range.start.line;

  const fullPathString = path && lineno ? `, ${path}:${lineno}` : '';

  return `${rule}: ${context}${fullPathString}`;
};
