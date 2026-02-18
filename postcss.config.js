// postcss.config.js
// Généré automatiquement par yarn setup
// Plugins inclus :
//   - postcss-import  : permet les @import entre fichiers CSS
//   - postcss-nested  : syntaxe de nesting type Sass (&, nesting de sélecteurs)
//   - autoprefixer    : ajoute automatiquement les préfixes navigateur (-webkit-, etc.)
//   - cssnano         : minification CSS en production

export default {
  plugins: {
    'postcss-import': {},
    'postcss-nested': {},
    autoprefixer: {},
    cssnano: {
      preset: [
        'default',
        {
          discardComments: { removeAll: true },
        },
      ],
    },
  },
};
