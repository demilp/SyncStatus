import React from "react";
import "./App.css";
//import axios from "axios";
import DexTemplateService from "./dexTemplateService";

class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      data: null,
      connected: false,
      pingDelay: [],
      isMaster: false,
      nextPingAt: null,
      downloadData: null
    };
    this.xhr = null;
    this.getIpInterval = null;
    window.log("Subscribing to player messages");
    this.fetch = this.fetch.bind(this);
    this.DexTemplateService = new DexTemplateService("SyncStatus");
    if (this.DexTemplateService.ip) {
      setInterval(this.fetch, this.props.interval * 1000);
      this.fetch();
    } else
      this.DexTemplateService.ipSubject.subscribe(ip => {
        setInterval(this.fetch, this.props.interval * 1000);
        this.fetch();
      });
    this.DexTemplateService.passthroughSubject.subscribe(passthrough => {
      if (passthrough.url === "/ping") {
        passthrough.body.Count = passthrough.body.Count || 30;
        passthrough.body.Interval = passthrough.body.Interval || 500;
        let c = 0;
        let interval = setInterval(() => {
          this.DexTemplateService.broadcast({
            command: "ping",
            time: new Date().getTime()
          });
          c++;
          if (c >= passthrough.body.Count) {
            clearInterval(interval);
          }
        }, passthrough.body.Interval);
      } else if (passthrough.url === "/play") {
        this.DexTemplateService.broadcast("play");
      } else if (passthrough.url === "/pause") {
        this.DexTemplateService.broadcast("pause");
      } else if (passthrough.url === "/stop") {
        this.DexTemplateService.broadcast("stop");
      }
    });
    this.DexTemplateService.keySubject.subscribe(key => {
      if (key === "channelDown") {
        this.downloadFile();
      }
    });
    this.DexTemplateService.broadcastSubject.subscribe(broadcastData => {
      console.log(broadcastData);
      if (broadcastData.type === "sendSync") {
        if (broadcastData.content === "play") {
          this.refs.vidRef.currentTime = 0;
          this.refs.vidRef.play();
        } else if (broadcastData.content === "pause") {
          this.refs.vidRef.pause();
        } else if (broadcastData.content === "stop") {
          this.refs.vidRef.pause();
          this.refs.vidRef.currentTime = 0;
        } else if (typeof broadcastData.content === "object") {
          /* if (broadcastData.content.command === "ping") {
            this.DexTemplateService.broadcast({
              command: "pong",
              time: broadcastData.content.time,
              ip: this.DexTemplateService.ip
            });
          } else  */ if (
            this.state.isMaster &&
            broadcastData.content.command === "pong" &&
            this.state.data.group[
              broadcastData.content.ip
            ] /*  ||
              broadcastData.content.ip === "localhost" */
          ) {
            let d = this.state.data;
            let ip = broadcastData.content.ip;
            /* if (this.DexTemplateService.ip === "localhost") {
              Object.keys(this.state.data.group).forEach(key => {
                if (this.state.data.group[key].isMaster) {
                  ip = key;
                }
              });
            } */
            d.group[ip].latency =
              new Date().getTime() - broadcastData.content.time + " ms";
            this.setState({ data: d });
          }
        }
      }
    });
  }

  componentDidMount() {
    window.log("Component mounted");
  }
  render() {
    let d = [];
    if (this.state.data) {
      let keys = Object.keys(this.state.data.group || {});
      d = keys.map(k => {
        return (
          <tr key={k} className={k === this.state.ip ? "bold" : ""}>
            <td>{k}</td>
            <td>{this.state.data.group[k].state}</td>
            <td>{this.state.data.group[k].originalChannel}</td>
            <td>{this.state.data.group[k].currentChannel}</td>
            <td>{this.state.data.group[k].playlistId}</td>
            <td>{this.state.data.group[k].playlistTimestamp}</td>
            <td>{this.state.data.group[k].scheduleId}</td>
            <td>{this.state.data.group[k].scheduleTimestamp}</td>
            <td>{this.state.data.group[k].isMaster.toString()}</td>
            <td>{this.state.data.group[k].stamp}</td>
            <td>
              {this.state.data.group[k].last_report
                ? new Date(
                    this.state.data.group[k].last_report
                  ).toLocaleString()
                : ""}
            </td>
            <td>{this.state.data.group[k].latency || "??"}</td>
          </tr>
        );
      });
    }
    return (
      <div>
        <table>
          <thead>
            <tr>
              <th className="left">IP</th>
              <th>State</th>
              <th>Current Channel</th>
              <th>Original Channel</th>
              <th>Playlist Id</th>
              <th>Playlist Timestamp</th>
              <th>Schedule Id</th>
              <th>Schedule Timestamp</th>
              <th>Is Master</th>
              <th>Stamp</th>
              <th>Last Report</th>
              <th>Latency</th>
            </tr>
          </thead>
          <tbody>{d}</tbody>
        </table>

        <div className="bottom">
          <div className="info">
            <div className="info-line">
              Group Name: {this.state.data ? this.state.data.groupName : ""}
            </div>
            <div className="info-line">
              Tags: {(this.state.data ? this.state.data.tags : []).join(", 0")}
            </div>
            <div className="info-line">
              Multicast: {this.state.data ? this.state.data.multicast : ""}
            </div>
            <div className="info-line">
              <span>
                Connected:
                <span
                  className={
                    this.state.connected ? "connected on" : "connected off"
                  }
                />
              </span>
            </div>
          </div>
          <button
            onClick={() => {
              this.downloadFile();
            }}
          >
            {!this.xhr ? "Download Test File" : "Stop Download"}
          </button>
          <div className="download-data">
            {(() => {
              let a = [
                <span key="state">
                  State:{" "}
                  {this.state.downloadData
                    ? this.state.downloadData.state || ""
                    : ""}
                </span>,
                <span key="url">
                  File:{" "}
                  {this.state.downloadData
                    ? this.state.downloadData.url || ""
                    : ""}
                </span>,
                <span key="size">
                  File size:{" "}
                  {this.state.downloadData && this.state.downloadData.total
                    ? (this.state.downloadData.total / 1024 / 1024).toFixed(2) +
                      "MB"
                    : ""}
                </span>,
                <span key="speed">
                  Curent speed:{" "}
                  {this.state.downloadData && this.state.downloadData.kBs
                    ? this.state.downloadData.kBs > 1024
                      ? (this.state.downloadData.kBs / 1024).toFixed(2) + "mB/s"
                      : this.state.downloadData.kBs.toFixed(2) + "kB/s"
                    : ""}
                </span>,
                <span key="av-speed">
                  Average speed:{" "}
                  {this.state.downloadData && this.state.downloadData.totalkBs
                    ? this.state.downloadData.totalkBs > 1024
                      ? (this.state.downloadData.totalkBs / 1024).toFixed(2) +
                        "mB/s"
                      : this.state.downloadData.totalkBs.toFixed(2) + "kB/s"
                    : ""}
                </span>,
                <span key="progress">
                  Progress:{" "}
                  {this.state.downloadData && this.state.downloadData.fraction
                    ? (this.state.downloadData.fraction * 100).toFixed(2) + "%"
                    : ""}
                </span>
              ];

              return a;
            })()}
          </div>
          <video ref="vidRef" src="./counter.mp4" />
        </div>

        <img src="./logo.png" alt="logo" className="logo" />
      </div>
    );
  }
  fetch() {
    this.DexTemplateService.syncStatus()
      .then(res => {
        let isMaster = false;
        let group = Object.entries(res.data.group);
        if (this.DexTemplateService.ip === "localhost") {
          isMaster = group[0] ? group[0][1].isMaster : false;
        } else {
          let s = group.find(d => {
            return d[0] === this.DexTemplateService.ip;
          });
          if (s) {
            isMaster = s[1].isMaster;
          } else {
            isMaster = false;
          }
        }
        if (isMaster) {
          for (let i = 0; i < 10; i++) {
            setTimeout(() => {
              this.DexTemplateService.broadcast({
                command: "ping",
                time: new Date().getTime()
              });
            }, i * 500);
          }
          this.DexTemplateService.broadcast("play");
        }
        this.setState({ data: res.data, connected: true, isMaster: isMaster });
        window.log(res.data);
      })
      .catch(e => {
        this.setState({ connected: false });
        console.log(e);
      });
  }
  downloadFile() {
    let url =
      (this.DexTemplateService.metadata.Server ||
        "http://server.dexmanager.com") +
      "/DexStorage/files/test-files/speedtest.mp4";
    if (this.xhr) {
      this.xhr.abort();
      this.xhr = null;
      return;
    }
    let startTimestamp = 0;
    let lastTimestamp = 0;
    let downloaded = 0;
    let total = 0;
    let fraction = 0;
    let lastDownloaded = 0;
    let partialBPMS = 0;
    let totalBPMS = 0;
    let self = this;
    function onProgress(event) {
      if (lastTimestamp && event.timeStamp - lastTimestamp < 500) return;
      lastDownloaded = event.loaded - downloaded;
      total = event.total;
      downloaded = event.loaded;
      fraction = downloaded / total;
      partialBPMS = lastDownloaded / (event.timeStamp - lastTimestamp);
      lastTimestamp = event.timeStamp;
      totalBPMS = downloaded / (lastTimestamp - startTimestamp);
      let kBs = (partialBPMS * 1000) /*B/s */ / 1024; /*kB/s*/
      let totalkBs = (totalBPMS * 1000) /*B/s */ / 1024; /*kB/s*/
      let d = {
        url,
        fraction,
        kBs,
        state: event.type,
        totalkBs,
        total
      };
      self.setState({
        downloadData: d
      });
    }
    function onEvent(event) {
      self.xhr = null;
      let d = self.state.downloadData || {};
      d.state = event.type;
      if (event.type === "load") d.fraction = 1;
      self.setState({
        downloadData: d
      });
    }
    function onLoadStart(event) {
      startTimestamp = event.timeStamp;
      lastTimestamp = event.timeStamp;
    }
    const xhr = new XMLHttpRequest();
    xhr.addEventListener("progress", onProgress);
    xhr.addEventListener("error", onEvent);
    xhr.addEventListener("load", onEvent);
    xhr.addEventListener("abort", onEvent);
    xhr.addEventListener("loadstart", onLoadStart);
    url += (url.match(/\?/) == null ? "?" : "&") + new Date().getTime();
    xhr.open("GET", url);
    xhr.send();
    this.xhr = xhr;
  }
}

export default App;
