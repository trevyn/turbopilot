import * as vscode from "vscode";
import { Configuration, OpenAIApi, CreateCompletionResponse } from "openai";

const configuration = new Configuration({
  apiKey: vscode.workspace.getConfiguration("turbopilot").openaiApiKey,
});
const openai = new OpenAIApi(configuration);

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand("turbopilot.start", () => {
      TurbopilotPanel.createOrShow(context.extensionUri);

      if (TurbopilotPanel.currentPanel) {
        TurbopilotPanel.currentPanel.doLoading();
      }

      let activeEditor = vscode.window.activeTextEditor;
      let document = activeEditor?.document;
      let text = document?.getText();
      let curPos = activeEditor?.selection.active;
      if (!curPos || !text) return;
      let offset = document?.offsetAt(curPos);
      if (!offset) return;
      const documentPrefix = text.substr(0, offset);
      const documentSuffix = text.substr(offset);

      (async () => {
        try {
          const completion = await openai.createCompletion({
            model: "code-davinci-002",
            prompt: documentPrefix,
            suffix: documentSuffix,
            max_tokens: 50,
            temperature: 1,
            // logprobs: 0,
            n: 64,
          });

          if (!completion.data.choices) {
            console.log("no completions");
            return;
          }

          // Send completions to webview
          if (TurbopilotPanel) {
            TurbopilotPanel.currentPanel?.doUpdateCompletions(completion.data);
          }
        } catch (e: any) {
          console.log("error!");
          vscode.window.showErrorMessage("OpenAI API error, check console.log");
          if (e.response) {
            console.log(e.response.status);
            console.log(JSON.stringify(e.response.data));
            vscode.window.showErrorMessage(JSON.stringify(e.response.data));
          } else {
            console.log(e.message);
            vscode.window.showErrorMessage(e.message);
          }
        }
      })();
    })
  );

  if (vscode.window.registerWebviewPanelSerializer) {
    // Make sure we register a serializer in activation event
    vscode.window.registerWebviewPanelSerializer(TurbopilotPanel.viewType, {
      async deserializeWebviewPanel(
        webviewPanel: vscode.WebviewPanel,
        state: any
      ) {
        console.log(`Got state: ${state}`);
        // Reset the webview options so we use latest uri for `localResourceRoots`.
        webviewPanel.webview.options = getWebviewOptions(context.extensionUri);
        TurbopilotPanel.revive(webviewPanel, context.extensionUri);
      },
    });
  }
}

function getWebviewOptions(extensionUri: vscode.Uri): vscode.WebviewOptions {
  return {
    // Enable javascript in the webview
    enableScripts: true,

    // And restrict the webview to only loading content from our extension's `media` directory.
    localResourceRoots: [vscode.Uri.joinPath(extensionUri, "media")],
  };
}

class TurbopilotPanel {
  /**
   * Track the current panel. Only allow a single panel to exist at a time.
   */
  public static currentPanel: TurbopilotPanel | undefined;

  public static readonly viewType = "turbopilot";

  private readonly _panel: vscode.WebviewPanel;
  private readonly _extensionUri: vscode.Uri;
  private _disposables: vscode.Disposable[] = [];

  public static createOrShow(extensionUri: vscode.Uri) {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    // If we already have a panel, show it.
    if (TurbopilotPanel.currentPanel) {
      // TurbopilotPanel.currentPanel._panel.reveal(); // (column)
      return;
    }

    // Otherwise, create a new panel.
    const panel = vscode.window.createWebviewPanel(
      TurbopilotPanel.viewType,
      "Turbopilot",
      column || vscode.ViewColumn.One,
      getWebviewOptions(extensionUri)
    );

    TurbopilotPanel.currentPanel = new TurbopilotPanel(panel, extensionUri);
  }

  public static revive(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
    TurbopilotPanel.currentPanel = new TurbopilotPanel(panel, extensionUri);
  }

  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
    this._panel = panel;
    this._extensionUri = extensionUri;

    this._panel.webview.html = this._getHtmlForWebview(
      this._panel.webview,
      "https://media.giphy.com/media/JIX9t2j0ZTN9S/giphy.gif"
    );

    // Listen for when the panel is disposed
    // This happens when the user closes the panel or when the panel is closed programmatically
    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

    // Update the content based on view changes
    // this._panel.onDidChangeViewState(
    //   (e) => {
    //     if (this._panel.visible) {
    //       this._update();
    //     }
    //   },
    //   null,
    //   this._disposables
    // );

    // Handle messages from the webview
    this._panel.webview.onDidReceiveMessage(
      (message) => {
        switch (message.command) {
          case "alert":
            vscode.window.showErrorMessage(message.text);
            return;
          case "insert-text":
            const editor = vscode.window.activeTextEditor;
            if (editor) {
              editor.edit((editBuilder) => {
                editBuilder.insert(editor.selection.active, message.text);
              });
            }
            return;
        }
      },
      null,
      this._disposables
    );
  }

  public doLoading() {
    this._panel.webview.postMessage({ command: "loading" });
  }

  public doUpdateCompletions(completions: CreateCompletionResponse) {
    this._panel.webview.postMessage({
      command: "update-completions",
      completions,
    });
  }

  public dispose() {
    TurbopilotPanel.currentPanel = undefined;

    // Clean up our resources
    this._panel.dispose();

    while (this._disposables.length) {
      const x = this._disposables.pop();
      if (x) {
        x.dispose();
      }
    }
  }

  private _getHtmlForWebview(webview: vscode.Webview, gifPath: string) {
    // Local path to main script run in the webview
    const scriptPathOnDisk = vscode.Uri.joinPath(
      this._extensionUri,
      "media",
      "main.js"
    );

    // And the uri we use to load this script in the webview
    const scriptUri = webview.asWebviewUri(scriptPathOnDisk);

    // Local path to css styles
    const styleResetPath = vscode.Uri.joinPath(
      this._extensionUri,
      "media",
      "reset.css"
    );
    const stylesPathMainPath = vscode.Uri.joinPath(
      this._extensionUri,
      "media",
      "vscode.css"
    );

    // Uri to load styles into webview
    const stylesResetUri = webview.asWebviewUri(styleResetPath);
    const stylesMainUri = webview.asWebviewUri(stylesPathMainPath);

    // Use a nonce to only allow specific scripts to be run
    const nonce = getNonce();

    return `<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">

				<!--
					Use a content security policy to only allow loading images from https or from our extension directory,
					and only allow scripts that have a specific nonce.
				-->
				<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; img-src ${webview.cspSource} https:; script-src 'nonce-${nonce}';">

				<meta name="viewport" content="width=device-width, initial-scale=1.0">

				<link href="${stylesResetUri}" rel="stylesheet">
				<link href="${stylesMainUri}" rel="stylesheet">

				<title>Turbopilot</title>
			</head>
			<body>
				<img src="${gifPath}" width="300" />
				<div id="maindiv">0</div>

				<script nonce="${nonce}" src="${scriptUri}"></script>
			</body>
			</html>`;
  }
}

function getNonce() {
  let text = "";
  const possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
