import React from 'react';
import { Chord } from "tonal";
import circleOfFifths from "../assets/circle-of-fifths.svg";

const modes = {
    "major": {
        "C": { scale: ["C", "D", "E", "F", "G", "A", "B"], accidental: "#", globalAccidentalPositions: [] },
        "D": { scale: ["D", "E", "F#", "G", "A", "B", "C#"], accidental: "#", globalAccidentalPositions: [5, 35] },
        "E": { scale: ["E", "F#", "G#", "A", "B", "C#", "D#"], accidental: "#", globalAccidentalPositions: [-5, 5, 25, 35] },
        "F": { scale: ["F", "G", "A", "Bb", "C", "D", "E"], accidental: "b", globalAccidentalPositions: [45] },
        "G": { scale: ["G", "A", "B", "C", "D", "E", "F#"], accidental: "#", globalAccidentalPositions: [5] },
        "A": { scale: ["A", "B", "C#", "D", "E", "F#", "G#"], accidental: "#", globalAccidentalPositions: [-5, 5, 35] },
        "B": { scale: ["B", "C#", "D#", "E", "F#", "G#", "A#"], accidental: "#", globalAccidentalPositions: [-5, 5, 25, 35, 55]  },
    }
}

function removeAccidental(note) {
    return note.replace("#", "").replace("b", "");
}

function getNoteLetterAndOctave(note_number, musicKey) {
    const octave = Math.max(Math.floor(note_number / 12) - 2, -1);
    const note_index = note_number % 12;
    const notes = ["C", { "#": "C#", "b": "Db" }, "D", { "#": "D#", "b": "Eb" }, "E", "F", { "#": "F#", "b": "Gb" }, "G", { "#": "G#", "b": "Ab" }, "A", { "#": "A#", "b": "Bb" }, "B"];
    let note = notes[note_index];

    if (typeof note === "object") {
        note = note[modes[musicKey.mode][musicKey.note].accidental];
    };

    let scaleNote = note;
    if (note.includes("#") || note.includes("b")) {
        if (modes[musicKey.mode][musicKey.note].scale.includes(note)) {
            scaleNote = removeAccidental(note);
        }
    }
    else {
        if (!modes[musicKey.mode][musicKey.note].scale.includes(note)) {
            scaleNote = note + "n";// n for natural note
        }
    }

    return { "note": note, "octave": octave, "noteNumber": note_number, "scaleNote": scaleNote }
}

function getNotesLetterAndOctave(notes_number, musicKey) {
    return notes_number.sort().reduce((previous, current, index) => {
        const A = getNoteLetterAndOctave(current, musicKey);
        const B = shouldFlipNote(previous, A, index, musicKey);
        return [...previous, B];
    }, []);
}

function shouldFlipNote(pressedNotes, note, index, musicKey) {
    // the most difficult part is here, have fun :)
    const notes = ["C", "D", "E", "F", "G", "A", "B"];
    const currentNoteIndex = notes.indexOf(removeAccidental(note.note));

    const previousNote = pressedNotes.find((_, i) => (index - 1 === i || (index === 0 && i === 6)));

    if (previousNote) {
        let previousNoteIndex = notes.indexOf(removeAccidental(previousNote.note)) === 6 ? -1 : notes.indexOf(removeAccidental(previousNote.note));

        if (currentNoteIndex - previousNoteIndex === 1 && previousNote.flip === false) {

            return { ...note, flip: true };
        }
    }

    return { ...note, flip: false };
}

