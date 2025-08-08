// Function to fetch and parse CSV files
const easterEggs = {
  "404": "https://www.youtube.com/watch?v=dQw4w9WgXcQ", // Rick-roll
  "69" : "https://i.imgur.com/N1cE0yV.gif",             // “nice”
  // drop more pairs here whenever you want
};

function fetchCSV(file) {
    return fetch(file)
        .then(response => response.text())
        .then(text => {
            return text.split('\n').slice(1).map(row => {
                const values = row.split(',');
                return values;
            });
        });
}

// Helper to format time
function formatTime(time) {
    const [seconds, milliseconds] = time.split('.');
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = (seconds % 60).toString(); // Convert to string for padStart
    return `${minutes}:${remainingSeconds.padStart(2, '0')}.${milliseconds}`;
}

// Helper to transform YouTube URL into embeddable link
function transformYoutubeUrl(url) {
    return url.replace('youtube.com/', 'youtube.com/embed/');
}

// Main function to generate page
function generateRunPage() {
    const urlParams = new URLSearchParams(window.location.search);
    const runId = parseInt(urlParams.get('run'), 10); // Ensure runId is a number
    if (easterEggs[runId]) {
        location.replace(easterEggs[runId]);
    }


    if (!runId) {
        document.getElementById('data-container').innerHTML = '<p>Error: No run specified in the URL.</p>';
        return;
    }

    Promise.all([
        fetchCSV('data/records.csv'),
        fetchCSV('data/levels.csv'),
        fetchCSV('data/categories.csv'),
        fetchCSV('data/players.csv'),
        fetchCSV('data/runs.csv') // Load runs.csv
    ]).then(([records, levels, categories, players, runs]) => {
        // Find the run data by comparing the correct column for 'order'
        const runData = records.find(record => parseInt(record[4], 10) === runId);
        if (!runData) {
            document.getElementById('data-container').innerHTML = '<p>Error: Run not found.</p>';
            return;
        }

        // Extract data from the run
        const [levelId, categoryId, playerId, , , rawTime] = runData; // Adjust index for order
        const time = formatTime(rawTime);

        const levelData = levels.find(level => level[0] === levelId);
        const categoryData = categories.find(category => category[0] === categoryId);
        const playerData = players.find(player => player[0] === playerId);

        if (levelData && categoryData && playerData) {
            const levelName = levelData[1];
            const gameMode = levelData[2];
            const categoryName = categoryData[1];
            const playerName = playerData[1];
            const playerColor = playerData[2];

            const h2 = document.createElement('h2');
            h2.innerHTML = `${levelName} (${gameMode}), ${categoryName} - ${time} by<br><span style="color:${playerColor}">${playerName}</span>`;

            const container = document.getElementById('data-container');
            container.appendChild(h2);

            // Find the additional run data from runs.csv
            const runExtraData = runs.find(run => parseInt(run[0], 10) === runId); // Match order
            if (runExtraData) {
                const [ , videoUrl, runnerComments] = runExtraData; // Extract video and comments

                // Transform YouTube URL to embeddable link
                const embedUrl = transformYoutubeUrl(videoUrl);

                // Embed video
                const videoIframe = document.createElement('iframe');
                videoIframe.src = embedUrl;
                videoIframe.width = "560";
                videoIframe.height = "315";
                videoIframe.frameBorder = "0";
                videoIframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
                videoIframe.allowFullscreen = true;
                container.appendChild(videoIframe);

                // Add runner's comments
                const comments = document.createElement('p');
                comments.textContent = runnerComments;
                container.appendChild(comments);
            }
        } else {
            document.getElementById('data-container').innerHTML = '<p>Error: Data for level, category, or player not found.</p>';
        }
    }).catch(error => {
        console.error('Error loading data:', error);
        document.getElementById('data-container').innerHTML = '<p>Error loading data. Please try again later.</p>';
    });
}

// Run the script when the page loads
document.addEventListener('DOMContentLoaded', generateRunPage);
