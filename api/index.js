'use strict';
// Точка входа для Vercel: все запросы /api/* приходят сюда (см. vercel.json → rewrites)
module.exports = require('../lib/app').handle;