const App = () => {

    const [musicKey, setMusicKey] = React.useState({ mode: "major", note: "C" });
    const [pressedNotes, setPressedNotes] = React.useState([]);

    React.useEffect(() => {
        navigator.requestMIDIAccess().then((midiAccess) => {
            findMIDIDevices(midiAccess);

            window.electronAPI.onMIDIConnect((deviceName) => {
                console.log("###################################")
                connectMIDIDevice(deviceName, midiAccess);
            })
        
            window.electronAPI.onFindMIDIConnections(() => {
                findMIDIDevices(midiAccess);
            });
        });
    }, []);

    // const disconnectAllMIDIInputs = async (inputs) => {
    //     console.log("disconnecting all MIDI inputs...");
    //     const disconnectPromises = inputs.map(input => input.close());
    //     const results = await Promise.all(disconnectPromises);
    //     return results;
    // }

    const connectMIDIDevice = (deviceName, midiAccess) => {
        let inputs = Array.from(midiAccess.inputs).map(input => input[1]);
        // inputs = await disconnectAllMIDIInputs(inputs);
        
        inputs.forEach(input => {
            if (input.name === deviceName) {
                input.onmidimessage = (msg) => {

                    const [state, note, velocity] = msg.data;
                    if (state === 156) {
                        if (pressedNotes.includes(note)) {
                            setPressedNotes(prev => prev.filter(n => n !== note));
                        }
                        else {
                            setPressedNotes(prev => [...prev, note]);
                        }
                    }
                    else if (state === 140) {
                        setPressedNotes(prev => prev.filter(n => n !== note));
                    }
                };
            }
            else {
                input.onmidimessage = (msg) => {};
            }
        });

        midiAccess.onstatechange = (event) => {
            // Print information about the (dis)connected MIDI controller
            console.log(event.port.name, event.port.manufacturer, event.port.state);
        };

        return inputs.find(device => device.name === deviceName);;
    }

    // const handleDeviceConnection = async (deviceName, midiAccess) => {
    //     const device = await connectMIDIDevice(deviceName, midiAccess);
    // }

    const findMIDIDevices = (midiAccess) => {
        const inputs = Array.from(midiAccess.inputs).map(input => input[1]);

        const devices = inputs.map(input => {
            return input.name;
        });
        window.electronAPI.onFoundMIDIConnections(devices);
    }

    return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", width: "100%" }}>
                <div>
                    <label for="musicKey">Major Key: </label>
                    <select name="musicKey" id="musicKey" value={musicKey.note} onChange={(e) => setMusicKey({ mode: "major", note: e.target.value })}>
                        {Object.keys(modes.major).map(k => (
                            <option value={k} >{k}</option>
                        ))}
                    </select>
                </div>

                <div>
                    {Chord.detect(getNotesLetterAndOctave(pressedNotes, musicKey).map(note => note.note))[0]}
                </div>
            </div>

            <div style={{ height: "260px", margin: "20px 0px" }}>
                <Staff musicKey={musicKey} pressedNotes={getNotesLetterAndOctave(pressedNotes, musicKey)} />
            </div>

            <div>
                <img src={circleOfFifths} />
            </div>

        </div>
    )
}

const Staff = ({ musicKey, pressedNotes }) => {

    console.log("key: ", musicKey);
    console.log("pressed notes: ", pressedNotes);

    return (
        <div style={{ width: "350px", display: "flex", flexDirection: "column-reverse", alignItems: "center", position: "relative" }}>
            {Array.from({ length: 13 }, (v, i) => i).map(index => (
                <Line index={index} />
            ))}
            {pressedNotes.map((note, index) => (
                <Note note={note} />
            ))}
            {modes[musicKey.mode][musicKey.note].globalAccidentalPositions.map((position, index) => (
                <Accidental accidental={modes[musicKey.mode][musicKey.note].accidental} x={index%2 === 0 ? "300px" : "270px"} y={position + "px"} size="26px" />
            ))}
        </div>
    )
}

const Line = ({ index }) => {

    const style = [0, 6, 12].includes(index) ?
        {
            position: "absolute",
            top: index * 20,
            width: "20%",
            height: "1px",
            backgroundColor: "black"
        }
        :
        {
            position: "absolute",
            top: index * 20,
            width: "100%",
            height: "1px",
            backgroundColor: "black"
        }

    return (
        <div style={style}>
        </div>
    )
}

