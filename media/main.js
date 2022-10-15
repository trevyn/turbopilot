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

  // setInterval(() => {
  //   counter.textContent = `${currentCount++} `;

  //   // Update state
  //   vscode.setState({ count: currentCount });

  //   // Alert the extension when the cat introduces a bug
  //   if (Math.random() < Math.min(0.001 * currentCount, 0.05)) {
  //     // Send a message back to the extension
  //     // vscode.postMessage({
  //     //     command: 'alert',
  //     //     text: '🐛  on line ' + currentCount
  //     // });
  //   }
  // }, 100);

  // Handle messages sent from the extension to the webview
  window.addEventListener("message", (event) => {
    const message = event.data; // The json data that the extension sent
    switch (message.command) {
      case "loading":
        maindiv.textContent = "loading...";
        maindiv.style.backgroundColor = "red";
        maindiv.style.color = "black";
        maindiv.style.fontSize = "22px";
        break;
      case "update-completions":
        // counter.textContent = JSON.stringify(message);

        maindiv.style.fontSize = "22px";
        maindiv.style.backgroundColor = "black";
        maindiv.style.color = "white";
        maindiv.textContent = JSON.stringify(message.completions.usage);

        for (let i = 0; i < message.completions.choices.length; i++) {
          const tempDiv = document.createElement("pre");
          tempDiv.style.backgroundColor = "#222";
          tempDiv.style.fontSize = "14px";
          // set hand cursor
          tempDiv.style.cursor = "pointer";
          tempDiv.onmouseover = (event) => {
            tempDiv.style.backgroundColor = "#111";
          };
          tempDiv.onmouseout = (event) => {
            tempDiv.style.backgroundColor = "#222";
          };
          tempDiv.textContent = message.completions.choices[i].text;
          maindiv.insertAdjacentElement("afterend", tempDiv);
        }
        break;
    }
  });
})();
