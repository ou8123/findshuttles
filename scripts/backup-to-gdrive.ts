import { google } from 'googleapis';
import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import * as dotenv from 'dotenv';

// Load .env file from project root if it exists
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// --- Configuration ---
const SERVICE_ACCOUNT_KEY_JSON = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_JSON;
const DRIVE_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID;
const NEON_DATABASE_URL = process.env.NEON_DATABASE_URL; // Needed by backup-neon-db.sh
const GIT_SHA = process.env.GIT_SHA || 'unknown'; // Get SHA from workflow env
const BACKUP_SCRIPT_PATH = path.resolve(__dirname, 'backup-neon-db.sh');
const LOCAL_BACKUP_DIR = path.resolve(__dirname, '../db_backups'); // Matches the dir in backup-neon-db.sh

// --- Validation ---
if (!SERVICE_ACCOUNT_KEY_JSON) {
  console.error('Error: GOOGLE_SERVICE_ACCOUNT_KEY_JSON environment variable is not set.');
  process.exit(1);
}
if (!DRIVE_FOLDER_ID) {
  console.error('Error: GOOGLE_DRIVE_FOLDER_ID environment variable is not set.');
  process.exit(1);
}
if (!NEON_DATABASE_URL) {
  console.error('Error: NEON_DATABASE_URL environment variable is not set.');
  process.exit(1);
}

// --- Helper Functions ---
async function runBackupScript(commitSha: string): Promise<string> {
  return new Promise((resolve, reject) => {
    console.log(`Running backup script: ${BACKUP_SCRIPT_PATH} with SHA: ${commitSha}...`);
    // Ensure the script is executable (important for some environments like GitHub Actions)
    fs.chmodSync(BACKUP_SCRIPT_PATH, '755');

    // Pass the commit SHA as an argument to the shell script
    const command = `bash ${BACKUP_SCRIPT_PATH} ${commitSha}`;
    console.log(`Executing command: ${command}`);
    const backupProcess = exec(command, { env: process.env });

    let stdout = '';
    let stderr = '';

    backupProcess.stdout?.on('data', (data) => {
      process.stdout.write(data); // Stream stdout
      stdout += data;
    });

    backupProcess.stderr?.on('data', (data) => {
      process.stderr.write(data); // Stream stderr
      stderr += data;
    });

    backupProcess.on('close', (code) => {
      if (code === 0) {
        // Extract the backup file path from the script's success message
        // Updated regex to potentially include SHA in the filename
        const match = stdout.match(/Database backup successful: (.*\.(sql|dump))/);
        if (match && match[1]) {
          console.log('Backup script finished successfully.');
          resolve(match[1]);
        } else {
          reject(new Error('Backup script succeeded but could not parse backup file path from output.'));
        }
      } else {
        console.error(`Backup script failed with code ${code}.`);
        reject(new Error(`Backup script failed. Stderr: ${stderr}`));
      }
    });

    backupProcess.on('error', (err) => {
      reject(new Error(`Failed to start backup script: ${err.message}`));
    });
  });
}

async function uploadToGoogleDrive(filePath: string, folderId: string, keyJson: string) {
  console.log(`Uploading ${path.basename(filePath)} to Google Drive folder ID: ${folderId}...`);

  const key = JSON.parse(keyJson);
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: key.client_email,
      private_key: key.private_key,
    },
    scopes: ['https://www.googleapis.com/auth/drive.file'], // Scope for file uploads
  });

  const drive = google.drive({ version: 'v3', auth });
  const fileName = path.basename(filePath);

  try {
    const fileMetadata = {
      name: fileName,
      parents: [folderId], // Specify the target folder
    };
    const media = {
      mimeType: 'application/sql', // Or 'application/gzip' if compressed
      body: fs.createReadStream(filePath),
    };

    const response = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id, name', // Fields to return in the response
    });

    console.log(`✅ File uploaded successfully: ${response.data.name} (ID: ${response.data.id})`);
    return response.data;
  } catch (error: any) {
    console.error('❌ Error uploading file to Google Drive:', error.message || error);
    throw error; // Re-throw the error to be caught by the main function
  }
}

function cleanupLocalBackup(filePath: string) {
  console.log(`Cleaning up local backup file: ${filePath}...`);
  try {
    fs.unlinkSync(filePath);
    console.log('Local backup file deleted.');
  } catch (error: any) {
    console.error(`Warning: Could not delete local backup file ${filePath}:`, error.message);
  }
}

// --- Main Execution ---
async function main() {
  let backupFilePath: string | null = null;
  try {
    // 1. Run the database backup script, passing the Git SHA
    backupFilePath = await runBackupScript(GIT_SHA);

    // Ensure the file exists before attempting upload
    if (!fs.existsSync(backupFilePath)) {
        throw new Error(`Backup file not found at expected path: ${backupFilePath}`);
    }

    // 2. Upload the backup file to Google Drive
    await uploadToGoogleDrive(backupFilePath, DRIVE_FOLDER_ID!, SERVICE_ACCOUNT_KEY_JSON!);

    // 3. (Optional) Cleanup local backup file
    cleanupLocalBackup(backupFilePath);

    console.log('--- Backup and Upload Process Completed Successfully ---');

  } catch (error) {
    console.error('--- Backup and Upload Process Failed ---');
    console.error(error);
    // Optional: Attempt cleanup even on failure if file exists
    if (backupFilePath && fs.existsSync(backupFilePath)) {
        console.log("Attempting cleanup despite failure...");
        cleanupLocalBackup(backupFilePath);
    }
    process.exit(1); // Exit with error status
  }
}

main();
