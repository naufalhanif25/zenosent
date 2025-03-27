// Importing necessary modules
const { app, BrowserWindow, Menu, shell, ipcMain } = require("electron");
const path = require("path");

let mainWindow;

app.whenReady().then(() => {
    // Create the main window
    mainWindow = new BrowserWindow({
        width: 1080,
        height: 720,
        resizable: true,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: __dirname + "/preload.js"
        },
        icon: path.join(__dirname, "../../assets/icon/icon.ico")
    });

    // Disable the default menu
    Menu.setApplicationMenu(null);

    mainWindow.loadFile("index.html");

    // Handle window close event
    mainWindow.on("closed", () => {
        mainWindow = null;
    });
});

// Handle external link opening in the default browser
ipcMain.on("open-link", (event, url) => {
    shell.openExternal(url);
});

// Close the application
app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
});
