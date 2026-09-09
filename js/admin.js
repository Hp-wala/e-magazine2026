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
const RECYCLE_BIN_STORAGE_KEY = 'english-department-magazine-recycle-bin';
const PROFILE_PHOTOS_STORAGE_KEY = 'english-department-profile-photos';
const DEFAULT_ARCHIVE_ENTRIES = [
    { year: '2026', title: '2026 Collection', pdf: 'img/cv.pdf', editors: [] }
];
const PROFILE_DIRECTORY = [
    { group: 'Advisor', people: [{ name: 'Dr. Montu Saikia', role: 'Advisor', photo: 'img/whispers-of-poetry.jpeg' }] },
    { group: 'Teacher Members', people: [
        ['Dr. Pulak Deka', 'img/e.jpeg'], ['Dimpi Basistha', 'img/imgechoes-thought.jpeg'], ['Pallab Jyoti Sarma', 'img/statuswindow_landing_page.jpg'],
        ['Ruchika Kashyap', 'img/imgechoes-of-thought.png'], ['Surashree Baruah', 'img/whispers-of-poetry.jpeg']
    ].map(([name, photo]) => ({ name, role: 'Teacher Member', photo })) },
    { group: 'Editorial Leadership', people: [
        ['Violina Deka', 'Editor', 'img/imgechoes-thought.jpeg'], ['Trisha Hazarika', 'Assistant Editor', 'img/e.jpeg'],
        ['Hrisikesh Sarma', 'Special Advisor to Editor', 'img/statuswindow_landing_page.jpg'], ['Irfan Farhad', 'Special Advisor to Editor', 'img/imgechoes-of-thought.png']
    ].map(([name, role, photo]) => ({ name, role, photo })) },
    { group: 'Editorial Team', people: [
        'Himadri Kumar', 'Kuntala Baharali', 'Mridushmita Kumar', 'Mrinmoy Sarma', 'Ritul Das', 'Priti Deka', 'Parbin Sultana',
        'Bhitali Kashyap', 'Maromi Sultana', 'Khusi Devi', 'Mandip Rajbongshi', 'Birina Sarania', 'Sumiya Hiussain',
        'Dipjyoti Kakati', 'Amrita Das', 'Tonmoy Nath'
    ].map((name, index) => ({ name, role: 'Editorial Team', photo: ['img/whispers-of-poetry.jpeg', 'img/imgechoes-thought.jpeg', 'img/e.jpeg', 'img/imgechoes-of-thought.png'][index % 4] })) }
];

document.getElementById('show-password').addEventListener('change', event => {
    document.getElementById('password').type = event.target.checked ? 'text' : 'password';
});

function showStatus(message, isError = false) {
    statusMessage.textContent = message;
    statusMessage.classList.toggle('error', isError);
}

function setFormStatus(id, message, isError = false) {
    const element = document.getElementById(id);
    element.textContent = message;
    element.classList.toggle('error', isError);
}

function setupFileDropzones() {
    document.querySelectorAll('.file-dropzone').forEach(dropzone => {
        const input = document.getElementById(dropzone.dataset.fileInput);
        const message = dropzone.querySelector('span');
        const defaultMessage = message.textContent;
        if (!input) return;

        const updateMessage = () => {
            message.textContent = input.files.length ? input.files[0].name : defaultMessage;
        };
        input.addEventListener('change', updateMessage);
        ['dragenter', 'dragover'].forEach(eventName => dropzone.addEventListener(eventName, event => {
            event.preventDefault();
            dropzone.classList.add('is-dragging');
        }));
        ['dragleave', 'drop'].forEach(eventName => dropzone.addEventListener(eventName, event => {
            event.preventDefault();
            dropzone.classList.remove('is-dragging');
        }));
        dropzone.addEventListener('drop', event => {
            const file = event.dataTransfer.files[0];
            if (!file) return;
            const transfer = new DataTransfer();
            transfer.items.add(file);
            input.files = transfer.files;
            updateMessage();
        });
    });
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

function profileKey(name) {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function getProfilePhotos() {
    try {
        return JSON.parse(localStorage.getItem(PROFILE_PHOTOS_STORAGE_KEY) || '{}');
    } catch {
        return {};
    }
}

function saveProfilePhotos(photos) {
    localStorage.setItem(PROFILE_PHOTOS_STORAGE_KEY, JSON.stringify(photos));
}

function readImageFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('The image could not be read.'));
        reader.readAsDataURL(file);
    });
}

