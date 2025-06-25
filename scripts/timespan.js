document.addEventListener("DOMContentLoaded", () => {
    // Path to your CSV files
    const recordsFile = "../data/records.csv"; // Replace with actual path
    const playersFile = "../data/players.csv"; // Replace with actual path

    // Function to fetch and parse CSV
    async function fetchCSV(file) {
        const response = await fetch(file);
        const text = await response.text();
        return Papa.parse(text, { header: true }).data; // Using PapaParse library
    }

    // Function to calculate rank with ties
    function calculateRanks(data, key) {
        let rank = 1;
        data.forEach((row, index) => {
            if (index > 0 && row[key] < data[index - 1][key]) {
                rank = index + 1; // Increment rank only when there's no tie
            }
            row.Rank = rank;
        });
        return data;
    }

    // Function to create and append a table
    function createTable(title, data, containerId) {
        const container = document.getElementById(containerId);

        // Add the title
        const h2 = document.createElement("h2");
        h2.textContent = title;
        container.appendChild(h2);

        // Create the table
        const table = document.createElement("table");
        table.classList.add("data-table");

        // Create table header
        const headerRow = document.createElement("tr");
        ["Rank", "Player", "Records", "Date"].forEach(header => {
            const th = document.createElement("th");
            th.textContent = header;
            headerRow.appendChild(th);
        });
        table.appendChild(headerRow);

        // Populate table rows
        data.forEach(row => {
            const tr = document.createElement("tr");

            // Rank cell
            const rankCell = document.createElement("td");
            rankCell.textContent = row.Rank;
            tr.appendChild(rankCell);

            // Player cell with color
            const playerCell = document.createElement("td");
            playerCell.textContent = row.Player;
            playerCell.style.color = row.Color;
            tr.appendChild(playerCell);

            // Records cell
            const recordsCell = document.createElement("td");
            recordsCell.textContent = row.MaxRecords;
            tr.appendChild(recordsCell);

            // Date/Time Span cell
            const dateCell = document.createElement("td");
            dateCell.textContent = row.Date;
            tr.appendChild(dateCell);

            table.appendChild(tr);
        });

        container.appendChild(table);
    }

    // Function to calculate max records in a time span (e.g., 7 days)
    function calculateMaxRecordsInTimeSpan(records, playerMap, days) {
        const groupedRecords = {};
        records.forEach(record => {
            const playerId = record.player;
            if (!playerMap[playerId]) return;

            const playerName = playerMap[playerId].name;
            const date = new Date(record.date);

            if (!groupedRecords[playerName]) {
                groupedRecords[playerName] = [];
            }
            groupedRecords[playerName].push(date);
        });

        const results = [];
        for (const playerName in groupedRecords) {
            const dates = groupedRecords[playerName].sort((a, b) => a - b);
            let maxCount = 0;
            let bestSpan = "";

            for (let i = 0; i < dates.length; i++) {
                const startDate = dates[i];
                const endDate = new Date(startDate);
                endDate.setDate(startDate.getDate() + days);

                const count = dates.filter(date => date >= startDate && date < endDate).length;

                if (count > maxCount) {
                    maxCount = count;
                    bestSpan = `${startDate.toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                    })} - ${endDate.toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                    })}`;
                }
            }

            const color = Object.values(playerMap).find(player => player.name === playerName).color;
            results.push({
                Player: playerName,
                MaxRecords: maxCount,
                Date: bestSpan,
                Color: color,
            });
        }

        results.sort((a, b) => b.MaxRecords - a.MaxRecords); // Sort by max records
        return calculateRanks(results, "MaxRecords"); // Add ranks with ties
    }

    // Main function
    async function main() {
        const records = await fetchCSV(recordsFile);
        const players = await fetchCSV(playersFile);

        // Create a lookup map for player names and colors
        const playerMap = {};
        players.forEach(player => {
            playerMap[player.id] = { name: player.player, color: player.colour };
        });

        // Calculate max records in a single day
        const singleDayResults = [];
        const recordCounts = {};
        records.forEach(record => {
            const playerId = record.player;
            const date = record.date;

            if (!playerMap[playerId]) return;

            const playerName = playerMap[playerId].name;

            if (!recordCounts[playerName]) {
                recordCounts[playerName] = {};
            }
            if (!recordCounts[playerName][date]) {
                recordCounts[playerName][date] = 0;
            }
            recordCounts[playerName][date]++;
        });

        for (const playerName in recordCounts) {
            let maxCount = 0;
            let bestDate = "";

            for (const [date, count] of Object.entries(recordCounts[playerName])) {
                if (count > maxCount) {
                    maxCount = count;
                    bestDate = new Date(date).toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                    });
                }
            }

            const color = Object.values(playerMap).find(player => player.name === playerName).color;
            singleDayResults.push({
                Player: playerName,
                MaxRecords: maxCount,
                Date: bestDate,
                Color: color,
            });
        }

        singleDayResults.sort((a, b) => b.MaxRecords - a.MaxRecords); // Sort by max records
        const rankedSingleDayResults = calculateRanks(singleDayResults, "MaxRecords"); // Add ranks with ties

        // Calculate max records in a 7-day time span
        const sevenDayResults = calculateMaxRecordsInTimeSpan(records, playerMap, 7);
        const thirtyDayResults = calculateMaxRecordsInTimeSpan(records, playerMap, 30);
        const yearResults = calculateMaxRecordsInTimeSpan(records, playerMap, 365);

        // Render the tables
        const tableContainer = document.getElementById("table-container");
        tableContainer.innerHTML = ""; // Clear existing content

        createTable("Most Records set in a single day", rankedSingleDayResults, "table-container");
        createTable("Most Records set in a 7-day time span", sevenDayResults, "table-container");
        createTable("Most Records set in a 30-day time span", thirtyDayResults, "table-container");
        createTable("Most Records set in a 365-day time span", yearResults, "table-container");
    }

    main().catch(error => console.error("Error loading data:", error));
});
