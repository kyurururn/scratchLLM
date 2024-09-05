#!/bin/bash

set -e

cd ./packages/scratch-svg-renderer
npm run build
cd -

cd ./packages/scratch-render
npm run build
cd -

cd ./packages/scratch-vm
npm run build
cd -

cd ./packages/scratch-gui
npm run prepublish
NODE_ENV=production npm run build
cd -
