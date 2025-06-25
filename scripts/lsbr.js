// Function to load and parse CSV data
function loadCSV(filePath, callback) {
    fetch(filePath)
        .then(response => response.text())
        .then(data => callback(parseCSV(data)))
        .catch(error => console.error('Error loading CSV:', error));
}

// Parse CSV data into an array of objects
function parseCSV(csv) {
    const lines = csv.trim().split('\n');
    const headers = lines[0].split(',');
    return lines.slice(1).map(line => {
        const values = line.split(',');
        return headers.reduce((acc, header, index) => {
            acc[header.trim()] = values[index]?.trim();
            return acc;
        }, {});
    });
}

// Function to group records by leaderboard (level + category)
function groupRecordsByLeaderboard(records) {
    const grouped = {};
    records.forEach(record => {
        const key = `${record.level}_${record.category}`;
        if (!grouped[key]) {
            grouped[key] = [];
        }
        grouped[key].push(record);
    });
    return grouped;
}

// Function to calculate the days a record stood
function calculateDaysStood(startDate, endDate) {
    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : new Date();
    return Math.ceil((end - start) / (1000 * 60 * 60 * 24));
}

// Function to process records and calculate additional fields
function processRecords(records, levels, categories, players) {
    const validLevelIDs = new Set([
        "ldyq21jw", "n93koqnw", "z98pnrgw", "rdn3noqw",
        "ldyq21kw", "gdrr2p6d", "nwl03g0w", "ywe0l2y9",
        "69z7zplw", "r9g6xy5w", "o9x64109", "495p4k0w",
        "rdqylzk9"
    ]);

    // Filter records by valid level IDs
    const filteredRecords = records.filter(record => validLevelIDs.has(record.level.trim().toLowerCase()));

    const grouped = groupRecordsByLeaderboard(filteredRecords);
    const processed = [];

    const levelMap = levels.reduce((map, level) => {
        map[level.id.trim().toLowerCase()] = `${level.name} (${level.gamemode})`;
        return map;
    }, {});

    const categoryMap = categories.reduce((map, category) => {
        map[category.id.trim().toLowerCase()] = category.name;
        return map;
    }, {});

    const playerMap = players.reduce((map, player) => {
        map[player.id.trim().toLowerCase()] = { 
            name: player.player, 
            color: player.colour 
        };
        return map;
    }, {});

    Object.values(grouped).forEach(leaderboardRecords => {
        leaderboardRecords.sort((a, b) => new Date(a.date) - new Date(b.date));

        for (let i = 0; i < leaderboardRecords.length; i++) {
            const current = leaderboardRecords[i];
            const next = leaderboardRecords[i + 1];

            const recordCategory = current.category.trim().toLowerCase();
            const recordPlayer = current.player.trim().toLowerCase();

            processed.push({
                track: levelMap[current.level.trim().toLowerCase()] || current.level,
                category: categoryMap[recordCategory] || current.category,
                playerName: playerMap[recordPlayer]?.name || current.player,
                playerColor: playerMap[recordPlayer]?.color || "#000000",
                time: current.time,
                dateSet: current.date,
                dateBeaten: next ? next.date : 'Unbeaten',
                beatenBy: next
                    ? { 
                        name: playerMap[next.player.trim().toLowerCase()]?.name || next.player, 
                        color: playerMap[next.player.trim().toLowerCase()]?.color || "#000000" 
                      }
                    : 'Unbeaten',
                daysStood: calculateDaysStood(current.date, next ? next.date : null),
            });
        }
    });

    processed.sort((a, b) => b.daysStood - a.daysStood);

    return processed;
}

