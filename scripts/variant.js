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
    const data = lines.slice(1).map(line => {
        const values = line.split(',');
        const obj = {};
        headers.forEach((header, i) => {
            obj[header.trim()] = values[i].trim(); // Trim values to avoid extra spaces
        });
        return obj;
    });
    return data;
}

// Function to format time from ss.xxx to m:ss.xxx
function formatTime(time) {
    const seconds = parseFloat(time);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = (seconds % 60).toFixed(3);
    return `${minutes}:${remainingSeconds.padStart(6, '0')}`; // Ensures formatting like 1:05.345
}

// Create a player lookup map from players.csv
function createPlayerMap(playerData) {
    const playerMap = {};
    playerData.forEach(player => {
        playerMap[player.id] = { name: player.player, color: player.colour };
    });
    return playerMap;
}

// Create a category lookup map from categories.csv
function createCategoryMap(categoryData) {
    const categoryMap = {};
    categoryData.forEach(category => {
        categoryMap[category.id] = category.name; // Map category ID to category name
    });
    return categoryMap;
}

// Create a level lookup map from levels.csv
function createLevelMap(levelData) {
    const levelMap = {};
    levelData.forEach(level => {
        levelMap[level.id] = {
            id: level.id,
            name: level.name,
            gamemode: level.gamemode,
            order: parseInt(level.order) // Convert the order to a number for sorting
        };
    });
    return levelMap;
}

// Function to find the best record for each leaderboard within a date range
function findBestRecordsWithinRange(recordData, startDate, endDate) {
    const bestRecords = {};

    recordData.forEach(row => {
        const { level, category, player, time, date } = row;
        const recordDate = new Date(date);

        // Check if record is within the date range
        if (recordDate >= startDate && recordDate <= endDate) {
            const key = `${level}_${category}`; // Unique key for each leaderboard (level + category)
            const timeValue = parseFloat(time); // Parse the time as a float for comparison

            // If no record exists for this leaderboard or if the current time is lower, store it
            if (!bestRecords[key] || timeValue < bestRecords[key].time) {
                bestRecords[key] = { level, category, player, time: timeValue };
            }
        }
    });

    return bestRecords;
}

// Group the best records by track and category based on gamemode using levels.csv
function groupBestRecordsByGamemode(bestRecords, levelMap, categoryMap, gamemode) {
    const trackMap = {};

    // Create an array of levels filtered by the gamemode and sorted by the order field
    const sortedLevels = Object.values(levelMap)
        .filter(level => level.gamemode === gamemode)
        .sort((a, b) => a.order - b.order); // Sort by order

    sortedLevels.forEach(level => {
        const levelId = Object.keys(levelMap).find(key => levelMap[key] === level);

        Object.values(bestRecords).forEach(record => {
            const { level: recordLevel, category, player, time } = record;

            if (recordLevel === levelId) {
                const track = levelMap[recordLevel].name;
                const categoryName = categoryMap[category]; // Get the category name using the ID

                if (!trackMap[track]) {
                    trackMap[track] = {};
                }
                trackMap[track][categoryName] = { player, time: formatTime(time) };
            }
        });
    });

    return trackMap;
}

// Add a date range selector in the summary-container
function addDateRangeSelector() {
    const summaryContainer = document.getElementById('summary-container');

    // Clear existing elements in summary-container to avoid duplicates
    summaryContainer.innerHTML = '';

    // Create label and date input elements
    const startDateLabel = document.createElement('label');
    startDateLabel.innerText = "Start Date: ";
    startDateLabel.htmlFor = "start-date-selector";

    const startDateInput = document.createElement('input');
    startDateInput.type = "date";
    startDateInput.id = "start-date-selector";

    const endDateLabel = document.createElement('label');
    endDateLabel.innerText = "End Date: ";
    endDateLabel.htmlFor = "end-date-selector";

    const endDateInput = document.createElement('input');
    endDateInput.type = "date";
    endDateInput.id = "end-date-selector";

    // Create a submit button
    const submitButton = document.createElement('button');
    submitButton.innerText = "Submit";

    // Get the current date range from the URL parameters or default to today
    const urlParams = new URLSearchParams(window.location.search);
    const startDateParam = urlParams.get('startDate');
    const endDateParam = urlParams.get('endDate');
    startDateInput.value = startDateParam || new Date(0).toISOString().split('T')[0];
    endDateInput.value = endDateParam || new Date().toISOString().split('T')[0];

    // Add event listener for the submit button
    submitButton.addEventListener('click', () => {
        const startDate = startDateInput.value;
        const endDate = endDateInput.value;
        if (startDate && endDate) {
            const newUrl = new URL(window.location.href);
            newUrl.searchParams.set('startDate', startDate);
            newUrl.searchParams.set('endDate', endDate);
            window.location.href = newUrl.toString(); // Reload the page with the new date range
        }
    });

    // Append elements to the summary container
    summaryContainer.appendChild(startDateLabel);
    summaryContainer.appendChild(startDateInput);
    summaryContainer.appendChild(endDateLabel);
    summaryContainer.appendChild(endDateInput);
    summaryContainer.appendChild(submitButton);
}