function renderProfilePhotoAdmin() {
    const list = document.getElementById('profile-photo-admin-list');
    const storedPhotos = getProfilePhotos();
    list.replaceChildren();
    PROFILE_DIRECTORY.flatMap(section => section.people).forEach(person => {
        const key = profileKey(person.name);
        const saved = storedPhotos[key] || {};
        const row = document.createElement('div');
        row.className = 'profile-photo-row';

        const preview = document.createElement('img');
        preview.className = 'profile-photo-preview';
        preview.src = saved.photo || person.photo;
        preview.alt = `${person.name} preview`;
        preview.style.objectPosition = `${saved.x ?? 50}% ${saved.y ?? 50}%`;
        preview.style.transform = `scale(${saved.zoom || 1})`;

        const info = document.createElement('div');
        const name = document.createElement('p');
        name.className = 'profile-photo-name';
        name.textContent = person.name;
        const role = document.createElement('p');
        role.className = 'profile-photo-role';
        role.textContent = `${section.group} - ${person.role}`;
        info.append(name, role);

        const controls = document.createElement('div');
        controls.className = 'profile-photo-controls';
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/*';
        fileInput.setAttribute('aria-label', `Upload photo for ${person.name}`);
        const zoomInput = document.createElement('input');
        zoomInput.type = 'range';
        zoomInput.min = '1';
        zoomInput.max = '2.5';
        zoomInput.step = '.05';
        zoomInput.value = saved.zoom || '1';
        zoomInput.title = 'Photo zoom';
        const positionInput = document.createElement('input');
        positionInput.type = 'range';
        positionInput.min = '0';
        positionInput.max = '100';
        positionInput.value = saved.x ?? '50';
        positionInput.title = 'Photo horizontal position';
        const verticalInput = document.createElement('input');
        verticalInput.type = 'range';
        verticalInput.min = '0';
        verticalInput.max = '100';
        verticalInput.value = saved.y ?? '50';
        verticalInput.title = 'Photo vertical position';
        const saveButton = document.createElement('button');
        saveButton.type = 'button';
        saveButton.textContent = 'Save';
        const deleteButton = document.createElement('button');
        deleteButton.type = 'button';
        deleteButton.className = 'danger-button';
        deleteButton.textContent = 'Reset';

        zoomInput.addEventListener('input', () => { preview.style.transform = `scale(${zoomInput.value})`; });
        const updatePosition = () => { preview.style.objectPosition = `${positionInput.value}% ${verticalInput.value}%`; };
        positionInput.addEventListener('input', updatePosition);
        verticalInput.addEventListener('input', updatePosition);
        fileInput.addEventListener('change', () => {
            const file = fileInput.files[0];
            if (!file) return;
            if (!file.type.startsWith('image/')) return showStatus('Please choose an image file.', true);
            const reader = new FileReader();
            reader.onload = () => { preview.src = reader.result; };
            reader.readAsDataURL(file);
        });
        saveButton.addEventListener('click', async () => {
            const file = fileInput.files[0];
            let photo = saved.photo || '';
            if (file) photo = await readImageFile(file);
            const photos = getProfilePhotos();
            photos[key] = { photo, zoom: Number(zoomInput.value), x: Number(positionInput.value), y: Number(verticalInput.value) };
            saveProfilePhotos(photos);
            showStatus(`${person.name} profile photo saved.`);
        });
        deleteButton.addEventListener('click', () => {
            const photos = getProfilePhotos();
            delete photos[key];
            saveProfilePhotos(photos);
            renderProfilePhotoAdmin();
            showStatus(`${person.name} photo reset to default.`);
        });
        controls.append(fileInput, zoomInput, positionInput, verticalInput, saveButton, deleteButton);
        row.append(preview, info, controls);
        list.appendChild(row);
    });
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

function getRecycleBinEntries() {
    try {
        const entries = JSON.parse(localStorage.getItem(RECYCLE_BIN_STORAGE_KEY) || '[]');
        return Array.isArray(entries) ? entries : [];
    } catch {
        return [];
    }
}

function saveRecycleBinEntries(entries) {
    localStorage.setItem(RECYCLE_BIN_STORAGE_KEY, JSON.stringify(entries));
}

function moveToRecycleBin(entry) {
    const trashEntry = { ...entry, deletedAt: new Date().toISOString() };
    saveRecycleBinEntries([...getRecycleBinEntries(), trashEntry]);
}

function renderRecycleBin() {
    const select = document.getElementById('recycle-bin-select');
    select.replaceChildren();
    getRecycleBinEntries().forEach((entry, index) => {
        const option = document.createElement('option');
        option.value = String(index);
        option.textContent = `${entry.year} - ${entry.title}${entry.type === 'current' ? ' (Current)' : ''}`;
        select.appendChild(option);
    });
    const disabled = !select.options.length;
    select.disabled = disabled;
    document.getElementById('restore-recycle-button').disabled = disabled;
    document.getElementById('empty-recycle-button').disabled = disabled;
}

function renderArchiveDeleteOptions() {
    const select = document.getElementById('archive-delete-year');
    const editSelect = document.getElementById('archive-edit-year');
    const editorInput = document.getElementById('archive-editors-edit');
    select.replaceChildren();
    editSelect.replaceChildren();
    const entries = getArchiveEntries();
    entries.forEach(entry => {
        const option = document.createElement('option');
        option.value = entry.year;
        option.textContent = `${entry.year} - ${entry.title}`;
        select.appendChild(option);
        editSelect.appendChild(option.cloneNode(true));
    });
    select.disabled = !select.options.length;
    document.getElementById('delete-archive-button').disabled = !select.options.length;
    editSelect.disabled = !editSelect.options.length;
    document.getElementById('save-archive-editors').disabled = !editSelect.options.length;
    const selectedEntry = entries.find(entry => entry.year === editSelect.value);
    editorInput.value = (selectedEntry?.editors || []).join(', ');
}

function archiveCurrentMagazine(pdf) {
    const currentDate = new Date();
    const month = currentDate.getMonth();
    if (month !== 7 && month !== 8) return false;

    const year = String(currentDate.getFullYear());
    const entries = getArchiveEntries();
    const archivedEntry = {
        year,
        title: `${year} Collection`,
        pdf,
        editors: getEditors()
    };
    const existingIndex = entries.findIndex(entry => entry.year === year);
    if (existingIndex >= 0) entries[existingIndex] = archivedEntry;
    else entries.push(archivedEntry);
    saveArchiveEntries(entries);
    return true;
}

function readPdfFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('The PDF could not be read.'));
        reader.readAsDataURL(file);
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
    const button = uploadForm.querySelector('button[type="submit"]');
    if (!file) {
        setFormStatus('upload-status', 'Please choose a PDF first.', true);
        return;
    }
    if (file.type !== 'application/pdf') {
        setFormStatus('upload-status', 'Only PDF files are allowed.', true);
        showStatus('Please choose a PDF file.', true);
        return;
    }

    button.disabled = true;
    button.textContent = 'Uploading...';
    setFormStatus('upload-status', 'Reading PDF and publishing...');
    showStatus('Saving magazine in this browser...');
    const reader = new FileReader();
    reader.onload = () => {
        try {
            const previousMagazine = localStorage.getItem(MAGAZINE_STORAGE_KEY);
            const archived = previousMagazine ? archiveCurrentMagazine(previousMagazine) : false;
            localStorage.setItem(MAGAZINE_STORAGE_KEY, reader.result);
            uploadForm.reset();
            setFormStatus('upload-status', archived ? 'Published. Previous PDF moved to archive.' : 'Published successfully.');
            showStatus(archived
                ? 'Previous magazine moved to this year\'s archive. New magazine is current.'
                : 'Magazine replaced for this browser.');
        } catch {
            setFormStatus('upload-status', 'Upload failed: PDF is too large for browser storage.', true);
            showStatus('This PDF is too large for browser storage.', true);
        }
        button.disabled = false;
        button.textContent = 'Upload and publish';
    };
    reader.onerror = () => {
        setFormStatus('upload-status', 'Upload failed: the PDF could not be read.', true);
        showStatus('The PDF could not be read.', true);
        button.disabled = false;
        button.textContent = 'Upload and publish';
    };
    reader.readAsDataURL(file);
});

document.getElementById('logout-button').addEventListener('click', () => {
    sessionStorage.removeItem(AUTH_SESSION_KEY);
    setAuthenticated(false);
    showStatus('Signed out.');
});

document.getElementById('delete-magazine-button').addEventListener('click', () => {
    const currentMagazine = localStorage.getItem(MAGAZINE_STORAGE_KEY);
    if (!currentMagazine) {
        showStatus('No uploaded current magazine to delete.', true);
        return;
    }
    if (!window.confirm('Delete the current magazine from this browser?')) return;
    moveToRecycleBin({
        type: 'current',
        year: String(new Date().getFullYear()),
        title: 'Current E-Magazine',
        pdf: currentMagazine,
        editors: getEditors()
    });
    localStorage.removeItem(MAGAZINE_STORAGE_KEY);
    showStatus('Current magazine deleted.');
});

document.getElementById('delete-archive-button').addEventListener('click', () => {
    const year = document.getElementById('archive-delete-year').value;
    if (!year) return showStatus('No yearly collection selected.', true);
    if (!window.confirm(`Delete the ${year} collection from this browser?`)) return;
    const entries = getArchiveEntries();
    const entry = entries.find(item => item.year === year);
    if (entry) moveToRecycleBin({ ...entry, type: 'archive' });
    saveArchiveEntries(entries.filter(entry => entry.year !== year));
    renderArchiveDeleteOptions();
    renderRecycleBin();
    showStatus(`${year} collection deleted.`);
});

document.getElementById('restore-recycle-button').addEventListener('click', () => {
    const select = document.getElementById('recycle-bin-select');
    const index = Number(select.value);
    const trash = getRecycleBinEntries();
    const entry = trash[index];
    if (!entry) return showStatus('No deleted magazine selected.', true);
    if (entry.type === 'current') {
        if (localStorage.getItem(MAGAZINE_STORAGE_KEY) && !window.confirm('Replace the current magazine with this deleted version?')) return;
        localStorage.setItem(MAGAZINE_STORAGE_KEY, entry.pdf);
    } else {
        const archives = getArchiveEntries();
        if (archives.some(item => item.year === entry.year)) return showStatus(`${entry.year} collection already exists.`, true);
        saveArchiveEntries([...archives, { year: entry.year, title: entry.title, pdf: entry.pdf, editors: entry.editors || [] }]);
        renderArchiveDeleteOptions();
    }
    trash.splice(index, 1);
    saveRecycleBinEntries(trash);
    renderRecycleBin();
    showStatus(`${entry.year} magazine restored.`);
});

document.getElementById('empty-recycle-button').addEventListener('click', () => {
    const select = document.getElementById('recycle-bin-select');
    const index = Number(select.value);
    const trash = getRecycleBinEntries();
    const entry = trash[index];
    if (!entry) return showStatus('No deleted magazine selected.', true);
    if (!window.confirm(`Permanently delete the ${entry.year} magazine?`)) return;
    trash.splice(index, 1);
    saveRecycleBinEntries(trash);
    renderRecycleBin();
    showStatus(`${entry.year} magazine permanently deleted.`);
});

document.getElementById('archive-edit-year').addEventListener('change', event => {
    const entry = getArchiveEntries().find(item => item.year === event.target.value);
    document.getElementById('archive-editors-edit').value = (entry?.editors || []).join(', ');
});

document.getElementById('save-archive-editors').addEventListener('click', () => {
    const year = document.getElementById('archive-edit-year').value;
    if (!year) return showStatus('No yearly collection selected.', true);
    const editors = document.getElementById('archive-editors-edit').value
        .split(',')
        .map(name => name.trim())
        .filter(Boolean);
    const entries = getArchiveEntries();
    const entry = entries.find(item => item.year === year);
    if (!entry) return showStatus('Yearly collection not found.', true);
    entry.editors = editors;
    saveArchiveEntries(entries);
    showStatus(`${year} editors updated.`);
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
    const year = document.getElementById('archive-year').value.trim();
    const title = document.getElementById('archive-title-input').value.trim();
    const selectedFile = document.getElementById('archive-pdf-file').files[0];
    const editors = document.getElementById('archive-editors').value
        .split(',')
        .map(name => name.trim())
        .filter(Boolean);
    if (!year || !title || !selectedFile) {
        setFormStatus('archive-upload-status', 'Year, title, and PDF are required.', true);
        return;
    }
    if (getArchiveEntries().some(entry => entry.year === year)) {
        setFormStatus('archive-upload-status', `${year} collection already exists.`, true);
        showStatus(`${year} archive folder already exists.`, true);
        return;
    }
    const button = event.target.querySelector('button[type="submit"]');
    button.disabled = true;
    button.textContent = 'Adding...';
    setFormStatus('archive-upload-status', 'Reading PDF and adding collection...');
    let pdf = '';
    if (selectedFile) {
        if (selectedFile.type !== 'application/pdf') {
            button.disabled = false;
            button.textContent = 'Add magazine';
            setFormStatus('archive-upload-status', 'Only PDF files are allowed.', true);
            return showStatus('Please choose a PDF file.', true);
        }
        try {
            pdf = await readPdfFile(selectedFile);
        } catch (error) {
            button.disabled = false;
            button.textContent = 'Add magazine';
            setFormStatus('archive-upload-status', error.message, true);
            return showStatus(error.message, true);
        }
    }
    saveArchiveEntries([...getArchiveEntries(), { year, title, pdf, editors }]);
    event.target.reset();
    renderArchiveDeleteOptions();
    button.disabled = false;
    button.textContent = 'Add magazine';
    setFormStatus('archive-upload-status', `${year} collection added successfully.`);
    showStatus('Archive folder added.');
});

checkSession();
setupFileDropzones();
renderEditors();
renderProfilePhotoAdmin();
renderArchiveDeleteOptions();
renderRecycleBin();
