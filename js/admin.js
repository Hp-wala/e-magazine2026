const loginForm = document.getElementById('login-form');
const uploadForm = document.getElementById('upload-form');
const dashboard = document.getElementById('dashboard');
const statusMessage = document.getElementById('status');

// Development-only credentials. Move this object behind the auth endpoint before production.
const ADMIN_CONFIG = {
    username: 'admin',
    password: 'admin123'
};
const AUTH_SESSION_KEY = 'magazine-admin-authenticated';
const MAGAZINE_STORAGE_KEY = 'english-department-magazine-pdf';
const EDITORS_STORAGE_KEY = 'english-department-editors';
const ARCHIVE_STORAGE_KEY = 'english-department-magazine-archive';
const DEFAULT_ARCHIVE_ENTRIES = [
    { year: '2025', title: '2025 Collection', pdf: '' }
];

document.getElementById('show-password').addEventListener('change', event => {
    document.getElementById('password').type = event.target.checked ? 'text' : 'password';
});

function showStatus(message, isError = false) {
    statusMessage.textContent = message;
    statusMessage.classList.toggle('error', isError);
}

function setAuthenticated(authenticated) {
    loginForm.hidden = authenticated;
    dashboard.hidden = !authenticated;
}

function checkSession() {
    // Development gate: require a fresh login whenever the admin page opens.
    sessionStorage.removeItem(AUTH_SESSION_KEY);
    setAuthenticated(false);
}

function getEditors() {
    try {
        return JSON.parse(localStorage.getItem(EDITORS_STORAGE_KEY) || '[]');
    } catch {
        return [];
    }
}

function saveEditors(editors) {
    localStorage.setItem(EDITORS_STORAGE_KEY, JSON.stringify(editors));
}

function getArchiveEntries() {
    try {
        const storedEntries = localStorage.getItem(ARCHIVE_STORAGE_KEY);
        if (storedEntries === null) {
            saveArchiveEntries(DEFAULT_ARCHIVE_ENTRIES);
            return DEFAULT_ARCHIVE_ENTRIES;
        }
        const entries = JSON.parse(storedEntries).filter(entry => entry.year !== '2024');
        saveArchiveEntries(entries);
        return entries;
    } catch {
        return DEFAULT_ARCHIVE_ENTRIES;
    }
}

function saveArchiveEntries(entries) {
    localStorage.setItem(ARCHIVE_STORAGE_KEY, JSON.stringify(entries));
}

function readPdfFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('The PDF could not be read.'));
        reader.readAsDataURL(file);
    });
}

function renderArchiveEntries() {
    const list = document.getElementById('archive-admin-list');
    list.replaceChildren();
    const entries = getArchiveEntries();

    if (!entries.length) {
        const emptyMessage = document.createElement('p');
        emptyMessage.textContent = 'No archive folders added yet.';
        list.appendChild(emptyMessage);
        return;
    }

    entries.forEach((entry, index) => {
        const row = document.createElement('div');
        row.className = 'archive-admin-row';
        row.innerHTML = `<strong>magazines/${entry.year}/</strong>`;

        const titleInput = document.createElement('input');
        titleInput.value = entry.title;
        titleInput.setAttribute('aria-label', `${entry.year} collection title`);
        const pdfInput = document.createElement('input');
        pdfInput.type = 'file';
        pdfInput.accept = 'application/pdf';
        pdfInput.setAttribute('aria-label', `${entry.year} PDF path`);
        const editorsInput = document.createElement('input');
        editorsInput.value = (entry.editors || []).join(', ');
        editorsInput.placeholder = 'Editor names, separated by commas';
        editorsInput.setAttribute('aria-label', `${entry.year} editors`);

        const saveButton = document.createElement('button');
        saveButton.type = 'button';
        saveButton.textContent = 'Save';
        saveButton.addEventListener('click', async () => {
            const updatedEntries = getArchiveEntries();
            const selectedFile = pdfInput.files[0];
            let pdf = updatedEntries[index].pdf || '';
            if (selectedFile) {
                if (selectedFile.type !== 'application/pdf') return showStatus('Please choose a PDF file.', true);
                try {
                    pdf = await readPdfFile(selectedFile);
                } catch (error) {
                    return showStatus(error.message, true);
                }
            }
            const editors = editorsInput.value.split(',').map(name => name.trim()).filter(Boolean);
            updatedEntries[index] = { ...updatedEntries[index], title: titleInput.value.trim(), pdf, editors };
            if (!updatedEntries[index].title) return showStatus('Collection title cannot be empty.', true);
            saveArchiveEntries(updatedEntries);
            renderArchiveEntries();
            showStatus('Archive folder updated.');
        });

        const deleteButton = document.createElement('button');
        deleteButton.type = 'button';
        deleteButton.className = 'danger-button';
        deleteButton.textContent = 'Delete';
        deleteButton.addEventListener('click', () => {
            const updatedEntries = getArchiveEntries();
            updatedEntries.splice(index, 1);
            saveArchiveEntries(updatedEntries);
            renderArchiveEntries();
            showStatus('Archive folder removed.');
        });

        row.append(titleInput, pdfInput, editorsInput, saveButton, deleteButton);
        list.appendChild(row);
    });
}

