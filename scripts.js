var webRtcPeer;
var mySignal;
const v = window.location.hash ? window.location.hash.substr(1) : Math.ceil(Math.random()*100);
const mqttClientId = Math.round(Math.random() * Math.pow(10, 10)).toString(16);
var mqttClient = mqtt.connect("wss://test.mosquitto.org:8081", {clientId: mqttClientId,
                                                                will: {
                                                                  topic: `aw2xcd/signal/${v}/${mqttClientId}`,
                                                                  payload: null,
                                                                  retain: true
                                                                }
                                                               });
var timeout;
var initiator;

mqttClient.on("error", e => console.log(e));
mqttClient.on("message", (topic, message) => {
  // one of the nodes disconnected
  if(!message.toString()) {
    // if im the initiator, then the client went down, do nothing and reset the signal
    if(initiator) {
      console.log('re publish');
      mqttClient.publish(`aw2xcd/signal/${v}/${mqttClientId}`, JSON.stringify(mySignal), {retain: true});
    } else {
      console.log('webRtcPeer.destroy');
      webRtcPeer.destroy();
      webRtcPeer = undefined;      
    }
  } else if (topic != `aw2xcd/signal/${v}/${mqttClientId}`) {
    message = JSON.parse(message.toString());
    console.log("MQTT", topic, message);
    if(!webRtcPeer) {
      clearTimeout(timeout);
      startWebRtcPeer(false);
    }
    console.log('re signal');
    webRtcPeer.signal(message);
  }
});
mqttClient.on("connect", () => {
  mqttClient.subscribe(`aw2xcd/signal/${v}/#`);
  // become initiator after 5 seconds
  timeout = setTimeout(() => startWebRtcPeer(true), 5000);
});

function startWebRtcPeer(_initiator) {
  initiator = _initiator;
  webRtcPeer = new SimplePeer({ initiator: initiator, trickle: false });
  webRtcPeer.on("error", err => console.log("ERROR", err));
  webRtcPeer.on("signal", function(data) {
    console.log("SIGNAL", JSON.stringify(data));
    // send mqtt
    if (initiator) {
      console.log('becoming initiator');
      mySignal = data; // save for later if client clears retain
      mqttClient.publish(`aw2xcd/signal/${v}/${mqttClientId}`, JSON.stringify(data), {retain: true});
    } else {
      mqttClient.publish(`aw2xcd/signal/${v}/${mqttClientId}`, JSON.stringify(data), {retain: false});
    }
  });
  webRtcPeer.on("connect", () => {
    console.log("CONNECT");
    document.getElementById('a').innerHTML = 'Connected. Open https://chris-gunawardena.github.io/webRTC-data-channel/#' + v + ' in another browser or window';
    document.getElementById('a').href = 'https://chris-gunawardena.github.io/webRTC-data-channel/#' + v;
    webRtcPeer.send("whatever" + Math.random());
  });
  webRtcPeer.on("data", data => document.querySelector('textarea').value = data); 
}
