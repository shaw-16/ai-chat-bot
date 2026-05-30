const micBtn = document.getElementById('mic-btn');
const statusText = document.getElementById('status-text');
const introOverlay = document.getElementById('intro-overlay');
const startBtn = document.getElementById('start-btn');
const pulseRing = document.getElementById('pulse-ring');

let selectedVoice = null;
// load voices
function loadVoices() {
    return new Promise((resolve) => {
        const voices = window.speechSynthesis.getVoices();

        if (voices.length > 0) {
            resolve(voices);
        } else {
            window.speechSynthesis.onvoiceschanged = () => {
                resolve(window.speechSynthesis.getVoices());
            };
        }
    });
}
// initialize voice
async function initVoice() {
    statusText.textContent = "Loading voice...";

    const voices = await loadVoices();

    selectedVoice =
        voices.find(v => v.name.includes("Google UK English Male")) ||
        voices.find(v => v.name.includes("Google") && v.name.includes("Male")) ||
        voices.find(v => v.name.includes("Google")) ||
        voices[0];

    console.log("Selected voice:", selectedVoice?.name);

    statusText.textContent = "Voice ready";
}



// Speech Recognition Setup
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition;

if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.lang = 'en-US';
    recognition.interimResults = false;

    recognition.onstart = () => {
        statusText.textContent = "Listening...";
        pulseRing.classList.add('active');
    };

    recognition.onend = () => {
        pulseRing.classList.remove('active');
        // If we didn't get a result, reset text
        if (statusText.textContent === "Listening...") {
            statusText.textContent = "Click microphone to speak";
        }
    };

    recognition.onresult = async (event) => {
        const transcript = event.results[0][0].transcript;
        console.log("User said:", transcript);
        statusText.textContent = "Thinking...";

        await handleQuery(transcript);
    };

    recognition.onerror = (event) => {
        console.error("Speech recognition error", event.error);
        statusText.textContent = "Error: " + event.error;
        pulseRing.classList.remove('active');
    };
} else {
    statusText.textContent = "Browser does not support Speech Recognition.";
    micBtn.disabled = true;
}

// Speech Synthesis Setup
function speak(text) {
    return new Promise((resolve) => {
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US';

        if (selectedVoice) {
            utterance.voice = selectedVoice;
        }

        utterance.onstart = () => {
            statusText.textContent = "Speaking...";
        };

        utterance.onend = () => {
            statusText.textContent = "Click microphone to reply";
            resolve();
        };

        window.speechSynthesis.speak(utterance);
    });
}


// API Handler
async function handleQuery(text) {
    try {
        const response = await fetch('https://ai-chat-bot-7nh2.onrender.com/api/ask', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ question: text })
        });

        const data = await response.json();
        if (data.answer) {
            await speak(data.answer);
        } else {
            statusText.textContent = "No answer received.";
        }
    } catch (error) {
        console.error(error);
        statusText.textContent = "Connection error.";
    }
}

// Event Listeners
micBtn.addEventListener('click', () => {
    if (recognition) {
        try {
            recognition.start();
        } catch (e) {
            // Usually happens if already started
            console.log(e);
            recognition.stop();
        }
    }
});

startBtn.addEventListener('click', async () => {
    introOverlay.style.display = 'none';

    await initVoice();   // ⏳ waits until browser voices are ready

    const introText =
        "Hi, I’m Shashank Shekhar. This voice bot answers questions the way I would. Click the microphone button to begin.";

    speak(introText);
});

