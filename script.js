// script.js (VERDADERO y ABSOLUTAMENTE COMPLETO - Estado funcional anterior)
document.addEventListener('DOMContentLoaded', () => {
    const outputArea = document.getElementById('output-area');
    const commandInput = document.getElementById('command-input');
    const userPromptPrefixElement = document.getElementById('user-prompt-prefix');

    // --- Cargar settings desde localStorage o usar defaults ---
    let userName = localStorage.getItem('zenithUserName') || "Memo";
    let currentThemeName = localStorage.getItem('zenithThemeName') || "classic_green";
    // --- Fin de carga de settings ---

    const appTitle = "[ *ZENITH JOURNAL* ]";
    const inspirationalMessages = [
        "   UNLEASH YOUR THOUGHTS.",
        "   EVERY ENTRY IS A NEW BEGINNING.",
        "   WHAT WILL YOU CREATE TODAY?"
    ];
    const separator = "...";
    const commandsHeader = "   AVAILABLE COMMANDS:";
    const availableCommands = [
        { cmd: "NEW_THOUGHT", desc: "Create a new journal entry" },
        { cmd: "LIST_THOUGHTS", desc: "List all saved thoughts" },
        { cmd: "VIEW_THOUGHT", desc: "View a specific thought by ID" },
        { cmd: "EDIT_THOUGHT", desc: "Modify a previous entry by ID" },
        { cmd: "DELETE_THOUGHT", desc: "Remove an existing entry by ID" },
        { cmd: "SAVE", desc: "Save current entry (in new/edit mode)" },
        { cmd: "FORGET_THOUGHTS", desc: "Clear current unsaved entry/screen" }, // Aún sin lógica específica
        { cmd: "UPDATE_NAME", desc: "Change your user name" },
        { cmd: "THEME_COLOR", desc: "Customize journal colors" },
        { cmd: "HELP_ZENITH", desc: "Display all commands" }
    ];

    const themes = {
        "classic_green": { bodyBg: "#000000", text: "#00FF00", inputBg: "transparent" },
        "amber_retro": { bodyBg: "#2E1700", text: "#FFB000", inputBg: "transparent" },
        "blue_glow": { bodyBg: "#050A17", text: "#00BFFF", inputBg: "transparent" },
        "light_mode": { bodyBg: "#F0F0F0", text: "#222222", inputBg: "#E0E0E0" }
    };

    let currentMode = 'command'; 
    let currentNewThoughtLines = [];
    let currentNewThoughtTimestamp = "";
    let editingThoughtId = null;
    let originalThoughtData = null;

    let db;
    const DB_NAME = "ZenithDB";
    const DB_VERSION = 1;
    const STORE_NAME = "thoughts";

    console.log("Zenith Journal Script Initialized. User:", userName, "Theme:", currentThemeName);

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
    
    function applyTheme(themeNameInput) {
        const theme = themes[themeNameInput];
        if (theme) {
            document.body.style.backgroundColor = theme.bodyBg;
            document.body.style.color = theme.text;
            commandInput.style.backgroundColor = theme.inputBg;
            commandInput.style.color = theme.text;
            commandInput.style.caretColor = theme.text;
            
            currentThemeName = themeNameInput;
            localStorage.setItem('zenithThemeName', currentThemeName); 
            console.log("Theme applied and saved to localStorage:", currentThemeName);
            return true; 
        }
        return false; 
    }
    
    function initializeDB() {
        console.log("Initializing IndexedDB...");
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = function(event) {
            console.log("IndexedDB upgrade needed.");
            db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
                console.log("Object store 'thoughts' created.");
            }
        };
        request.onsuccess = function(event) {
            console.log("IndexedDB initialized.");
            db = event.target.result;
        };
        request.onerror = function(event) {
            console.error("IndexedDB error:", event.target.error);
            displayLine("ZNTH_ERROR: DB init error.");
        };
    }

    function fetchThoughtById(id, onSuccess, onError) {
        if (!db) { onError("Database not initialized."); return; }
        const transaction = db.transaction([STORE_NAME], "readonly");
        const objectStore = transaction.objectStore(STORE_NAME);
        const request = objectStore.get(id);
        request.onsuccess = function(event) {
            if (request.result) {
                onSuccess(request.result);
            } else {
                onError(`Thought ID: ${id} not found.`);
            }
        };
        request.onerror = function(event) {
            onError(`Error fetching thought ID: ${id}.`);
        };
    }

    function listAllThoughts() {
        if (!db) { displayLine("ZNTH_ERROR: Database not initialized."); return; }
        const transaction = db.transaction([STORE_NAME], "readonly");
        const objectStore = transaction.objectStore(STORE_NAME);
        const thoughts = [];
        outputArea.appendChild(document.createElement('hr'));
        displayLine("--- Your Saved Thoughts ---");
        objectStore.openCursor().onsuccess = function(event) {
            const cursor = event.target.result;
            if (cursor) {
                thoughts.push(cursor.value);
                cursor.continue();
            } else {
                if (thoughts.length === 0) {
                    displayLine("No thoughts saved yet.");
                } else {
                    thoughts.forEach(t => displayLine(`ID: ${t.id} | "${t.title}" | Created: ${t.timestamp}`));
                }
                displayLine("-------------------------");
                displayLine("Hint: Use 'VIEW_THOUGHT [ID]' to see full content.");
                outputArea.appendChild(document.createElement('hr'));
            }
        };
        objectStore.openCursor().onerror = function(event) {
            console.error("Error listing thoughts:", event.target.error);
            displayLine("ZNTH_ERROR: Could not retrieve thoughts.");
        };
    }

    function setPrompt() {
        console.log("Setting prompt. Mode:", currentMode, "User:", userName);
        let promptText = `[${userName}]@BACKTHINKER:~$ `;
        if (currentMode === 'new_thought') {
            promptText = `[${userName}]@BACKTHINKER:~/new_thought $ `;
        } else if (currentMode === 'awaiting_title') {
            promptText = `GIVE NAME TO YOUR THOUGHT: `;
        } else if (currentMode === 'awaiting_delete_id') {
            promptText = `ENTER ID OF THOUGHT TO DELETE: `;
        } else if (currentMode === 'awaiting_edit_id') {
            promptText = `ENTER ID OF THOUGHT TO EDIT: `;
        } else if (currentMode === 'editing_thought') {
            promptText = `[${userName}]@BACKTHINKER:~/edit_thought (ID: ${editingThoughtId}) $ `;
        } else if (currentMode === 'awaiting_edit_title') {
            const oldTitle = originalThoughtData ? originalThoughtData.title : "";
            promptText = `NEW TITLE (OR PRESS ENTER TO KEEP "${oldTitle}"): `;
        }
        userPromptPrefixElement.textContent = promptText;
        commandInput.value = "";
        commandInput.focus();
    }

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
                currentMode = 'new_thought';
                currentNewThoughtLines = [];
                currentNewThoughtTimestamp = getCurrentTimestamp();
                outputArea.innerHTML = '';
                displayLine(`New entry started at: ${currentNewThoughtTimestamp}`);
                displayLine("---");
                break;
            case 'save':
                displayLine("ZNTH_INFO: Use SAVE within new/edit modes.");
                break;
            case 'update_name':
                if (args.length > 0) {
                    userName = args.join(' ');
                    localStorage.setItem('zenithUserName', userName);
                    displayLine(`Username updated to: ${userName}`);
                } else {
                    displayLine("ZNTH_USAGE: UPDATE_NAME [new_username]");
                }
                break;
            case 'theme_color':
                if (args.length > 0) {
                    const themeNameArg = args[0].toLowerCase();
                    if (applyTheme(themeNameArg)) {
                        displayLine(`Theme set to: ${themeNameArg}`);
                    } else {
                        displayLine(`ZNTH_ERROR: Theme "${themeNameArg}" not found.`);
                        displayLine(`Available: ${Object.keys(themes).join(', ')}`);
                    }
                } else {
                    console.log("Executing theme_color with no args. Current theme:", currentThemeName);
                    displayLine(`ZNTH_USAGE: THEME_COLOR [theme_name]`);
                    displayLine(`Current theme: ${currentThemeName}.`);
                    displayLine(`Available themes: ${Object.keys(themes).join(', ')}`);
                }
                break;
            case 'list_thoughts':
                listAllThoughts();
                break;
            case 'delete_thought':
                currentMode = 'awaiting_delete_id';
                break;
            case 'edit_thought':
                currentMode = 'awaiting_edit_id';
                break;
            case 'view_thought':
                if (args.length === 0) {
                    displayLine("ZNTH_USAGE: VIEW_THOUGHT [ID]");
                    displayLine("Hint: Use 'LIST_THOUGHTS' to find ID.");
                } else {
                    const idToView = parseInt(args[0], 10);
                    if (isNaN(idToView)) {
                        displayLine("ZNTH_ERROR: Invalid ID for VIEW_THOUGHT.");
                    } else {
                        fetchThoughtById(idToView,
                            (thought) => {
                                outputArea.innerHTML = '';
                                displayLine(`--- Viewing Thought ID: ${thought.id} ---`);
                                displayLine(`Title: ${thought.title}`);
                                displayLine(`Created: ${thought.timestamp}`);
                                displayLine(`Last Modified: ${thought.lastModified}`);
                                displayLine("--- Content ---");
                                if (thought.content && thought.content.length > 0) {
                                    thought.content.forEach(line => displayLine(line));
                                } else {
                                    displayLine("(This thought has no content)");
                                }
                                displayLine("------------------------------");
                            },
                            (errorMsg) => {
                                displayLine(`ZNTH_ERROR: ${errorMsg}`);
                            }
                        );
                    }
                }
                break;
            // FORGET_THOUGHTS aún no tiene un case aquí porque se maneja en el eventListener
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
                setPrompt();
            } else if (currentMode === 'new_thought') {
                if (inputText.toLowerCase() === 'save') {
                    currentMode = 'awaiting_title';
                    setPrompt(); 
                } else {
                    displayLine(inputText);
                    currentNewThoughtLines.push(inputText);
                    setPrompt(); 
                }
            } else if (currentMode === 'awaiting_title') { // Guardando un NEW_THOUGHT
                const thoughtTitle = inputText || "Untitled Thought";
                if (!db) {
                    console.error("DB not ready for save.");
                    displayLine("ZNTH_ERROR: DB not ready.");
                    currentMode = 'command';
                    displayWelcomeSequence();
                    setPrompt();
                    return;
                }
                const thoughtToSave = {
                    title: thoughtTitle,
                    timestamp: currentNewThoughtTimestamp,
                    content: currentNewThoughtLines,
                    lastModified: new Date().toISOString()
                };
                const transaction = db.transaction([STORE_NAME], "readwrite");
                const objectStore = transaction.objectStore(STORE_NAME);
                const request = objectStore.add(thoughtToSave);
                request.onsuccess = function(e) {
                    displayLine(`THOUGHT SAVED: "${thoughtTitle}" (ID: ${e.target.result})`);
                    displayLine("---");
                    currentNewThoughtLines = [];
                    currentNewThoughtTimestamp = "";
                    currentMode = 'command';
                    displayWelcomeSequence();
                    setPrompt();
                };
                request.onerror = function(e) {
                    displayLine(`ZNTH_ERROR: Could not save. ${e.target.error.name}`);
                    currentMode = 'command';
                    displayWelcomeSequence();
                    setPrompt();
                };
            } else if (currentMode === 'awaiting_delete_id') {
                const idToDelete = parseInt(inputText, 10);
                if (isNaN(idToDelete)) {
                    displayLine("ZNTH_ERROR: Invalid ID.");
                    setPrompt();
                } else {
                    if (!db) {
                        displayLine("ZNTH_ERROR: DB not ready.");
                        currentMode = 'command';
                        displayWelcomeSequence();
                        setPrompt();
                        return;
                    }
                    const transaction = db.transaction([STORE_NAME], "readwrite");
                    const objectStore = transaction.objectStore(STORE_NAME);
                    const deleteRequest = objectStore.delete(idToDelete);
                    deleteRequest.onsuccess = function() {
                        displayLine(`THOUGHT ID: ${idToDelete} DELETED.`);
                        currentMode = 'command';
                        displayWelcomeSequence();
                        setPrompt();
                    };
                    deleteRequest.onerror = function(e) {
                        displayLine(`ZNTH_ERROR: Could not delete. ${e.target.error.name}`);
                        currentMode = 'command';
                        displayWelcomeSequence();
                        setPrompt();
                    };
                }
            } else if (currentMode === 'awaiting_edit_id') {
                const idToEdit = parseInt(inputText, 10);
                if (isNaN(idToEdit)) {
                    displayLine("ZNTH_ERROR: Invalid ID.");
                    setPrompt();
                } else {
                    fetchThoughtById(idToEdit,
                        (thought) => { // onSuccess
                            originalThoughtData = thought;
                            editingThoughtId = idToEdit;
                            currentNewThoughtLines = []; 
                            currentMode = 'editing_thought';
                            outputArea.innerHTML = ''; 
                            displayLine(`Editing Thought ID: ${editingThoughtId} - "${originalThoughtData.title}"`);
                            displayLine(`Original content (created ${originalThoughtData.timestamp}):`);
                            if (originalThoughtData.content && originalThoughtData.content.length > 0) {
                                originalThoughtData.content.forEach(line => displayLine(line));
                            } else {
                                displayLine("(No previous content)");
                            }
                            displayLine("--- Enter new content below ---");
                            setPrompt();
                        },
                        (errorMsg) => { // onError
                            displayLine(`ZNTH_ERROR: ${errorMsg}`);
                            currentMode = 'command';
                            setPrompt();
                        }
                    );
                }
            } else if (currentMode === 'editing_thought') {
                if (inputText.toLowerCase() === 'save') {
                    currentMode = 'awaiting_edit_title';
                    setPrompt(); 
                } else {
                    displayLine(inputText);
                    currentNewThoughtLines.push(inputText);
                    setPrompt(); 
                }
            } else if (currentMode === 'awaiting_edit_title') { // Guardando un EDIT_THOUGHT
                const newTitle = inputText || originalThoughtData.title;
                if (!db) {
                    console.error("DB not ready for update.");
                    displayLine("ZNTH_ERROR: DB not ready.");
                    currentMode = 'command';
                    displayWelcomeSequence();
                    setPrompt();
                    return;
                }
                const thoughtToUpdate = {
                    id: editingThoughtId,
                    title: newTitle,
                    timestamp: originalThoughtData.timestamp, 
                    content: currentNewThoughtLines,
                    lastModified: new Date().toISOString()
                };
                
                console.log("Attempting to update thought in IndexedDB:", thoughtToUpdate);

                const transaction = db.transaction([STORE_NAME], "readwrite");
                const objectStore = transaction.objectStore(STORE_NAME);
                const request = objectStore.put(thoughtToUpdate);

                request.onsuccess = function(event) {
                    console.log("Thought successfully updated in IndexedDB. ID:", event.target.result);
                    displayLine(`THOUGHT ID: ${editingThoughtId} UPDATED. New Title: "${newTitle}"`);
                    displayLine("---");
                    currentNewThoughtLines = [];
                    editingThoughtId = null;
                    originalThoughtData = null;
                    
                    currentMode = 'command';
                    displayWelcomeSequence();
                    setPrompt();
                };
                request.onerror = function(event) {
                    console.error("Error updating thought in IndexedDB:", event.target.error);
                    displayLine(`ZNTH_ERROR: Could not update thought. Error: ${event.target.error.name}`);
                    currentMode = 'command';
                    displayWelcomeSequence();
                    setPrompt();
                };
            }
        }
    });
    
    // --- Lógica Principal al cargar la página ---
    initializeDB();
    applyTheme(currentThemeName); 
    displayWelcomeSequence();
    setPrompt();
});
