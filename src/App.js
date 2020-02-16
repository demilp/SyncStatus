import React from "react";
import "./App.css";
import axios from "axios";

class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      data: null,
      ip: null,
      connected: false
    };
    this.getIpInterval = null;
    window.log("Subscribing to player messages");
    window.addEventListener("message", e => {
      if (typeof e.data !== "object") return;
      if (e.data.type === "ip") {
        window.log("Received IP " + e.data.content);
        this.setState(
          {
            ip: e.data.content === "0.0.0.0" ? "localhost" : e.data.content
          },
          this.onIp
        );
      }
    });
    this.fetch = this.fetch.bind(this);
    this.getIp = this.getIp.bind(this);
    this.onIp = this.onIp.bind(this);
  }
  getIp() {
    window.log("Getting IP");
    if (window.parent !== window) {
      window.log("via post message");
      window.parent.postMessage(
        { origin: "DexTemplate", type: "getIP", content: {} },
        "*"
      );
    } else {
      window.log("window.parent === window, not iframe, using localhost");
      this.setState({ ip: "localhost" }, this.onIp);
    }
  }
  onIp() {
    clearInterval(this.getIpInterval);
    setInterval(this.fetch, this.props.interval * 1000);
    this.fetch();
  }

  componentDidMount() {
    window.log("Component mounted");
    this.getIpInterval = setInterval(this.getIp, 5000);
    this.getIp();
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
              {this.state.data.group[k].last_report?new Date(this.state.data.group[k].last_report).toLocaleString():""}
            </td>
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
            </tr>
          </thead>
          <tbody>{d}</tbody>
        </table>
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
        <img src="./logo.png" alt="logo" className="logo" />
      </div>
    );
  }
  fetch() {
    axios
      .get("http://" + this.state.ip + ":9520")
      .then(res => {
        this.setState({ data: res.data, connected: true });
        window.log(res.data);
      })
      .catch(e => {
        this.setState({ connected: false });
        console.log(e);
      });
  }
}

export default App;
