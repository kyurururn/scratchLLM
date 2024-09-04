#!/bin/bash

cd ./packages/scratch-svg-renderer
npm run build || return 1
cd -

cd ./packages/scratch-render
npm run build || return 1
cd -

cd ./packages/scratch-vm
npm run build || return 1
cd -

cd ./packages/scratch-gui
npm run prepublish
NODE_ENV=production npm run build || return 1
cd -
