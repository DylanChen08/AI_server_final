'use strict';
const path = require('path');

process.chdir(path.join(__dirname));
require('ts-node/register');
require(path.join(__dirname, 'src', 'mcp', 'main.ts'));
