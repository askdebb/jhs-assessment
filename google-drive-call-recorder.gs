/**
 * ==============================================================================
 * GHANA JHS CONTINUOUS ASSESSMENT PORTAL: GOOGLE DRIVE CALL RECORDING WEBHOOK
 * Account: computing.b9@gmail.com
 * Parent Folder: "Ghana_JHS_Computing_Call_Recordings"
 * User Subfolders: "[Learner Name] ([Class / ID])"
 * ==============================================================================
 *
 * HOW TO DEPLOY IN 30 SECONDS:
 * 1. Log in to your Google Account (computing.b9@gmail.com)
 * 2. Visit https://script.google.com/home and click "New project"
 * 3. Replace all code in Code.gs with this file
 * 4. Click "Deploy" > "New deployment"
 * 5. Select type "Web app"
 * 6. Set Description: "JHS Assessment Call Recordings Webhook with User Subfolders"
 * 7. Set "Execute as": "Me (computing.b9@gmail.com)"
 * 8. Set "Who has access": "Anyone"
 * 9. Click "Deploy" and authorize permissions.
 * 10. Copy the Web App URL and paste it into the Portal Admin "Google Drive Settings".
 */

const TARGET_ROOT_FOLDER_NAME = "Ghana_JHS_Computing_Call_Recordings";
const ADMIN_OWNER_EMAIL = "computing.b9@gmail.com";

function getOrCreateRootFolder() {
  const folders = DriveApp.getFoldersByName(TARGET_ROOT_FOLDER_NAME);
  if (folders.hasNext()) {
    return folders.next();
  }
  return DriveApp.createFolder(TARGET_ROOT_FOLDER_NAME);
}

function getOrCreateUserSubfolder(rootFolder, userFolderName) {
  const safeName = (userFolderName || "Unassigned_Learners").trim();
  const subfolders = rootFolder.getFoldersByName(safeName);
  if (subfolders.hasNext()) {
    return subfolders.next();
  }
  return rootFolder.createFolder(safeName);
}

function formatSafeTimestamp(dateObj) {
  const pad = (n) => (n < 10 ? "0" + n : "" + n);
  const year = dateObj.getFullYear();
  const month = pad(dateObj.getMonth() + 1);
  const day = pad(dateObj.getDate());
  let hours = dateObj.getHours();
  const minutes = pad(dateObj.getMinutes());
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  hours = hours ? hours : 12; // 0 hour is 12
  const hoursStr = pad(hours);
  return year + "-" + month + "-" + day + "_" + hoursStr + "-" + minutes + ampm;
}

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return ContentService.createTextOutput(JSON.stringify({
        status: "error",
        message: "No post data received"
      })).setMimeType(ContentService.MimeType.JSON);
    }

    const payload = JSON.parse(e.postData.contents);
    const mimeType = payload.mimeType || "video/webm";
    const base64Data = payload.base64Data;
    const callType = (payload.callType || "voice").toLowerCase();
    const callerName = payload.callerName || "Student";
    const partnerName = payload.partnerName || "Master Debrah";
    const durationSeconds = payload.durationSeconds || 0;
    const studentName = payload.studentName || payload.partnerName || payload.callerName || "Learner";
    const studentClass = payload.studentClass || payload.classLevel || "Basic 9";
    const userFolderName = payload.userFolderName || (studentName + " (" + studentClass + ")");

    // Human-readable, well-labelled filename with User Name, Call Type, and Date/Time
    const now = new Date();
    const cleanStudentName = studentName.replace(/[^a-zA-Z0-9_\- ]/g, "").replace(/\s+/g, "_");
    const callTypeLabel = callType === "video" ? "Video_Call" : "Voice_Call";
    const timeStampLabel = formatSafeTimestamp(now);
    const fileName = payload.fileName || (cleanStudentName + "_" + callTypeLabel + "_" + timeStampLabel + ".webm");

    if (!base64Data) {
      return ContentService.createTextOutput(JSON.stringify({
        status: "error",
        message: "Missing base64Data in payload"
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 1. Decode base64 to binary blob
    const decodedBytes = Utilities.base64Decode(base64Data);
    const blob = Utilities.newBlob(decodedBytes, mimeType, fileName);

    // 2. Locate or create parent folder: "Ghana_JHS_Computing_Call_Recordings"
    const rootFolder = getOrCreateRootFolder();

    // 3. Locate or create that specific user's subfolder inside: e.g. "Kwame Mensah (Basic 9A)"
    const userFolder = getOrCreateUserSubfolder(rootFolder, userFolderName);

    // 4. Save the file inside the user's dedicated subfolder
    const driveFile = userFolder.createFile(blob);

    // 5. Enrich file description with full pedagogical and audit details
    const description = [
      "Ghana Basic Education — JHS Continuous Assessment Call Session Recording",
      "Owner Account: " + ADMIN_OWNER_EMAIL,
      "Learner: " + studentName + " (" + studentClass + ")",
      "Dedicated Folder: " + TARGET_ROOT_FOLDER_NAME + " / " + userFolderName,
      "Participants: " + callerName + " <-> " + partnerName,
      "Call Type: " + (callType === "video" ? "1080p Video Call" : "HD Voice Call (48kHz)"),
      "Duration: " + durationSeconds + " seconds",
      "Timestamp: " + now.toLocaleString(),
      "Saved automatically behind the scene"
    ].join("\n");

    driveFile.setDescription(description);

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      fileId: driveFile.getId(),
      fileName: driveFile.getName(),
      fileSize: driveFile.getSize(),
      webViewLink: driveFile.getUrl(),
      downloadUrl: driveFile.getDownloadUrl(),
      userFolderId: userFolder.getId(),
      userFolderName: userFolderName,
      userFolderUrl: userFolder.getUrl(),
      rootFolder: TARGET_ROOT_FOLDER_NAME,
      owner: ADMIN_OWNER_EMAIL,
      timestamp: now.toISOString()
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: "active",
    service: "Ghana JHS Call Recording Cloud Backup Webhook",
    owner: ADMIN_OWNER_EMAIL,
    parentFolder: TARGET_ROOT_FOLDER_NAME,
    userSubfolders: "Enabled (Individual Learner Folders)",
    time: new Date().toISOString()
  })).setMimeType(ContentService.MimeType.JSON);
}
