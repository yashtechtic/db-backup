const express = require("express");
const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");
const moment = require("moment");
const archiver = require("archiver");

const app = express();
const PORT = process.env.PORT || 4001;
const STORAGE_DIR = path.join(__dirname, "storage");
require('dotenv').config();

// Ensure the storage directory exists
if (!fs.existsSync(STORAGE_DIR)) {
  fs.mkdirSync(STORAGE_DIR);
}
// Serve static files from the storage directory
app.use('/storage', express.static(STORAGE_DIR));

// Endpoint to trigger the backup process
app.get("/backup", (req, res) => {
  performBackup((error, backupPath) => {
    if (error) {
      return res.status(500).send({ code: 500, error: "Backup failed" });
    }
    // res.download(backupPath);
    const filename = path.basename(backupPath);
    const publicUrl = `${req.protocol}://${req.get('host')}/storage/${filename}`;
    console.log("publicUrl :>> ", publicUrl);
    res.send({ url: publicUrl });
  });
});

// Function to perform the database backup and create a zip archive
function performBackup(callback) {
  const currentDate = moment().format("YYYY-MM-DD_hh-mm-ss");
  const backupFilename = `backup-${currentDate}.sql`;
  const backupPath = path.join(STORAGE_DIR, backupFilename);
  const zipFilename = `backup-${currentDate}.zip`;
  const zipPath = path.join(STORAGE_DIR, zipFilename);
  console.log('process.env.NODE_ENV :>> ', process.env.NODE_ENV);
  const command =
    process.env.NODE_ENV === "production"
      ? `mysqldump --defaults-extra-file='~/.my.cnf' --opt --all-databases > ${backupPath}`
      : `mysqldump --defaults-extra-file='./.my.cnf' --opt --all-databases > ${backupPath}`;

  exec(command, (error, stdout, stderr) => {
    console.log("error :>> ", error);
    if (error) {
      console.error(`Error: ${error.message}`);
      return callback(error);
    }
    if (stderr) {
      console.error(`Error: ${stderr}`);
      return callback(stderr);
    }
    console.log(`Backup successful. File saved at: ${backupPath}`);

    // Create a zip archive containing the backup file
    const output = fs.createWriteStream(zipPath);
    const archive = archiver("zip");

    output.on("close", () => {
      console.log(`Zip archive created. File saved at: ${zipPath}`);
      // Clean up: delete the original backup file
      fs.unlinkSync(backupPath);
      callback(null, zipPath);
    });

    archive.on("error", (err) => {
      console.error("Error creating zip archive:", err);
      callback(err);
    });

    archive.pipe(output);
    archive.append(fs.createReadStream(backupPath), { name: backupFilename });
    archive.finalize();
  });
}

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
