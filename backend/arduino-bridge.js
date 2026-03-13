import { SerialPort } from "serialport";
import { ReadlineParser } from "@serialport/parser-readline";

const port = new SerialPort({
  path: "/dev/ttyACM0",
  baudRate: 9600
});

const parser = port.pipe(new ReadlineParser({ delimiter: "\n" }));

parser.on("data", async (line) => {
  try {
    const data = JSON.parse(line);

    const payload = {
      houseId: "house_1",
      energyProduced: data.energyProduced,
      energyConsumed: data.energyConsumed,
      timestamp: Date.now()
    };

    await fetch("http://localhost:5005/energy/report", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    console.log("sent to backend:", payload);

  } catch (err) {
    console.log("invalid data:", line);
  }
});
