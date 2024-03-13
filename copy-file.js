const fs = require('fs');
const path = require('path');

const sourcePath = path.join(__dirname, 'src', 'cloud.key');
const destinationPath = path.join(__dirname, 'dist', 'cloud.key');

fs.copyFile(sourcePath, destinationPath, (err) => {
    if (err) {
        console.error('Error copying file:', err);
    } else {
        console.log('File copied successfully!');
    }
});