const Note = ({ note }) => {

    const position = () => {
        const octave = note.octave;
        const letter = note.note;
        const letters = ["C", "D", "E", "F", "G", "A", "B"];

        const result = 32 - ((octave - 3) * 70) - (letters.indexOf(letter.replace("#", "").replace("b", "")) * 10);
        return result
    };

    return (
        <div style={{ position: "absolute", left: "calc(50% - 15px)", top: `${position()}px` }}>
            <QuaterNote note={note.scaleNote} flip={note.flip} />
        </div>
    )
}

const QuaterNote = ({ note, flip }) => {

    return (
        <div id="quater-note" style={{ position: "relative" }}>
            <Accidental accidental={note.substring(1,2)} x="10px" y="73px" size="26px" />
            {flip ?
                <div style={{ position: "absolute", left: "22px" }}>
                    <svg width="30" height="100" xmlns="http://www.w3.org/2000/svg" transform="scale(-1,1)">
                        <rect id="svg_1" height="84.82816" width="2" y="2" x="25" fill="#000000" stroke="#000" />
                        <ellipse transform="rotate(-19.0053 14.9625 88.1817)" fill="#000000" stroke="#000" cx="15" cy="88" id="svg_2" rx="13" ry="9" />
                    </svg>
                </div>
                :
                <div style={{ position: "absolute", left: "0px" }}>
                    <svg width="30" height="100" xmlns="http://www.w3.org/2000/svg">
                        <rect id="svg_1" height="84.82816" width="2" y="2" x="25" fill="#000000" stroke="#000" />
                        <ellipse transform="rotate(-19.0053 14.9625 88.1817)" fill="#000000" stroke="#000" cx="15" cy="88" id="svg_2" rx="13" ry="9" />
                    </svg>
                </div>
            }
        </div>
    )
}

const Accidental = ({accidental, x, y, size}) => {
    return (
        <div id="accidental" style={{ position: "absolute", right: x, top: y, fontSize: size }}>
            {accidental === "#" &&
                <div>
                    <svg width="30" height="30" xmlns="http://www.w3.org/2000/svg">
                        <rect id="svg_3" height="22" width="1" y="8" x="8" stroke="#000" fill="#000000" />
                        <rect id="svg_4" height="22" width="1" y="2" x="14" stroke="#000" fill="#000000" />
                        <rect transform="rotate(60.9623 11.9444 12.9167)" id="svg_5" height="22" width="1" y="1" x="11" stroke="#000" fill="#000000" />
                        <rect transform="rotate(60.9623 12.5 20.4166)" id="svg_6" height="22" width="1" y="9" x="11" stroke="#000" fill="#000000" />
                    </svg>
                </div>
            }
            {accidental === "b" &&
                <div>
                    <svg width="30" height="30" xmlns="http://www.w3.org/2000/svg">
                        <rect id="svg_15" height="22.22222" width="1.11111" y="0.69445" x="0.27778" stroke="#000" fill="#000000" />
                        <path stroke-width="2" id="svg_17" d="m0.81302,15.14797c3.55032,-6.72685 17.46059,0 0,8.64881c-17.46059,-8.64881 -3.55032,-15.37566 0,-8.64881z" stroke="#000" fill="none" />
                    </svg>
                </div>
            }
            {accidental === "n" &&
                <div>
                    <svg width="30" height="30" xmlns="http://www.w3.org/2000/svg">
                        <rect id="svg_3" height="22" width="1" y="0.55263" x="0.52632" stroke="#000" fill="#000000" />
                        <rect id="svg_4" height="22" width="1" y="5.55263" x="8.52632" stroke="#000" fill="#000000" />
                        <rect transform="rotate(60.9623 6.34665 7.28367)" id="svg_5" height="8" width="2" y="5.14474" x="5.77632" fill="#000000" stroke="#000" />
                        <rect transform="rotate(60.9623 6.28084 18.9942)" id="svg_7" height="8" width="2" y="16.27632" x="5.18421" fill="#000000" stroke="#000" />
                    </svg>
                </div>
            }
        </div>
    )
}

export default App;