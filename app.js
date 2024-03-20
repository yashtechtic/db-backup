const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const moment = require('moment');
const archiver = require('archiver');

// Function to perform the database backup and create a zip archive
function performBackup() {
    const currentDate = moment().format('YYYY-MM-DD_hh-mm-ss');
    const backupFilename = `backup-${currentDate}.sql`;
    const backupPath = path.join(__dirname, 'storage', backupFilename);
    const zipFilename = `backup-${currentDate}.zip`;
    const zipPath = path.join(__dirname, 'storage', zipFilename);
    // const command = `mysqldump --opt --user=root --host=localhost --password="12345678" behavior_management > ${backupPath}`;
    
    const command = `mysqldump --defaults-extra-file=~/.my.cnf --opt --all-databases > ${backupPath}`;

    exec(command, (error, stdout, stderr) => {
        console.log('stdout :>> ', stdout);
        if (error) {
            console.error(`Error: ${error.message}`);
            return;
        }
        if (stderr) {
            console.error(`Error: ${stderr}`);
            return;
        }
        console.log(`Backup successful. File saved at: ${backupPath}`);

        // Create a zip archive containing the backup file
        const output = fs.createWriteStream(zipPath);
        const archive = archiver('zip');

        output.on('close', () => {
            console.log(`Zip archive created. File saved at: ${zipPath}`);
            // Clean up: delete the original backup file
            fs.unlinkSync(backupPath);
        });

        archive.on('error', (err) => {
            console.error('Error creating zip archive:', err);
        });

        archive.pipe(output);
        archive.append(fs.createReadStream(backupPath), { name: backupFilename });
        archive.finalize();
    });
}

// Call the backup function
performBackup();
