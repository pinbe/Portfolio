const names = [
    'photo_view',
    'photogrid_view',
];

module.exports = {
    targets : names.map(name => {
        return {
            entry: `./src/${name}.ts`,
            output: {
                filename: `${name}.js`
            }
        }
    })
};
