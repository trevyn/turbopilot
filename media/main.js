// This script will be run within the webview itself
// It cannot access the main VS Code APIs directly.

(function () {
  const vscode = acquireVsCodeApi();

  const oldState = /** @type {{ count: number} | undefined} */ (
    vscode.getState()
  );

  const maindiv = /** @type {HTMLElement} */ (
    document.getElementById("maindiv")
  );
  console.log("Initial state", oldState);

  let currentCount = (oldState && oldState.count) || 0;
  maindiv.textContent = `${currentCount}`;
  maindiv.style.fontSize = "22px";

  //   // Update state
  //   vscode.setState({ count: currentCount });

  // Handle messages sent from the extension to the webview
  window.addEventListener("message", (event) => {
    const message = event.data; // The json data that the extension sent
    switch (message.command) {
      case "loading":
        maindiv.textContent = "loading...";
        maindiv.style.backgroundColor = "red";
        maindiv.style.color = "black";
        break;
      case "update-completions":
        // counter.textContent = JSON.stringify(message);

        maindiv.style.backgroundColor = "black";
        maindiv.style.color = "white";
        maindiv.textContent = JSON.stringify(message.completions.usage);

        for (let i = 0; i < message.completions.choices.length; i++) {
          const tempDiv = document.createElement("pre");
          tempDiv.style.backgroundColor = "#222";
          tempDiv.style.fontSize = "14px";
          tempDiv.style.borderTop = "1px solid white";
          tempDiv.style.cursor = "pointer";
          tempDiv.onmouseover = (event) => {
            tempDiv.style.backgroundColor = "#111";
          };
          tempDiv.onmouseout = (event) => {
            tempDiv.style.backgroundColor = "#222";
          };
          tempDiv.onclick = (event) => {
            vscode.postMessage({
              command: "insert-text",
              text: message.completions.choices[i].text,
            });
          };

          tempDiv.textContent = message.completions.choices[i].text;
          maindiv.appendChild(tempDiv);
        }
        break;
    }
  });
})();
