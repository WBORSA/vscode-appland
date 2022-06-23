import * as vscode from 'vscode';
import { CTA_EARLY_ACCESS_RT_ANALYSIS } from '../actions/betaSignup';
import ExtensionState from '../configuration/extensionState';
import { CTA_INTERACT, Telemetry } from '../telemetry';

export const COMMAND_EARLY_ACCESS = 'appmap.getEarlyAccess';

export default function registerCommand(
  context: vscode.ExtensionContext,
  extensionState: ExtensionState
): void {
  context.subscriptions.push(
    vscode.commands.registerCommand(
      COMMAND_EARLY_ACCESS,
      async (placement: 'sidebar' | 'notification') => {
        extensionState.setShouldViewBetaCta(false);
        Telemetry.sendEvent(CTA_INTERACT, { id: CTA_EARLY_ACCESS_RT_ANALYSIS, placement });
        vscode.env.openExternal(vscode.Uri.parse('https://appland.com'));
      }
    )
  );
}
