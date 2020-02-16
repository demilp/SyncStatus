import 'react-app-polyfill/stable';
import React from "react";
import ReactDOM from "react-dom";
import "./index.css";
import App from "./App";
window.log = function(message) {
  let l = {
    type: "log",
    content: { tag: "[Turnero]", message: message },
    origin: "DexTemplate"
  };
  console.log(l.content.message);
  window.parent.postMessage(l, "*");
};
let interval = 10;
try {
  interval = parseInt(document.getElementById("refreshTime").textContent);
} catch (e) {
  console.log(e);
}
window.log("Starting Dex Sync Status");
try {
  ReactDOM.render(
    <App interval={interval || 10} />,
    document.getElementById("root")
  );
} catch (e) {
  window.log(e)
}
