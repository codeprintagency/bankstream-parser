
const { exec } = require('child_process');
const path = require('path');

// Function to run a command in a specified directory
function runCommand(command, directory) {
    return new Promise((resolve, reject) => {
        exec(command, { cwd: directory }, (error, stdout, stderr) => {
            if (error) {
                console.error(`Error: ${error}`);
                return reject(error);
            }
            console.log(`stdout: ${stdout}`);
            console.error(`stderr: ${stderr}`);
            resolve();
        });
    });
}

async function buildProjects() {
    try {
        // Directory paths
        const shared = path.join(__dirname, 'shared');
        const package = path.join(__dirname, 'packages/webxr');
        
        console.log("Building projects...");
        console.log("Shared directory:", shared);
        console.log("Package directory:", package);
        
        // Install dependencies in shared directory
        console.log("Installing shared dependencies...");
        await runCommand('npm install', shared);
        
        // Install dependencies in the package directory
        console.log("Installing package dependencies...");
        await runCommand('npm install', package);
        
        // Create npm link in shared
        console.log("Creating npm link for shared...");
        await runCommand('npm link', shared);
        
        // Use the npm link in package
        console.log("Linking shared to package...");
        await runCommand('npm link shared', package);
        
        // Run build with the npx prefix to ensure we use the local vite
        console.log("Building package...");
        await runCommand('npx vite build', package);
        
        console.log("Build completed successfully!");
    } catch (error) {
        console.error('Failed to build:', error);
        process.exit(1); // Exit with error code
    }
}

buildProjects();
