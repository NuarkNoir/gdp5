const MAP_START_MARKER = 0x33;

class P5File {
    /** @type {String}  */ data
    /** @type {File}    */ file
    /** @type {String}  */ name
    /** @type {Number}  */ size
    /** @type {String}  */ type
    /** @type {String?} */ subtype
}

class BinUtils {
    /**
     * 
     * @param {DataView} view
     */
    constructor(view) {
        this.offset = 0;
        this.view = view;
    }

    /**
     * 
     * @param {Number} offset 
     */
    seek(offset) {
        this.offset = offset;
    }

    /**
     * 
     * @returns {Number}
     */
    readInt() {
        const out = this.view.getInt32(this.offset);
        this.offset += 4;
        return out;
    }

    /**
     * 
     * @returns {Number}
     */
    readShort() {
        const out = this.view.getInt16(this.offset);
        this.offset += 2;
        return out;
    }

    /**
     * 
     * @returns {Number}
     */
    readByte() {
        const out = this.view.getInt8(this.offset);
        this.offset += 1;
        return out;
    }

    /**
     * 
     * @returns {Number}
     */
    peekInt() {
        return this.view.getInt32(this.offset);
    }

    /**
     * 
     * @returns {Number}
     */
    peekShort() {
        return this.view.getInt16(this.offset);
    }

    /**
     * 
     * @returns {Number}
     */
    peekByte() {
        return this.view.getInt8(this.offset);
    }
}

class Point {
    /** @type {Number} */ x;
    /** @type {Number} */ y;

    /**
     * 
     * @param {Number} x 
     * @param {Number} y 
     */
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
}

class AABB {
    /** @type {Point} */ topLeft;
    /** @type {Point} */ bottomRight;
}

class TrackData {
    /** @type {Point}   */ playerStartPos;
    /** @type {Point}   */ finishPos;
    /** @type {Number}  */ pointsCount;
    /** @type {Point[]} */ mapPoints;
    /** @type {AABB?}   */ _trackAABB = null;

    /**
     * @returns {AABB}
     */
    getAABB() {
        if (this._trackAABB === null) {
            let lx, mx = lx = 0;
            let ly, my = ly = 0;

            this.mapPoints.forEach(pt => {
                if (pt.x < lx) {
                    lx = pt.x;
                } else if (pt.x > mx) {
                    mx = pt.x;
                }

                if (pt.y < ly) {
                    ly = pt.y;
                } else if (pt.y > my) {
                    my = pt.y;
                }
            });

            this._trackAABB = new AABB();
            this._trackAABB.topLeft = new Point(lx, my);
            this._trackAABB.bottomRight = new Point(mx, ly);
        }

        return this._trackAABB;
    }
}

class TrackName {
    /** @type {Number}    */ offset;
    /** @type {String}    */ name;
    /** @type {TrackData} */ trackData;

    /**
     * 
     * @param {String} name 
     * @param {Number} offset 
     */
    constructor(name, offset) {
        this.name = name;
        this.offset = offset;
    }

    /**
     * 
     * @param {TrackData} trackData 
     */
    setTrackData(trackData) {
        this.trackData = trackData;
    }
}

class Level {
    /** @type {Number}      */ count;
    /** @type {TrackName[]} */ tracks;

    /**
     * 
     * @param {Number} tracksCount 
     */
    constructor(tracksCount) {
        this.count = tracksCount;
        this.tracks = Array(tracksCount);
    }
}

class MRGFile {
    /** @type {Level[]} */ levels;

    constructor() {
        this.levels = Array(3);
    }

    /**
     * 
     * @param {Number} levelNum 
     * @param {Number} trackNum 
     * @returns {TrackName}
     */
    getTrack(levelNum, trackNum) {
        return this.levels[levelNum].tracks[trackNum];
    }

    /**
     * 
     * @param {Uint8Array} bytes
     * @returns MRGFile 
     */
    static parse(bytes) {
        const view = new DataView(bytes.buffer, 0);
        const reader = new BinUtils(view);
        let mrgFile = new MRGFile();

        for (let i = 0; i < 3; i++) {
            const tn = reader.readInt();

            const level = new Level(tn);
            for (let j = 0; j < tn; j++) {
                const trackOffset = reader.readInt();
                let titleBytes = [];
                while (reader.peekByte() !== 0) {
                    let byte = reader.readByte();
                    titleBytes.push(byte);
                }
                reader.readByte();
                let trackName = String.fromCharCode(...titleBytes);

                level.tracks[j] = new TrackName(trackName, trackOffset);
            }
            mrgFile.levels[i] = level;
        }

        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < mrgFile.levels[i].count; j++) {
                let track = mrgFile.levels[i].tracks[j];
                reader.seek(track.offset);
                if (reader.peekByte() !== MAP_START_MARKER) {
                    console.warn(`Corrupted map data at offset ${track.offset}`);
                    continue;
                }
                reader.readByte();

                let trackData = new TrackData();
                trackData.playerStartPos = new Point(
                    reader.readInt() >> 16 << 3, reader.readInt() >> 16 << 3
                );
                trackData.finishPos = new Point(
                    reader.readInt() >> 16 << 3, reader.readInt() >> 16 << 3
                );
                trackData.pointsCount = reader.readShort();
                trackData.mapPoints = Array(trackData.pointsCount);
                trackData.mapPoints[0] = new Point(
                    reader.readInt(), reader.readInt()
                );
                for (let i = 1; i < trackData.pointsCount; i++) {
                    let ppx = reader.readByte();
                    let ppy = 0;
                    if (ppx === -1) {
                        ppx = reader.readInt();
                        ppy = reader.readInt();
                    } else {
                        ppx += trackData.mapPoints[i-1].x;
                        ppy = trackData.mapPoints[i-1].y + reader.readByte();
                    }
                    trackData.mapPoints[i] = new Point(
                        ppx, ppy
                    );
                }

                track.setTrackData(trackData);
            }
        }

        return mrgFile;
    }
}