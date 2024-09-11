#!/bin/bash

set -e

npm -C ./packages/scratch-svg-renderer run build

npm -C ./packages/scratch-render run build

npm -C ./packages/scratch-vm run build

NODE_ENV=production npm -C ./packages/scratch-gui run build
