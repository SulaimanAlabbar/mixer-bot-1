const { createLogger, format, transports } = require("winston");
require("winston-daily-rotate-file");
const fs = require("fs");
const path = require("path");
const validator = require("validator");
const { GameClient, setWebSocket } = require("@mixer/interactive-node");
const ws = require("ws");
const axios = require("axios");
const uuidv4 = require("uuid/v4");
const readline = require("readline");
require("colors");
const config = require("../config.json");
const {
  initializeDrops,
  initializeServers,
  initializeDropsButtonsControls,
  initializeDropsLabelsControls,
  initializeServersButtonsControls,
  initializeServersLabelsControls
} = require("./initializers");
const {
  intro,
  newRound,
  playerJoined,
  timerStarted,
  menu,
  seperator,
  errorMessage
} = require("./text");

const logDir = "../logs";

if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

const filename = path.join(logDir, "results.log");

const dailyRotateFileTransport = new transports.DailyRotateFile({
  filename: `${logDir}/%DATE%-results.log`,
  datePattern: "YYYY-MM-DD"
});

const logger = createLogger({
  level: "info",
  format: format.combine(
    format.timestamp({
      format: "YYYY-MM-DD HH:mm:ss"
    }),
    format.printf(info => `${info.timestamp} ${info.level}: ${info.message}`)
  ),
  transports: [new transports.File({ filename }), dailyRotateFileTransport]
});

const getIndexOfRoundTopVoter = players =>
  players.reduce(
    (iMax, x, i, arr) => (x.votes > arr[iMax].votes ? i : iMax),
    0
  );

const updateRoundTopVoter = (players, rtv) => {
  rtv.setText(
    `Round Top Voter: ${
      players[getIndexOfRoundTopVoter(players)].participant.username
    }`
  );
};

const printPlayersInGame = players => {
  console.log("Players currently ingame: ");
  for (let i = 0; i < players.length; i++) {
    console.log(`${i + 1}) ${players[i]}`);
  }
};

async function getLatestFollower() {
  try {
    const response1 = await axios.get(
      `https://mixer.com/api/v1/channels/${config.channel}`
    );

    const response2 = await axios.get(
      `https://mixer.com/api/v1/channels/${
        response1.data.id
      }/follow?order=followed.createdAt:desc`
    );

    return response2.data[0].username;
  } catch (error) {
    console.log(Date.now());
    console.error(error);
  }
}

let drops = initializeDrops(3);
let servers = initializeServers(2);
let players = [];
let gameId;
let playersInGame = [];
let roundColor = 0;
let gameColor = 0;
let branch = false;
let timerInitiated = false;
let interval;
const defaultSceneId = "default"; //uuidv4();
const playSceneId = "play"; //uuidv4();
const instructionsSceneId = "instructions"; //uuidv4();

setWebSocket(ws);
const client = new GameClient();

