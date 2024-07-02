const { Menu } = require('electron');

const template = [
    {
        label: 'File',
        submenu: [
            { role: 'quit' }
        ]
    },
];

module.exports = {
    menubar: Menu.buildFromTemplate(template)
}