// Function to tally records for each player and game mode
function tallyPlayerRecords(bestRecords, playerMap, levelMap) {
    const tally = {};

    Object.values(bestRecords).forEach(record => {
        const { player, level } = record;
        const levelEntry = levelMap[level];

        if (!levelEntry) {
            console.error(`Level not found for ID: ${level}`);
            return;
        }

        const gamemode = levelEntry.gamemode;

        if (!tally[player]) {
            tally[player] = { timeTrial: 0, proRace: 0, battleRace: 0, total: 0 };
        }

        if (gamemode === 'Time Trial') {
            tally[player].timeTrial += 1;
        } else if (gamemode === 'Pro Race') {
            tally[player].proRace += 1;
        } else if (gamemode === 'Battle Race') {
            tally[player].battleRace += 1;
        }

        tally[player].total = tally[player].timeTrial + tally[player].proRace + tally[player].battleRace;
    });

    // Convert the tally object into an array and sort by total records
    const tallyArray = Object.keys(tally).map(playerId => {
        const player = playerMap[playerId];
        return {
            playerId,
            playerName: player ? player.name : "Unknown",
            color: player ? player.color : "#000", // Default color to black if player is unknown
            ...tally[playerId]
        };
    });

    tallyArray.sort((a, b) => b.total - a.total || a.playerName.localeCompare(b.playerName));

    return tallyArray;
}

// Function to create the Current Tally table
function createTallyTable(tallyData) {
    const tableContainer = document.getElementById('table-container');

    // Create a title for the tally table
    const tableTitle = document.createElement('h2');
    tableTitle.innerText = "Current Tally";
    tableContainer.appendChild(tableTitle);

    const table = document.createElement('table');

    // Create the table header
    const headerRow = document.createElement('tr');
    const headers = ['Rank', 'Player', 'Time Trial', 'Pro Race', 'Battle Race', 'Total'];
    headers.forEach(header => {
        const th = document.createElement('th');
        th.innerText = header;
        headerRow.appendChild(th);
    });

    table.appendChild(headerRow);

    // Create rows for each player
    let rank = 1;
    let previousTotal = null;
    let actualRank = 1; // This is for ties

    tallyData.forEach((playerData, index) => {
        const row = document.createElement('tr');

        // Rank logic: check if the total is the same as the previous one for tied ranking
        if (previousTotal !== playerData.total) {
            actualRank = rank;
        }

        // Rank column
        const rankCell = document.createElement('td');
        rankCell.innerText = actualRank;
        row.appendChild(rankCell);

        // Player column
        const playerCell = document.createElement('td');
        playerCell.innerHTML = `<span style="color: ${playerData.color}">${playerData.playerName}</span>`;
        row.appendChild(playerCell);

        // Time Trial column
        const timeTrialCell = document.createElement('td');
        timeTrialCell.innerText = playerData.timeTrial;
        row.appendChild(timeTrialCell);

        // Pro Race column
        const proRaceCell = document.createElement('td');
        proRaceCell.innerText = playerData.proRace;
        row.appendChild(proRaceCell);

        // Battle Race column
        const battleRaceCell = document.createElement('td');
        battleRaceCell.innerText = playerData.battleRace;
        row.appendChild(battleRaceCell);

        // Total column
        const totalCell = document.createElement('td');
        totalCell.innerText = playerData.total;
        row.appendChild(totalCell);

        // Append the row to the table
        table.appendChild(row);

        // Update previous total and rank for the next iteration
        previousTotal = playerData.total;
        rank += 1;
    });

    tableContainer.appendChild(table);
}

