import * as vscode from 'vscode';
import ExtensionSettings from '../configuration/extensionSettings';
import ExtensionState from '../configuration/extensionState';
import { ProjectStateServiceInstance } from '../services/projectStateService';
import { CTA_DISMISS, CTA_INTERACT, CTA_VIEW, Telemetry } from '../telemetry';

const id = 'early-access-runtime-analysis';
const placement = 'notification';
export const CTA_EARLY_ACCESS_RT_ANALYSIS = 'early-access-runtime-analysis';

export default async function initialize(
  extensionState: ExtensionState,
  projectStates: Readonly<Array<ProjectStateServiceInstance>>
): Promise<void> {
  if (!ExtensionSettings.analysisBetaSignupEnabled()) {
    return;
  }

  if (!extensionState.shouldViewBetaCta) {
    return;
  }

  let hasInstallableProject = false;
  for (const projectState of projectStates) {
    if (await projectState.supported()) {
      hasInstallableProject = true;
    }
  }

  if (!hasInstallableProject) {
    // Wait until a viable project is open
    return;
  }

  Telemetry.sendEvent(CTA_VIEW, { id: CTA_EARLY_ACCESS_RT_ANALYSIS, placement });

  const result = await vscode.window.showInformationMessage(
    'Sign up for early access to runtime analysis.',
    'Get Early Access'
  );

  extensionState.setShouldViewBetaCta(false);

  if (result) {
    vscode.env.openExternal(vscode.Uri.parse('https://appland.com'));
    Telemetry.sendEvent(CTA_INTERACT, { id: CTA_EARLY_ACCESS_RT_ANALYSIS, placement });
  } else {
    Telemetry.sendEvent(CTA_DISMISS, { id: CTA_EARLY_ACCESS_RT_ANALYSIS, placement });
  }
}
