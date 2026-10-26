const mqtt = require('mqtt');
const fs = require('fs'); 
const cfg = require('./config');
const base = `tecsup/${cfg.grupo}`;
const UMBRAL_TEMP = 30; // °C

const ARCHIVO = 'lecturas.csv';
if (!fs.existsSync(ARCHIVO)) {
  fs.writeFileSync(ARCHIVO, 'fecha_hora,id,temp,hum\n');
}

const client = mqtt.connect(cfg.url, {
  username: cfg.username,
  password: cfg.password,
  clientId: `monitor-${cfg.grupo}-${Math.random().toString(16).slice(2, 8)}`,
});

client.on('connect', () => {
  console.log('Monitor conectado al broker');

  client.subscribe([`${base}/sensores/#`, `${base}/estado`], { qos: 1 }, (err) => {
    if (err) console.error('Error al suscribirse:', err.message);
  });
});

client.on('message', (topic, message) => {
  const texto = message.toString();

  if (topic === `${base}/estado`) {
    console.log(`[ESTADO] Sensor ${texto}`);
    return;
  }

  try {
    const dato = JSON.parse(texto);
    console.log(`[${topic}] temp=${dato.temp} °C, hum=${dato.hum} %`);

    const fechaHora = new Date().toLocaleString('sv-SE'); 
    fs.appendFileSync(ARCHIVO, `${fechaHora},${dato.id},${dato.temp},${dato.hum}\n`);

    if (dato.temp > UMBRAL_TEMP) {
      const alerta = { id: dato.id, msg: 'Temperatura alta', temp: dato.temp };
      client.publish(`${base}/alertas`, JSON.stringify(alerta), { qos: 1 });
      console.log('ALERTA enviada:', alerta);
    }
  } catch (e) {
    console.error('Mensaje con formato no válido:', texto);
  }
});

client.on('error', (err) => console.error('Error:', err.message));