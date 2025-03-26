
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

// Function to run a command in a specified directory
function runCommand(command, directory) {
    return new Promise((resolve, reject) => {
        console.log(`Running command: ${command} in directory: ${directory}`);
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
        const root = __dirname;
        const shared = path.join(__dirname, 'shared');
        const packageDir = path.join(__dirname, 'packages/webxr');
        
        console.log("Building projects...");
        console.log("Root directory:", root);
        console.log("Shared directory:", shared);
        console.log("Package directory:", packageDir);
        
        // Check if directories exist
        console.log("Checking if directories exist...");
        if (fs.existsSync(shared)) {
            console.log("Shared directory exists");
        } else {
            console.log("Shared directory does not exist");
            // List contents of current directory
            console.log("Contents of current directory:", fs.readdirSync(__dirname));
        }
        
        if (fs.existsSync(packageDir)) {
            console.log("Package directory exists");
        } else {
            console.log("Package directory does not exist");
            // Try to find packages directory
            if (fs.existsSync(path.join(__dirname, 'packages'))) {
                console.log("Packages directory exists, contents:", fs.readdirSync(path.join(__dirname, 'packages')));
            }
        }
        
        // Install root dependencies first (if package.json exists in root)
        if (fs.existsSync(path.join(root, 'package.json'))) {
            console.log("Installing root dependencies...");
            await runCommand('npm install', root);
        }
        
        // If shared and package directories exist, continue with the build process
        if (fs.existsSync(shared) && fs.existsSync(packageDir)) {
            // Install dependencies in shared directory
            console.log("Installing shared dependencies...");
            await runCommand('npm install', shared);
            
            // Install dependencies in the package directory
            console.log("Installing package dependencies...");
            await runCommand('npm install', packageDir);
            
            // Create npm link in shared
            console.log("Creating npm link for shared...");
            await runCommand('npm link', shared);
            
            // Use the npm link in package
            console.log("Linking shared to package...");
            await runCommand('npm link shared', packageDir);
            
            // Run build with the npx prefix to ensure we use the local vite
            console.log("Building package...");
            await runCommand('npx vite build', packageDir);
            
            // Copy the built files to the root dist directory
            console.log("Copying built files to root dist directory...");
            if (!fs.existsSync(path.join(root, 'dist'))) {
                fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
            }
            
            // Copy all files from package/dist to root/dist
            if (fs.existsSync(path.join(packageDir, 'dist'))) {
                await runCommand(`cp -R ${path.join(packageDir, 'dist')}/* ${path.join(root, 'dist')}`, root);
                console.log("Build files copied successfully!");
            } else {
                console.error("Package dist directory not found!");
            }
        } else {
            // Fallback for standard Vite project
            console.log("Shared or package directories not found. Falling back to standard build...");
            if (fs.existsSync(path.join(root, 'package.json'))) {
                console.log("Building root project...");
                await runCommand('npx vite build', root);
                console.log("Root project built successfully!");
            } else {
                console.error("No package.json found in root directory!");
            }
        }
        
        console.log("Build completed successfully!");
    } catch (error) {
        console.error('Failed to build:', error);
        process.exit(1); // Exit with error code
    }
}

buildProjects();
