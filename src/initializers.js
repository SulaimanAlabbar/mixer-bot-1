const config = require("../config.json");

const random = (min, max) => Math.floor(Math.random() * (max - min + 1) + min);

const initializeDropsButtonsControls = drops =>
  config.controls.dropsButtons.map((db, index) => ({
    ...db,
    // tooltip: drops[index].name,
    backgroundImage: drops[index].image
  }));

const initializeDropsLabelsControls = drops =>
  config.controls.dropsLabels.map((dl, index) => ({
    ...dl,
    text: `${drops[index].name} [${drops[index].votes}]`
  }));

const initializeServersButtonsControls = servers =>
  config.controls.serversButtons.map((sb, index) => ({
    ...sb,
    // tooltip: servers[index].name,
    backgroundImage: servers[index].image
  }));

const initializeServersLabelsControls = servers =>
  config.controls.serversLabels.map((sl, index) => ({
    ...sl,
    text: `${servers[index].name} [${servers[index].votes}]`
  }));

const initializeDrops = length => {
  let DC = [];
  const numOfDrops = config.drops.length;

  for (let i = 0; i < length && i < numOfDrops; i++) {
    let rnd = random(0, numOfDrops - 1);

    while (DC.map(dc => dc.index).includes(rnd)) {
      rnd = random(0, numOfDrops - 1);
    }

    DC.push({
      id: "drops",
      index: rnd,
      name: config.drops[rnd].name,
      image: config.drops[rnd].image,
      votes: 0,
      dropsButtonsControl: null,
      dropsLabelsControl: null
    });
  }

  return DC;
};

const initializeServers = length => {
  let SC = [];
  const numOfServers = Array.from(new Set(config.servers)).length;

  for (let i = 0; i < length && i < numOfServers; i++) {
    let rnd = random(0, numOfServers - 1);

    while (SC.map(sc => sc.name).includes(config.servers[rnd])) {
      rnd = random(0, numOfServers - 1);
    }
    SC.push({
      id: "servers",
      index: rnd,
      name: config.servers[rnd],
      image:
        config.servers[rnd] === "Brazil"
          ? "https://i.imgur.com/tz8PzVY.png"
          : config.servers[rnd] === "Europe"
          ? "https://i.imgur.com/WMeG3KR.png"
          : config.servers[rnd] === "Oceania"
          ? "https://i.imgur.com/U0HxoU8.png"
          : config.servers[rnd] === "NA East"
          ? "https://i.imgur.com/EQabKOD.png"
          : config.servers[rnd] === "NA West"
          ? "https://i.imgur.com/EQabKOD.png"
          : "",

      votes: 0,
      serversButtonsControl: null,
      serversLabelsControl: null
    });
  }

  SC = SC.sort(() => Math.random() - 0.5);

  return SC;
};

module.exports.initializeDrops = initializeDrops;
module.exports.initializeServers = initializeServers;
module.exports.initializeDropsButtonsControls = initializeDropsButtonsControls;
module.exports.initializeDropsLabelsControls = initializeDropsLabelsControls;
module.exports.initializeServersButtonsControls = initializeServersButtonsControls;
module.exports.initializeServersLabelsControls = initializeServersLabelsControls;
