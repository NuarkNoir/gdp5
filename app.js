'use strict';

let fileInput;
let levelSelector;
let trackSelector;
let debugRenderCheckbox;

/**
 * @type MRGFile?
 */
let parsedFile = null;

/**
 * 
 * @param {P5File} file 
 */
const handleFile = function (file) {
    if (file.name.endsWith(".mrg")) {
        loadBytes(file.data, (file) => {
            parsedFile = MRGFile.parse(file.bytes);
            print(parsedFile);
            fileInput.hide();
            levelSelector.show();
        }, (error) => {
            print(error);
        })
    } else {
        alert("unknown file type");
    }
}

const levelSelected = function () {
    let item = ~~levelSelector.value();
    if (item === -1) {
        trackSelector.hide();
    } else {
        while (trackSelector.elt.length > 0) {
            trackSelector.elt.remove(0);
        }
        
        trackSelector.option("Select track", -1);
        for (let i = 0; i < parsedFile.levels[item].count; i++) {
            trackSelector.option(parsedFile.getTrack(item, i).name, i);
        }

        trackSelector.show();
        trackSelector.removeAttribute("disabled");
    }
}

function setup() {
    fileInput = createFileInput(handleFile);
    fileInput.position(20, 50);

    levelSelector = createSelect();
    levelSelector.position(20, 50);
    levelSelector.hide();

    levelSelector.option("Select level", -1);
    levelSelector.option("Level 1", 0);
    levelSelector.option("Level 2", 1);
    levelSelector.option("Level 3", 2);

    levelSelector.changed(levelSelected);

    trackSelector = createSelect();
    trackSelector.position(20, 80);
    trackSelector.disable();
    trackSelector.hide();

    debugRenderCheckbox = createCheckbox("Do debug rendering?", true);
    debugRenderCheckbox.position(20, 20);

    createCanvas(document.body.clientWidth, document.body.clientHeight);
}

let x = 100;
let y = 100;

function draw() {
    translate(width / 2 - x, height / 2 - y);
    background(55);

    let lev = ~~levelSelector.value();
    let trk = ~~trackSelector.value();
    if (lev !== -1 && trk !== -1) {
        push();
        {
            strokeCap(SQUARE);

            strokeWeight(2);
            stroke("lime");
            const track = parsedFile.getTrack(lev, trk);
            for (let i = 1; i < track.trackData.mapPoints.length; i++) {
                const pp = track.trackData.mapPoints[i-1];
                const cp = track.trackData.mapPoints[i];
                line(pp.x, -pp.y, cp.x, -cp.y);
            }
            
            const taabb = track.trackData.getAABB();
            strokeWeight(6);
            stroke("yellow");
            point(track.trackData.playerStartPos.x, -track.trackData.playerStartPos.y);
            stroke("red");
            line(track.trackData.finishPos.x, -taabb.topLeft.y, track.trackData.finishPos.x, -taabb.bottomRight.y);

            if (debugRenderCheckbox.checked()) {
                strokeWeight(1);
                noFill();
                rectMode(CORNERS);
                stroke("cyan");
                rect(taabb.topLeft.x, -taabb.topLeft.y, taabb.bottomRight.x, -taabb.bottomRight.y);
            }
        }
        pop();
    }

    if (keyIsDown(LEFT_ARROW)) {
      x -= 5;
    }
  
    if (keyIsDown(RIGHT_ARROW)) {
      x += 5;
    }
  
    if (keyIsDown(UP_ARROW)) {
      y -= 5;
    }
  
    if (keyIsDown(DOWN_ARROW)) {
      y += 5;
    }
}