function renderEditors() {
    const list = document.getElementById('editor-admin-list');
    list.replaceChildren();
    const editors = getEditors();

    if (!editors.length) {
        const emptyMessage = document.createElement('p');
        emptyMessage.textContent = 'No editors added yet.';
        list.appendChild(emptyMessage);
        return;
    }

    editors.forEach((name, index) => {
        const row = document.createElement('div');
        row.className = 'editor-admin-row';

        const input = document.createElement('input');
        input.value = name;
        input.setAttribute('aria-label', `Editor ${index + 1} name`);

        const saveButton = document.createElement('button');
        saveButton.type = 'button';
        saveButton.textContent = 'Save';
        saveButton.addEventListener('click', () => {
            const updatedName = input.value.trim();
            if (!updatedName) return showStatus('Editor name cannot be empty.', true);
            const updatedEditors = getEditors();
            updatedEditors[index] = updatedName;
            saveEditors(updatedEditors);
            renderEditors();
            showStatus('Editor name updated.');
        });

        const deleteButton = document.createElement('button');
        deleteButton.type = 'button';
        deleteButton.className = 'danger-button';
        deleteButton.textContent = 'Delete';
        deleteButton.addEventListener('click', () => {
            const updatedEditors = getEditors();
            updatedEditors.splice(index, 1);
            saveEditors(updatedEditors);
            renderEditors();
            showStatus('Editor removed.');
        });

        row.append(input, saveButton, deleteButton);
        list.appendChild(row);
    });
}

loginForm.addEventListener('submit', async event => {
    event.preventDefault();
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();

    if (username === ADMIN_CONFIG.username && password === ADMIN_CONFIG.password) {
        sessionStorage.setItem(AUTH_SESSION_KEY, 'true');
        setAuthenticated(true);
        loginForm.reset();
        showStatus('Signed in.');
    } else {
        showStatus('Invalid username or password.', true);
    }
});

uploadForm.addEventListener('submit', async event => {
    event.preventDefault();
    const file = document.getElementById('magazine-file').files[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
        showStatus('Please choose a PDF file.', true);
        return;
    }

    showStatus('Saving magazine in this browser...');
    const reader = new FileReader();
    reader.onload = () => {
        try {
            localStorage.setItem(MAGAZINE_STORAGE_KEY, reader.result);
            uploadForm.reset();
            showStatus('Magazine replaced for this browser.');
        } catch {
            showStatus('This PDF is too large for browser storage.', true);
        }
    };
    reader.onerror = () => showStatus('The PDF could not be read.', true);
    reader.readAsDataURL(file);
});

document.getElementById('logout-button').addEventListener('click', () => {
    sessionStorage.removeItem(AUTH_SESSION_KEY);
    setAuthenticated(false);
    showStatus('Signed out.');
});

document.getElementById('editor-add-form').addEventListener('submit', event => {
    event.preventDefault();
    const input = document.getElementById('editor-name');
    const name = input.value.trim();
    if (!name) return;
    saveEditors([...getEditors(), name]);
    input.value = '';
    renderEditors();
    showStatus('Editor added.');
});

document.getElementById('archive-add-form').addEventListener('submit', async event => {
    event.preventDefault();
    const year = document.getElementById('archive-year').value;
    const title = document.getElementById('archive-title-input').value.trim();
    const selectedFile = document.getElementById('archive-pdf-file').files[0];
    const editors = document.getElementById('archive-editors').value.split(',').map(name => name.trim()).filter(Boolean);
    if (!year || !title) return;
    if (getArchiveEntries().some(entry => entry.year === year)) {
        showStatus(`${year} archive folder already exists.`, true);
        return;
    }
    let pdf = '';
    if (selectedFile) {
        if (selectedFile.type !== 'application/pdf') return showStatus('Please choose a PDF file.', true);
        try {
            pdf = await readPdfFile(selectedFile);
        } catch (error) {
            return showStatus(error.message, true);
        }
    }
    saveArchiveEntries([...getArchiveEntries(), { year, title, pdf, editors }]);
    event.target.reset();
    renderArchiveEntries();
    showStatus('Archive folder added.');
});

checkSession();
renderEditors();
renderArchiveEntries();