client.on("open", async () => {
  //==================================================
  //================CREATINGSCENES====================
  //==================================================
  //const defaultScene = await client.createScene({ sceneID: defaultSceneId });
  // const playScene = await client.createScene({ sceneID: playSceneId });
  // const instructionsScene = await client.createScene({
  //   sceneID: instructionsSceneId
  // });
  //==================================================
  //================CREATINGCONTROLS==================
  //==================================================
  const playButton = await client.createControls({
    sceneID: defaultSceneId,
    controls: config.controls.playButton
  });
  const instructionsButton = await client.createControls({
    sceneID: defaultSceneId,
    controls: config.controls.instructionsButton
  });
  const homePlayButton = await client.createControls({
    sceneID: playSceneId,
    controls: config.controls.homePlayButton
  });
  const instructionsPlayButton = await client.createControls({
    sceneID: playSceneId,
    controls: config.controls.instructionsPlayButton
  });
  const homeInstructionsButton = await client.createControls({
    sceneID: instructionsSceneId,
    controls: config.controls.homeInstructionsButton
  });
  const PlayInstructionsButton = await client.createControls({
    sceneID: instructionsSceneId,
    controls: config.controls.PlayInstructionsButton
  });

  const dropsButtons = await client.createControls({
    sceneID: playSceneId,
    controls: initializeDropsButtonsControls(drops)
  });

  const dropsLabels = await client.createControls({
    sceneID: playSceneId,
    controls: initializeDropsLabelsControls(drops)
  });

  const serversButtons = await client.createControls({
    sceneID: playSceneId,
    controls: initializeServersButtonsControls(servers)
  });
  const serversLabels = await client.createControls({
    sceneID: playSceneId,
    controls: initializeServersLabelsControls(servers)
  });

  const roundTopVoterLabel = await client.createControls({
    sceneID: defaultSceneId,
    controls: config.controls.roundTopVoterLabel
  });

  const gameIdTextBox = await client.createControls({
    sceneID: playSceneId,
    controls: config.controls.gameIdTextBox
  });

  const gameIdLabel = await client.createControls({
    sceneID: playSceneId,
    controls: config.controls.gameIdLabel
  });

  const boostButtons = await client.createControls({
    sceneID: playSceneId,
    controls: config.controls.boostButtons
  });
  const timerButton = await client.createControls({
    sceneID: playSceneId,
    controls: config.controls.timerButton
  });
  const vsButton = await client.createControls({
    sceneID: playSceneId,
    controls: config.controls.VSButton
  });
  const avatarButton = await client.createControls({
    sceneID: defaultSceneId,
    controls: config.controls.avatarButton
  });
  let currentDropLabel = await client.createControls({
    sceneID: defaultSceneId,
    controls: config.controls.currentDropLabel
  });
  let currentServerLabel = await client.createControls({
    sceneID: defaultSceneId,
    controls: config.controls.currentServerLabel
  });
  const latestFollowerLabel = await client.createControls({
    sceneID: defaultSceneId,
    controls: config.controls.latestFollowerLabel
  });
  const InstructionsLabels = await client.createControls({
    sceneID: instructionsSceneId,
    controls: config.controls.InstructionsLabels
  });

  //==================================================
  //=================CREATINGGROUPS===================
  //==================================================
  await client.createGroups({
    groups: [
      {
        groupID: "defaultGroup",
        sceneID: defaultSceneId
      },
      {
        groupID: "playGroup",
        sceneID: playSceneId
      },
      {
        groupID: "instructionsGroup",
        sceneID: instructionsSceneId
      }
    ]
  });
  //==================================================
  //===================GROUPBUTTONS===================
  //==================================================
  playButton.forEach(pb => {
    pb.on("mousedown", async (inputEvent, participant) => {
      participant.groupID = "playGroup";
      client.updateParticipants({
        participants: [participant]
      });
    });
  });

  instructionsButton.forEach(ib => {
    ib.on("mousedown", async (inputEvent, participant) => {
      participant.groupID = "instructionsGroup";
      client.updateParticipants({
        participants: [participant]
      });
    });
  });

  homePlayButton.forEach(hpb => {
    hpb.on("mousedown", async (inputEvent, participant) => {
      participant.groupID = "defaultGroup";
      client.updateParticipants({
        participants: [participant]
      });
    });
  });

  instructionsPlayButton.forEach(ipb => {
    ipb.on("mousedown", async (inputEvent, participant) => {
      participant.groupID = "instructionsGroup";
      client.updateParticipants({
        participants: [participant]
      });
    });
  });

  homeInstructionsButton.forEach(hib => {
    hib.on("mousedown", async (inputEvent, participant) => {
      participant.groupID = "defaultGroup";
      client.updateParticipants({
        participants: [participant]
      });
    });
  });

  PlayInstructionsButton.forEach(pib => {
    pib.on("mousedown", async (inputEvent, participant) => {
      participant.groupID = "playGroup";
      client.updateParticipants({
        participants: [participant]
      });
    });
  });

  //==================================================
  //===================DROPSBUTTONS===================
  //==================================================
  dropsButtons.forEach((db, index) => {
    drops[index].dropsButtonsControl = db;
    drops[index].dropsLabelsControl = dropsLabels[index];

    db.on("mousedown", async (inputEvent, participant) => {
      const indexOfPlayer = players.findIndex(
        player => player.participant.username === participant.username
      );
      const indexOfDrops = drops.findIndex(
        ls => ls.dropsButtonsControl.controlID === inputEvent.input.controlID
      );

      const player = players[indexOfPlayer];

      const drop = drops[indexOfDrops];

      if (player.lastDropsVote === null) {
        drop.votes += player.votes;

        drop.dropsLabelsControl.setText(`${drop.name} [${drop.votes}]`);

        updateRoundTopVoter(players, roundTopVoterLabel[0]);

        player.lastDropsVote = inputEvent.input.controlID;
      } else if (player.lastDropsVote !== inputEvent.input.controlID) {
        drop.votes += player.votes;

        drop.dropsLabelsControl.setText(`${drop.name} [${drop.votes}]`);

        const indexOfLastDrop = drops.findIndex(
          ls => ls.dropsButtonsControl.controlID === player.lastDropsVote
        );

        const lastDrop = drops[indexOfLastDrop];

        lastDrop.votes -= player.votes;

        lastDrop.dropsLabelsControl.setText(
          `${lastDrop.name} [${lastDrop.votes}]`
        );

        updateRoundTopVoter(players, roundTopVoterLabel[0]);

        player.lastDropsVote = inputEvent.input.controlID;
      }

      updateRoundTopVoter(players, roundTopVoterLabel[0]);
    });
  });
  //==================================================
  //===================SERVERBUTTONS==================
  //==================================================
  serversButtons.forEach((sb, index) => {
    servers[index].serversButtonsControl = sb;
    servers[index].serversLabelsControl = serversLabels[index];

    sb.on("mousedown", async (inputEvent, participant) => {
      const indexOfPlayer = players.findIndex(
        player => player.participant.username === participant.username
      );

      const indexOfServers = servers.findIndex(
        s => s.serversButtonsControl.controlID === inputEvent.input.controlID
      );

      const player = players[indexOfPlayer];
      const server = servers[indexOfServers];

      if (player.lastServersVote === null) {
        server.votes += player.votes;

        server.serversLabelsControl.setText(`${server.name} [${server.votes}]`);

        updateRoundTopVoter(players, roundTopVoterLabel[0]);

        player.lastServersVote = inputEvent.input.controlID;
      } else if (player.lastServersVote !== inputEvent.input.controlID) {
        server.votes += player.votes;

        server.serversLabelsControl.setText(`${server.name} [${server.votes}]`);

        const indexOfLastServersVote = servers.findIndex(
          ls => ls.serversButtonsControl.controlID === player.lastServersVote
        );

        const lastServer = servers[indexOfLastServersVote];

        lastServer.votes -= player.votes;

        lastServer.serversLabelsControl.setText(
          `${lastServer.name} [${lastServer.votes}]`
        );

        updateRoundTopVoter(players, roundTopVoterLabel[0]);

        player.lastServersVote = inputEvent.input.controlID;
      }

      updateRoundTopVoter(players, roundTopVoterLabel[0]);
    });
  });
  //==================================================
  //=====================TEXTBOX======================
  //==================================================
  gameIdTextBox.forEach(gidtb => {
    gidtb.on("submit", async (inputEvent, participant) => {
      if (gameId !== null && gameId !== undefined) {
        if (validator.isAlphanumeric(inputEvent.input.value + "")) {
          if (inputEvent.input.value.toLowerCase() === gameId.toLowerCase()) {
            if (!playersInGame.includes(participant.username)) {
              playersInGame.push(participant.username);

              console.log(
                gameColor === 0
                  ? playerJoined.magenta
                  : gameColor === 1
                  ? playerJoined.yellow
                  : playerJoined.cyan
              );
              gameColor = gameColor === 2 ? 0 : gameColor + 1;

              console.log(seperator);
              printPlayersInGame(playersInGame);
              console.log(menu);
              process.stdout.write("Input: ");
            }
          }
        }
      }
    });
  });
  //==================================================
  //===================BOOSTBUTTONS===================
  //==================================================
  boostButtons.forEach(bb => {
    bb.on("mousedown", async (inputEvent, participant) => {
      const indexOfPlayer = players.findIndex(
        player => player.participant.username === participant.username
      );

      const player = players[indexOfPlayer];

      const oldVotes = player.votes;

      if (inputEvent.input.controlID === "Boost_1") player.votes += 1;
      else if (inputEvent.input.controlID === "Boost_5") player.votes += 5;

      if (player.lastDropsVote !== null) {
        const indexOfDrops = drops.findIndex(
          ls => ls.dropsButtonsControl.controlID === player.lastDropsVote
        );

        const drop = drops[indexOfDrops];

        drop.votes += player.votes - oldVotes;

        drop.dropsLabelsControl.setText(`${drop.name} [${drop.votes}]`);
      }

      if (player.lastServersVote !== null) {
        const indexOfServers = servers.findIndex(
          s => s.serversButtonsControl.controlID === player.lastServersVote
        );

        const server = servers[indexOfServers];

        server.votes += player.votes - oldVotes;

        server.serversLabelsControl.setText(`${server.name} [${server.votes}]`);
      }

      if (inputEvent.transactionID)
        await client.captureTransaction(inputEvent.transactionID);
    });
  });

  //==================================================
  //==================LATESTFOLLOWER==================
  //==================================================
  const latestFollower = await getLatestFollower();
  latestFollowerLabel[0].setText(`Latest Follower: ${latestFollower}`);

  setInterval(async () => {
    const latestFollower = await getLatestFollower();

    if (latestFollower !== latestFollowerLabel[0].text)
      latestFollowerLabel[0].setText(`Latest Follower: ${latestFollower}`);
  }, 600000);

  await client.ready(true);

  //==================================================
  //==================RESTARTROUND====================
  //==================================================
  async function restartRound() {
    console.log(
      roundColor === 0
        ? newRound.red
        : roundColor === 1
        ? newRound.green
        : newRound.blue
    );
    roundColor = roundColor === 2 ? 0 : roundColor + 1;

    const indexOfMostVotedDrop = getIndexOfRoundTopVoter(drops);
    const indexOfMostVotedServer = getIndexOfRoundTopVoter(servers);

    if (drops[indexOfMostVotedDrop].votes === 0) {
      try {
        await client.deleteControls({
          sceneID: defaultSceneId,
          controlIDs: ["Current_Drop_Label"]
        });

        await client.createControls({
          sceneID: defaultSceneId,
          controls: [
            {
              ...config.controls.currentDropLabel[0],
              text: ""
            }
          ]
        });

        await client.updateControls({
          sceneID: defaultSceneId,
          controls: [
            {
              ...config.controls.currentDropLabel[0],
              text: ""
            }
          ]
        });
      } catch (error) {
        console.error(error);
      }
    } else {
      const dropName = drops[indexOfMostVotedDrop].name.slice(0);

      try {
        await client.deleteControls({
          sceneID: defaultSceneId,
          controlIDs: ["Current_Drop_Label"]
        });

        await client.createControls({
          sceneID: defaultSceneId,
          controls: [
            {
              ...config.controls.currentDropLabel[0],
              text: `Current Drop: ${dropName}`
            }
          ]
        });

        await client.updateControls({
          sceneID: defaultSceneId,
          controls: [
            {
              ...config.controls.currentDropLabel[0],
              text: `Current Drop: ${dropName}`
            }
          ]
        });
      } catch (error) {
        console.error(error);
      }
    }

    if (servers[indexOfMostVotedServer].votes === 0) {
      try {
        await client.deleteControls({
          sceneID: defaultSceneId,
          controlIDs: ["Current_Server_Label"]
        });

        await client.createControls({
          sceneID: defaultSceneId,
          controls: [
            {
              ...config.controls.currentServerLabel[0],
              text: ""
            }
          ]
        });

        await client.updateControls({
          sceneID: defaultSceneId,
          controls: [
            {
              ...config.controls.currentServerLabel[0],
              text: ""
            }
          ]
        });
      } catch (error) {
        console.error(error);
      }
    } else {
      const serverName = servers[indexOfMostVotedServer].name.slice(0);

      try {
        await client.deleteControls({
          sceneID: defaultSceneId,
          controlIDs: ["Current_Server_Label"]
        });

        await client.createControls({
          sceneID: defaultSceneId,
          controls: [
            {
              ...config.controls.currentServerLabel[0],
              text: `Current Server: ${serverName}`
            }
          ]
        });

        await client.updateControls({
          sceneID: defaultSceneId,
          controls: [
            {
              ...config.controls.currentServerLabel[0],
              text: `Current Server: ${serverName}`
            }
          ]
        });
      } catch (error) {
        console.error(error);
      }
    }

    drops = initializeDrops(3);
    servers = initializeServers(2);

    dropsButtons.forEach((db, index) => {
      const drop = drops[index];
      drop.dropsButtonsControl = db;
      drop.dropsLabelsControl = dropsLabels[index];
      db.update({ backgroundImage: drop.image });
      dropsLabels[index].setText(`${drop.name} [${drop.votes}]`);
    });

    serversButtons.forEach((sb, index) => {
      const server = servers[index];
      server.serversButtonsControl = sb;
      server.serversLabelsControl = serversLabels[index];
      sb.update({ backgroundImage: server.image });
      serversLabels[index].setText(`${server.name} [${server.votes}]`);
    });

    roundTopVoterLabel[0].setText("");
    timerButton[0].setText("");

    players.forEach(player => {
      player.votes = 1;
      player.lastDropsVote = null;
      player.lastServersVote = null;
    });

    players.forEach(player => {
      player.participant.groupID = "defaultGroup";
      client.updateParticipants({
        participants: [player.participant]
      });
    });

    console.log(menu);
    process.stdout.write("Input: ");
    clearInterval(interval);
  }

  //==================================================
  //=====================CONSOLE======================
  //==================================================
  console.log(intro);
  console.log(menu);

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: "Input: "
  });

  rl.prompt();

  rl.on("line", line => {
    if (branch) {
      gameId = line.trim();
      branch = false;
      console.log(menu);
    } else if (!branch) {
      switch (line.trim()) {
        case "1": {
          let counter = 60;
          let originalCounter = counter;

          console.log(timerStarted);
          console.log(menu);

          players.forEach(player => {
            player.participant.groupID = "playGroup";
            client.updateParticipants({
              participants: [player.participant]
            });
          });

          //restartRound();

          clearInterval(interval);

          timerButton[0].setProgress(1);
          timerButton[0].setText(`${counter--}`);

          interval = setInterval(() => {
            if (counter === 0) {
              restartRound();
              clearInterval(interval);
            }

            timerButton[0].setProgress(counter / originalCounter);
            timerButton[0].setText(`${counter--}`);
          }, 1000);
          break;
        }
        case "2":
          playersInGame = [];
          console.log("Enter last three characters of game ID: ");
          branch = true;
          break;
        case "3":
          console.log("Goodbye");
          process.exit(0);
          break;
        default:
          console.log(`Invalid Input '${line.trim()}'`);
          console.log(menu);
          break;
      }
    }
    rl.prompt();
  }).on("close", () => {
    console.log("Goodbye");
    process.exit(0);
  });
});

//==================================================
//=====================PLAYERS======================
//==================================================
client.state.on("participantJoin", async participant => {
  const indexOfPlayer = players.findIndex(
    player => player.participant.username === participant.username
  );

  if (indexOfPlayer === -1)
    players.push({
      participant: participant,
      votes: 1,
      lastDropsVote: null,
      lastServersVote: null
    });
  else players[indexOfPlayer].participant = participant;
});

client.on("error", error => {
  console.log(Date.now());
  console.error(error);
});

client.open({
  authToken: config.accessToken,
  versionId: config.versionId
});

process.on("uncaughtException", error => {
  console.log(errorMessage.red);
  logger.log("error", error);
});

process.on("unhandledRejection", error => {
  console.log(errorMessage.red);
  logger.log("error", error);
});

process.on("warning", warning => {
  logger.log("warning", warning);
});
