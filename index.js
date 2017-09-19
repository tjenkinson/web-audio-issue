function pad(str, length, padString=0) {
    str = str + "";
    while (str.length < length)
        str = padString + str;
    return str;
}

function combine(arrays) {
    const tmp = new Uint8Array(arrays.reduce((acc, array) => acc + array.byteLength, 0));
    let offset = 0;
    arrays.forEach((array) => {
        tmp.set(array, offset);
        offset += array.byteLength;
    });
    return tmp;
}
  
const urls = [];
for(let i=0; i<4; i++) {
    urls.push(`segments/out${pad(i, 3)}.opus`);
}

function runIndividualSegments() {
    run(false);
}

function runCombinedSegment() {
    run(true);
}

function run(combined) {
    return Promise.all(urls.map((url) => fetch(url))).then((responses) => responses.map((response) => response.arrayBuffer())).then((segmentPromises) => Promise.all(segmentPromises)).then((segments) => {
        if (combined) {
            const singleSegment = combine(segments.map((segment) => new Uint8Array(segment))).buffer;
            return scheduleSegments([singleSegment]);
        } else {
            return scheduleSegments(segments);
        }
    }).catch(console.error);

    function scheduleSegments(segments) {
        const context = new AudioContext();
        const sourcesPromise = Promise.all(segments.map((segment) => context.decodeAudioData(segment).then((buffer) => {
            const source = context.createBufferSource();
            source.buffer = buffer;
            return source;
        })));

        return sourcesPromise.then((sources) => {
            let offset = context.currentTime + 1;
            sources.forEach((source) => {
                source.connect(context.destination);
                source.start(offset);
                offset += source.buffer.duration;
            });
        });
    }
}
