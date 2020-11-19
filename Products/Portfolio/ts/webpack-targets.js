const names = [
    'photo_view',
    'photogrid_view',
    'portfolio_presentation_form',
];

module.exports = {
    targets : names.map(name => {
        return {
            entry: `./src/${name}.ts`,
            output: {
                filename: `${name}.js`
            }
        };
    })
};
