// script.js (Completo, con IndexedDB inicialización)
document.addEventListener('DOMContentLoaded', () => {
    const outputArea = document.getElementById('output-area');
    const commandInput = document.getElementById('command-input');
    const userPromptPrefixElement = document.getElementById('user-prompt-prefix');

    let userName = "Memo";
    const appTitle = "[ *ZENITH JOURNAL* ]";
    const inspirationalMessages = [
        "   UNLEASH YOUR THOUGHTS.",
        "   EVERY ENTRY IS A NEW BEGINNING.",
        "   WHAT WILL YOU CREATE TODAY?"
    ];
    const separator = "---";
    const commandsHeader = "   AVAILABLE COMMANDS:";
    const availableCommands = [
        { cmd: "NEW_THOUGHT", desc: "Create a new journal entry" },
        { cmd: "DELETE_THOUGHT", desc: "Remove an existing entry" },
        { cmd: "SAVE", desc: "Save current entry" },
        { cmd: "EDIT_THOUGHT", desc: "Modify a previous entry" },
        { cmd: "FORGET_THOUGHTS", desc: "Clear current unsaved entry/screen" },
        { cmd: "UPDATE_NAME", desc: "Change your user name" },
        { cmd: "THEME_COLOR", desc: "Customize journal colors" },
        { cmd: "HELP_ZENITH", desc: "Display all commands" }
    ];

    let currentMode = 'command'; // 'command', 'new_thought', 'awaiting_title'
    let currentNewThoughtLines = [];
    let currentNewThoughtTimestamp = "";

    // --- Configuración de IndexedDB ---  <<<<<<<<<< NUEVA SECCIÓN AQUÍ
    let db; // Variable para mantener la referencia a nuestra base de datos
    const DB_NAME = "ZenithDB";
    const DB_VERSION = 1; 
    const STORE_NAME = "thoughts";
    // --- Fin de Configuración de IndexedDB ---

    console.log("Zenith Journal Script Initialized. Initial mode:", currentMode);

    // --- Definición de Funciones ---

    function getCurrentTimestamp() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        const timeZoneName = Intl.DateTimeFormat('en-US', { timeZoneName:'short' }).formatToParts(now).find(part => part.type === 'timeZoneName')?.value || "LOCAL";
        return `[${year}-${month}-${day} ${hours}:${minutes}:${seconds} ${timeZoneName}]`;
    }

    function displayLine(text, type = 'output-line') {
        const line = document.createElement('div');
        line.className = type;
        line.textContent = text;
        outputArea.appendChild(line);
        outputArea.scrollTop = outputArea.scrollHeight;
    }

    function displayWelcomeSequence() {
        outputArea.innerHTML = ''; 
        displayLine(`>>> WELCOME, BACKTHINKER? ${userName} <<<`);
        displayLine(appTitle);
        displayLine(" ");
        inspirationalMessages.forEach(msg => displayLine(msg));
        displayLine(separator);
        displayLine(getCurrentTimestamp()); 
        displayLine(" ");
        displayLine(commandsHeader);
        availableCommands.forEach(command => {
            const commandText = `${command.cmd.padEnd(18)}| ${command.desc}`;
            displayLine(commandText);
        });
        displayLine(" ");
    }

    function setPrompt() {
        console.log("Setting prompt. Current mode:", currentMode); 
        if (currentMode === 'command') {
            userPromptPrefixElement.textContent = `[${userName}]@BACKTHINKER:~$ `;
        } else if (currentMode === 'new_thought') {
            userPromptPrefixElement.textContent = `[${userName}]@BACKTHINKER:~/new_thought $ `;
        } else if (currentMode === 'awaiting_title') {
            userPromptPrefixElement.textContent = `GIVE NAME TO YOUR THOUGHT: `;
        }
        commandInput.value = "";
        commandInput.focus();
    }

    // --- Nueva Función para IndexedDB --- <<<<<<<<<< NUEVA FUNCIÓN AQUÍ
    function initializeDB() {
        console.log("Initializing IndexedDB...");
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = function(event) {
            console.log("IndexedDB upgrade needed or database creation.");
            db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                console.log("Creating object store:", STORE_NAME);
                const objectStore = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
                // Opcional: Crear índices
                // objectStore.createIndex('title', 'title', { unique: false });
                // objectStore.createIndex('timestamp', 'timestamp', { unique: false });
                console.log("Object store 'thoughts' created.");
            }
        };

        request.onsuccess = function(event) {
            console.log("IndexedDB initialized successfully.");
            db = event.target.result;
        };

        request.onerror = function(event) {
            console.error("IndexedDB error:", event.target.errorCode);
            displayLine("ZNTH_ERROR: Could not initialize local database. Thoughts cannot be saved or loaded.");
        };
    }
    // --- Fin de Nueva Función para IndexedDB ---

    function processCommand(commandText) {
        console.log("Processing command (mode 'command'):", commandText);
        const [command, ...args] = commandText.toLowerCase().split(' ');

        switch (command) {
            case 'help_zenith':
                displayLine(" ");
                displayLine(commandsHeader);
                availableCommands.forEach(cmdObj => {
                    const cmdText = `${cmdObj.cmd.padEnd(18)}| ${cmdObj.desc}`;
                    displayLine(cmdText);
                });
                displayLine(" ");
                break;
            case 'date':
                displayLine(getCurrentTimestamp());
                break;
            case 'new_thought':
                console.log("Executing NEW_THOUGHT command logic.");
                currentMode = 'new_thought';
                currentNewThoughtLines = [];
                currentNewThoughtTimestamp = getCurrentTimestamp(); 
                outputArea.innerHTML = ''; 
                displayLine(`New entry started at: ${currentNewThoughtTimestamp}`);
                displayLine("---");
                break;
            case 'save':
                displayLine("ZNTH_INFO: Nothing to save. Use NEW_THOUGHT to create an entry first.");
                break;
            default:
                displayLine(`ZNTH_ERROR: Command not found: ${commandText}`);
                break;
        }
    }

    commandInput.addEventListener('keydown', function(event) {
        if (event.key === 'Enter') {
            event.preventDefault();
            const inputText = commandInput.value.trim();
            console.log(`Enter pressed. Mode: ${currentMode}, Input: "${inputText}"`); 

            if (currentMode === 'command') {
                if (inputText) {
                    displayLine(`${userPromptPrefixElement.textContent}${inputText}`);
                    processCommand(inputText);
                }
            } else if (currentMode === 'new_thought') {
                if (inputText.toLowerCase() === 'save') {
                    console.log("'save' detected in new_thought mode. Changing mode to awaiting_title."); 
                    currentMode = 'awaiting_title';
                } else {
                    console.log("Adding line to new_thought:", inputText); 
                    displayLine(inputText);
                    currentNewThoughtLines.push(inputText);
                }
            } else if (currentMode === 'awaiting_title') {
                const thoughtTitle = inputText || "Untitled Thought";
                console.log("In awaiting_title mode. Title received:", thoughtTitle); 
                
                // Simulación de Guardado (la lógica real de IndexedDB irá aquí después):
                console.log("Simulating save for thought (actual DB save to be implemented):", { 
                    title: thoughtTitle,
                    timestamp: currentNewThoughtTimestamp,
                    content: currentNewThoughtLines
                });
                
                displayLine(`THOUGHT SAVED: "${thoughtTitle}"`);
                displayLine("---");
                currentNewThoughtLines = []; 
                currentNewThoughtTimestamp = "";
                
                console.log("Changing mode back to 'command' and displaying welcome sequence."); 
                currentMode = 'command'; 
                displayWelcomeSequence(); 
            }
            setPrompt(); 
        }
    });

    // --- Lógica Principal al cargar la página ---
    initializeDB(); // <<<<<<< NUEVA LLAMADA AQUÍ, para configurar la base de datos al inicio
    displayWelcomeSequence();
    setPrompt();
});
