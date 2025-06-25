const fs = require('fs');
const path = require('path');
const csvParser = require('csv-parser');
const axios = require('axios');

// Path to CSV files
const levelsFilePath = path.join(__dirname, 'data/levels.csv');
const recordsFilePath = path.join(__dirname, 'data/records.csv');

// Helper function to read CSV file and return parsed data
function readCSVFile(filePath) {
    return new Promise((resolve, reject) => {
        const results = [];
        fs.createReadStream(filePath)
            .pipe(csvParser())
            .on('data', (data) => results.push(data))
            .on('end', () => resolve(results))
            .on('error', (error) => reject(error));
    });
}

// Helper function to ensure the CSV ends with a newline before appending a new record
function ensureNewlineBeforeAppend(filePath) {
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    if (!fileContent.endsWith('\n')) {
        fs.appendFileSync(filePath, '\n');
    }
}

// Helper function to get the last entry number and increment it
function getLastEntryNumber(filePath) {
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const lines = fileContent.trim().split('\n');
    if (lines.length > 1) { // assuming first line is header
        const lastLine = lines[lines.length - 1].split(',');
        return parseInt(lastLine[4], 10) + 1; // Fifth value in last entry (4th index)
    }
    return 100; // Start at 100 if no records exist
}

// Helper function to write new record to records.csv with a new line
function appendRecordToCSV(filePath, newRecord) {
    ensureNewlineBeforeAppend(filePath); // Ensure there's a newline before appending

    const recordLine = `${newRecord.level},${newRecord.category},${newRecord.player},${newRecord.date},${newRecord.entryNumber},${newRecord.time},${newRecord.platform}\n`;
    fs.appendFileSync(filePath, recordLine);
}

// Main function to fetch API data, process it, and update records.csv
async function processRunsData() {
    try {
        // Load levels and records CSV data
        const levels = await readCSVFile(levelsFilePath);
        const records = await readCSVFile(recordsFilePath);

        // Fetch data from the API
        const response = await axios.get('https://www.speedrun.com/api/v1/runs?game=w6j2971j&status=verified&orderby=verify-date&direction=desc');
        const jsonData = response.data.data;

        // Get the starting entry number from the last record
        let entryNumber = getLastEntryNumber(recordsFilePath);

        // Process each record in the API response
        jsonData.forEach((run) => {
            const levelId = run.level;
            const categoryId = run.category;
            const playerId = run.players[0].id;
            const date = run.date;
            const time = run.times.primary_t;
            const platform = run.system.platform;  // Capture the platform value

            // Check if the level exists in the levels.csv
            const levelExists = levels.some((level) => level.id === levelId);

            if (!levelExists) {
                console.log(`Level ID ${levelId} not found in levels.csv. Skipping record.`);
                return;
            }

            // Check if the record already exists in records.csv
            const recordExists = records.some(
                (record) =>
                    record.level === levelId &&
                    record.category === categoryId &&
                    record.player === playerId &&
                    record.date === date &&
                    parseFloat(record.time) === time
            );

            if (recordExists) {
                console.log(`Record for level ${levelId}, category ${categoryId}, player ${playerId}, date ${date}, time ${time} already exists. Skipping.`);
                return;
            }

            // **NEW CHECK: Skip if a faster run already exists for the same level and category**
            const fasterRunExists = records.some(
                (record) =>
                    record.level === levelId &&
                    record.category === categoryId &&
                    parseFloat(record.time) < time // Check if there is a faster time
            );

            if (fasterRunExists) {
                console.log(`Skipping run for level ${levelId}, category ${categoryId} as a faster time already exists.`);
                return;
            }

            // If record does not exist and is not slower than an existing one, add it to records.csv
            const newRecord = {
                level: levelId,
                category: categoryId,
                player: playerId,
                date: date,
                entryNumber: entryNumber, // Insert incremented entry number here
                time: time,
                platform: platform  // Add platform to the new record
            };

            appendRecordToCSV(recordsFilePath, newRecord);
            console.log(`New record added: ${JSON.stringify(newRecord)}`);

            entryNumber += 1; // Increment for the next record
        });

        console.log('Processing complete.');
    } catch (error) {
        console.error('Error processing runs data:', error);
    }
}

// Execute the function
processRunsData();
