console.log("3");

const EVT_TYPES = ["launching", "starting", "changes", "victory"];

for (let i = 0; i < EVT_TYPES.length; i++) {
  let received;
  socket.on(EVT_TYPES[i], data => {
    received = {
      eventType: EVT_TYPES[i],
      eventData: data
    };
    console.debug(JSON.stringify(received));
  });
}
