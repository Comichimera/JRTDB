// Function to load CSV data from an external source
function loadCSVData(filePath, callback) {
    fetch(filePath)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.text();
        })
        .then(data => {
            callback(data);
        })
        .catch(error => console.error('Error loading CSV:', error));
}

// Function to parse CSV into a usable array of objects
function parseCSV(csv) {
    const lines = csv.trim().split('\n');
    const headers = lines[0].split(',');
    return lines.slice(1).map(line => {
        const values = line.split(',');
        const obj = {};
        headers.forEach((header, i) => {
            obj[header.trim()] = values[i].trim();
        });
        return obj;
    });
}

// Function to format time from seconds (e.g., 180.862 to 3:00.862)
function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = (seconds % 60).toFixed(3).padStart(6, '0');
    return `${mins}:${secs}`;
}

// Function to group player records by level and category
function groupPlayerRecords(recordData, playerId, categoryMap) {
    const playerRecords = {};

    recordData.forEach(record => {
        if (record.player === playerId) {
            const { level, category, time } = record;
            const readableCategory = categoryMap[category];
            if (!readableCategory) {
                console.error(`Category ID not found: ${category}`);
                return;
            }

            const key = `${level}_${readableCategory}`;
            if (!playerRecords[key]) {
                playerRecords[key] = [];
            }

            playerRecords[key].push(parseFloat(time));
        }
    });

    // Sort times in descending order
    Object.keys(playerRecords).forEach(key => {
        playerRecords[key].sort((a, b) => b - a);
    });

    return playerRecords;
}

// Function to create a table for player records
function createTable(playerRecords, levelMap, categoryNames, title, sectionId, gamemode, playerList) {
    const tableContainer = document.getElementById('table-container');

    const sectionDiv = document.createElement('div');
    sectionDiv.id = sectionId;
    sectionDiv.className = 'content';

    // Add table title
    const tableTitle = document.createElement('h2');
    tableTitle.innerText = title;
    sectionDiv.appendChild(tableTitle);

    // Add a combo box with players
    const comboBox = document.createElement('select');
    comboBox.style.display = 'block'; // Ensure it appears on its own line
    comboBox.style.margin = '0 auto'; // Center the combo box

    // Add an empty default option
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.innerText = '-- Select a Player --';
    comboBox.appendChild(defaultOption);

    // Add players alphabetically with IDs as values
    playerList
        .sort((a, b) => a.name.localeCompare(b.name)) // Sort by player name
        .forEach(player => {
            const option = document.createElement('option');
            option.value = player.id; // Store Player ID as the value
            option.innerText = player.name; // Display Player Name
            comboBox.appendChild(option);
        });

    sectionDiv.appendChild(comboBox);

    // Add event listener to handle selection
    comboBox.addEventListener('change', () => {
        const selectedPlayerId = comboBox.value;
        if (selectedPlayerId) {
            // Redirect to the player page with the selected Player ID
            window.location.href = `Player.html?playerId=${selectedPlayerId}`;
        }
    });

    const table = document.createElement('table');

    // Create the table header
    const headerRow = document.createElement('tr');
    const trackHeader = document.createElement('th');
    trackHeader.innerText = 'Track';
    headerRow.appendChild(trackHeader);

    categoryNames.forEach(category => {
        const th = document.createElement('th');
        th.innerText = category;
        headerRow.appendChild(th);
    });

    table.appendChild(headerRow);

    // Populate rows for each track
    const sortedLevels = Object.values(levelMap)
        .filter(level => level.gamemode === gamemode)
        .sort((a, b) => a.order - b.order);

    sortedLevels.forEach(level => {
        const row = document.createElement('tr');
        const trackCell = document.createElement('td');

        const link = document.createElement('a');
        link.href = `https://www.jrtdb.com/level.html?level=${level.id}`;
        link.innerText = level.name;
        trackCell.appendChild(link);

        row.appendChild(trackCell);

        categoryNames.forEach(category => {
            const cell = document.createElement('td');
            cell.className = 'center';
            const key = `${level.id}_${category}`;

            if (playerRecords[key]) {
                const timesDiv = document.createElement('div');
                timesDiv.style.display = 'block';
                timesDiv.style.fontSize = 'inherit';
                timesDiv.style.lineHeight = '1.5';
                timesDiv.innerText = playerRecords[key]
                    .map(formatTime) // Format times
                    .join('\n');
                cell.appendChild(timesDiv);
            } else {
                // Leave cell empty if no records exist
                cell.innerText = '';
            }

            row.appendChild(cell);
        });

        table.appendChild(row);
    });

    sectionDiv.appendChild(table);
    tableContainer.appendChild(sectionDiv);
}

// Function to add a single "All Records Set by:" header
function addPlayerHeader(playerName, playerColor) {
    const header = document.createElement('h2');
    header.style.textAlign = 'center';
    header.innerHTML = `All Records Set by: <span style="color: ${playerColor}">${playerName}</span>`;
    const tableContainer = document.getElementById('table-container');
    tableContainer.parentNode.insertBefore(header, tableContainer);
}

// Load all data and create tables dynamically
function createAllTablesForPlayer(playerId) {
    loadCSVData('../data/players.csv', playersCSV => {
        const players = parseCSV(playersCSV);
        const player = players.find(p => p.id === playerId);

        if (!player) {
            console.error(`Player ID not found: ${playerId}`);
            return;
        }

        const playerName = player.player;
        const playerColor = player.colour;

        // Extract player names and IDs for the combo box
        const playerList = players.map(p => ({ id: p.id, name: p.player }));

        addPlayerHeader(playerName, playerColor); // Add header once above the first table

        loadCSVData('../data/categories.csv', categoriesCSV => {
            const categories = parseCSV(categoriesCSV);
            const categoryMap = categories.reduce((map, category) => {
                map[category.id] = category.name;
                return map;
            }, {});

            const categoryNames = Object.values(categoryMap);

            loadCSVData('../data/levels.csv', levelsCSV => {
                const levels = parseCSV(levelsCSV);
                const levelMap = levels.reduce((map, level) => {
                    map[level.id] = {
                        id: level.id,
                        name: level.name,
                        gamemode: level.gamemode,
                        order: parseInt(level.order, 10)
                    };
                    return map;
                }, {});

                loadCSVData('../data/records.csv', recordsCSV => {
                    const records = parseCSV(recordsCSV);

                    const playerRecords = groupPlayerRecords(records, playerId, categoryMap);

                    // Create only the tables
                    createTable(playerRecords, levelMap, categoryNames, "Time Trial Records", "table-TT", "Time Trial", playerList);
                    createTable(playerRecords, levelMap, categoryNames, "Pro Race Records", "table-PR", "Pro Race", playerList);
                    createTable(playerRecords, levelMap, categoryNames, "Battle Race Records", "table-BR", "Battle Race", playerList);
                });
            });
        });
    });
}

// Get player ID from URL and initialize
const playerId = new URLSearchParams(window.location.search).get('playerId');
if (!playerId) {
    console.error('Player ID not specified in URL.');
} else {
    createAllTablesForPlayer(playerId);
}