// Function to populate the table in the HTML
function populateTable(records) {
    const tableContainer = document.getElementById('table-container');
    const table = document.createElement('table');

    // Create table headers
    const headers = ['Record', 'Player', 'Time', 'Date Set', 'Date Beaten', 'Beaten By', 'Days Stood'];
    const headerRow = document.createElement('tr');

    headers.forEach(header => {
        const th = document.createElement('th');
        th.innerText = header;
        headerRow.appendChild(th);
    });

    table.appendChild(headerRow);

    // Function to format time from ss.xxx to m:ss.xxx
    function formatTime(seconds) {
        const totalSeconds = parseFloat(seconds);
        const minutes = Math.floor(totalSeconds / 60);
        const remainingSeconds = (totalSeconds % 60).toFixed(3);
        return `${minutes}:${remainingSeconds.padStart(6, '0')}`;
    }

    // Create table rows
    records.forEach(record => {
        const row = document.createElement('tr');

        // Record column (combining Track and Category)
        const recordCell = document.createElement('td');
        recordCell.innerText = `${record.track} ${record.category}`;
        row.appendChild(recordCell);

        // Player column with color styling
        const playerCell = document.createElement('td');
        const playerSpan = document.createElement('span');
        playerSpan.style.cssText = `color: ${record.playerColor};`;
        playerSpan.innerText = record.playerName;
        playerCell.appendChild(playerSpan);
        row.appendChild(playerCell);

        // Time column (formatted)
        const timeCell = document.createElement('td');
        timeCell.innerText = formatTime(record.time);
        row.appendChild(timeCell);

        // Date Set column
        const dateSetCell = document.createElement('td');
        dateSetCell.innerText = record.dateSet;
        row.appendChild(dateSetCell);

        // Date Beaten and Beaten By columns (merged for unbeaten records)
        if (record.beatenBy === 'Unbeaten') {
            const mergedCell = document.createElement('td');
            mergedCell.innerText = 'Unbeaten';
            mergedCell.colSpan = 2; // Span both "Date Beaten" and "Beaten By" columns
            mergedCell.style.textAlign = 'center'; // Center-align text
            row.appendChild(mergedCell);
        } else {
            // Date Beaten column
            const dateBeatenCell = document.createElement('td');
            dateBeatenCell.innerText = record.dateBeaten;
            row.appendChild(dateBeatenCell);

            // Beaten By column with color styling
            const beatenByCell = document.createElement('td');
            const beatenBySpan = document.createElement('span');
            beatenBySpan.style.cssText = `color: ${record.beatenBy.color};`;
            beatenBySpan.innerText = record.beatenBy.name;
            beatenByCell.appendChild(beatenBySpan);
            row.appendChild(beatenByCell);
        }

        // Days Stood column
        const daysStoodCell = document.createElement('td');
        daysStoodCell.innerText = record.daysStood;
        row.appendChild(daysStoodCell);

        table.appendChild(row);
    });

    tableContainer.appendChild(table);
}

function createListButton() {
    // Get the summary container element
    const summaryContainer = document.getElementById('summary-container');
    
    // Create the button element
    const button = document.createElement('button');
    button.innerText = 'Unbeaten List';
    button.style.cssText = 'padding: 10px 20px; margin: 10px; font-size: 16px; cursor: pointer;';
    
    // Add a click event listener to redirect to OverallUnbeaten.html
    button.addEventListener('click', () => {
        window.location.href = 'BattleRaceUnbeaten.html';
    });
    
    // Append the button to the summary container
    summaryContainer.appendChild(button);
}

document.addEventListener('DOMContentLoaded', createListButton);

// Load all necessary CSV files and populate the table
Promise.all([
    fetch('../data/records.csv').then(res => res.text()).then(parseCSV),
    fetch('../data/levels.csv').then(res => res.text()).then(parseCSV),
    fetch('../data/categories.csv').then(res => res.text()).then(parseCSV),
    fetch('../data/players.csv').then(res => res.text()).then(parseCSV),
]).then(([records, levels, categories, players]) => {
    const processedRecords = processRecords(records, levels, categories, players);
    populateTable(processedRecords);
}).catch(error => console.error('Error loading data:', error));
