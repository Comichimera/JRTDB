async function fetchCSVData(path) {
    const response = await fetch(path);
    const text = await response.text();
    return parseCSV(text);
}

function parseCSV(csvText) {
    const rows = csvText.split('\n');
    const headers = rows[0].split(',');
    return rows.slice(1).map(row => {
        const values = row.split(',');
        return headers.reduce((acc, header, index) => {
            acc[header.trim()] = values[index]?.trim();
            return acc;
        }, {});
    });
}

async function populateSplits(videoAId, videoBId) {
    const splitsA = await fetchCSVData(`data/lap_analyses/lap_data/${videoAId}.csv`);
    const splitsB = await fetchCSVData(`data/lap_analyses/lap_data/${videoBId}.csv`);

    const splitsBody = document.getElementById('splits-body');

    splitsBody.innerHTML = splitsA.map((splitA, index) => {
        const splitB = splitsB[index];

        if (!splitB) return '';

        const timeA = parseFloat(splitA.time).toFixed(3);
        const timeB = parseFloat(splitB.time).toFixed(3);

        const deltaA = (timeA - timeB).toFixed(3);
        const deltaB = (timeB - timeA).toFixed(3);

        const deltaAFormatted = `${deltaA > 0 ? '+' : ''}${deltaA}`;
        const deltaBFormatted = `${deltaB > 0 ? '+' : ''}${deltaB}`;

        return `
            <tr>
                <td>${splitA.split}</td>
                <td>${timeA}</td>
                <td class="${deltaA > 0 ? 'positive-delta' : 'negative-delta'}">${deltaAFormatted}</td>
                <td>${timeB}</td>
                <td class="${deltaB > 0 ? 'positive-delta' : 'negative-delta'}">${deltaBFormatted}</td>
            </tr>
        `;
    }).join('');
}

async function getPlayerData() {
    const data = await fetchCSVData('data/players.csv');
    return data.reduce((acc, player) => {
        acc[player.id] = {
            name: player.player,
            color: player.colour
        };
        return acc;
    }, {});
}

async function getVideoData() {
    const data = await fetchCSVData('data/lap_analyses/laps.csv');
    const videoA = data.find(video => video.id === 'njsypy72');
    const videoB = data.find(video => video.id === '6zmp1cx3');
    return {
        videoA: {
            id: videoA.id, // Add this to ensure the ID is included
            url: videoA.url,
            start: parseFloat(videoA.start_frame),
            end: parseFloat(videoA.end_frame),
            playerId: videoA.player
        },
        videoB: {
            id: videoB.id, // Add this to ensure the ID is included
            url: videoB.url,
            start: parseFloat(videoB.start_frame),
            end: parseFloat(videoB.end_frame),
            playerId: videoB.player
        }
    };
}

let playerA, playerB;
const FRAME_DURATION = 1 / 30; // Frame duration in seconds for 30 FPS
let videoData;

var tag = document.createElement('script');
tag.src = "https://www.youtube.com/iframe_api";
var firstScriptTag = document.getElementsByTagName('script')[0];
firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

async function onYouTubeIframeAPIReady() {
    const players = await getPlayerData();
    videoData = await getVideoData();

    const playerAData = players[videoData.videoA.playerId];
    const playerBData = players[videoData.videoB.playerId];

    const playerAName = document.getElementById('playerAName');
    const playerBName = document.getElementById('playerBName');

    playerAName.textContent = playerAData.name;
    playerAName.style.color = playerAData.color;

    playerBName.textContent = playerBData.name;
    playerBName.style.color = playerBData.color;

    const playerATimeHeader = document.getElementById('playerATimeHeader');
    const playerADeltaHeader = document.getElementById('playerADeltaHeader');
    const playerBTimeHeader = document.getElementById('playerBTimeHeader');
    const playerBDeltaHeader = document.getElementById('playerBDeltaHeader');

    playerATimeHeader.textContent = `${playerAData.name} Time`;
    playerATimeHeader.style.color = playerAData.color;

    playerADeltaHeader.textContent = `${playerAData.name} Delta`;
    playerADeltaHeader.style.color = playerAData.color;

    playerBTimeHeader.textContent = `${playerBData.name} Time`;
    playerBTimeHeader.style.color = playerBData.color;

    playerBDeltaHeader.textContent = `${playerBData.name} Delta`;
    playerBDeltaHeader.style.color = playerBData.color;

    playerA = new YT.Player('playerA', {
        height: '315',
        width: '560',
        videoId: videoData.videoA.url.split('youtu.be/')[1],
        events: {
            'onReady': (event) => onPlayerReady(event, videoData.videoA.start),
            'onStateChange': (event) => onPlayerStateChange(event, videoData.videoA.end)
        }
    });

    playerB = new YT.Player('playerB', {
        height: '315',
        width: '560',
        videoId: videoData.videoB.url.split('youtu.be/')[1],
        events: {
            'onReady': (event) => onPlayerReady(event, videoData.videoB.start),
            'onStateChange': (event) => onPlayerStateChange(event, videoData.videoB.end)
        }
    });

    populateSplits(videoData.videoA.id, videoData.videoB.id);
}

// Handle player readiness and seek to the start time
function onPlayerReady(event, startTime) {
    event.target.seekTo(startTime, true);
    event.target.pauseVideo();
}

// Pause video when it reaches or exceeds the end time
function onPlayerStateChange(event, endTime) {
    if (event.data === YT.PlayerState.PLAYING) {
        const interval = setInterval(() => {
            if (event.target.getCurrentTime() >= endTime) {
                event.target.pauseVideo();
                clearInterval(interval);
            }
        }, 100);
    }
}

// Play/Pause both videos
document.getElementById('playPauseButton').addEventListener('click', function () {
    const isPlayingA = playerA.getPlayerState() === YT.PlayerState.PLAYING;
    const isPlayingB = playerB.getPlayerState() === YT.PlayerState.PLAYING;

    if (isPlayingA && isPlayingB) {
        playerA.pauseVideo();
        playerB.pauseVideo();
    } else {
        playerA.playVideo();
        playerB.playVideo();
    }
});

// Reset both videos
document.getElementById('resetButton').addEventListener('click', function () {
    const stateA = playerA.getPlayerState();
    const stateB = playerB.getPlayerState();

    playerA.seekTo(videoData.videoA.start, true);
    playerB.seekTo(videoData.videoB.start, true);

    if (stateA === YT.PlayerState.PLAYING) {
        playerA.playVideo();
    } else {
        playerA.pauseVideo();
    }

    if (stateB === YT.PlayerState.PLAYING) {
        playerB.playVideo();
    } else {
        playerB.pauseVideo();
    }
});

// Adjust frames for both videos
function adjustFrame(offset) {
    const currentA = playerA.getCurrentTime();
    const currentB = playerB.getCurrentTime();

    playerA.seekTo(currentA + offset, true);
    playerB.seekTo(currentB + offset, true);
}

document.getElementById('minus1F').addEventListener('click', () => adjustFrame(-FRAME_DURATION));
document.getElementById('plus1F').addEventListener('click', () => adjustFrame(FRAME_DURATION));
document.getElementById('minus15F').addEventListener('click', () => adjustFrame(-FRAME_DURATION * 15));
document.getElementById('plus15F').addEventListener('click', () => adjustFrame(FRAME_DURATION * 15));
document.getElementById('minus30F').addEventListener('click', () => adjustFrame(-FRAME_DURATION * 30));
document.getElementById('plus30F').addEventListener('click', () => adjustFrame(FRAME_DURATION * 30));