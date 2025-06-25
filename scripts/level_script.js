// Function to get URL parameter
function getUrlParameter(name) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
}

// Function to load CSV data from an external source
function loadCSVData(filePath, callback) {
    fetch(filePath)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.text();
        })
        .then(data => callback(data))
        .catch(error => console.error('Error loading CSV:', error));
}

// Function to parse CSV into an array of objects
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

// Function to create a player lookup map from players.csv
function createPlayerMap(playerData) {
    const playerMap = {};
    playerData.forEach(player => {
        playerMap[player.id] = { name: player.player, color: player.colour };
    });
    return playerMap;
}

// Function to calculate "Stood For" duration in days
function calculateStoodForDuration(date1, date2) {
    const dateObj1 = new Date(date1);
    const dateObj2 = date2 ? new Date(date2) : new Date(); // if no next date, use today
    const diffTime = Math.abs(dateObj2 - dateObj1);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)); // Convert ms to days
}

// Function to format time from seconds to m:ss.xxx
function formatTimeInMinutes(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = (seconds % 60).toFixed(3);
    return `${minutes}:${remainingSeconds.toString().padStart(6, '0')}`;
}

// Function to create a table for a specific level and category, with "Stood For" duration and video links
function createCategoryTable(levelId, levelName, gamemode, categoryId, categoryName, playerMap, recordData) {
    // Filter and sort records by date and time
    const filteredRecords = recordData
        .filter(record => record.level === levelId && record.category === categoryId)
        .sort((a, b) => new Date(a.date) - new Date(b.date));

    // Compute "Stood For" for each record and include the "order" field for links
    const recordWithDuration = filteredRecords.map((record, index) => {
        const nextRecordDate = index < filteredRecords.length - 1 ? filteredRecords[index + 1].date : null;
        return {
            player: playerMap[record.player] ? playerMap[record.player].name : "Unknown Player",
            color: playerMap[record.player] ? playerMap[record.player].color : "#000000",
            time: formatTimeInMinutes(parseFloat(record.time)), // Format time to m:ss.xxx
            date: record.date,
            stoodFor: nextRecordDate ? `${calculateStoodForDuration(record.date, nextRecordDate)} Days` : 
                        `${calculateStoodForDuration(record.date)} Days (current)`,
            order: record.order // Include order for video links
        };
    });

    // Only add the level name and game mode as an H1 if it doesn't already exist
    const tableContainer = document.getElementById("table-container");
    if (!tableContainer.querySelector("h1")) {
        const levelTitle = document.createElement("h1");
        levelTitle.innerText = `${levelName} (${gamemode})`;
        tableContainer.appendChild(levelTitle);
    }

    // Add the category name as an H2
    const sectionDiv = document.createElement("div");
    sectionDiv.className = "content";

    const tableTitle = document.createElement("h2");
    tableTitle.innerText = categoryName;
    sectionDiv.appendChild(tableTitle);

    const table = document.createElement("table");
    const headerRow = document.createElement("tr");

    // Table headers
    ["Player", "Time", "Date", "Stood For", "Video"].forEach(header => {
        const th = document.createElement("th");
        th.innerText = header;
        headerRow.appendChild(th);
    });
    table.appendChild(headerRow);

    // Add each record as a table row
    recordWithDuration.forEach(record => {
        const row = document.createElement("tr");

        // Player cell with color styling
        const playerCell = document.createElement("td");
        playerCell.innerHTML = `<span style="color: ${record.color}">${record.player}</span>`;
        row.appendChild(playerCell);

        const timeCell = document.createElement("td");
        timeCell.innerText = record.time;
        row.appendChild(timeCell);

        const dateCell = document.createElement("td");
        dateCell.innerText = record.date;
        row.appendChild(dateCell);

        const stoodForCell = document.createElement("td");
        stoodForCell.innerText = record.stoodFor;
        row.appendChild(stoodForCell);

        // Video cell with a dynamic link using the order field
        const videoCell = document.createElement("td");
        videoCell.innerHTML = `<a href="run.html?run=${record.order}" target="_blank">Link</a>`;
        row.appendChild(videoCell);

        table.appendChild(row);
    });

    sectionDiv.appendChild(table);
    tableContainer.appendChild(sectionDiv);
}

// Main function to load data and build tables for each category
function initializePage() {
    const levelId = getUrlParameter("level");

    if (!levelId) {
        console.error("Level ID not provided in the URL.");
        return;
    }

    loadCSVData('data/levels.csv', function(levelsCSV) {
        const levelData = parseCSV(levelsCSV);
        const level = levelData.find(level => level.id === levelId);
        
        if (!level) {
            console.error("Level not found.");
            return;
        }

        const levelName = level.name;
        const gamemode = level.gamemode; // Retrieve gamemode from level data
        const categories = [
            { id: "w2019gjk", name: "100 HP" },
            { id: "wdm4pxed", name: "200 HP" },
            { id: "vdoqe16k", name: "300 HP" }
        ];

        loadCSVData('data/players.csv', function(playersCSV) {
            const playerData = parseCSV(playersCSV);
            const playerMap = createPlayerMap(playerData);

            loadCSVData('data/records.csv', function(recordsCSV) {
                const recordData = parseCSV(recordsCSV);

                // Generate a table for each category
                categories.forEach(category => {
                    createCategoryTable(levelId, levelName, gamemode, category.id, category.name, playerMap, recordData);
                });
            });
        });
    });
}

// Run the main function after page loads
window.onload = initializePage;