// Function to create tables and display records within the specified date range
function createAllTablesWithinDateRange(recordData, levelMap, categoryMap, playerMap, startDate, endDate) {
    const bestRecords = findBestRecordsWithinRange(recordData, startDate, endDate);

    // Create Time Trial Table
    const timeTrialData = groupBestRecordsByGamemode(bestRecords, levelMap, categoryMap, 'Time Trial');
    createTable(timeTrialData, playerMap, levelMap, 'Time Trial Records', 'TT', 'Time Trial');

    // Create Pro Race Table
    const proRaceData = groupBestRecordsByGamemode(bestRecords, levelMap, categoryMap, 'Pro Race');
    createTable(proRaceData, playerMap, levelMap, 'Pro Race Records', 'PR', 'Pro Race');

    // Create Battle Race Table
    const battleRaceData = groupBestRecordsByGamemode(bestRecords, levelMap, categoryMap, 'Battle Race');
    createTable(battleRaceData, playerMap, levelMap, 'Battle Race Records', 'BR', 'Battle Race');

    // Tally the records for each player
    const tallyData = tallyPlayerRecords(bestRecords, playerMap, levelMap);
    createTallyTable(tallyData); // Create the tally table
}

function createTable(trackData, playerMap, levelMap, title, sectionId, gamemode) {
    const tableContainer = document.getElementById('table-container');

    // Create a div to wrap the table
    const sectionDiv = document.createElement('div');
    sectionDiv.id = sectionId;
    sectionDiv.className = 'content'; // Apply the content class for styling

    // Create a title for the table
    const tableTitle = document.createElement('h2');
    tableTitle.innerText = title;
    sectionDiv.appendChild(tableTitle);

    const table = document.createElement('table');

    // Create the table header
    const headerRow = document.createElement('tr');
    const trackHeader = document.createElement('th');
    trackHeader.innerText = 'Track';
    headerRow.appendChild(trackHeader);

    // Define the category headers
    const categories = ['100 HP', '200 HP', '300 HP'];

    categories.forEach(category => {
        const th = document.createElement('th');
        th.innerText = category;
        headerRow.appendChild(th);
    });

    table.appendChild(headerRow);

    // Create rows for each track
    Object.keys(trackData).forEach(track => {
        const row = document.createElement('tr');

        // Find levelId by using track name and gamemode
        const levelEntry = Object.values(levelMap).find(entry => entry.name === track && entry.gamemode === gamemode);

        const trackCell = document.createElement('td');
        if (levelEntry) {
            const link = document.createElement('a');
            link.href = `https://www.jrtdb.com/level.html?level=${levelEntry.id}`;
            link.innerText = track;
            trackCell.appendChild(link);
        } else {
            trackCell.innerText = track; // Fallback if levelEntry not found
        }
        row.appendChild(trackCell);

        // Add player data for each category
        categories.forEach(category => {
            const cell = document.createElement('td');
            cell.className = 'center'; // Use the center class for center-aligned content
            if (trackData[track][category]) {
                const { player, time } = trackData[track][category];
                const playerInfo = playerMap[player];

                if (playerInfo) {
                    cell.innerHTML = `${time}<br><span style="color: ${playerInfo.color}">${playerInfo.name}</span>`;
                } else {
                    cell.innerText = `${time}<br>Unknown Player`;
                }
            } else {
                cell.innerText = 'N/A';
            }
            row.appendChild(cell);
        });

        table.appendChild(row);
    });

    sectionDiv.appendChild(table);
    tableContainer.appendChild(sectionDiv);
}

// Initialize tables with a date range
function initializeTablesWithDateRange() {
    // Get date parameters from URL
    const urlParams = new URLSearchParams(window.location.search);
    const startDateParam = urlParams.get('startDate');
    const endDateParam = urlParams.get('endDate');

    const startDate = startDateParam ? new Date(startDateParam) : new Date(0); // Default to epoch if no start date provided
    const endDate = endDateParam ? new Date(endDateParam) : new Date(); // Default to today if no end date provided

    loadCSVData('../data/levels.csv', function(levelsCSV) {
        const levelData = parseCSV(levelsCSV);
        const levelMap = createLevelMap(levelData);

        loadCSVData('../data/categories.csv', function(categoriesCSV) {
            const categoryData = parseCSV(categoriesCSV);
            const categoryMap = createCategoryMap(categoryData);

            loadCSVData('../data/players.csv', function(playersCSV) {
                const playerData = parseCSV(playersCSV);
                const playerMap = createPlayerMap(playerData);

                loadCSVData('../data/records.csv', function(recordsCSV) {
                    const recordData = parseCSV(recordsCSV);
                    createAllTablesWithinDateRange(recordData, levelMap, categoryMap, playerMap, startDate, endDate);
                });
            });
        });
    });
}

// Call the initialization function on load to set up tables based on the date range
initializeTablesWithDateRange();
document.addEventListener('DOMContentLoaded', addDateRangeSelector);
