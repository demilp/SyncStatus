import axios from "axios";
import isEqual from "lodash/isEqual";
import * as io from "socket.io-client";
import { Subject } from "rxjs";

export default class DexTemplateService {
  constructor(appName) {
    this.appName = appName;
    let self = this;
    this.ip = null;
    this.metadataSubject = new Subject();
    this.ipSubject = new Subject();
    this.passthroughSubject = new Subject();
    this.broadcastSubject = new Subject();
    this.keySubject = new Subject();
    this.metadata = {};

    if (window.parent === window) {
      if (process.env.NODE_ENV !== "production") {
        self.ip = "localhost";
        self.ipSubject.next(self.ip);
        this.createSocket(self.ip);
        this.log("Development socket created");
      }
      if (window.EventSource) {
        var source = new EventSource(
          "http://localhost:9520/event-stream?channel=POST|receiveTurn"
        );
        source.addEventListener(
          "message",
          function(e) {
            if (e.data.startsWith("POST|receiveTurn@cmd.String ")) {
              let msg = JSON.parse(JSON.parse(e.data.substring(28)));
              this.passthroughSubject.next({
                ...msg,
                Timestamp: new Date().toISOString()
              });
            }
          }.bind(this),
          false
        );
      }
    } else {
      this.log("Requesting ip address");
      window.parent.postMessage(getIPRequest, "*");
    }

    window.addEventListener("message", e => {
      try {
        if (typeof e.data !== "object") return;
        const data = e.data;
        const content = data.content;
        if (data.type === "metadata") {
          this.log("Received metadata " + JSON.stringify(content));
          if (!isEqual(content, self.metadata)) {
            this.log(
              "Metadata changed from " +
                JSON.stringify(self.metadata) +
                " to " +
                JSON.stringify(content)
            );
            self.metadata = content;
            self.metadataSubject.next(self.metadata);
          }
        } else if (data.type === "ip") {
          this.log("Received ip " + content);
          self.ip = content === "0.0.0.0" ? "localhost" : content;
          self.createSocket(self.ip);
          self.ipSubject.next(self.ip);
        } else if (data.type === "sendSync") {
          self.broadcastSubject.next(data);
        }else if(data.type === "key"){
          self.keySubject.next(content);
        }
      } catch (error) {
        this.log(error);
      }
    });
  }

  createSocket(ip) {
    this.log("Creating socket. IP: " + ip);
    this.socket = io(`http://${ip}:9520/passthrough`);
    this.socket.on(
      "data",
      function(msg) {
        this.passthroughSubject.next({
          ...msg,
          Timestamp: new Date().toISOString()
        });
      }.bind(this)
    );
  }

  getMetadata() {
    this.log("Requesting metadata");
    if (window.parent === window) {
      axios
        .get("http://localhost:9501/DexClient/GetMachineInfo.json")
        .then(response => {
          if (response.data && response.data.MachineMetadata) {
            let metadata = {
              ...response.data.MachineMetadata,
              Id: response.data.MachineId
            };
            this.log("Received metadata " + JSON.stringify(metadata));
            if (!isEqual(metadata, this.metadata)) {
              this.log(
                "Metadata changed from " +
                  JSON.stringify(this.metadata) +
                  " to " +
                  JSON.stringify(metadata)
              );
              this.metadata = metadata;
              this.metadataSubject.next(this.metadata);
            }
          }
        })
        .catch(error => {
          /* if (__config.useDebugMetadata)
            this.metadataSubject.next(testMetadata); */
        });
    } else window.parent.postMessage(getMetadataRequest, "*");
  }

  broadcast(data) {
    this.log("Sending broadcast " + JSON.stringify(data));
    window.parent.postMessage(
      {
        content: data,
        type: "sendSync",
        origin: "DexTemplate",
        app: this.appName
      },
      "*"
    );
  }

  onMetadataChange() {
    return this.metadataSubject;
  }
  onData() {
    return this.passthroughSubject;
  }
  syncStatus() {
    return axios.get("http://" + this.ip + ":9520");
  }
  log(message) {
    let l = {
      type: "log",
      content: { tag: `[${this.appName}]`, message: message },
      origin: "DexTemplate"
    };
    console.log(l.content.message);
    window.parent.postMessage(l, "*");
  }
}
const getMetadataRequest = {
  origin: "DexTemplate",
  type: "getMetadata",
  content: {}
};
const getIPRequest = {
  origin: "DexTemplate",
  type: "getIP",
  content: {}
};
