#!/bin/bash
set -e
set -v

export NODE_ENV=production

# Stop the server
sudo supervisorctl stop star-wars-recorder

# Remove any unfinished rendering traces
rm -rf dist/rendering dist/screenshots

# Make sure all video files are properly pushed to the remote server
rsync -au dist/videos/ daydream:/star-wars-intros/

# Start the server again
sudo supervisorctl stop star-wars-recorder

# Fill the queue with the videos that were being rendered before we restarted
./bin/refill.js
