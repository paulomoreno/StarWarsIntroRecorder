#!/bin/bash
set -v

SCREENSHOT_DIR=./dist/screenshots
RENDERING_DIR=./dist/rendering
VIDEO_DIR=./dist/videos

mkdir -p $SCREENSHOT_DIR
mkdir -p $RENDERING_DIR
mkdir -p $VIDEO_DIR

set -e

# Extract settings
CREATOR_PATH=$(cat ./config/creator-path.txt)

# Gather all necessary screenshots
LOG=$(./bin/screenshooter.js K9iNc3zvbplHnHbmi8W --creator-path=$CREATOR_PATH/public/index.html --engine=slimerjs)

# Extract data needed to generate the videos
FPS_INTRO=$(grep __FRAMES_PER_SECOND_0__ <<< "$LOG" | sed -e "s/__FRAMES_PER_SECOND_0__: //g")
FPS_LOGO=$(grep __FRAMES_PER_SECOND_1__ <<< "$LOG" | sed -e "s/__FRAMES_PER_SECOND_1__: //g")
FPS_CRAWL=$(grep __FRAMES_PER_SECOND_2__ <<< "$LOG" | sed -e "s/__FRAMES_PER_SECOND_2__: //g")
FPS_ENDING=$(grep __FRAMES_PER_SECOND_3__ <<< "$LOG" | sed -e "s/__FRAMES_PER_SECOND_3__: //g")

# Do not continue if FPS_ENDING is not set
if [ -z "$FPS_ENDING" ]; then
  exit 1
fi

echo ""
echo ""
echo "INTRO FPS: $FPS_INTRO"
echo "LOGO FPS: $FPS_LOGO"
echo "CRAWL FPS: $FPS_CRAWL"
echo "ENDING FPS: $FPS_ENDING"
echo ""
echo ""

# Generate intro video
ffmpeg -framerate $FPS_INTRO -i $SCREENSHOT_DIR/$1-0-%d.png -c:v libx264 -pix_fmt yuv420p $RENDERING_DIR/$1-intro.mp4
# Generate logo video
ffmpeg -framerate $FPS_LOGO -i $SCREENSHOT_DIR/$1-1-%d.png -c:v libx264 -pix_fmt yuv420p $RENDERING_DIR/$1-logo.mp4
# Generate crawl video
ffmpeg -framerate $FPS_CRAWL -i $SCREENSHOT_DIR/$1-2-%d.png -c:v libx264 -pix_fmt yuv420p $RENDERING_DIR/$1-crawl.mp4
# Generate ending video
ffmpeg -framerate $FPS_ENDING -i $SCREENSHOT_DIR/$1-3-%d.png -c:v libx264 -pix_fmt yuv420p $RENDERING_DIR/$1-ending.mp4

# Combine all videos
ffmpeg -i $RENDERING_DIR/$1-intro.mp4 -i $RENDERING_DIR/$1-logo.mp4 -i $RENDERING_DIR/$1-crawl.mp4 -i $RENDERING_DIR/$1-ending.mp4 -filter_complex "[0:0] [1:0] [2:0] [3:0] concat=n=4 [v]" -map "[v]" $RENDERING_DIR/$1-combined.mp4

# Add audio
ffmpeg -i $RENDERING_DIR/$1-combined.mp4 -i assets/audio/intro.mp3 -c copy -map 0:0 -map 1:0 $RENDERING_DIR/$1-final.mp4

# Move the file to the video directory
mv $RENDERING_DIR/$1-final.mp4 $VIDEO_DIR/$1.mp4

# Do not flood the stdout with removal data
set +v
# Remove all screenshots and rendering leftovers
rm $RENDERING_DIR/$1* $SCREENSHOT_DIR/$1*
set -v

exit 0
