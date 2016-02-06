#!/bin/bash
set -v

# Screenshooter timeFactor
sed -i -e "s/timeFactor:.*,/timeFactor: $1,/g" bin/screenshooter.js

# Creator timeFactor
CREATOR_PATH=$(cat ./config/creator-path.txt)
cd $CREATOR_PATH
sed -i -e "s/\$timeFactor:.*;/\$timeFactor: $1;/g" sass/styles.scss
gulp build

exit 0
